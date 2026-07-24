const { nanoid } = require("nanoid");
const validator = require("validator");
const UAParser = require("ua-parser-js");
const prisma = require("../config/prisma");

const createLink = async (req, res, next) => {
  try {
    const { originalUrl, title } = req.body;

    if (!originalUrl) {
      return res.status(400).json({ error: "originalUrl is required" });
    }

    if (!validator.isURL(originalUrl)) {
      return res.status(400).json({ error: "Invalid URL format" });
    }

    const shortCode = nanoid(8);

    const link = await prisma.link.create({
      data: {
        originalUrl,
        shortCode,
        title: title || null,
        userId: req.user.userId,
      },
      select: {
        id: true,
        shortCode: true,
        originalUrl: true,
        title: true,
        isActive: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      message: "Short link created successfully",
      link,
    });
  } catch (error) {
    next(error);
  }
};

const getMyLinks = async (req, res, next) => {
  try {
    const links = await prisma.link.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        shortCode: true,
        originalUrl: true,
        title: true,
        isActive: true,
        createdAt: true,
      },
    });

    res.status(200).json({ links });
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
        id: true,
        shortCode: true,
        originalUrl: true,
        title: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!link) {
      return res.status(404).json({ error: "Link not found" });
    }

    res.status(200).json({ link });
  } catch (error) {
    next(error);
  }
};

const updateLink = async (req, res, next) => {
  try {
    const { originalUrl, title, isActive } = req.body;

    const existing = await prisma.link.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.userId,
      },
    });

    if (!existing) {
      return res.status(404).json({ error: "Link not found" });
    }

    const data = {};

    if (originalUrl !== undefined) {
      if (!validator.isURL(originalUrl)) {
        return res.status(400).json({ error: "Invalid URL format" });
      }
      data.originalUrl = originalUrl;
    }

    if (title !== undefined) {
      if (typeof title !== "string") {
        return res.status(400).json({ error: "title must be a string" });
      }
      data.title = title;
    }

    if (isActive !== undefined) {
      if (typeof isActive !== "boolean") {
        return res.status(400).json({ error: "isActive must be a boolean" });
      }
      data.isActive = isActive;
    }

    const link = await prisma.link.update({
      where: { id: existing.id },
      data,
      select: {
        id: true,
        shortCode: true,
        originalUrl: true,
        title: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(200).json({ message: "Link updated successfully", link });
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
      return res.status(404).json({ error: "Link not found" });
    }

    await prisma.link.delete({
      where: { id: existing.id },
    });

    res.status(200).json({ message: "Link deleted successfully" });
  } catch (error) {
    next(error);
  }
};

/**
 * Resolves a short code to its original URL and redirects the visitor.
 * Only active links can be redirected; deactivated or deleted links return 404.
 * Click analytics (IP, browser, OS, device, referer) are recorded before
 * the redirect is issued so that every successful redirect is captured.
 *
 * @param {import("express").Request} req - Express request with `shortCode` param
 * @param {import("express").Response} res - Express response
 * @param {import("express").NextFunction} next - Express next middleware
 */
const redirectLink = async (req, res, next) => {
  try {
    // Filter by isActive to ensure deactivated links are never redirected,
    // even if their short code still exists in the database.
    const link = await prisma.link.findFirst({
      where: {
        shortCode: req.params.shortCode,
        isActive: true,
      },
    });

    if (!link) {
      return res.status(404).json({ error: "Short link not found" });
    }

    // Parse the User-Agent header to extract structured browser,
    // OS, and device information for click analytics.
    const parser = new UAParser(req.headers["user-agent"]);
    const { browser, os, device } = parser.getResult();
    const browserName = browser.name || null;
    const osName = os.name || null;
    const deviceType = device.type || "desktop";

    // Persist analytics before issuing the redirect. The click record
    // must be written while we still have access to the request context
    // (IP, headers); after res.redirect() the connection may close.
    const clickData = {
      linkId: link.id,
      ipAddress: req.ip,
      browser,
      os,
      device,
      referer: req.get("referer") || null,
      userAgent: req.get("user-agent") || null,
    };

    try {
      await prisma.click.create({ data: clickData });
    } catch {
      // Analytics failures are non-fatal in principle, but the current
      // implementation surfaces a 500 so data-integrity issues are not
      // silently swallowed during development and monitoring.
      return res.status(500).json({ error: "Failed to record click" });
    }

    // Issue the redirect immediately after the click is recorded so the
    // visitor reaches their destination with minimal added latency.
    res.redirect(link.originalUrl);
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
      return res.status(404).json({ error: "Link not found" });
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
      const browserName = click.browser || "Unknown";
      const deviceType = click.device || "Unknown";
      const osName = click.os || "Unknown";

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

module.exports = { createLink, getMyLinks, getLink, updateLink, deleteLink, redirectLink, getLinkAnalytics };
