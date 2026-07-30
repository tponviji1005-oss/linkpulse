const prisma = require("../config/prisma");

const CLICK_SELECT = {
  id: true,
  linkId: true,
  ipAddress: true,
  browser: true,
  browserVersion: true,
  os: true,
  osVersion: true,
  device: true,
  referer: true,
  language: true,
  isBot: true,
  createdAt: true,
};

async function createClick(data) {
  return prisma.click.create({ data, select: CLICK_SELECT });
}

async function findClicksByLink(linkId) {
  return prisma.click.findMany({
    where: { linkId },
    select: CLICK_SELECT,
    orderBy: { createdAt: "desc" },
  });
}

async function countClicks(linkId) {
  return prisma.click.count({ where: { linkId } });
}

async function findClicksByPeriod(linkId, start, end) {
  return prisma.click.findMany({
    where: {
      linkId,
      createdAt: { gte: start, lte: end },
    },
    select: CLICK_SELECT,
    orderBy: { createdAt: "desc" },
  });
}

async function countClicksByRange(linkId, start, end) {
  return prisma.click.count({
    where: {
      linkId,
      createdAt: { gte: start, lte: end },
    },
  });
}

async function getUniqueVisitors(linkId, start, end) {
  const result = await prisma.click.findMany({
    where: {
      linkId,
      createdAt: { gte: start, lte: end },
      ipAddress: { not: null },
    },
    select: { ipAddress: true },
    distinct: ["ipAddress"],
  });
  return result.length;
}

async function getFieldBreakdown(linkId, field, start, end) {
  const rows = await prisma.click.findMany({
    where: {
      linkId,
      createdAt: { gte: start, lte: end },
    },
    select: { [field]: true },
  });

  const counts = {};
  for (const row of rows) {
    const key = row[field] || "Unknown";
    counts[key] = (counts[key] || 0) + 1;
  }

  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

async function getDailyTimeline(linkId, start, end) {
  const clicks = await prisma.click.findMany({
    where: {
      linkId,
      createdAt: { gte: start, lte: end },
    },
    select: { createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const dailyMap = {};
  for (const click of clicks) {
    const date = click.createdAt.toISOString().split("T")[0];
    dailyMap[date] = (dailyMap[date] || 0) + 1;
  }

  return Object.entries(dailyMap)
    .map(([date, clicks]) => ({ date, clicks }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

async function getClickFields(linkId, fields, start, end) {
  return prisma.click.findMany({
    where: {
      linkId,
      createdAt: { gte: start, lte: end },
    },
    select: fields.reduce((acc, f) => ({ ...acc, [f]: true }), {}),
  });
}

module.exports = {
  createClick,
  findClicksByLink,
  countClicks,
  findClicksByPeriod,
  countClicksByRange,
  getUniqueVisitors,
  getFieldBreakdown,
  getDailyTimeline,
  getClickFields,
};
