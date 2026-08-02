function getRealRatioPoints(ratio) {
  if (ratio >= 0.95) return 40;
  if (ratio >= 0.9) return 35;
  if (ratio >= 0.8) return 30;
  if (ratio >= 0.7) return 20;
  if (ratio >= 0.5) return 10;
  return 0;
}

function getActivityPoints(count) {
  if (count >= 100) return 20;
  if (count >= 50) return 15;
  if (count >= 20) return 10;
  if (count >= 1) return 5;
  return 0;
}

function getVisitorPoints(count) {
  if (count >= 100) return 20;
  if (count >= 50) return 15;
  if (count >= 20) return 10;
  if (count >= 10) return 5;
  return 0;
}

function getLabel(score) {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 50) return 'Average';
  if (score >= 25) return 'Poor';
  return 'Critical';
}

function calculateHealthScore({
  totalClicks = 0,
  realClicks = 0,
  isFlagged = false,
  recentRealClicks = 0,
  uniqueVisitors = 0,
} = {}) {
  const realRatio = totalClicks > 0 ? realClicks / totalClicks : 0;
  const realRatioPoints = totalClicks > 0 ? getRealRatioPoints(realRatio) : 0;
  const suspiciousPoints = isFlagged ? 0 : 20;
  const activityPoints = getActivityPoints(recentRealClicks);
  const visitorPoints = getVisitorPoints(uniqueVisitors);

  const healthScore = realRatioPoints + suspiciousPoints + activityPoints + visitorPoints;

  return { healthScore, healthLabel: getLabel(healthScore) };
}

module.exports = { calculateHealthScore };
