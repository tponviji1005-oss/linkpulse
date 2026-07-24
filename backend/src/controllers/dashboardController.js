const prisma = require("../config/prisma");

const getDashboardSummary = async (req, res, next) => {
  try {
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
        createdAt: true,
      },
    });

    res.status(200).json({
      totalLinks,
      activeLinks,
      inactiveLinks,
      totalClicks,
      recentLinks,
    });
  } catch (error) {
    next(error);
  }
};

const getTopLinks = async (req, res, next) => {
  try {
    const links = await prisma.link.findMany({
      where: { userId: req.user.userId },
      select: {
        id: true,
        shortCode: true,
        title: true,
        originalUrl: true,
        isActive: true,
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
      createdAt: link.createdAt,
      clickCount: link._count.clicks,
    }));

    res.status(200).json({ topLinks });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboardSummary, getTopLinks };
