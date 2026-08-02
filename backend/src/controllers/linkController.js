const QRCode = require('qrcode');
const bcrypt = require('bcrypt');
const { nanoid } = require('nanoid');
const validator = require('validator');
const prisma = require('../config/prisma');
const { invalidateCache } = require('../utils/cache');
const { dashboardSummaryKey, topLinksKey } = require('../utils/cacheKeys');
const { getCachedLink, setCachedLink, deleteCachedLink } = require('../lib/redirectCache');
const { parsePagination, paginateResponse } = require('../utils/pagination');
const { isValidUUID } = require('../utils/uuid');
const { calculateHealthScore } = require('../utils/healthScore');
const { invalidateLinkAnalytics } = require('./analyticsController');
const { detectCountry, detectDeviceType, extractIPAddress } = require('../helpers/analyticsHelper');
const analyticsService = require('../services/analyticsService');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const logClickFailure = (linkId, error) => {
  const message = error && error.message ? error.message : String(error);
  console.error(`[ClickRecordingFailed] linkId=${linkId} error=${message}`);
};

const RESERVED_SHORT_CODES = [
  'api',
  'health',
  'login',
  'register',
  'dashboard',
  'auth',
  'links',
  'analytics',
  'bulk',
  'profile',
  'password-gate',
];

const CUSTOM_ALIAS_REGEX = /^[a-zA-Z0-9_-]+$/;

const parseMaxClicks = (value) => {
  if (value === undefined) return { valid: true, value: null };
  if (value === null || value === '') return { valid: true, value: null };
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) {
    return { valid: false, error: 'maxClicks must be a positive integer' };
  }
  return { valid: true, value: num };
};

const parseTitle = (value) => {
  if (value === undefined || value === null || value === '') {
    return { valid: true, value: value || null };
  }
  if (typeof value !== 'string') {
    return { valid: false, error: 'title must be a string' };
  }
  if (value.length > 255) {
    return { valid: false, error: 'title must be at most 255 characters' };
  }
  return { valid: true, value };
};

const MAX_SHORT_CODE_RETRIES = 5;

const COUNTRY_CODE_REGEX = /^[A-Za-z]{2}$/;

const DEVICE_TYPES = ['mobile', 'desktop', 'tablet'];

const AB_WEIGHT_TOTAL = 100;
const AB_MIN_VARIANTS = 2;

const SELECT_LINK_FIELDS = {
  id: true,
  shortCode: true,
  originalUrl: true,
  title: true,
  isActive: true,
  expiresAt: true,
  maxClicks: true,
  isFlagged: true,
  createdAt: true,
  passwordHash: true,
  geoRules: true,
  deviceRules: true,
  abVariants: true,
};

function stripPasswordHash(link) {
  if (!link) return link;
  const { passwordHash, ...rest } = link;
  return { ...rest, hasPassword: !!passwordHash };
}

