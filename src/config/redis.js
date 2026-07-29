const Redis = require('ioredis');
const logger = require('../utils/logger');

const memoryStore = new Map();
let isRedisConnected = false;

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  lazyConnect: true,
  maxRetriesPerRequest: 1
});

redis.on('connect', () => {
  isRedisConnected = true;
  logger.info('Connected to Redis Cache');
});

redis.on('error', (err) => {
  isRedisConnected = false;
  logger.warn('Redis unavailable, using in-memory store fallback:', err.message);
});

redis.connect().catch(() => {});

const cache = {
  get: async (key) => {
    if (isRedisConnected) {
      try {
        const val = await redis.get(key);
        return val ? JSON.parse(val) : null;
      } catch (err) {
        logger.error('Redis GET error:', err.message);
      }
    }
    const item = memoryStore.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      memoryStore.delete(key);
      return null;
    }
    return item.value;
  },

  set: async (key, value, ttlSeconds = 300) => {
    if (isRedisConnected) {
      try {
        await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
        return;
      } catch (err) {
        logger.error('Redis SET error:', err.message);
      }
    }
    memoryStore.set(key, {
      value,
      expiry: Date.now() + ttlSeconds * 1000
    });
  },

  del: async (key) => {
    if (isRedisConnected) {
      try {
        await redis.del(key);
      } catch (err) {}
    }
    memoryStore.delete(key);
  }
};

module.exports = cache;
