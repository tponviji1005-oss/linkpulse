const analyticsRepository = require("../repositories/analyticsRepository");
const { buildClickData, logClick, isDev, getDateRange } = require("../helpers/analyticsHelper");
const { classifyReferrer } = require("../utils/referrerParser");
const { getCache, setCache } = require("../utils/cache");
const { analyticsKey } = require("../utils/cacheKeys");

const ANALYTICS_CACHE_TTL = 60;

async function recordClick({ linkId, req }) {
  const clickData = buildClickData({ linkId, req });

  const click = await analyticsRepository.createClick(clickData);

  logClick(clickData);

  return click;
}

async function getCachedOrCompute(cacheKey, computeFn) {
  const cached = await getCache(cacheKey);
  if (cached) {
    if (isDev()) console.log(`Analytics Cache HIT — ${cacheKey}`);
    return cached;
  }
  if (isDev()) console.log(`Analytics Cache MISS — ${cacheKey}`);
  const result = await computeFn();
  await setCache(cacheKey, result, ANALYTICS_CACHE_TTL);
  if (isDev()) console.log(`Analytics Generated — ${cacheKey}`);
  return result;
}

async function getOverview({ linkId, period }) {
  const cacheKey = analyticsKey(linkId, `overview:${period}`);

  return getCachedOrCompute(cacheKey, async () => {
    const { start, end } = getDateRange(period);
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const monthStart = new Date(now);
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [
      totalClicks,
      uniqueVisitors,
      todayClicks,
      thisWeekClicks,
      thisMonthClicks,
      browserBreakdown,
      deviceBreakdown,
      referrerData,
    ] = await Promise.all([
      analyticsRepository.countClicksByRange(linkId, start, end),
      analyticsRepository.getUniqueVisitors(linkId, start, end),
      analyticsRepository.countClicksByRange(linkId, todayStart, now),
      analyticsRepository.countClicksByRange(linkId, weekStart, now),
      analyticsRepository.countClicksByRange(linkId, monthStart, now),
      analyticsRepository.getFieldBreakdown(linkId, "browser", start, end),
      analyticsRepository.getFieldBreakdown(linkId, "device", start, end),
      analyticsRepository.getClickFields(linkId, ["referer"], start, end),
    ]);

    const countryBreakdown = await analyticsRepository.getFieldBreakdown(linkId, "country", start, end);

    const referrerCounts = {};
    for (const row of referrerData) {
      const type = classifyReferrer(row.referer);
      referrerCounts[type] = (referrerCounts[type] || 0) + 1;
    }
    const referrerBreakdown = Object.entries(referrerCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalClicks,
      uniqueVisitors,
      todayClicks,
      thisWeekClicks,
      thisMonthClicks,
      topCountry: countryBreakdown.length > 0 ? countryBreakdown[0].name : null,
      topBrowser: browserBreakdown.length > 0 ? browserBreakdown[0].name : null,
      topDevice: deviceBreakdown.length > 0 ? deviceBreakdown[0].name : null,
      topReferrer: referrerBreakdown.length > 0 ? referrerBreakdown[0].name : "Direct",
    };
  });
}

async function getTimeline({ linkId, period }) {
  const cacheKey = analyticsKey(linkId, `timeline:${period}`);

  return getCachedOrCompute(cacheKey, async () => {
    const { start, end } = getDateRange(period);
    return analyticsRepository.getDailyTimeline(linkId, start, end);
  });
}

async function getDeviceBreakdown({ linkId, period }) {
  const cacheKey = analyticsKey(linkId, `devices:${period}`);

  return getCachedOrCompute(cacheKey, async () => {
    const { start, end } = getDateRange(period);
    return analyticsRepository.getFieldBreakdown(linkId, "device", start, end);
  });
}

async function getBrowserBreakdown({ linkId, period }) {
  const cacheKey = analyticsKey(linkId, `browsers:${period}`);

  return getCachedOrCompute(cacheKey, async () => {
    const { start, end } = getDateRange(period);
    return analyticsRepository.getFieldBreakdown(linkId, "browser", start, end);
  });
}

async function getOSBreakdown({ linkId, period }) {
  const cacheKey = analyticsKey(linkId, `os:${period}`);

  return getCachedOrCompute(cacheKey, async () => {
    const { start, end } = getDateRange(period);
    return analyticsRepository.getFieldBreakdown(linkId, "os", start, end);
  });
}

async function getReferrerBreakdown({ linkId, period }) {
  const cacheKey = analyticsKey(linkId, `referrers:${period}`);

  return getCachedOrCompute(cacheKey, async () => {
    const { start, end } = getDateRange(period);
    const referrerData = await analyticsRepository.getClickFields(linkId, ["referer"], start, end);

    const counts = {};
    for (const row of referrerData) {
      const type = classifyReferrer(row.referer);
      counts[type] = (counts[type] || 0) + 1;
    }

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  });
}

module.exports = {
  recordClick,
  getOverview,
  getTimeline,
  getDeviceBreakdown,
  getBrowserBreakdown,
  getOSBreakdown,
  getReferrerBreakdown,
};
