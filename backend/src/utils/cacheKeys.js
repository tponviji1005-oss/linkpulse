const redirectKey = (shortCode) => `redirect:${shortCode}`;

const dashboardSummaryKey = (userId) => `dashboard:summary:${userId}`;

const topLinksKey = (userId) => `dashboard:toplinks:${userId}`;

module.exports = {
  redirectKey,
  dashboardSummaryKey,
  topLinksKey,
};
