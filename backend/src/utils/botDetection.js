const KNOWN_BOT_PATTERNS = [
  /googlebot/i,
  /bingbot/i,
  /slurp/i,
  /duckduckbot/i,
  /yandexbot/i,
  /facebookexternalhit/i,
  /twitterbot/i,
  /linkedinbot/i,
  /whatsapp/i,
  /discordbot/i,
  /telegrambot/i,
  /curl/i,
  /wget/i,
  /python-requests/i,
  /axios/i,
  /postmanruntime/i,
  /go-http-client/i,
  /java/i,
  /apachebench/i,
];

const AUTOMATED_PATTERNS = [
  /bot/i,
  /crawler/i,
  /spider/i,
  /scrape/i,
  /headless/i,
  /phantomjs/i,
  /httpclient/i,
  /node-fetch/i,
  /libwww/i,
];

const isKnownBotUserAgent = (userAgent) => {
  if (!userAgent) return false;
  return KNOWN_BOT_PATTERNS.some((pattern) => pattern.test(userAgent));
};

const isMissingUserAgent = (userAgent) => !userAgent || userAgent.trim() === "";

const isAutomatedUserAgent = (userAgent) => {
  if (!userAgent) return true;
  return (
    isKnownBotUserAgent(userAgent) ||
    AUTOMATED_PATTERNS.some((pattern) => pattern.test(userAgent))
  );
};

const isSuspiciousHeaders = (headers) => {
  if (!headers) return false;
  const hasAcceptLanguage = Boolean(headers["accept-language"]);
  const hasReferer = Boolean(headers["referer"] || headers["referrer"]);
  return !hasAcceptLanguage && !hasReferer;
};

const isBot = (userAgent, headers) => {
  if (isMissingUserAgent(userAgent)) return true;
  if (isKnownBotUserAgent(userAgent)) return true;
  if (isSuspiciousHeaders(headers) && isAutomatedUserAgent(userAgent)) return true;
  return false;
};

const isRepeatedClick = (recentClicks) => recentClicks + 1 >= 5;

module.exports = {
  isBot,
  isRepeatedClick,
};
