const express = require('express');
const router = express.Router();

// --- 1. Middleware Imports / Definitions ---
// Adjust the path to auth if your auth.js is in the same directory (routes/auth.js)
const { authenticateToken } = require('./auth');

/**
 * Middleware to verify resource ownership (Keertika: Access Control Check)
 * Prevents User A from modifying or deleting User B's ride offer/request
 */
const authorizeOwnership = (RideModel) => {
  return async (req, res, next) => {
    try {
      const rideId = req.params.id;
      const ride = await RideModel.findById(rideId);

      if (!ride) {
        return res.status(404).json({ success: false, error: 'Ride offer not found' });
      }

      // Check if logged-in user matches creator of the ride
      if (ride.userId.toString() !== req.user.id) {
        return res.status(403).json({ 
          success: false, 
          error: 'Forbidden: You are not authorized to modify or delete this ride offer' 
        });
      }

      req.ride = ride; // Pass fetched ride object forward
      next();
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Server error during authorization check' });
    }
  };
};

/**
 * Input Validator Middleware for Ride Creation / Update (FR-19)
 */
const validateRidePayload = (req, res, next) => {
  const { origin, destination, availableSeats, departureTime } = req.body;
  const errors = [];

  // 1. Validate Seats (Must be integer, > 0, and max vehicle capacity e.g., 6)
  if (!Number.isInteger(availableSeats) || availableSeats <= 0 || availableSeats > 6) {
    errors.push('Available seats must be an integer between 1 and 6.');
  }

  // 2. Validate Departure Time (Must be a valid date string and strictly in the future)
  const parsedDate = new Date(departureTime);
  if (isNaN(parsedDate.getTime())) {
    errors.push('Invalid departure date format.');
  } else if (parsedDate <= new Date()) {
    errors.push('Departure time must be scheduled in the future.');
  }

  // 3. Validate Origin & Destination Strings
  if (!origin || typeof origin !== 'string' || origin.trim().length < 3) {
    errors.push('Origin location must be at least 3 characters long.');
  }
  if (!destination || typeof destination !== 'string' || destination.trim().length < 3) {
    errors.push('Destination location must be at least 3 characters long.');
  }

  // Return 400 Bad Request if validation fails
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      errors: errors
    });
  }

  next();
};

// --- 2. Mock Database / Model Wrapper (Replace with Mongoose/SQL Model in production) ---
let rideOffersDb = [
  {
    id: 'ride-101',
    userId: 'user-001', // Owned by User 1
    origin: 'PES University RR Campus',
    destination: 'Koramangala 5th Block',
    availableSeats: 3,
    departureTime: new Date(Date.now() + 86400000).toISOString() // Tomorrow
  }
];

const RideModel = {
  findById: async (id) => rideOffersDb.find(r => r.id === id)
};

// --- 3. Route Endpoints ---

/**
 * @route POST /api/rides/offers
 * @desc  Create a new ride offer (FR-01)
 */
router.post('/offers', authenticateToken, validateRidePayload, (req, res) => {
  const { origin, destination, availableSeats, departureTime } = req.body;

  const newRide = {
    id: `ride-${Date.now()}`,
    userId: req.user.id,
    origin,
    destination,
    availableSeats,
    departureTime
  };

  rideOffersDb.push(newRide);
  return res.status(201).json({ 
    success: true, 
    message: 'Ride offer created successfully', 
    data: newRide 
  });
});

/**
 * @route PUT /api/rides/offers/:id
 * @desc  Update existing ride offer with ownership check and validation (FR-02, SR-02)
 */
router.put('/offers/:id', authenticateToken, authorizeOwnership(RideModel), validateRidePayload, (req, res) => {
  const { origin, destination, availableSeats, departureTime } = req.body;
  
  const rideIndex = rideOffersDb.findIndex(r => r.id === req.params.id);
  rideOffersDb[rideIndex] = {
    ...rideOffersDb[rideIndex],
    origin,
    destination,
    availableSeats,
    departureTime
  };

  return res.status(200).json({
    success: true,
    message: 'Ride offer updated successfully',
    data: rideOffersDb[rideIndex]
  });
});

/**
 * @route DELETE /api/rides/offers/:id
 * @desc  Cancel / Delete a ride offer with ownership verification (FR-03, SR-02)
 */
router.delete('/offers/:id', authenticateToken, authorizeOwnership(RideModel), (req, res) => {
  rideOffersDb = rideOffersDb.filter(r => r.id !== req.params.id);
  return res.status(200).json({ 
    success: true, 
    message: 'Ride offer cancelled successfully' 
  });
});

module.exports = router;