const logger = require('../utils/logger');

function createRateLimiter(limit = 100, windowMs = 60000) {
  const store = new Map();

  return (req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const key = `${req.path}_${ip}`;
    const now = Date.now();

    let client = store.get(key);

    if (!client || now > client.resetTime) {
      client = { count: 1, resetTime: now + windowMs };
    } else {
      client.count += 1;
    }

    store.set(key, client);

    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - client.count));

    if (client.count > limit) {
      logger.warn(`Rate limit exceeded for ${key}`);
      return res.status(429).json({
        status: 'fail',
        message: 'Too many requests, please try again later.'
      });
    }

    next();
  };
}

const trendingLimiter = createRateLimiter(60, 60000);
const sourcesLimiter = createRateLimiter(30, 60000);
const refreshLimiter = createRateLimiter(5, 60000);

module.exports = {
  createRateLimiter,
  trendingLimiter,
  sourcesLimiter,
  refreshLimiter
};
