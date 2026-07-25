const BOT_PATTERNS = [
  /googlebot/i,
  /bingbot/i,
  /facebookexternalhit/i,
  /twitterbot/i,
];

const isBot = (userAgent) => {
  if (!userAgent) return false;
  return BOT_PATTERNS.some((pattern) => pattern.test(userAgent));
};

module.exports = { isBot };
