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

module.exports = router;