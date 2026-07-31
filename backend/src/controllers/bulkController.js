const bcrypt = require('bcrypt');
const { nanoid } = require('nanoid');
const validator = require('validator');
const prisma = require('../config/prisma');
const { invalidateCache } = require('../utils/cache');
const { dashboardSummaryKey, topLinksKey } = require('../utils/cacheKeys');
const { deleteCachedLink } = require('../lib/redirectCache');
const { parseCSV, generateCSV } = require('../utils/csvHelpers');
const { invalidateLinkAnalytics } = require('./analyticsController');

const bulkCreateLinks = async (req, res, next) => {
  try {
    const { links } = req.body;

    if (!Array.isArray(links) || links.length === 0) {
      return res.status(400).json({ error: 'links array is required and must not be empty' });
    }

    if (links.length > 50) {
      return res.status(400).json({ error: 'Maximum 50 links per bulk create' });
    }

    const results = [];
    const errors = [];

    const existingLinks = await prisma.link.findMany({
      where: { userId: req.user.userId },
      select: { originalUrl: true },
    });
    const existingUrls = new Set(existingLinks.map((l) => l.originalUrl));

    for (let i = 0; i < links.length; i++) {
      const item = links[i];
      if (typeof item !== 'object' || item === null) {
        errors.push({ row: i + 1, error: 'Invalid link entry' });
        continue;
      }
      const { originalUrl, title, password, expiresAt } = item;

      if (!originalUrl || !validator.isURL(originalUrl)) {
        errors.push({ row: i + 1, originalUrl: originalUrl || '', error: 'Invalid URL format' });
        continue;
      }

      if (existingUrls.has(originalUrl)) {
        errors.push({ row: i + 1, originalUrl, error: 'Duplicate URL' });
        continue;
      }

      if (title !== undefined && title !== null && (typeof title !== 'string' || title.length > 255)) {
        errors.push({ row: i + 1, originalUrl, error: 'title must be a string with at most 255 characters' });
        continue;
      }

      let passwordHash = null;
      if (password) {
        if (typeof password !== 'string') {
          errors.push({ row: i + 1, originalUrl, error: 'password must be a string' });
          continue;
        }
        passwordHash = await bcrypt.hash(password, 10);
      }

      let expiryDate = null;
      if (expiresAt) {
        expiryDate = new Date(expiresAt);
        if (isNaN(expiryDate.getTime()) || expiryDate <= new Date()) {
          errors.push({ row: i + 1, originalUrl, error: 'Invalid expiration date' });
          continue;
        }
      }

      const shortCode = nanoid(8);

      try {
        const link = await prisma.link.create({
          data: {
            originalUrl,
            shortCode,
            title: title || null,
            userId: req.user.userId,
            expiresAt: expiryDate,
            passwordHash,
          },
          select: {
            id: true,
            shortCode: true,
            originalUrl: true,
            title: true,
            isActive: true,
            expiresAt: true,
            createdAt: true,
          },
        });

        existingUrls.add(originalUrl);
        results.push({ ...link, hasPassword: !!passwordHash });
      } catch (err) {
        errors.push({ row: i + 1, originalUrl, error: err.message });
      }
    }

    await invalidateCache(dashboardSummaryKey(req.user.userId), topLinksKey(req.user.userId));

    res.status(201).json({
      message: `Bulk create completed: ${results.length} created, ${errors.length} failed`,
      created: results,
      failed: errors,
      totalCreated: results.length,
      totalFailed: errors.length,
    });
  } catch (error) {
    next(error);
  }
};

