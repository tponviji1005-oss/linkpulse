const redirectKey = (shortCode) => `redirect:${shortCode}`;

const dashboardSummaryKey = (userId) => `dashboard:summary:${userId}`;

const topLinksKey = (userId) => `dashboard:toplinks:${userId}`;

const analyticsKey = (linkId, period) => `analytics:${linkId}:${period}`;

const linkListKey = (userId, query) => `links:list:${userId}:${query}`;

module.exports = {
  redirectKey,
  dashboardSummaryKey,
  topLinksKey,
  analyticsKey,
  linkListKey,
};
