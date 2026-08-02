const { parseBrowser, parseBrowserVersion, parseOS, parseOSVersion, parseDevice } = require("../utils/deviceParser");
const { isBot } = require("../utils/botDetection");
const geoip = require("geoip-lite");

const isDev = () => process.env.NODE_ENV === "development";

function extractIPAddress(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.ip || req.socket?.remoteAddress || null;
}

function extractUserAgent(req) {
  return req.headers["user-agent"] || null;
}

function extractLanguage(req) {
  const lang = req.headers["accept-language"];
  if (!lang) return null;
  return lang.split(",")[0].split(";")[0].trim() || null;
}

function extractReferer(req) {
  return req.headers["referer"] || req.headers["referrer"] || null;
}

function normalizeUserAgent(userAgent) {
  if (!userAgent) return null;
  return userAgent.substring(0, 1024);
}

function getCountry(ip) {
  if (!ip) return null;
  const result = geoip.lookup(ip);
  return result ? result.country : null;
}

function detectCountry(req) {
  return getCountry(extractIPAddress(req));
}

function detectDeviceType(req) {
  const type = parseDevice(extractUserAgent(req));
  return type ? type.toLowerCase() : "desktop";
}

function buildClickData({ linkId, req }) {
  const userAgent = extractUserAgent(req);
  const ipAddress = extractIPAddress(req);

  return {
    linkId,
    userAgent: normalizeUserAgent(userAgent),
    browser: parseBrowser(userAgent),
    browserVersion: parseBrowserVersion(userAgent),
    os: parseOS(userAgent),
    osVersion: parseOSVersion(userAgent),
    device: parseDevice(userAgent),
    referer: extractReferer(req),
    ipAddress,
    language: extractLanguage(req),
    isBot: isBot(userAgent, req.headers),
    country: getCountry(ipAddress),
  };
}

function logClick(data) {
  if (!isDev()) return;
  console.log(`Click Logged — ${data.shortCode || data.linkId}`);
  if (data.browser) console.log(`  Browser Detected: ${data.browser}`);
  if (data.device) console.log(`  Device Detected: ${data.device}`);
}

function getDateRange(period) {
  const now = new Date();
  switch (period) {
    case "today": {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return { start, end: now };
    }
    case "7d": {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      return { start, end: now };
    }
    case "30d": {
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      return { start, end: now };
    }
    case "90d": {
      const start = new Date(now);
      start.setDate(start.getDate() - 90);
      return { start, end: now };
    }
    case "all":
    default:
      return { start: new Date(0), end: now };
  }
}

module.exports = {
  buildClickData,
  logClick,
  isDev,
  getDateRange,
  detectCountry,
  detectDeviceType,
  extractIPAddress,
};
