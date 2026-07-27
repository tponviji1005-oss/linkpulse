const QRCode = require('qrcode');
const bcrypt = require('bcrypt');
const { nanoid } = require('nanoid');
const validator = require('validator');
const UAParser = require('ua-parser-js');
const prisma = require('../config/prisma');
const { getCache, setCache, invalidateCache } = require('../utils/cache');
const { redirectKey, dashboardSummaryKey, topLinksKey } = require('../utils/cacheKeys');
const { isBot } = require('../utils/botDetection');
const { parsePagination, paginateResponse } = require('../utils/pagination');
const { invalidateLinkAnalytics } = require('./analyticsController');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const SELECT_LINK_FIELDS = {
  id: true,
  shortCode: true,
  originalUrl: true,
  title: true,
  isActive: true,
  expiresAt: true,
  createdAt: true,
};

function stripPasswordHash(link) {
  if (!link) return link;
  const { passwordHash, ...rest } = link;
  return { ...rest, hasPassword: !!passwordHash };
}

const createLink = async (req, res, next) => {
  try {
    const { originalUrl, title, expiresAt, password } = req.body;

    if (!originalUrl) {
      return res.status(400).json({ error: 'originalUrl is required' });
    }

    if (!validator.isURL(originalUrl)) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    if (expiresAt) {
      const expiryDate = new Date(expiresAt);
      if (isNaN(expiryDate.getTime())) {
        return res.status(400).json({ error: 'Invalid expiration date' });
      }
      if (expiryDate <= new Date()) {
        return res.status(400).json({ error: 'Expiration must be in the future' });
      }
    }

    let passwordHash = null;
    if (password) {
      if (typeof password !== 'string' || password.length < 1) {
        return res.status(400).json({ error: 'Password cannot be empty' });
      }
      passwordHash = await bcrypt.hash(password, 10);
    }

    const shortCode = nanoid(8);

    const link = await prisma.link.create({
      data: {
        originalUrl,
        shortCode,
        title: title || null,
        userId: req.user.userId,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        passwordHash,
      },
      select: SELECT_LINK_FIELDS,
    });

    res.status(201).json({
      message: 'Short link created successfully',
      link: stripPasswordHash(link),
    });

    await invalidateCache(dashboardSummaryKey(req.user.userId), topLinksKey(req.user.userId));
  } catch (error) {
    next(error);
  }
};

const getMyLinks = async (req, res, next) => {
  try {
    const { search, status, sort, page, limit } = req.query;
    const pagination = parsePagination({ page, limit });

    const where = { userId: req.user.userId };

    if (search) {
      where.OR = [
        { originalUrl: { contains: search, mode: 'insensitive' } },
        { shortCode: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    } else if (status === 'protected') {
      where.passwordHash = { not: null };
    } else if (status === 'public') {
      where.passwordHash = null;
    } else if (status === 'expired') {
      where.expiresAt = { lt: new Date() };
    }

    let orderBy = { createdAt: 'desc' };
    if (sort === 'oldest') orderBy = { createdAt: 'asc' };
    else if (sort === 'most_clicked') orderBy = { clicks: { _count: 'desc' } };
    else if (sort === 'least_clicked') orderBy = { clicks: { _count: 'asc' } };

    const [links, total] = await Promise.all([
      prisma.link.findMany({
        where,
        orderBy,
        skip: pagination.skip,
        take: pagination.limit,
        select: {
          ...SELECT_LINK_FIELDS,
          passwordHash: true,
          _count: { select: { clicks: true } },
        },
      }),
      prisma.link.count({ where }),
    ]);

    res.status(200).json(
      paginateResponse(
        links.map(stripPasswordHash),
        total,
        pagination.page,
        pagination.limit,
      ),
    );
  } catch (error) {
    next(error);
  }
};

const getLink = async (req, res, next) => {
  try {
    const link = await prisma.link.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.userId,
      },
      select: {
        ...SELECT_LINK_FIELDS,
        updatedAt: true,
        passwordHash: true,
      },
    });

    if (!link) {
      return res.status(404).json({ error: 'Link not found' });
    }

    res.status(200).json({ link: stripPasswordHash(link) });
  } catch (error) {
    next(error);
  }
};

const updateLink = async (req, res, next) => {
  try {
    const { originalUrl, title, isActive, expiresAt, password } = req.body;

    const existing = await prisma.link.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.userId,
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Link not found' });
    }

    const data = {};

    if (originalUrl !== undefined) {
      if (!validator.isURL(originalUrl)) {
        return res.status(400).json({ error: 'Invalid URL format' });
      }
      data.originalUrl = originalUrl;
    }

    if (title !== undefined) {
      if (typeof title !== 'string') {
        return res.status(400).json({ error: 'title must be a string' });
      }
      data.title = title;
    }

    if (isActive !== undefined) {
      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ error: 'isActive must be a boolean' });
      }
      data.isActive = isActive;
    }

    if (expiresAt !== undefined) {
      if (expiresAt === null || expiresAt === '') {
        data.expiresAt = null;
      } else {
        const expiryDate = new Date(expiresAt);
        if (isNaN(expiryDate.getTime())) {
          return res.status(400).json({ error: 'Invalid expiration date' });
        }
        if (expiryDate <= new Date()) {
          return res.status(400).json({ error: 'Expiration must be in the future' });
        }
        data.expiresAt = expiryDate;
      }
    }

    if (password !== undefined) {
      if (password === null || password === '') {
        data.passwordHash = null;
      } else {
        if (typeof password !== 'string' || password.length < 1) {
          return res.status(400).json({ error: 'Password cannot be empty' });
        }
        data.passwordHash = await bcrypt.hash(password, 10);
      }
    }

    const link = await prisma.link.update({
      where: { id: existing.id },
      data,
      select: {
        ...SELECT_LINK_FIELDS,
        updatedAt: true,
        passwordHash: true,
      },
    });

    await invalidateCache(redirectKey(existing.shortCode));

    res.status(200).json({ message: 'Link updated successfully', link: stripPasswordHash(link) });

    await invalidateCache(dashboardSummaryKey(req.user.userId), topLinksKey(req.user.userId));
  } catch (error) {
    next(error);
  }
};

