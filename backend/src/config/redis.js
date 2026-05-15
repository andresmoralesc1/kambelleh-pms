import Redis from 'ioredis';

let redis = null;

const getRedis = () => {
  if (!redis) {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    redis = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) {
          console.warn('[redis] Max retries reached, continuing without Redis');
          return null;
        }
        return Math.min(times * 200, 2000);
      },
    });

    redis.on('error', (err) => {
      console.warn('[redis] Connection error:', err.message);
    });

    redis.on('connect', () => {
      console.log('[redis] Connected');
    });
  }
  return redis;
};

export const connectRedis = async () => {
  const client = getRedis();
  try {
    await client.connect();
  } catch (err) {
    if (err.message !== 'Redis is already connecting/connected') {
      console.warn('[redis] Could not connect:', err.message);
    }
  }
  return client;
};

export const disconnectRedis = async () => {
  if (redis) {
    await redis.quit();
    redis = null;
  }
};

export default getRedis;