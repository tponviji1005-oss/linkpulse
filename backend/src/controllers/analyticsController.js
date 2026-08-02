const prisma = require('../config/prisma');
const { getCache, setCache, invalidateCache } = require('../utils/cache');
const { analyticsKey } = require('../utils/cacheKeys');
const { isValidUUID } = require('../utils/uuid');
const { calculateHealthScore } = require('../utils/healthScore');
const { generateRecommendations } = require('../utils/recommendationEngine');
const { generatePrediction } = require('../utils/predictionEngine');
const { generateDashboardSummary } = require('../utils/dashboardSummary');
const { generateTrafficInsights } = require('../utils/trafficInsights');
const { calculateOptimizationScore } = require('../utils/optimizationScore');
const analyticsService = require('../services/analyticsService');
const { getDateRange } = require('../helpers/analyticsHelper');

const ANALYTICS_CACHE_TTL = 120;

function getReferrerHostname(referer) {
  if (!referer) return 'Direct';

  try {
    const url = new URL(referer);
    return url.hostname || 'Direct';
  } catch {
    return 'Unknown';
  }
}

function getTopFromBreakdown(breakdown, total) {
  const entries = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return { top: null, share: 0 };
  const [top, count] = entries[0];
  return { top, share: total > 0 ? (count / total) * 100 : 0 };
}

async function verifyLinkOwnership(linkId, userId) {
  const link = await prisma.link.findFirst({
    where: { id: linkId, userId },
    select: { id: true },
  });
  return link;
}

