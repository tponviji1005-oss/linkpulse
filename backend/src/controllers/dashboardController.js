const prisma = require("../config/prisma");
const { getCache, setCache } = require("../utils/cache");
const { dashboardSummaryKey, topLinksKey } = require("../utils/cacheKeys");

const DASHBOARD_CACHE_TTL = 60;

const getDashboardSummary = async (req, res, next) => {
  try {
    const cacheKey = dashboardSummaryKey(req.user.userId);
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    const links = await prisma.link.findMany({
      where: { userId: req.user.userId },
      select: { id: true, isActive: true },
    });

    const totalLinks = links.length;
    const activeLinks = links.filter((l) => l.isActive).length;
    const inactiveLinks = totalLinks - activeLinks;

    let totalClicks = 0;

    if (links.length > 0) {
      const linkIds = links.map((l) => l.id);
      const clicks = await prisma.click.findMany({
        where: { linkId: { in: linkIds } },
        select: { id: true },
      });
      totalClicks = clicks.length;
    }

    const recentLinks = await prisma.link.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: "desc" },
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
      },
    });

    const payload = {
      totalLinks,
      activeLinks,
      inactiveLinks,
      totalClicks,
      recentLinks: recentLinks.map((l) => ({
        ...l,
        hasPassword: !!l.passwordHash,
        passwordHash: undefined,
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
        clicks: { _count: "desc" },
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
