const clients = new Map();

// Keep the in-memory bucket map bounded as expired client windows age out.
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of clients) {
    if (bucket.resetAt <= now) clients.delete(key);
  }
}, 60_000);
cleanupTimer.unref();

function rateLimit({ limit, windowMs, message }) {
  return (req, res, next) => {
    const now = Date.now();
    const key = `${req.baseUrl}:${req.ip || req.socket.remoteAddress || 'unknown'}`;
    let bucket = clients.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      clients.set(key, bucket);
    }

    bucket.count += 1;
    const remaining = Math.max(0, limit - bucket.count);
    res.set('RateLimit-Limit', String(limit));
    res.set('RateLimit-Remaining', String(remaining));
    res.set('RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));
    if (bucket.count > limit) {
      return res.status(429).json({ success: false, message });
    }
    return next();
  };
}

module.exports = { rateLimit };