const getAdvancedAnalytics = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) {
      return res.status(400).json({ error: 'Invalid link ID format' });
    }

    const period = req.query.period || 'all';

    const link = await prisma.link.findFirst({
      where: { id, userId: req.user.userId },
      select: { id: true, shortCode: true, originalUrl: true, title: true, passwordHash: true, isActive: true, expiresAt: true, isFlagged: true, maxClicks: true },
    });

    if (!link) {
      return res.status(404).json({ error: 'Link not found' });
    }

    const cacheKey = analyticsKey(id, period);
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    const { start, end } = getDateRange(period);

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);

    const [clicks, recent7dRealClicks] = await Promise.all([
      prisma.click.findMany({
        where: {
          linkId: id,
          createdAt: { gte: start, lte: end },
        },
        select: {
          ipAddress: true,
          browser: true,
          os: true,
          device: true,
          referer: true,
          country: true,
          redirectType: true,
          abVariantLabel: true,
          isBot: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.click.count({
        where: {
          linkId: id,
          isBot: false,
          createdAt: { gte: weekStart },
        },
      }),
    ]);

    const totalClicks = clicks.length;
    const uniqueIps = new Set();

    const browserBreakdown = {};
    const osBreakdown = {};
    const deviceBreakdown = {};
    const referrerBreakdown = {};
    const countryBreakdown = {};
    const redirectTypeBreakdown = {};
    const abVariantBreakdown = {};
    const dailyTrend = {};
    const weeklyTrend = {};
    const monthlyTrend = {};
    const hourlyDistribution = {};
    let botClicks = 0;
    let humanClicks = 0;

    for (const click of clicks) {
      if (click.isBot) {
        botClicks++;
        continue;
      }
      humanClicks++;

      uniqueIps.add(click.ipAddress);

      const browserName = click.browser || 'Unknown';
      browserBreakdown[browserName] = (browserBreakdown[browserName] || 0) + 1;

      const osName = click.os || 'Unknown';
      osBreakdown[osName] = (osBreakdown[osName] || 0) + 1;

      const deviceType = click.device || 'Unknown';
      deviceBreakdown[deviceType] = (deviceBreakdown[deviceType] || 0) + 1;

      const referrer = getReferrerHostname(click.referer);
      referrerBreakdown[referrer] = (referrerBreakdown[referrer] || 0) + 1;

      if (click.country) {
        countryBreakdown[click.country] = (countryBreakdown[click.country] || 0) + 1;
      }

      const redirectType = click.redirectType || 'default';
      redirectTypeBreakdown[redirectType] = (redirectTypeBreakdown[redirectType] || 0) + 1;

      if (click.abVariantLabel) {
        abVariantBreakdown[click.abVariantLabel] = (abVariantBreakdown[click.abVariantLabel] || 0) + 1;
      }

      const date = click.createdAt.toISOString().split('T')[0];
      dailyTrend[date] = (dailyTrend[date] || 0) + 1;

      const weekStart = new Date(click.createdAt);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      weeklyTrend[weekKey] = (weeklyTrend[weekKey] || 0) + 1;

      const monthKey = date.substring(0, 7);
      monthlyTrend[monthKey] = (monthlyTrend[monthKey] || 0) + 1;

      const hour = click.createdAt.getHours();
      hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
    }

    const uniqueClicks = uniqueIps.size;
    const realClicks = humanClicks;

    const { healthScore, healthLabel } = calculateHealthScore({
      totalClicks,
      realClicks,
      isFlagged: link.isFlagged,
      recentRealClicks: recent7dRealClicks,
      uniqueVisitors: uniqueClicks,
    });

    const hasPassword = !!link.passwordHash;
    const protectedClicks = hasPassword ? totalClicks : 0;
    const publicClicks = hasPassword ? 0 : totalClicks;

    const isActive = link.isActive;
    const isExpired = link.expiresAt && new Date(link.expiresAt) < new Date();
    const activeClicks = isActive && !isExpired ? totalClicks : 0;
    const expiredClicks = isExpired ? totalClicks : 0;

    const dailyTrendArray = Object.entries(dailyTrend)
      .map(([date, clicks]) => ({ date, clicks }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const weeklyTrendArray = Object.entries(weeklyTrend)
      .map(([date, clicks]) => ({ date, clicks }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const monthlyTrendArray = Object.entries(monthlyTrend)
      .map(([month, clicks]) => ({ month, clicks }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const hourlyArray = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      clicks: hourlyDistribution[i] || 0,
    }));

    const sortByValue = (obj) =>
      Object.entries(obj)
        .sort((a, b) => b[1] - a[1])
        .reduce((acc, [k, v]) => { acc[k] = v; return acc; }, {});

    const topCountryInfo = getTopFromBreakdown(countryBreakdown, realClicks);
    const topDeviceInfo = getTopFromBreakdown(deviceBreakdown, realClicks);
    const topBrowserInfo = getTopFromBreakdown(browserBreakdown, realClicks);
    const topReferrerInfo = getTopFromBreakdown(referrerBreakdown, realClicks);

    const { summary, recommendations } = generateRecommendations({
      healthScore,
      healthLabel,
      totalClicks,
      realClicks,
      botClicks,
      uniqueVisitors: uniqueClicks,
      topCountry: topCountryInfo.top,
      topCountryShare: topCountryInfo.share,
      topDevice: topDeviceInfo.top,
      topBrowser: topBrowserInfo.top,
      topBrowserShare: topBrowserInfo.share,
      topReferrer: topReferrerInfo.top,
      hourlyDistribution: hourlyArray,
      dailyTrend: dailyTrendArray,
      isFlagged: link.isFlagged,
      expiresAt: link.expiresAt,
      maxClicks: link.maxClicks,
      hasPassword,
    });

    const prediction = generatePrediction({ dailyTrend: dailyTrendArray });

    const dashboardSummary = generateDashboardSummary({
      healthScore,
      healthLabel,
      prediction,
      summary,
      recommendations,
      totalClicks,
      realClicks,
      botClicks,
      uniqueVisitors: uniqueClicks,
      isFlagged: link.isFlagged,
    });

    const trafficInsights = generateTrafficInsights({
      browserBreakdown: sortByValue(browserBreakdown),
      deviceBreakdown: sortByValue(deviceBreakdown),
      countryBreakdown: sortByValue(countryBreakdown),
      referrerBreakdown: sortByValue(referrerBreakdown),
      dailyTrend: dailyTrendArray,
      hourlyDistribution: hourlyArray,
    });

    const optimization = calculateOptimizationScore({
      healthScore,
      realClickPercentage: totalClicks > 0 ? (realClicks / totalClicks) * 100 : 0,
      uniqueVisitors: uniqueClicks,
      isFlagged: link.isFlagged,
      prediction,
      topReferrer: topReferrerInfo.top,
      topDevice: topDeviceInfo.top,
      topBrowser: topBrowserInfo.top,
    });

    const result = {
      link: {
        id: link.id,
        shortCode: link.shortCode,
        originalUrl: link.originalUrl,
        title: link.title,
        isActive: link.isActive,
        hasPassword,
        isFlagged: link.isFlagged,
        expiresAt: link.expiresAt,
      },
      period,
      totalClicks,
      uniqueClicks,
      dailyTrend: dailyTrendArray,
      weeklyTrend: weeklyTrendArray,
      monthlyTrend: monthlyTrendArray,
      hourlyDistribution: hourlyArray,
      browserBreakdown: sortByValue(browserBreakdown),
      osBreakdown: sortByValue(osBreakdown),
      deviceBreakdown: sortByValue(deviceBreakdown),
      referrerBreakdown: sortByValue(referrerBreakdown),
      countryBreakdown: sortByValue(countryBreakdown),
      redirectTypeBreakdown: sortByValue(redirectTypeBreakdown),
      abVariantBreakdown: sortByValue(abVariantBreakdown),
      botClicks,
      humanClicks,
      realClicks,
      protectedClicks,
      publicClicks,
      activeClicks,
      expiredClicks,
      healthScore,
      healthLabel,
      summary,
      recommendations,
      prediction,
      dashboardSummary,
      trafficInsights,
      optimization,
    };

    await setCache(cacheKey, result, ANALYTICS_CACHE_TTL);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const invalidateLinkAnalytics = async (linkId) => {
  const periods = ['today', '7d', '30d', '90d', 'all'];
  const keys = periods.map((p) => analyticsKey(linkId, p));
  await invalidateCache(...keys);
};

async function getOverview(req, res, next) {
  try {
    if (!isValidUUID(req.params.linkId)) {
      return res.status(400).json({ error: 'Invalid link ID format' });
    }

    const link = await verifyLinkOwnership(req.params.linkId, req.user.userId);
    if (!link) return res.status(404).json({ error: "Link not found" });

    const period = req.query.period || "all";
    const data = await analyticsService.getOverview({ linkId: req.params.linkId, period });
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
}

async function getTimeline(req, res, next) {
  try {
    if (!isValidUUID(req.params.linkId)) {
      return res.status(400).json({ error: 'Invalid link ID format' });
    }

    const link = await verifyLinkOwnership(req.params.linkId, req.user.userId);
    if (!link) return res.status(404).json({ error: "Link not found" });

    const period = req.query.period || "7d";
    const data = await analyticsService.getTimeline({ linkId: req.params.linkId, period });
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
}

async function getDevices(req, res, next) {
  try {
    if (!isValidUUID(req.params.linkId)) {
      return res.status(400).json({ error: 'Invalid link ID format' });
    }

    const link = await verifyLinkOwnership(req.params.linkId, req.user.userId);
    if (!link) return res.status(404).json({ error: "Link not found" });

    const period = req.query.period || "all";
    const data = await analyticsService.getDeviceBreakdown({ linkId: req.params.linkId, period });
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
}

async function getBrowsers(req, res, next) {
  try {
    if (!isValidUUID(req.params.linkId)) {
      return res.status(400).json({ error: 'Invalid link ID format' });
    }

    const link = await verifyLinkOwnership(req.params.linkId, req.user.userId);
    if (!link) return res.status(404).json({ error: "Link not found" });

    const period = req.query.period || "all";
    const data = await analyticsService.getBrowserBreakdown({ linkId: req.params.linkId, period });
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
}

async function getOS(req, res, next) {
  try {
    if (!isValidUUID(req.params.linkId)) {
      return res.status(400).json({ error: 'Invalid link ID format' });
    }

    const link = await verifyLinkOwnership(req.params.linkId, req.user.userId);
    if (!link) return res.status(404).json({ error: "Link not found" });

    const period = req.query.period || "all";
    const data = await analyticsService.getOSBreakdown({ linkId: req.params.linkId, period });
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
}

async function getReferrers(req, res, next) {
  try {
    if (!isValidUUID(req.params.linkId)) {
      return res.status(400).json({ error: 'Invalid link ID format' });
    }

    const link = await verifyLinkOwnership(req.params.linkId, req.user.userId);
    if (!link) return res.status(404).json({ error: "Link not found" });

    const period = req.query.period || "all";
    const data = await analyticsService.getReferrerBreakdown({ linkId: req.params.linkId, period });
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
}

module.exports = { getAdvancedAnalytics, invalidateLinkAnalytics, getOverview, getTimeline, getDevices, getBrowsers, getOS, getReferrers };
