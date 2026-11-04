const jwt = require('jsonwebtoken');

// JWT Secret Key (Ensure this is set in your environment variables)
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

/**
 * Middleware to authenticate requests via Bearer Token
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Extract token from "Bearer <token>"

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      error: 'Access Denied: Missing Authorization Header' 
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ 
        success: false, 
        error: 'Forbidden: Invalid or Expired Token' 
      });
    }
    req.user = user; // Attach payload (e.g., userId, email) to request object
    next();
  });
};

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

module.exports = { authenticateToken, authorizeOwnership };