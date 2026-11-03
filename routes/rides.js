const express = require('express');
const router = express.Router();
const Ride = require('../models/Ride');
const User = require('../models/User');

// Middleware mockup / placeholder if auth middleware is imported separately
// const auth = require('../middleware/auth'); 

// GET all ride offers
router.get('/offers', async (req, res) => {
    try {
        const rides = await Ride.find({});
        return res.status(200).json({ success: true, data: rides });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// POST a new ride offer
router.post('/offers', async (req, res) => {
    try {
        const { userId, departureTime, seatsAvailable, pickupLocation, dropLocation } = req.body;

        // Input Validation
        if (new Date(departureTime) < new Date()) {
            return res.status(400).json({ error: "Departure time cannot be in the past" });
        }

        if (!seatsAvailable || seatsAvailable <= 0) {
            return res.status(400).json({ error: "Available seats must be greater than zero" });
        }

        const newRide = new Ride({
            userId,
            departureTime,
            seatsAvailable,
            pickupLocation,
            dropLocation
        });

        const savedRide = await newRide.save();
        return res.status(201).json({ success: true, data: savedRide });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// UPDATE a ride offer (with ownership verification and input validation)
router.put('/offers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const authenticatedUserId = req.user ? req.user.id : req.body.userId; // Fallback for testing if middleware isn't wired yet

        const ride = await Ride.findById(id);
        if (!ride) {
            return res.status(404).json({ error: "Ride offer not found" });
        }

        // SR-02 Ownership Verification
        if (ride.userId.toString() !== authenticatedUserId.toString()) {
            return res.status(403).json({ error: "Forbidden: You can only edit your own posts" });
        }

        // Validate departure time if provided
        if (req.body.departureTime && new Date(req.body.departureTime) < new Date()) {
            return res.status(400).json({ error: "Departure time cannot be in the past" });
        }

        // Validate seats if provided
        if (req.body.seatsAvailable !== undefined && req.body.seatsAvailable <= 0) {
            return res.status(400).json({ error: "Available seats must be greater than zero" });
        }

        const updatedRide = await Ride.findByIdAndUpdate(id, req.body, { new: true });
        return res.status(200).json({ success: true, data: updatedRide });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// DELETE a ride offer (with ownership verification)
router.delete('/offers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const authenticatedUserId = req.user ? req.user.id : req.body.userId; // Fallback for testing if middleware isn't wired yet

        const ride = await Ride.findById(id);
        if (!ride) {
            return res.status(404).json({ error: "Ride offer not found" });
        }

        // SR-02 Ownership Verification
        if (ride.userId.toString() !== authenticatedUserId.toString()) {
            return res.status(403).json({ error: "Forbidden: You can only delete your own posts" });
        }

        await Ride.findByIdAndDelete(id);
        return res.status(200).json({ success: true, message: "Ride offer deleted successfully" });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

module.exports = router;