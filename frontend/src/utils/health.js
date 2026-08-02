const HEALTH_META = {
  Excellent: { emoji: '\u{1F7E2}', className: 'health-excellent' },
  Good: { emoji: '\u{1F535}', className: 'health-good' },
  Average: { emoji: '\u{1F7E0}', className: 'health-average' },
  Poor: { emoji: '\u{1F534}', className: 'health-poor' },
  Critical: { emoji: '\u26D4', className: 'health-critical' },
};

export function healthMeta(label) {
  return HEALTH_META[label] || HEALTH_META.Critical;
}
