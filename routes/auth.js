const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    try {
        const token = authHeader.replace('Bearer ', '');
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified; // Attach user payload (id, role, etc.) to request object
        next();
    } catch (err) {
        return res.status(403).json({ success: false, message: 'Invalid or expired token.' });
    }
};

module.exports = authMiddleware; // Changed from export default to module.exports