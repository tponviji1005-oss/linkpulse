const Redis = require("ioredis");

const REDIS_URL = process.env.REDIS_URL;

if (!REDIS_URL) {
  console.warn("REDIS_URL not set — Redis caching disabled");
}

const redis = REDIS_URL
  ? new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 10) return null;
        return Math.min(times * 200, 5000);
      },
      lazyConnect: true,
      enableReadyCheck: true,
      connectTimeout: 5000,
      commandTimeout: 3000,
    })
  : null;

if (redis) {
  redis.on("error", (err) => {
    console.warn(`Redis error: ${err.message}`);
  });

  redis.on("connect", () => {
    console.log("Redis connected");
  });

  redis.on("ready", () => {
    console.log("Redis ready");
  });
}

module.exports = redis;