const deleteLink = async (req, res, next) => {
  try {
    const existing = await prisma.link.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.userId,
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Link not found' });
    }

    await prisma.click.deleteMany({ where: { linkId: existing.id } });
    await prisma.link.delete({ where: { id: existing.id } });

    await invalidateCache(redirectKey(existing.shortCode));
    await invalidateLinkAnalytics(existing.id);

    res.status(200).json({ message: 'Link deleted successfully' });

    await invalidateCache(dashboardSummaryKey(req.user.userId), topLinksKey(req.user.userId));
  } catch (error) {
    next(error);
  }
};

const REDIRECT_CACHE_TTL = 3600;

const redirectLink = async (req, res, next) => {
  try {
    const { shortCode } = req.params;
    const cacheRedisKey = redirectKey(shortCode);

    let link = await getCache(cacheRedisKey);

    if (!link) {
      link = await prisma.link.findFirst({
        where: {
          shortCode,
          isActive: true,
        },
        select: {
          id: true,
          shortCode: true,
          originalUrl: true,
          expiresAt: true,
          passwordHash: true,
        },
      });

      if (link && !link.passwordHash && !link.expiresAt) {
        await setCache(cacheRedisKey, link, REDIRECT_CACHE_TTL);
      }
    }

    if (!link) {
      return res.status(404).json({ error: 'Short link not found' });
    }

    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      return res.status(410).json({ error: 'This link has expired.' });
    }

    if (link.passwordHash) {
      return res.redirect(
        `${FRONTEND_URL}/password-gate/${link.id}?shortCode=${encodeURIComponent(link.shortCode)}`,
      );
    }

    const parser = new UAParser(req.headers['user-agent']);
    const { browser, os, device } = parser.getResult();
    const browserName = browser.name || null;
    const osName = os.name || null;
    const deviceType = device.type || 'desktop';

    const userAgent = req.get('user-agent') || null;

    const clickData = {
      linkId: link.id,
      ipAddress: req.ip,
      browser: browserName,
      os: osName,
      device: deviceType,
      referer: req.get('referer') || null,
      userAgent,
      isBot: isBot(userAgent),
    };

    try {
      await prisma.click.create({ data: clickData });
    } catch {
      return res.status(500).json({ error: 'Failed to record click' });
    }

    res.redirect(link.originalUrl);
  } catch (error) {
    next(error);
  }
};

const verifyPassword = async (req, res, next) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const link = await prisma.link.findFirst({
      where: { id: req.params.id },
      select: {
        id: true,
        originalUrl: true,
        isActive: true,
        passwordHash: true,
        expiresAt: true,
      },
    });

    if (!link) {
      return res.status(404).json({ error: 'Link not found' });
    }

    if (!link.isActive) {
      return res.status(404).json({ error: 'Link not found' });
    }

    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      return res.status(410).json({ error: 'This link has expired.' });
    }

    if (!link.passwordHash) {
      return res.status(400).json({ error: 'This link does not require a password' });
    }

    const match = await bcrypt.compare(password, link.passwordHash);

    if (!match) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    res.status(200).json({ success: true, redirectUrl: link.originalUrl });
  } catch (error) {
    next(error);
  }
};

const getLinkAnalytics = async (req, res, next) => {
  try {
    const existing = await prisma.link.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.userId,
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Link not found' });
    }

    const clicks = await prisma.click.findMany({
      where: { linkId: existing.id },
      select: {
        browser: true,
        device: true,
        os: true,
      },
    });

    const totalClicks = clicks.length;

    const browserBreakdown = {};
    const deviceBreakdown = {};
    const osBreakdown = {};

    for (const click of clicks) {
      const browserName = click.browser || 'Unknown';
      const deviceType = click.device || 'Unknown';
      const osName = click.os || 'Unknown';

      browserBreakdown[browserName] = (browserBreakdown[browserName] || 0) + 1;
      deviceBreakdown[deviceType] = (deviceBreakdown[deviceType] || 0) + 1;
      osBreakdown[osName] = (osBreakdown[osName] || 0) + 1;
    }

    res.status(200).json({
      totalClicks,
      browserBreakdown,
      deviceBreakdown,
      osBreakdown,
    });
  } catch (error) {
    next(error);
  }
};

const generateQRCode = async (req, res, next) => {
  try {
    const link = await prisma.link.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.userId,
      },
      select: {
        id: true,
        shortCode: true,
      },
    });

    if (!link) {
      return res.status(404).json({ error: 'Link not found' });
    }

    const shortUrl = `${req.protocol}://${req.get('host')}/${link.shortCode}`;
    const png = await QRCode.toBuffer(shortUrl, {
      type: 'png',
      width: 400,
      margin: 2,
      color: { dark: '#1a1a2e', light: '#ffffff' },
    });

    res.set('Content-Type', 'image/png');
    res.send(png);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createLink,
  getMyLinks,
  getLink,
  updateLink,
  deleteLink,
  redirectLink,
  verifyPassword,
  getLinkAnalytics,
  generateQRCode,
};