const createLink = async (req, res, next) => {
  try {
    const { originalUrl, title, expiresAt, password, customAlias, maxClicks } = req.body;

    if (!originalUrl) {
      return res.status(400).json({ error: 'originalUrl is required' });
    }

    const maxClicksResult = parseMaxClicks(maxClicks);
    if (!maxClicksResult.valid) {
      return res.status(400).json({ error: maxClicksResult.error });
    }

    const titleResult = parseTitle(title);
    if (!titleResult.valid) {
      return res.status(400).json({ error: titleResult.error });
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

    let shortCode = null;

    const alias = customAlias ? String(customAlias).trim() : '';
    if (alias) {
      if (alias.length < 3 || alias.length > 20) {
        return res.status(400).json({ error: 'Custom alias must be between 3 and 20 characters' });
      }

      if (!CUSTOM_ALIAS_REGEX.test(alias)) {
        return res.status(400).json({ error: 'Custom alias can only contain letters, numbers, hyphens, and underscores' });
      }

      if (RESERVED_SHORT_CODES.includes(alias.toLowerCase())) {
        return res.status(400).json({ error: 'This alias is reserved and cannot be used' });
      }

      const existing = await prisma.link.findFirst({
        where: { shortCode: { equals: alias, mode: 'insensitive' } },
        select: { id: true },
      });

      if (existing) {
        return res.status(409).json({ error: 'This alias is already taken' });
      }

      shortCode = alias;
    }

    const linkData = {
      originalUrl,
      shortCode: null,
      title: titleResult.value,
      userId: req.user.userId,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      maxClicks: maxClicksResult.value,
      passwordHash,
    };

    let link;
    if (shortCode) {
      try {
        link = await prisma.link.create({
          data: { ...linkData, shortCode },
          select: SELECT_LINK_FIELDS,
        });
      } catch (error) {
        if (error.code === 'P2002') {
          return res.status(409).json({ error: 'This alias is already taken' });
        }
        throw error;
      }
    } else {
      for (let attempt = 0; attempt < MAX_SHORT_CODE_RETRIES; attempt++) {
        try {
          link = await prisma.link.create({
            data: { ...linkData, shortCode: nanoid(8) },
            select: SELECT_LINK_FIELDS,
          });
          break;
        } catch (error) {
          if (error.code !== 'P2002') {
            throw error;
          }
        }
      }
      if (!link) {
        return res.status(409).json({ error: 'Failed to generate a unique short code. Please try again.' });
      }
    }

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

    const ids = links.map((l) => l.id);

    const allTime = new Map();
    const recent7d = new Map();
    const uniqueVisitors = new Map();

    if (ids.length > 0) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);

      const [clickStats, recentStats, visitorStats] = await Promise.all([
        prisma.click.groupBy({
          by: ['linkId', 'isBot'],
          where: { linkId: { in: ids } },
          _count: { _all: true },
        }),
        prisma.click.groupBy({
          by: ['linkId'],
          where: { linkId: { in: ids }, isBot: false, createdAt: { gte: weekStart } },
          _count: { _all: true },
        }),
        prisma.click.groupBy({
          by: ['linkId', 'ipAddress'],
          where: { linkId: { in: ids }, isBot: false, ipAddress: { not: null } },
          _count: { _all: true },
        }),
      ]);

      for (const row of clickStats) {
        const entry = allTime.get(row.linkId) || { total: 0, real: 0 };
        entry.total += row._count._all;
        if (!row.isBot) entry.real += row._count._all;
        allTime.set(row.linkId, entry);
      }

      for (const row of recentStats) {
        recent7d.set(row.linkId, row._count._all);
      }

      for (const row of visitorStats) {
        uniqueVisitors.set(row.linkId, (uniqueVisitors.get(row.linkId) || 0) + 1);
      }
    }

    const enriched = links.map((link) => {
      const stats = allTime.get(link.id) || { total: 0, real: 0 };
      const { healthScore, healthLabel } = calculateHealthScore({
        totalClicks: stats.total,
        realClicks: stats.real,
        isFlagged: link.isFlagged,
        recentRealClicks: recent7d.get(link.id) || 0,
        uniqueVisitors: uniqueVisitors.get(link.id) || 0,
      });
      return { ...stripPasswordHash(link), healthScore, healthLabel };
    });

    res.status(200).json(
      paginateResponse(
        enriched,
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
    if (!isValidUUID(req.params.id)) {
      return res.status(400).json({ error: 'Invalid link ID format' });
    }

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
    if (!isValidUUID(req.params.id)) {
      return res.status(400).json({ error: 'Invalid link ID format' });
    }

    const { originalUrl, title, isActive, expiresAt, password, maxClicks } = req.body;

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
      if (title.length > 255) {
        return res.status(400).json({ error: 'title must be at most 255 characters' });
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

    if (maxClicks !== undefined) {
      const maxClicksResult = parseMaxClicks(maxClicks);
      if (!maxClicksResult.valid) {
        return res.status(400).json({ error: maxClicksResult.error });
      }
      data.maxClicks = maxClicksResult.value;
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

    await deleteCachedLink(existing.shortCode);

    res.status(200).json({ message: 'Link updated successfully', link: stripPasswordHash(link) });

    await invalidateCache(dashboardSummaryKey(req.user.userId), topLinksKey(req.user.userId));
  } catch (error) {
    next(error);
  }
};

const deleteLink = async (req, res, next) => {
  try {
    if (!isValidUUID(req.params.id)) {
      return res.status(400).json({ error: 'Invalid link ID format' });
    }

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

    await deleteCachedLink(existing.shortCode);
    await invalidateLinkAnalytics(existing.id);

    res.status(200).json({ message: 'Link deleted successfully' });

    await invalidateCache(dashboardSummaryKey(req.user.userId), topLinksKey(req.user.userId));
  } catch (error) {
    next(error);
  }
};

const updateGeoRules = async (req, res, next) => {
  try {
    if (!isValidUUID(req.params.id)) {
      return res.status(400).json({ error: 'Invalid link ID format' });
    }

    const existing = await prisma.link.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.userId,
      },
      select: {
        id: true,
        shortCode: true,
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Link not found' });
    }

    const { rules } = req.body;

    if (!Array.isArray(rules)) {
      return res.status(400).json({ error: 'rules must be an array of { countryCode, destinationUrl }' });
    }

    const seen = new Set();
    for (const rule of rules) {
      if (!rule || typeof rule.countryCode !== 'string' || !COUNTRY_CODE_REGEX.test(rule.countryCode.trim())) {
        return res.status(400).json({ error: 'Each rule needs a valid 2-letter ISO country code' });
      }
      const code = rule.countryCode.trim().toUpperCase();
      if (seen.has(code)) {
        return res.status(400).json({ error: `Duplicate country code: ${code}` });
      }
      seen.add(code);
      if (!rule.destinationUrl || !validator.isURL(rule.destinationUrl)) {
        return res.status(400).json({ error: `Invalid destination URL for country ${code}` });
      }
    }

    const normalized = rules.map((rule) => ({
      countryCode: rule.countryCode.trim().toUpperCase(),
      destinationUrl: rule.destinationUrl,
    }));

    await prisma.$transaction(async (tx) => {
      await tx.geoRule.deleteMany({ where: { linkId: existing.id } });
      if (normalized.length > 0) {
        await tx.geoRule.createMany({
          data: normalized.map((rule) => ({ ...rule, linkId: existing.id })),
        });
      }
    });

    await deleteCachedLink(existing.shortCode);

    res.status(200).json({ message: 'Geo rules updated', geoRules: normalized });
  } catch (error) {
    next(error);
  }
};

const updateDeviceRules = async (req, res, next) => {
  try {
    if (!isValidUUID(req.params.id)) {
      return res.status(400).json({ error: 'Invalid link ID format' });
    }

    const existing = await prisma.link.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.userId,
      },
      select: {
        id: true,
        shortCode: true,
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Link not found' });
    }

    const { rules } = req.body;

    if (!Array.isArray(rules)) {
      return res.status(400).json({ error: 'rules must be an array of { deviceType, destinationUrl }' });
    }

    const seen = new Set();
    for (const rule of rules) {
      if (!rule || typeof rule.deviceType !== 'string' || !DEVICE_TYPES.includes(rule.deviceType.trim().toLowerCase())) {
        return res.status(400).json({ error: 'Each rule needs a valid deviceType: mobile, desktop, or tablet' });
      }
      const type = rule.deviceType.trim().toLowerCase();
      if (seen.has(type)) {
        return res.status(400).json({ error: `Duplicate device type: ${type}` });
      }
      seen.add(type);
      if (!rule.destinationUrl || !validator.isURL(rule.destinationUrl)) {
        return res.status(400).json({ error: `Invalid destination URL for device ${type}` });
      }
    }

    const normalized = rules.map((rule) => ({
      deviceType: rule.deviceType.trim().toLowerCase(),
      destinationUrl: rule.destinationUrl,
    }));

    await prisma.$transaction(async (tx) => {
      await tx.deviceRule.deleteMany({ where: { linkId: existing.id } });
      if (normalized.length > 0) {
        await tx.deviceRule.createMany({
          data: normalized.map((rule) => ({ ...rule, linkId: existing.id })),
        });
      }
    });

    await deleteCachedLink(existing.shortCode);

    res.status(200).json({ message: 'Device rules updated', deviceRules: normalized });
  } catch (error) {
    next(error);
  }
};

const updateABVariants = async (req, res, next) => {
  try {
    if (!isValidUUID(req.params.id)) {
      return res.status(400).json({ error: 'Invalid link ID format' });
    }

    const existing = await prisma.link.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.userId,
      },
      select: {
        id: true,
        shortCode: true,
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Link not found' });
    }

    const { variants } = req.body;

    if (!Array.isArray(variants)) {
      return res.status(400).json({ error: 'variants must be an array of { destinationUrl, weight, label }' });
    }

    if (variants.length > 0 && variants.length < AB_MIN_VARIANTS) {
      return res.status(400).json({ error: `A/B testing requires at least ${AB_MIN_VARIANTS} variants` });
    }

    let weightSum = 0;
    for (const variant of variants) {
      if (!variant || !variant.destinationUrl || !validator.isURL(variant.destinationUrl)) {
        return res.status(400).json({ error: 'Each variant needs a valid destination URL' });
      }
      if (!Number.isInteger(variant.weight) || variant.weight <= 0 || variant.weight > AB_WEIGHT_TOTAL) {
        return res.status(400).json({ error: 'Each variant weight must be a positive integer (1-100)' });
      }
      if (variant.label != null && typeof variant.label !== 'string') {
        return res.status(400).json({ error: 'Variant label must be a string' });
      }
      weightSum += variant.weight;
    }

    if (variants.length > 0 && weightSum !== AB_WEIGHT_TOTAL) {
      return res.status(400).json({ error: `A/B variant weights must sum to exactly ${AB_WEIGHT_TOTAL} (got ${weightSum})` });
    }

    await prisma.$transaction(async (tx) => {
      await tx.aBVariant.deleteMany({ where: { linkId: existing.id } });
      if (variants.length > 0) {
        await tx.aBVariant.createMany({
          data: variants.map((variant) => ({
            linkId: existing.id,
            destinationUrl: variant.destinationUrl,
            weight: variant.weight,
            label: variant.label != null && variant.label !== '' ? variant.label : null,
          })),
        });
      }
    });

    await deleteCachedLink(existing.shortCode);

    res.status(200).json({ message: 'A/B variants updated', variants: variants.map((v) => ({ ...v })) });
  } catch (error) {
    next(error);
  }
};

