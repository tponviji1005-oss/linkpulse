const MAX_HIGHLIGHTS = 5;

function percent(part, total) {
  return total > 0 ? (part / total) * 100 : 0;
}

function getTitle(healthLabel) {
  switch (healthLabel) {
    case 'Excellent':
      return 'Excellent Link Performance';
    case 'Good':
      return 'Healthy Link Performance';
    case 'Average':
      return 'Average Link Performance';
    case 'Poor':
      return 'Performance Needs Improvement';
    default:
      return 'Critical Link Performance';
  }
}

function getPriority(healthLabel, isFlagged) {
  if (isFlagged || healthLabel === 'Critical') return 'HIGH';
  if (healthLabel === 'Poor' || healthLabel === 'Average') return 'MEDIUM';
  return 'LOW';
}

function buildOverview({ healthLabel, totalClicks, realPercent, botPercent, prediction, isFlagged }) {
  if (totalClicks === 0) {
    return 'No traffic has been recorded yet for this link.';
  }

  const sentences = [];

  if (isFlagged) {
    sentences.push('Suspicious traffic has been detected for this link.');
  }

  switch (healthLabel) {
    case 'Excellent':
      sentences.push('The link is performing extremely well with high-quality human traffic.');
      break;
    case 'Good':
      sentences.push('Traffic is healthy with strong human engagement.');
      break;
    case 'Average':
      sentences.push('Traffic is stable but engagement can improve.');
      break;
    case 'Poor':
      sentences.push('Performance is below average and may need attention.');
      break;
    default:
      sentences.push('The link is in critical condition and requires immediate attention.');
      break;
  }

  if (prediction && prediction.trend === 'Growing') {
    sentences.push('It is expected to continue growing next week.');
  } else if (prediction && prediction.trend === 'Declining') {
    sentences.push('Traffic may decline next week.');
  } else if (prediction && prediction.trend === 'Stable') {
    sentences.push('Traffic is expected to remain stable next week.');
  }

  if (botPercent > 30 && !isFlagged) {
    sentences.push('Bot traffic is unusually high.');
  }

  return sentences.join(' ');
}

function buildHighlights({ healthScore, healthLabel, prediction, totalClicks, realPercent, botPercent, uniqueVisitors, isFlagged }) {
  const highlights = [];

  highlights.push(`Health Score: ${healthScore}`);
  highlights.push(`Prediction: ${prediction ? prediction.predictedClicks : 0} clicks next week`);
  highlights.push(
    botPercent > 30
      ? `Bot traffic at ${botPercent.toFixed(0)}%`
      : `Bot traffic only ${botPercent.toFixed(0)}%`,
  );

  if (botPercent > 30) highlights.push('High bot traffic detected.');
  if (prediction && prediction.trend === 'Growing') highlights.push('Traffic expected to grow.');
  if (prediction && prediction.trend === 'Declining') highlights.push('Traffic expected to decline.');
  if (isFlagged) highlights.push('Suspicious activity detected.');
  if (realPercent > 95) highlights.push('Excellent traffic quality.');
  if (uniqueVisitors > 100) highlights.push('Strong visitor diversity.');
  if (healthLabel === 'Excellent') highlights.push('Excellent overall health.');

  const seen = new Set();
  const unique = [];
  for (const item of highlights) {
    if (seen.has(item)) continue;
    seen.add(item);
    unique.push(item);
  }

  return unique.slice(0, MAX_HIGHLIGHTS);
}

function generateDashboardSummary({
  healthScore = 0,
  healthLabel = '',
  prediction = null,
  summary = '',
  recommendations = [],
  totalClicks = 0,
  realClicks = 0,
  botClicks = 0,
  uniqueVisitors = 0,
  isFlagged = false,
} = {}) {
  const botPercent = percent(botClicks, totalClicks);
  const realPercent = percent(realClicks, totalClicks);

  return {
    title: getTitle(healthLabel),
    overview: buildOverview({ healthLabel, totalClicks, realPercent, botPercent, prediction, isFlagged }),
    priority: getPriority(healthLabel, isFlagged),
    highlights: buildHighlights({ healthScore, healthLabel, prediction, totalClicks, realPercent, botPercent, uniqueVisitors, isFlagged }),
  };
}

module.exports = { generateDashboardSummary };
