const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { RideOffer, RideRequest } = require('../models/Ride');
const jwt = require('jsonwebtoken');

const rideWriteRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' }
});

// Response-time monitoring for geospatial search (NFR-01)
const monitorSearchResponseTime = (req, res, next) => {
  const startTime = process.hrtime.bigint();

  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1e6;

    const status = durationMs < 3000 ? 'PASS' : 'FAIL';

    console.log(
      `[PERFORMANCE] ${req.method} ${req.originalUrl} | ` +
      `Status: ${res.statusCode} | ` +
      `Response time: ${durationMs.toFixed(2)} ms | ` +
      `Target: < 3000 ms | Result: ${status}`
    );

  });

  next();
};

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
router.post('/offers', rideWriteRateLimit, verifyToken, async (req, res) => {
  try {
    const newOffer = new RideOffer({ ...req.body, driver: req.user.id });
    await newOffer.save();
    res.status(201).json(newOffer);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Post a Ride Request
router.post('/requests', rideWriteRateLimit, verifyToken, async (req, res) => {
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
router.get('/search', monitorSearchResponseTime, async (req, res) => {
  try {
    const q = req.query;
    // lat/lng remain aliases for the original endpoint.
    const originLatParam = q.originLat ?? q.lat;
    const originLngParam = q.originLng ?? q.lng;
    const destinationLatParam = q.destinationLat;
    const destinationLngParam = q.destinationLng;
    const radiusParam = q.radiusKm;
    const radiusKm = radiusParam === undefined ? 5 : Number(radiusParam);

    const coordinate = (value, min, max) => {
      const normalized = typeof value === 'string' ? value.trim() : value;
      return normalized !== undefined && normalized !== '' &&
        Number.isFinite(Number(normalized)) && Number(normalized) >= min && Number(normalized) <= max;
    };
    if (!coordinate(originLatParam, -90, 90) || !coordinate(originLngParam, -180, 180)) {
      return res.status(400).json({ error: 'Provide valid originLat/originLng (or lat/lng) coordinates.' });
    }
    const hasDestination = destinationLatParam !== undefined || destinationLngParam !== undefined;
    if (hasDestination && (!coordinate(destinationLatParam, -90, 90) || !coordinate(destinationLngParam, -180, 180))) {
      return res.status(400).json({ error: 'destinationLat and destinationLng must both be valid coordinates.' });
    }
    if (!Number.isFinite(radiusKm) || radiusKm <= 0 || radiusKm > 100) {
      return res.status(400).json({ error: 'radiusKm must be greater than 0 and at most 100.' });
    }

    const hasDepartureStart = q.departureFrom !== undefined;
    const hasDepartureEnd = q.departureTo !== undefined;
    if (hasDepartureStart !== hasDepartureEnd) {
      return res.status(400).json({ error: 'departureFrom and departureTo must be provided together.' });
    }
    let departureFrom;
    let departureTo;
    if (hasDepartureStart) {
      departureFrom = new Date(q.departureFrom);
      departureTo = new Date(q.departureTo);
      if (!Number.isFinite(departureFrom.getTime()) || !Number.isFinite(departureTo.getTime()) || departureFrom > departureTo) {
        return res.status(400).json({ error: 'Provide a valid departure window with departureFrom <= departureTo.' });
      }
    }

    const originLat = Number(originLatParam);
    const originLng = Number(originLngParam);
    const filter = { status: 'ACTIVE' };
    if (hasDepartureStart) filter.departureTime = { $gte: departureFrom, $lte: departureTo };
    const pipeline = [{
      $geoNear: {
        near: { type: 'Point', coordinates: [originLng, originLat] },
        key: 'originLocation',
        distanceField: 'distanceMeters',
        maxDistance: radiusKm * 1000,
        spherical: true,
        query: filter
      }
    }];
    if (hasDestination) {
      pipeline.push({
        $match: {
          destinationLocation: {
            $geoWithin: {
              $centerSphere: [[Number(destinationLngParam), Number(destinationLatParam)], radiusKm / 6371]
            }
          }
        }
      });
    }
    pipeline.push({ $limit: 50 });

    const rides = await RideOffer.aggregate(pipeline);
    // Tanishkaa's rank_matches input contract: request + offers. Time values are
    // absolute UTC minutes so differences remain correct across date boundaries.
    const desiredTime = q.desiredTime ? new Date(q.desiredTime) :
      (departureFrom && departureTo ? new Date((departureFrom.getTime() + departureTo.getTime()) / 2) : null);
    if (q.desiredTime && !Number.isFinite(desiredTime.getTime())) {
      return res.status(400).json({ error: 'desiredTime must be a valid ISO date.' });
    }
    const request = hasDestination && desiredTime ? {
      pickup_lat: originLat,
      pickup_lon: originLng,
      dropoff_lat: Number(destinationLatParam),
      dropoff_lon: Number(destinationLngParam),
      desired_time_min: Math.floor(desiredTime.getTime() / 60000)
    } : null;
    const offers = rides.filter((ride) =>
      ride.originCoordinates && ride.destinationCoordinates && Number.isFinite(ride.departureTime?.getTime?.())
    ).map((ride) => ({
      id: String(ride._id),
      driver_name: ride.driverName || 'Student',
      pickup_lat: ride.originCoordinates.lat,
      pickup_lon: ride.originCoordinates.lng,
      dropoff_lat: ride.destinationCoordinates.lat,
      dropoff_lon: ride.destinationCoordinates.lng,
      departure_time_min: Math.floor(new Date(ride.departureTime).getTime() / 60000),
      available_seats: ride.availableSeats,
      status: String(ride.status || 'ACTIVE').toLowerCase(),
      pickup_name: ride.originAddress,
      dropoff_name: ride.destinationAddress
    }));

    return res.status(200).json({
      count: offers.length,
      radiusKm,
      request,
      offers
    });
  } catch (err) {
    console.error('Ride search failed:', err);

    return res.status(500).json({
      error: 'Unable to search for rides.'
    });
  }
});

module.exports = router;
