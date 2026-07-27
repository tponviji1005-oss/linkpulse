const prisma = require('../config/prisma');
const { getCache, setCache, invalidateCache } = require('../utils/cache');
const { analyticsKey } = require('../utils/cacheKeys');

const ANALYTICS_CACHE_TTL = 120;

function getDateRange(period) {
  const now = new Date();
  switch (period) {
    case 'today': {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return { start, end: now };
    }
    case '7d': {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      return { start, end: now };
    }
    case '30d': {
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      return { start, end: now };
    }
    case '90d': {
      const start = new Date(now);
      start.setDate(start.getDate() - 90);
      return { start, end: now };
    }
    case 'all':
    default:
      return { start: new Date(0), end: now };
  }
}

const getAdvancedAnalytics = async (req, res, next) => {
  try {
    const { id } = req.params;
    const period = req.query.period || 'all';

    const link = await prisma.link.findFirst({
      where: { id, userId: req.user.userId },
      select: { id: true, shortCode: true, originalUrl: true, title: true, passwordHash: true, isActive: true, expiresAt: true },
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

    const clicks = await prisma.click.findMany({
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
        isBot: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalClicks = clicks.length;
    const uniqueIps = new Set(clicks.map((c) => c.ipAddress).filter(Boolean));
    const uniqueClicks = uniqueIps.size;

    const browserBreakdown = {};
    const osBreakdown = {};
    const deviceBreakdown = {};
    const referrerBreakdown = {};
    const countryBreakdown = {};
    const dailyTrend = {};
    const weeklyTrend = {};
    const monthlyTrend = {};
    const hourlyDistribution = {};
    let botClicks = 0;
    let humanClicks = 0;

    for (const click of clicks) {
      const browserName = click.browser || 'Unknown';
      browserBreakdown[browserName] = (browserBreakdown[browserName] || 0) + 1;

      const osName = click.os || 'Unknown';
      osBreakdown[osName] = (osBreakdown[osName] || 0) + 1;

      const deviceType = click.device || 'Unknown';
      deviceBreakdown[deviceType] = (deviceBreakdown[deviceType] || 0) + 1;

      const referrer = click.referer ? new URL(click.referer).hostname : 'Direct';
      referrerBreakdown[referrer] = (referrerBreakdown[referrer] || 0) + 1;

      if (click.country) {
        countryBreakdown[click.country] = (countryBreakdown[click.country] || 0) + 1;
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

      if (click.isBot) {
        botClicks++;
      } else {
        humanClicks++;
      }
    }

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

    const result = {
      link: {
        id: link.id,
        shortCode: link.shortCode,
        originalUrl: link.originalUrl,
        title: link.title,
        isActive: link.isActive,
        hasPassword,
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
      botClicks,
      humanClicks,
      protectedClicks,
      publicClicks,
      activeClicks,
      expiredClicks,
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

module.exports = { getAdvancedAnalytics, invalidateLinkAnalytics };
