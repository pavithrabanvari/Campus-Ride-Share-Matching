const router = require('express').Router();
const mongoose = require('mongoose');
const { RideOffer, RideRequest } = require('../models/Ride');
const { requireAuth } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rateLimit');

const rideWriteRateLimit = rateLimit({ limit: 60, windowMs: 60_000, message: 'Too many ride updates. Please try again later.' });

function validCoordinate(value, min, max) {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) return false;
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max;
}

function validCoordinatePair(value) {
  return value && typeof value === 'object' && !Array.isArray(value) &&
    validCoordinate(value.lat, -90, 90) && validCoordinate(value.lng, -180, 180);
}

function validPost(body, type) {
  const fields = type === 'offer'
    ? ['originAddress', 'originCoordinates', 'destinationAddress', 'destinationCoordinates', 'departureTime', 'availableSeats']
    : ['originAddress', 'originCoordinates', 'destinationAddress', 'destinationCoordinates', 'desiredTime', 'seatsNeeded'];
  if (!body || fields.some((field) => body[field] === null || body[field] === undefined || body[field] === '')) {
    return 'All route, time, and seat fields are required.';
  }
  if (typeof body.originAddress !== 'string' || !body.originAddress.trim() ||
      typeof body.destinationAddress !== 'string' || !body.destinationAddress.trim()) {
    return 'Origin and destination names are required.';
  }
  if (!validCoordinatePair(body.originCoordinates) || !validCoordinatePair(body.destinationCoordinates)) {
    return 'Provide valid latitude and longitude coordinates for both locations.';
  }
  const date = new Date(type === 'offer' ? body.departureTime : body.desiredTime);
  if (!Number.isFinite(date.getTime())) return 'Provide a valid departure date and time.';
  const seats = Number(type === 'offer' ? body.availableSeats : body.seatsNeeded);
  if (!Number.isInteger(seats) || seats < 1 || seats > 20) return 'Seat count must be a whole number from 1 to 20.';
  return null;
}

function monitorSearchResponseTime(req, res, next) {
  const startTime = process.hrtime.bigint();
  res.on('finish', () => {
    const elapsedMs = Number(process.hrtime.bigint() - startTime) / 1e6;
    console.log(`[PERFORMANCE] ${req.method} ${req.originalUrl} | ${res.statusCode} | ${elapsedMs.toFixed(2)} ms`);
  });
  next();
}

router.post('/offers', rideWriteRateLimit, requireAuth, async (req, res) => {
  const error = validPost(req.body, 'offer');
  if (error) return res.status(400).json({ success: false, message: error });
  try {
    const offer = await RideOffer.create({ ...req.body, driver: req.user.id });
    return res.status(201).json(offer);
  } catch (cause) {
    if (cause.name === 'ValidationError' || cause.name === 'CastError') {
      return res.status(400).json({ success: false, message: cause.message });
    }
    return res.status(500).json({ success: false, message: 'Unable to create ride offer.' });
  }
});

router.post('/requests', rideWriteRateLimit, requireAuth, async (req, res) => {
  const error = validPost(req.body, 'request');
  if (error) return res.status(400).json({ success: false, message: error });
  try {
    const request = await RideRequest.create({ ...req.body, rider: req.user.id });
    return res.status(201).json(request);
  } catch (cause) {
    if (cause.name === 'ValidationError' || cause.name === 'CastError') {
      return res.status(400).json({ success: false, message: cause.message });
    }
    return res.status(500).json({ success: false, message: 'Unable to create ride request.' });
  }
});

router.patch('/offers/:id', rideWriteRateLimit, requireAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid ride offer id.' });
  }
  try {
    const offer = await RideOffer.findById(req.params.id);
    if (!offer) return res.status(404).json({ success: false, message: 'Ride offer not found.' });
    if (String(offer.driver) !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You can only update your own ride offers.' });
    }
    const allowed = new Set(['originAddress', 'originCoordinates', 'destinationAddress', 'destinationCoordinates', 'departureTime', 'availableSeats', 'vehicleDetails', 'status']);
    const updates = Object.keys(req.body || {});
    if (!updates.length || updates.some((field) => !allowed.has(field))) {
      return res.status(400).json({ success: false, message: 'The requested ride offer updates are invalid.' });
    }
    for (const field of updates) offer[field] = req.body[field];
    await offer.save();
    return res.json({ success: true, message: 'Ride offer updated successfully.', data: offer });
  } catch (cause) {
    if (cause.name === 'ValidationError' || cause.name === 'CastError') {
      return res.status(400).json({ success: false, message: cause.message });
    }
    return res.status(500).json({ success: false, message: 'Unable to update ride offer.' });
  }
});

