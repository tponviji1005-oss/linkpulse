const redis = require("../config/redis");

const getCache = async (key) => {
  if (!redis) return null;

  try {
    const data = await redis.get(key);
    if (!data) return null;
    return JSON.parse(data);
  } catch (err) {
    console.warn(`Cache GET error for key "${key}": ${err.message}`);
    return null;
  }
};

const setCache = async (key, value, ttlSeconds) => {
  if (!redis) return;

  try {
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      await redis.setex(key, ttlSeconds, serialized);
    } else {
      await redis.set(key, serialized);
    }
  } catch (err) {
    console.warn(`Cache SET error for key "${key}": ${err.message}`);
  }
};

const invalidateCache = async (...keys) => {
  if (!redis || keys.length === 0) return;

  try {
    await redis.del(...keys);
  } catch (err) {
    console.warn(`Cache DEL error: ${err.message}`);
  }
};

module.exports = { getCache, setCache, invalidateCache };
