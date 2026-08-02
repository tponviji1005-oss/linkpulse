const redis = require('../config/redis');

function createRateLimiter(options = {}) {
  const windowMs = options.windowMs || 60 * 1000;
  const max = options.max || 100;
  const keyPrefix = options.keyPrefix || 'ratelimit';

  return async function rateLimiter(req, res, next) {
    if (!redis) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Redis unavailable — rate limiting bypassed');
      }
      return next();
    }

    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const windowKey = Math.floor(Date.now() / windowMs);
    const key = `${keyPrefix}:${ip}:${windowKey}`;

    try {
      const count = await redis.incr(key);

      if (count === 1) {
        await redis.expire(key, Math.ceil(windowMs / 1000));
      }

      if (process.env.NODE_ENV === 'development') {
        console.log(`Rate Limit HIT — ${ip} — ${count}/${max}`);
      }

      if (count > max) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`Rate Limit BLOCKED — ${ip} exceeded ${max}`);
        }
        return res.status(429).json({
          error: 'Too many requests. Please try again later.',
        });
      }

      next();
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Redis unavailable — rate limiting bypassed: ${err.message}`);
      }
      next();
    }
  };
}

module.exports = createRateLimiter;
