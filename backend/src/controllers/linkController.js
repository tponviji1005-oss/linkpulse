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

module.exports = { createLink };