const csvUpload = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'CSV file is required' });
    }

    let records;
    try {
      records = parseCSV(req.file.buffer);
    } catch {
      return res.status(400).json({ error: 'Invalid CSV format' });
    }

    if (records.length === 0) {
      return res.status(400).json({ error: 'CSV file is empty or has no valid rows' });
    }

    if (records.length > 100) {
      return res.status(400).json({ error: 'Maximum 100 rows per CSV upload' });
    }

    const results = [];
    const errors = [];

    const existingLinks = await prisma.link.findMany({
      where: { userId: req.user.userId },
      select: { originalUrl: true },
    });
    const existingUrls = new Set(existingLinks.map((l) => l.originalUrl));

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const originalUrl = record.url || record.originalUrl || record.original_url || '';
      const title = record.title || '';
      const password = record.password || '';
      const expiresAt = record.expiresAt || record.expires_at || '';

      if (!originalUrl || !validator.isURL(originalUrl)) {
        errors.push({ row: i + 1, originalUrl, error: 'Invalid URL format' });
        continue;
      }

      if (existingUrls.has(originalUrl)) {
        errors.push({ row: i + 1, originalUrl, error: 'Duplicate URL' });
        continue;
      }

      if (title && title.length > 255) {
        errors.push({ row: i + 1, originalUrl, error: 'title must be at most 255 characters' });
        continue;
      }

      let passwordHash = null;
      if (password) {
        passwordHash = await bcrypt.hash(password, 10);
      }

      let expiryDate = null;
      if (expiresAt) {
        expiryDate = new Date(expiresAt);
        if (isNaN(expiryDate.getTime()) || expiryDate <= new Date()) {
          errors.push({ row: i + 1, originalUrl, error: 'Invalid expiration date' });
          continue;
        }
      }

      const shortCode = nanoid(8);

      try {
        const link = await prisma.link.create({
          data: {
            originalUrl,
            shortCode,
            title: title || null,
            userId: req.user.userId,
            expiresAt: expiryDate,
            passwordHash,
          },
          select: {
            id: true,
            shortCode: true,
            originalUrl: true,
            title: true,
            isActive: true,
            expiresAt: true,
            createdAt: true,
          },
        });

        existingUrls.add(originalUrl);
        results.push({ ...link, hasPassword: !!passwordHash });
      } catch (err) {
        errors.push({ row: i + 1, originalUrl, error: err.message });
      }
    }

    await invalidateCache(dashboardSummaryKey(req.user.userId), topLinksKey(req.user.userId));

    res.status(201).json({
      message: `CSV import completed: ${results.length} created, ${errors.length} failed`,
      created: results,
      failed: errors,
      totalCreated: results.length,
      totalFailed: errors.length,
    });
  } catch (error) {
    next(error);
  }
};

const exportCSV = async (req, res, next) => {
  try {
    const links = await prisma.link.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' },
      select: {
        shortCode: true,
        originalUrl: true,
        title: true,
        isActive: true,
        expiresAt: true,
        passwordHash: true,
        createdAt: true,
        _count: { select: { clicks: true } },
      },
    });

    const rows = links.map((link) => ({
      shortCode: link.shortCode,
      url: `${process.env.BACKEND_URL || 'http://localhost:5000'}/${link.shortCode}`,
      originalUrl: link.originalUrl,
      title: link.title || '',
      isActive: link.isActive,
      hasPassword: !!link.passwordHash,
      expiresAt: link.expiresAt ? link.expiresAt.toISOString() : '',
      createdAt: link.createdAt.toISOString(),
      clicks: link._count.clicks,
    }));

    const csv = generateCSV(rows, [
      'shortCode', 'url', 'originalUrl', 'title', 'isActive', 'hasPassword', 'expiresAt', 'createdAt', 'clicks',
    ]);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="linkpulse-export.csv"');
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};

const bulkDelete = async (req, res, next) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    const links = await prisma.link.findMany({
      where: { id: { in: ids }, userId: req.user.userId },
      select: { id: true, shortCode: true },
    });

    if (links.length === 0) {
      return res.status(404).json({ error: 'No matching links found' });
    }

    const linkIds = links.map((l) => l.id);
    const shortCodes = links.map((l) => l.shortCode);

    await prisma.click.deleteMany({ where: { linkId: { in: linkIds } } });
    await prisma.link.deleteMany({ where: { id: { in: linkIds } } });

    for (const sc of shortCodes) {
      await deleteCachedLink(sc);
    }
    await invalidateCache(dashboardSummaryKey(req.user.userId), topLinksKey(req.user.userId));

    for (const lid of linkIds) {
      await invalidateLinkAnalytics(lid);
    }

    res.status(200).json({
      message: `${links.length} links deleted successfully`,
      deleted: links.length,
    });
  } catch (error) {
    next(error);
  }
};

const bulkActivate = async (req, res, next) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    const result = await prisma.link.updateMany({
      where: { id: { in: ids }, userId: req.user.userId },
      data: { isActive: true },
    });

    await invalidateCache(dashboardSummaryKey(req.user.userId), topLinksKey(req.user.userId));

    res.status(200).json({
      message: `${result.count} links activated`,
      updated: result.count,
    });
  } catch (error) {
    next(error);
  }
};

const bulkDeactivate = async (req, res, next) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    const links = await prisma.link.findMany({
      where: { id: { in: ids }, userId: req.user.userId },
      select: { id: true, shortCode: true },
    });

    const result = await prisma.link.updateMany({
      where: { id: { in: ids }, userId: req.user.userId },
      data: { isActive: false },
    });

    const shortCodes = links.map((l) => l.shortCode);
    for (const sc of shortCodes) {
      await deleteCachedLink(sc);
    }
    await invalidateCache(dashboardSummaryKey(req.user.userId), topLinksKey(req.user.userId));

    res.status(200).json({
      message: `${result.count} links deactivated`,
      updated: result.count,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  bulkCreateLinks,
  csvUpload,
  exportCSV,
  bulkDelete,
  bulkActivate,
  bulkDeactivate,
};
