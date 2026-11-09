const jwt = require('jsonwebtoken');
const crypto = require('node:crypto');

// Production deployments should set JWT_SECRET. The random fallback keeps local
// development usable without a committed or predictable signing key.
const jwtSecret = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

function requireAuth(req, res, next) {
  const authorization = req.get('Authorization') || '';
  const [scheme, token] = authorization.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ success: false, message: 'A Bearer token is required.' });
  }
  try {
    req.user = jwt.verify(token, jwtSecret);
    return next();
  } catch {
    return res.status(401).json({ success: false, message: 'The token is invalid or expired.' });
  }
}

module.exports = { jwtSecret, requireAuth };
