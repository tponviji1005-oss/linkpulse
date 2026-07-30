const Redis = require("ioredis");

let client = null;

function createClient() {
  if (client) return client;

  const url = process.env.REDIS_URL;
  const host = process.env.REDIS_HOST;
  const port = parseInt(process.env.REDIS_PORT, 10) || 6379;
  const password = process.env.REDIS_PASSWORD;

  if (!url && !host) {
    console.warn("No Redis configuration found (REDIS_URL or REDIS_HOST) — caching disabled");
    return null;
  }

  const options = {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 10) return null;
      return Math.min(times * 200, 5000);
    },
    lazyConnect: true,
    enableReadyCheck: true,
    connectTimeout: 5000,
    commandTimeout: 3000,
  };

  if (password) options.password = password;

  try {
    client = url ? new Redis(url, options) : new Redis({ host, port, ...options });

    client.on("connect", () => {
      console.log("✓ Redis Connected");
    });

    client.on("reconnecting", () => {
      console.log("Redis Reconnecting...");
    });

    client.on("close", () => {
      console.log("Redis Disconnected");
    });

    client.on("error", (err) => {
      console.warn(`Redis Error: ${err.message}`);
    });
  } catch (err) {
    console.warn(`Failed to create Redis client: ${err.message}`);
    client = null;
  }

  return client;
}

async function connectRedis() {
  if (client && (client.status === "ready" || client.status === "connecting")) {
    return client;
  }

  if (!client) createClient();

  if (!client) return null;

  try {
    await client.connect();
    return client;
  } catch (err) {
    console.warn(`Redis connection failed: ${err.message} — caching disabled`);
    client = null;
    return null;
  }
}

async function disconnectRedis() {
  if (!client) return;
  const c = client;
  client = null;
  try {
    await c.quit();
  } catch {
    try {
      c.disconnect(false);
    } catch {
      // ignore
    }
  }
}

function isRedisConnected() {
  return client !== null && client.status === "ready";
}

function getRedisClient() {
  return client;
}

createClient();

module.exports = {
  connectRedis,
  disconnectRedis,
  isRedisConnected,
  getRedisClient,
};
