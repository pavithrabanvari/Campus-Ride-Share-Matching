const express = require('express');
const router = express.Router();
const Ride = require('../models/Ride');
const authMiddleware = require('../middleware/auth'); // JWT verification middleware

// ==========================================
// 1. CREATE RIDE OFFER (FR-05)
// ==========================================
router.post('/offers', authMiddleware, async (req, res) => {
    try {
        const { source, destination, departureTime, seatsAvailable, vehicleDetails } = req.body;
        
        // Input validation
        if (!source || !destination || !departureTime || !seatsAvailable) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const newRide = new Ride({
            host: req.user.id, // Extracted securely from JWT payload
            source,
            destination,
            departureTime,
            seatsAvailable,
            vehicleDetails,
            status: 'ACTIVE'
        });

        await newRide.save();
        return res.status(201).json({ 
            success: true, 
            message: 'Ride offer created successfully', 
            data: newRide 
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});

// ==========================================
// 2. EDIT OR CANCEL RIDE OFFER (FR-08 / NFR-03)
// ==========================================
router.patch('/offers/:id', authMiddleware, async (req, res) => {
    try {
        const ride = await Ride.findById(req.params.id);
        
        if (!ride) {
            return res.status(404).json({ success: false, message: 'Ride offer not found' });
        }

        // Authorization check: Ensure only the creator/host can edit or cancel
        if (ride.host.toString() !== req.user.id) {
            return res.status(403).json({ 
                success: false, 
                message: 'Access denied: You can only modify your own ride offers' 
            });
        }

        const allowedUpdates = ['departureTime', 'seatsAvailable', 'status', 'vehicleDetails'];
        const updates = Object.keys(req.body);
        
        const isValidOperation = updates.every(update => allowedUpdates.includes(update));
        if (!isValidOperation) {
            return res.status(400).json({ success: false, message: 'Invalid updates specified' });
        }

        updates.forEach(update => (ride[update] = req.body[update]));
        await ride.save();

        return res.status(200).json({ 
            success: true, 
            message: 'Ride offer updated successfully', 
            data: ride 
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;