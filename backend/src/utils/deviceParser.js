const UAParser = require("ua-parser-js");

function parseBrowser(userAgent) {
  if (!userAgent) return null;

  const parser = new UAParser(userAgent);
  const browser = parser.getBrowser();
  const name = (browser.name || "").toLowerCase();

  if (name.includes("chrome")) return "Chrome";
  if (name.includes("firefox") || name.includes("fxios")) return "Firefox";
  if (name.includes("safari")) return "Safari";
  if (name.includes("edge") || name.includes("edg")) return "Edge";
  if (name.includes("opera") || name.includes("opr")) return "Opera";
  if (name.includes("brave")) return "Brave";

  const ua = userAgent.toLowerCase();
  if (ua.includes("brave") && !ua.includes("edge") && !ua.includes("opr")) return "Brave";

  if (browser.name) return browser.name;

  return null;
}

function parseBrowserVersion(userAgent) {
  if (!userAgent) return null;
  const parser = new UAParser(userAgent);
  return parser.getBrowser().version || null;
}

function parseOS(userAgent) {
  if (!userAgent) return null;

  const parser = new UAParser(userAgent);
  const os = parser.getOS();
  const name = (os.name || "").toLowerCase();

  if (name.includes("windows")) return "Windows";
  if (name.includes("mac os") || name.includes("macos")) return "macOS";
  if (name.includes("linux")) return "Linux";
  if (name.includes("android")) return "Android";
  if (name.includes("ios") || name.includes("iphone") || name.includes("ipad")) return "iOS";

  if (os.name) return os.name;

  return null;
}

function parseOSVersion(userAgent) {
  if (!userAgent) return null;
  const parser = new UAParser(userAgent);
  return parser.getOS().version || null;
}

function parseDevice(userAgent) {
  if (!userAgent) return null;

  const parser = new UAParser(userAgent);
  const device = parser.getDevice();
  const type = (device.type || "").toLowerCase();

  if (type === "mobile") return "Mobile";
  if (type === "tablet") return "Tablet";
  if (type === "desktop" || !type) return "Desktop";

  return null;
}

module.exports = {
  parseBrowser,
  parseBrowserVersion,
  parseOS,
  parseOSVersion,
  parseDevice,
};
