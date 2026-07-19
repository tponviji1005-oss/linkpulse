const { nanoid } = require("nanoid");
const validator = require("validator");
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

module.exports = { createLink, getMyLinks, getLink, updateLink, deleteLink };