router.get('/search', monitorSearchResponseTime, async (req, res) => {
  const q = req.query;
  const originLat = q.originLat ?? q.lat;
  const originLng = q.originLng ?? q.lng;
  const destinationLat = q.destinationLat;
  const destinationLng = q.destinationLng;
  const radiusKm = q.radiusKm === undefined ? 5 : Number(q.radiusKm);
  if (!validCoordinate(originLat, -90, 90) || !validCoordinate(originLng, -180, 180)) {
    return res.status(400).json({ error: 'Provide valid originLat/originLng (or lat/lng) coordinates.' });
  }
  if ((destinationLat !== undefined || destinationLng !== undefined) &&
      (!validCoordinate(destinationLat, -90, 90) || !validCoordinate(destinationLng, -180, 180))) {
    return res.status(400).json({ error: 'destinationLat and destinationLng must both be valid coordinates.' });
  }
  if (!Number.isFinite(radiusKm) || radiusKm <= 0 || radiusKm > 100) {
    return res.status(400).json({ error: 'radiusKm must be greater than 0 and at most 100.' });
  }

  const hasFrom = q.departureFrom !== undefined;
  const hasTo = q.departureTo !== undefined;
  if (hasFrom !== hasTo) return res.status(400).json({ error: 'departureFrom and departureTo must be provided together.' });
  let departureFrom;
  let departureTo;
  if (hasFrom) {
    departureFrom = new Date(q.departureFrom);
    departureTo = new Date(q.departureTo);
    if (!Number.isFinite(departureFrom.getTime()) || !Number.isFinite(departureTo.getTime()) || departureFrom > departureTo) {
      return res.status(400).json({ error: 'Provide a valid departure window with departureFrom <= departureTo.' });
    }
  }
  let desiredTime = q.desiredTime === undefined ? null : new Date(q.desiredTime);
  if (desiredTime && !Number.isFinite(desiredTime.getTime())) {
    return res.status(400).json({ error: 'desiredTime must be a valid date.' });
  }
  if (!desiredTime && departureFrom && departureTo) {
    desiredTime = new Date((departureFrom.getTime() + departureTo.getTime()) / 2);
  }

  const filter = { status: 'ACTIVE' };
  if (hasFrom) filter.departureTime = { $gte: departureFrom, $lte: departureTo };
  const pipeline = [{
    $geoNear: {
      near: { type: 'Point', coordinates: [Number(originLng), Number(originLat)] },
      key: 'originLocation',
      distanceField: 'distanceMeters',
      maxDistance: radiusKm * 1000,
      spherical: true,
      query: filter
    }
  }];
  if (destinationLat !== undefined || destinationLng !== undefined) {
    pipeline.push({ $match: { destinationLocation: {
      $geoWithin: { $centerSphere: [[Number(destinationLng), Number(destinationLat)], radiusKm / 6371] }
    } } });
  }
  pipeline.push({ $limit: 50 });

  try {
    const rides = await RideOffer.aggregate(pipeline);
    const offers = rides.filter((ride) => Number.isFinite(new Date(ride.departureTime).getTime())).map((ride) => ({
      id: String(ride._id),
      driver_name: 'Student',
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
    const request = destinationLat !== undefined && desiredTime ? {
      pickup_lat: Number(originLat),
      pickup_lon: Number(originLng),
      dropoff_lat: Number(destinationLat),
      dropoff_lon: Number(destinationLng),
      desired_time_min: Math.floor(desiredTime.getTime() / 60000)
    } : null;
    return res.json({ count: offers.length, radiusKm, request, offers });
  } catch (cause) {
    console.error('Ride search failed:', cause.message);
    return res.status(500).json({ error: 'Unable to search for rides.' });
  }
});

module.exports = router;