function hashStringToInt(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

// Pick a weighted A/B variant deterministically per visitor so the SAME
// visitor keeps getting the SAME variant across visits. We hash a stable
// visitor identifier (the request IP, same one geo detection uses) into a
// 0-99 value, then map it into the weighted cumulative buckets.
function pickABVariant(variants, req) {
  const identifier = extractIPAddress(req) || req.ip || req.socket?.remoteAddress || 'unknown';
  const bucket = hashStringToInt(identifier) % AB_WEIGHT_TOTAL;
  let cumulative = 0;
  for (const variant of variants) {
    cumulative += variant.weight;
    if (bucket < cumulative) {
      return variant;
    }
  }
  return variants[variants.length - 1];
}

const redirectLink = async (req, res, next) => {
  try {
    const { shortCode } = req.params;

    let link = await getCachedLink(shortCode);

    if (!link) {
      link = await prisma.link.findFirst({
        where: {
          shortCode,
        },
        select: {
          id: true,
          shortCode: true,
          originalUrl: true,
          isActive: true,
          expiresAt: true,
          maxClicks: true,
          passwordHash: true,
          geoRules: true,
          deviceRules: true,
          abVariants: true,
        },
      });

      if (link && link.isActive) {
        await setCachedLink(shortCode, link);
      }
    }

    if (!link) {
      return res.status(404).json({ error: 'Short link not found' });
    }

    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      return res.status(410).json({ error: 'This link has expired.' });
    }

    if (link.isActive === false) {
      if (link.maxClicks != null) {
        const clickCount = await prisma.click.count({ where: { linkId: link.id } });
        if (clickCount >= link.maxClicks) {
          return res.status(410).json({ error: 'Link click limit reached' });
        }
      }
      return res.status(404).json({ error: 'Short link not found' });
    }

    if (link.maxClicks != null) {
      const clickCount = await prisma.click.count({ where: { linkId: link.id } });
      if (clickCount >= link.maxClicks) {
        await prisma.link.update({
          where: { id: link.id },
          data: { isActive: false },
        });
        await deleteCachedLink(link.shortCode);
        return res.status(410).json({ error: 'Link click limit reached' });
      }
    }

    if (link.passwordHash) {
      return res.redirect(
        `${FRONTEND_URL}/password-gate/${link.id}?shortCode=${encodeURIComponent(link.shortCode)}`,
      );
    }

    // Precedence: geo rule > device rule > A/B variant > default originalUrl.
    // A matching geo rule wins over a device rule; when neither matches, an
    // A/B variant is chosen (weighted, sticky per visitor); and when no rules
    // or variants exist at all, the link's originalUrl is used (backward
    // compatible).
    let redirectType = 'default';
    let targetUrl = link.originalUrl;
    let abVariantLabel = null;

    if (link.geoRules && link.geoRules.length > 0) {
      const country = detectCountry(req);
      const match = country
        ? link.geoRules.find((rule) => rule.countryCode === country)
        : null;
      if (match) {
        redirectType = 'geo';
        targetUrl = match.destinationUrl;
      }
    }

    if (redirectType === 'default' && link.deviceRules && link.deviceRules.length > 0) {
      const deviceType = detectDeviceType(req);
      const match = link.deviceRules.find((rule) => rule.deviceType === deviceType);
      if (match) {
        redirectType = 'device';
        targetUrl = match.destinationUrl;
      }
    }

    if (redirectType === 'default' && link.abVariants && link.abVariants.length >= AB_MIN_VARIANTS) {
      const variant = pickABVariant(link.abVariants, req);
      redirectType = 'ab_test';
      targetUrl = variant.destinationUrl;
      abVariantLabel = variant.label || variant.destinationUrl;
    }

    let clickResult;
    try {
      clickResult = await analyticsService.recordClickWithLimitCheck({ linkId: link.id, req, redirectType, abVariantLabel });
    } catch (error) {
      logClickFailure(link.id, error);
    }

    if (clickResult && clickResult.status === 'limit_reached') {
      await deleteCachedLink(link.shortCode);
      return res.status(410).json({ error: 'Link click limit reached' });
    }

    res.redirect(targetUrl);  } catch (error) {
    next(error);
  }
};

const verifyPassword = async (req, res, next) => {
  try {
    if (!isValidUUID(req.params.id)) {
      return res.status(400).json({ error: 'Invalid link ID format' });
    }

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

    analyticsService.recordClick({ linkId: link.id, req }).catch((err) => {
      logClickFailure(link.id, err);
    });

    res.status(200).json({ success: true, redirectUrl: link.originalUrl });
  } catch (error) {
    next(error);
  }
};

const getLinkAnalytics = async (req, res, next) => {
  try {
    if (!isValidUUID(req.params.id)) {
      return res.status(400).json({ error: 'Invalid link ID format' });
    }

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
    if (!isValidUUID(req.params.id)) {
      return res.status(400).json({ error: 'Invalid link ID format' });
    }

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
  updateGeoRules,
  updateDeviceRules,
  updateABVariants,
  redirectLink,
  verifyPassword,
  getLinkAnalytics,
  generateQRCode,
};
