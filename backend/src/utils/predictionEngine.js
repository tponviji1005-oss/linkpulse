const PREDICTION_WINDOW = 7;

function getConfidence(variation) {
  if (variation <= 2) return 95;
  if (variation <= 4) return 90;
  if (variation <= 6) return 80;
  if (variation <= 8) return 70;
  return 60;
}

function getTrend(growth) {
  if (growth > 2) return 'Growing';
  if (growth < -2) return 'Declining';
  return 'Stable';
}

function getMessage(trend) {
  switch (trend) {
    case 'Growing':
      return 'Traffic is expected to grow next week.';
    case 'Declining':
      return 'Traffic may decline next week.';
    default:
      return 'Traffic is expected to remain stable.';
  }
}

function generatePrediction({ dailyTrend = [] } = {}) {
  if (!Array.isArray(dailyTrend) || dailyTrend.length === 0) {
    return { predictedClicks: 0, trend: 'Stable', confidence: 100, message: 'No historical traffic available.' };
  }

  const recent = dailyTrend.slice(-PREDICTION_WINDOW);
  const values = recent.map((d) => Number(d.clicks) || 0);

  const total = values.reduce((sum, v) => sum + v, 0);
  if (total === 0) {
    return { predictedClicks: 0, trend: 'Stable', confidence: 100, message: 'No historical traffic available.' };
  }

  const average = total / values.length;

  if (values.length === 1) {
    return {
      predictedClicks: Math.max(0, Math.round(average * PREDICTION_WINDOW)),
      trend: 'Stable',
      confidence: 95,
      message: 'Traffic is expected to remain stable.',
    };
  }

  const diffs = [];
  for (let i = 1; i < values.length; i++) {
    diffs.push(values[i] - values[i - 1]);
  }

  const growth = diffs.reduce((sum, d) => sum + d, 0) / diffs.length;
  const variation = diffs.reduce((sum, d) => sum + Math.abs(d), 0) / diffs.length;
  const trend = getTrend(growth);

  let predicted = 0;
  let day = values[values.length - 1];
  for (let i = 0; i < PREDICTION_WINDOW; i++) {
    day += growth;
    predicted += Math.max(0, Math.round(day));
  }

  return {
    predictedClicks: Math.max(0, predicted),
    trend,
    confidence: getConfidence(variation),
    message: getMessage(trend),
  };
}

module.exports = { generatePrediction };
