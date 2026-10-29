const router = require('express').Router();
const { RideOffer, RideRequest } = require('../models/Ride');
const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied' });
  try {
    req.user = jwt.verify(token, 'YOUR_JWT_SECRET');
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid token' });
  }
};

// Post a Ride Offer
router.post('/offers', verifyToken, async (req, res) => {
  try {
    const newOffer = new RideOffer({ ...req.body, driver: req.user.id });
    await newOffer.save();
    res.status(201).json(newOffer);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Post a Ride Request
router.post('/requests', verifyToken, async (req, res) => {
  try {
    const newRequest = new RideRequest({ ...req.body, rider: req.user.id });
    await newRequest.save();
    res.status(201).json(newRequest);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


/**
 * Search active ride offers near a given location.
 * GET /api/rides/search?lat=12.9716&lng=77.5946&radiusKm=5
 */
router.get('/search', async (req, res) => {
  try {
    const { lat: latParam, lng: lngParam, radiusKm: radiusParam } = req.query;

    // Validate required coordinates.
    if (
      latParam === undefined ||
      lngParam === undefined ||
      latParam.trim() === '' ||
      lngParam.trim() === ''
    ) {
      return res.status(400).json({
        error: 'Latitude (lat) and longitude (lng) are required.'
      });
    }

    const lat = Number(latParam);
    const lng = Number(lngParam);
    const radiusKm = radiusParam === undefined ? 5 : Number(radiusParam);

    if (
      !Number.isFinite(lat) ||
      lat < -90 ||
      lat > 90 ||
      !Number.isFinite(lng) ||
      lng < -180 ||
      lng > 180
    ) {
      return res.status(400).json({
        error: 'Provide valid latitude (-90 to 90) and longitude (-180 to 180).'
      });
    }

    if (
      radiusParam !== undefined &&
      (radiusParam.trim() === '' || !Number.isFinite(radiusKm))
    ) {
      return res.status(400).json({
        error: 'radiusKm must be a valid number.'
      });
    }

    if (radiusKm <= 0 || radiusKm > 100) {
      return res.status(400).json({
        error: 'radiusKm must be greater than 0 and at most 100.'
      });
    }

    const rides = await RideOffer.find({
      status: 'ACTIVE',
      originLocation: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat]
          },
          $maxDistance: radiusKm * 1000
        }
      }
    }).limit(50);

    return res.status(200).json({
      count: rides.length,
      radiusKm,
      rides
    });
  } catch (err) {
    console.error('Ride search failed:', err);

    return res.status(500).json({
      error: 'Unable to search for rides.'
    });
  }
});

module.exports = router;