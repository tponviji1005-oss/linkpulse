export function getPredictionColor(trend) {
  if (trend === 'Growing') return 'green';
  if (trend === 'Declining') return 'orange';
  return 'blue';
}
