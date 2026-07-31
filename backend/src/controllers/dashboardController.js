const prisma = require('../config/prisma');
const { getCache, setCache } = require('../utils/cache');
const { dashboardSummaryKey, topLinksKey } = require('../utils/cacheKeys');

const DASHBOARD_CACHE_TTL = 60;

const getDashboardSummary = async (req, res, next) => {
  try {
    const cacheKey = dashboardSummaryKey(req.user.userId);
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    const userId = req.user.userId;

    const [totalLinks, activeLinks, totalClicks, realClicks, botClicks, flaggedLinks, recentLinks] = await Promise.all([
      prisma.link.count({ where: { userId } }),
      prisma.link.count({ where: { userId, isActive: true } }),
      prisma.click.count({
        where: {
          link: { userId },
        },
      }),
      prisma.click.count({
        where: {
          link: { userId },
          isBot: false,
        },
      }),
      prisma.click.count({
        where: {
          link: { userId },
          isBot: true,
        },
      }),
      prisma.link.count({ where: { userId, isFlagged: true } }),
      prisma.link.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          shortCode: true,
          title: true,
          originalUrl: true,
          isActive: true,
          expiresAt: true,
          passwordHash: true,
          createdAt: true,
          _count: { select: { clicks: true } },
        },
      }),
    ]);

    const inactiveLinks = totalLinks - activeLinks;

    const payload = {
      totalLinks,
      activeLinks,
      inactiveLinks,
      totalClicks,
      realClicks,
      botClicks,
      flaggedLinks,
      recentLinks: recentLinks.map((l) => ({
        id: l.id,
        shortCode: l.shortCode,
        title: l.title,
        originalUrl: l.originalUrl,
        isActive: l.isActive,
        expiresAt: l.expiresAt,
        hasPassword: !!l.passwordHash,
        createdAt: l.createdAt,
        clickCount: l._count.clicks,
      })),
    };

    await setCache(cacheKey, payload, DASHBOARD_CACHE_TTL);

    res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
};

const getTopLinks = async (req, res, next) => {
  try {
    const cacheKey = topLinksKey(req.user.userId);
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    const links = await prisma.link.findMany({
      where: { userId: req.user.userId },
      select: {
        id: true,
        shortCode: true,
        title: true,
        originalUrl: true,
        isActive: true,
        expiresAt: true,
        passwordHash: true,
        createdAt: true,
        _count: {
          select: { clicks: true },
        },
      },
      orderBy: {
        clicks: { _count: 'desc' },
      },
      take: 5,
    });

    const topLinks = links.map((link) => ({
      id: link.id,
      shortCode: link.shortCode,
      title: link.title,
      originalUrl: link.originalUrl,
      isActive: link.isActive,
      expiresAt: link.expiresAt,
      hasPassword: !!link.passwordHash,
      createdAt: link.createdAt,
      clickCount: link._count.clicks,
    }));

    const payload = { topLinks };

    await setCache(cacheKey, payload, DASHBOARD_CACHE_TTL);

    res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboardSummary, getTopLinks };
