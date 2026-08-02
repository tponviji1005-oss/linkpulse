const { getCache, setCache, invalidateCache } = require('../utils/cache');
const { redirectCacheKey } = require('../utils/cacheKeys');
const { isDev } = require('../helpers/analyticsHelper');

const REDIRECT_CACHE_TTL = 3600;

async function getCachedLink(shortCode) {
  const key = redirectCacheKey(shortCode);
  const data = await getCache(key);
  if (data) {
    if (isDev()) console.log(`Redis Cache HIT — ${key}`);
    return data;
  }
  if (isDev()) console.log(`Redis Cache MISS — ${key}`);
  return null;
}

async function setCachedLink(shortCode, data) {
  const key = redirectCacheKey(shortCode);
  await setCache(key, data, REDIRECT_CACHE_TTL);
  if (isDev()) console.log(`Redis Cache SET — ${key}`);
}

async function deleteCachedLink(shortCode) {
  const key = redirectCacheKey(shortCode);
  await invalidateCache(key);
  if (isDev()) console.log(`Redis Cache DELETE — ${key}`);
}

module.exports = {
  getCachedLink,
  setCachedLink,
  deleteCachedLink,
};
