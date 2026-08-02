function healthPoints(score) {
  if (score >= 90) return 40;
  if (score >= 80) return 35;
  if (score >= 70) return 30;
  if (score >= 60) return 20;
  if (score >= 40) return 10;
  return 0;
}

function realClickPoints(percent) {
  if (percent >= 95) return 20;
  if (percent >= 90) return 15;
  if (percent >= 80) return 10;
  if (percent >= 70) return 5;
  return 0;
}

function visitorPoints(count) {
  if (count >= 100) return 20;
  if (count >= 50) return 15;
  if (count >= 20) return 10;
  if (count >= 10) return 5;
  return 0;
}

function predictionPoints(trend) {
  if (trend === 'Growing') return 20;
  if (trend === 'Stable') return 15;
  if (trend === 'Declining') return 5;
  return 0;
}

function getLabel(score) {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 50) return 'Average';
  if (score >= 25) return 'Needs Improvement';
  return 'Poor';
}

function buildImprovements({
  score,
  isFlagged,
  prediction,
  uniqueVisitors,
  realClickPercentage,
  topReferrer,
  topDevice,
  topBrowser,
}) {
  if (score >= 90) return ['Your link is already highly optimized.'];

  const list = [];
  const seen = new Set();
  const push = (item) => {
    if (seen.has(item)) return;
    seen.add(item);
    list.push(item);
  };

  if (isFlagged) push('Reduce suspicious traffic.');
  if (prediction && prediction.trend === 'Declining') push('Increase promotion of the link.');
  if (uniqueVisitors < 20) push('Expand your audience.');
  else if (uniqueVisitors < 50) push('Improve visitor diversity.');
  if (topReferrer === 'Direct') push('Increase sharing on social media.');
  if (topDevice === 'Android') push('Optimize for mobile users.');
  if (topBrowser === 'Chrome') push('Optimize for Chrome users.');
  if (realClickPercentage < 90) push('Reduce bot traffic.');

  const fallbacks = [
    'Share during peak traffic hours.',
    'Increase real visitor engagement.',
    'Improve browser compatibility.',
  ];
  for (const fallback of fallbacks) {
    if (list.length >= 5) break;
    push(fallback);
  }

  return list.slice(0, 5);
}

function calculateOptimizationScore(input = {}) {
  const {
    healthScore = 0,
    realClickPercentage = 0,
    uniqueVisitors = 0,
    isFlagged = false,
    prediction = null,
    topReferrer = null,
    topDevice = null,
    topBrowser = null,
  } = input;

  const base =
    healthPoints(healthScore) +
    realClickPoints(realClickPercentage) +
    visitorPoints(uniqueVisitors) +
    predictionPoints(prediction && prediction.trend);

  const optimizationScore = Math.max(0, Math.min(100, base - (isFlagged ? 20 : 0)));

  return {
    optimizationScore,
    optimizationLabel: getLabel(optimizationScore),
    improvements: buildImprovements({
      score: optimizationScore,
      isFlagged,
      prediction,
      uniqueVisitors,
      realClickPercentage,
      topReferrer,
      topDevice,
      topBrowser,
    }),
  };
}

module.exports = { calculateOptimizationScore };
