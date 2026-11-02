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

// ==========================================
// RIDE OFFER UPDATE & DELETE (Sprint 2)
// ==========================================

// Update a Ride Offer (Only the driver who created it can update)
router.put('/offers/:id', verifyToken, async (req, res) => {
  try {
    const { departureTime, seatsAvailable } = req.body;

    // Input Validation: Future Date Check (FR-19 / TC-04)
    if (departureTime && new Date(departureTime) <= new Date()) {
      return res.status(400).json({ error: 'Departure time must be in the future.' });
    }

    // Input Validation: Seat Limit Check
    if (seatsAvailable !== undefined && (seatsAvailable < 1 || seatsAvailable > 8)) {
      return res.status(400).json({ error: 'Seats available must be between 1 and 8.' });
    }

    const offer = await RideOffer.findById(req.params.id);
    if (!offer) return res.status(404).json({ error: 'Ride offer not found.' });

    // Authorization Check: Ensure logged-in user is the driver (SR-02 / NFR-03)
    if (offer.driver.toString() !== req.user.id.toString()) {
      return res.status(403).json({ error: 'Unauthorized: You can only modify your own ride offers.' });
    }

    const updatedOffer = await RideOffer.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    res.status(200).json(updatedOffer);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete/Cancel a Ride Offer (Only the driver who created it can delete)
router.delete('/offers/:id', verifyToken, async (req, res) => {
  try {
    const offer = await RideOffer.findById(req.params.id);
    if (!offer) return res.status(404).json({ error: 'Ride offer not found.' });

    // Authorization Check: Ensure logged-in user is the driver (SR-02 / NFR-03)
    if (offer.driver.toString() !== req.user.id.toString()) {
      return res.status(403).json({ error: 'Unauthorized: You can only delete your own ride offers.' });
    }

    await RideOffer.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Ride offer successfully deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==========================================
// RIDE REQUEST UPDATE & DELETE (Sprint 2)
// ==========================================

// Update a Ride Request (Only the rider who created it can update)
router.put('/requests/:id', verifyToken, async (req, res) => {
  try {
    const { departureTime, seatsRequested } = req.body;

    // Input Validation: Future Date Check (FR-19 / TC-04)
    if (departureTime && new Date(departureTime) <= new Date()) {
      return res.status(400).json({ error: 'Departure time must be in the future.' });
    }

    // Input Validation: Seat Limit Check
    if (seatsRequested !== undefined && (seatsRequested < 1 || seatsRequested > 8)) {
      return res.status(400).json({ error: 'Seats requested must be between 1 and 8.' });
    }

    const request = await RideRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Ride request not found.' });

    // Authorization Check: Ensure logged-in user is the rider (SR-02 / NFR-03)
    if (request.rider.toString() !== req.user.id.toString()) {
      return res.status(403).json({ error: 'Unauthorized: You can only modify your own ride requests.' });
    }

    const updatedRequest = await RideRequest.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    res.status(200).json(updatedRequest);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete/Cancel a Ride Request (Only the rider who created it can delete)
router.delete('/requests/:id', verifyToken, async (req, res) => {
  try {
    const request = await RideRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Ride request not found.' });

    // Authorization Check: Ensure logged-in user is the rider (SR-02 / NFR-03)
    if (request.rider.toString() !== req.user.id.toString()) {
      return res.status(403).json({ error: 'Unauthorized: You can only delete your own ride requests.' });
    }

    await RideRequest.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Ride request successfully deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
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