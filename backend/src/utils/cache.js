import getRedis from '../config/redis.js';

export const cache = {
  async get(key) {
    try {
      const redis = getRedis();
      const val = await redis.get(key);
      return val ? JSON.parse(val) : null;
    } catch {
      return null;
    }
  },

  async set(key, value, ttlSeconds) {
    try {
      const redis = getRedis();
      await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
      // Cache failures are silent — app continues without cache
    }
  },

  async del(key) {
    try {
      const redis = getRedis();
      await redis.del(key);
    } catch {
      // Silent failure
    }
  },

  async invalidateDashboard() {
    try {
      const redis = getRedis();
      const keys = await redis.keys('dashboard:*');
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch {
      // Silent failure
    }
  },
};