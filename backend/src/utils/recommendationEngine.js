const CATEGORY_PRIORITY = {
  security: 1,
  health: 2,
  traffic: 3,
  marketing: 4,
  optimization: 5,
};

function percent(part, total) {
  return total > 0 ? (part / total) * 100 : 0;
}

function formatHour(hour) {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

function findPeakHour(hourlyDistribution) {
  if (!Array.isArray(hourlyDistribution) || hourlyDistribution.length === 0) return null;
  let peak = null;
  let maxClicks = 0;
  for (const slot of hourlyDistribution) {
    if (slot.clicks > maxClicks) {
      maxClicks = slot.clicks;
      peak = slot.hour;
    }
  }
  return maxClicks > 0 ? peak : null;
}

function isWithinDays(date, days) {
  const diff = new Date(date).getTime() - Date.now();
  return diff > 0 && diff <= days * 24 * 3600 * 1000;
}

function remainingClicksPercent(totalClicks, maxClicks) {
  if (maxClicks == null || maxClicks <= 0) return 100;
  const remaining = maxClicks - totalClicks;
  if (remaining <= 0) return 0;
  return (remaining / maxClicks) * 100;
}

function getTrendDirection(dailyTrend) {
  if (!Array.isArray(dailyTrend) || dailyTrend.length < 2) return null;
  const recent = dailyTrend.slice(-7);
  const first = recent[0].clicks;
  const last = recent[recent.length - 1].clicks;
  if (last > first) return 'increasing';
  if (last < first) return 'decreasing';
  return null;
}

function getSummary(healthLabel, totalClicks) {
  if (totalClicks === 0) return 'No traffic has been recorded yet.';
  switch (healthLabel) {
    case 'Excellent':
      return 'This link is performing very well.';
    case 'Good':
      return 'Traffic is healthy with room for improvement.';
    case 'Average':
      return 'Traffic is stable but engagement can improve.';
    case 'Poor':
      return 'Performance is below average.';
    default:
      return 'This link requires attention.';
  }
}

function generateRecommendations({
  healthScore = 0,
  healthLabel = '',
  totalClicks = 0,
  realClicks = 0,
  botClicks = 0,
  uniqueVisitors = 0,
  topCountry = null,
  topCountryShare = 0,
  topDevice = null,
  topBrowser = null,
  topBrowserShare = 0,
  topReferrer = null,
  hourlyDistribution = [],
  dailyTrend = [],
  isFlagged = false,
  expiresAt = null,
  maxClicks = null,
  hasPassword = false,
} = {}) {
  if (totalClicks === 0) {
    return {
      summary: 'No traffic has been recorded yet.',
      recommendations: ['Start sharing this link.'],
    };
  }

  const candidates = [];
  const seen = new Set();

  const add = (text, category) => {
    if (seen.has(text)) return;
    seen.add(text);
    candidates.push({ text, category });
  };

  const botPercent = percent(botClicks, totalClicks);
  const realPercent = percent(realClicks, totalClicks);

  if (botPercent > 40) {
    add('Investigate possible automated abuse.', 'security');
  }
  if (botPercent > 20) {
    add('High bot traffic detected. Monitor suspicious activity.', 'security');
  }
  if (isFlagged) {
    add('Suspicious traffic detected. Review traffic sources.', 'security');
  }
  if (!hasPassword && botPercent > 30) {
    add('Enable password protection.', 'security');
  }

  if (healthScore >= 90) {
    add('Continue sharing through current channels.', 'health');
  } else if (healthScore >= 75) {
    add('Increase sharing frequency.', 'health');
  } else if (healthScore >= 50) {
    add('Improve audience engagement.', 'health');
  } else if (healthScore >= 25) {
    add('Review marketing strategy.', 'health');
  } else {
    add('This link needs immediate attention.', 'health');
  }

  if (realPercent > 95) {
    add('Traffic quality is excellent.', 'traffic');
  }

  const direction = getTrendDirection(dailyTrend);
  if (direction === 'increasing') {
    add('Current growth trend is positive.', 'traffic');
  } else if (direction === 'decreasing') {
    add('Traffic is declining. Consider re-sharing.', 'traffic');
  }

  if (topCountry && topCountry !== 'Unknown' && topCountryShare > 60) {
    add(`Focus future campaigns in ${topCountry}.`, 'marketing');
  }

  const referrer = topReferrer ? topReferrer.toLowerCase() : '';
  if (referrer === 'direct') {
    add('Use social platforms to diversify traffic.', 'marketing');
  } else if (referrer.includes('instagram')) {
    add('Instagram is your strongest traffic source.', 'marketing');
  }

  if (uniqueVisitors < 10) {
    add('Increase promotion to reach more users.', 'marketing');
  }

  const peakHour = findPeakHour(hourlyDistribution);
  if (peakHour !== null) {
    add(`Best engagement occurs around ${formatHour(peakHour)}.`, 'marketing');
  }

  if (expiresAt && isWithinDays(expiresAt, 3)) {
    add('Link expires soon.', 'optimization');
  }

  if (remainingClicksPercent(totalClicks, maxClicks) < 20) {
    add('Maximum click limit is nearly reached.', 'optimization');
  }

  const device = topDevice ? topDevice.toLowerCase() : '';
  if (device === 'android') {
    add('Optimize Android experience.', 'optimization');
  } else if (device === 'desktop') {
    add('Improve desktop landing page.', 'optimization');
  } else if (device === 'iphone') {
    add('Optimize iOS experience.', 'optimization');
  }

  const browser = topBrowser ? topBrowser.toLowerCase() : '';
  if (browser === 'chrome' && topBrowserShare > 70) {
    add('Ensure Chrome experience stays optimized.', 'optimization');
  }

  if (candidates.length < 2) {
    add('Monitor performance and adjust your approach as needed.', 'optimization');
  }

  candidates.sort((a, b) => CATEGORY_PRIORITY[a.category] - CATEGORY_PRIORITY[b.category]);

  return {
    summary: getSummary(healthLabel, totalClicks),
    recommendations: candidates.map((c) => c.text).slice(0, 5),
  };
}

module.exports = { generateRecommendations };
