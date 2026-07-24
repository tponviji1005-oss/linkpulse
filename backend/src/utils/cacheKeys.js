const redirectKey = (shortCode) => `redirect:${shortCode}`;

const dashboardSummaryKey = (userId) => `dashboard:summary:${userId}`;

const topLinksKey = (userId) => `dashboard:toplinks:${userId}`;

const analyticsKey = (linkId) => `analytics:${linkId}`;

module.exports = {
  redirectKey,
  dashboardSummaryKey,
  topLinksKey,
  analyticsKey,
};
