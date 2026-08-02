const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function hourLabel(hour) {
  if (hour === null || hour === undefined) return null;
  const h = Number(hour);
  if (Number.isNaN(h)) return null;
  const period = h % 12 || 12;
  const suffix = h < 12 ? 'AM' : 'PM';
  return `${period} ${suffix}`;
}

function periodOfHour(hour) {
  if (hour >= 5 && hour <= 11) return 'morning';
  if (hour >= 12 && hour <= 16) return 'afternoon';
  if (hour >= 17 && hour <= 21) return 'evening';
  return 'night';
}

function weekdayFromDate(dateStr) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dateStr));
  if (!match) return null;
  const dayIndex = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))).getUTCDay();
  return WEEKDAYS[dayIndex];
}

function topKey(obj) {
  if (!obj || typeof obj !== 'object') return null;
  const entries = Object.entries(obj);
  if (entries.length === 0) return null;
  entries.sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]));
  return entries[0][0];
}

function bestHourFrom(hourlyDistribution) {
  const entries = [];
  if (Array.isArray(hourlyDistribution)) {
    for (const item of hourlyDistribution) {
      if (!item || item.hour === undefined || item.hour === null) continue;
      entries.push([Number(item.hour), Number(item.clicks) || 0]);
    }
  } else if (hourlyDistribution && typeof hourlyDistribution === 'object') {
    for (const [k, v] of Object.entries(hourlyDistribution)) {
      entries.push([Number(k), Number(v) || 0]);
    }
  }
  if (entries.length === 0) return null;
  entries.sort((a, b) => (b[1] - a[1]) || (a[0] - b[0]));
  return entries[0][0];
}

function bestDayFrom(dailyTrend) {
  const entries = [];
  if (Array.isArray(dailyTrend)) {
    for (const item of dailyTrend) {
      if (!item) continue;
      const date = item.date !== undefined ? item.date : item.day;
      if (date === undefined || date === null) continue;
      entries.push([date, Number(item.clicks) || 0]);
    }
  } else if (dailyTrend && typeof dailyTrend === 'object') {
    for (const [k, v] of Object.entries(dailyTrend)) {
      entries.push([k, Number(v) || 0]);
    }
  }
  if (entries.length === 0) return null;
  entries.sort((a, b) => (b[1] - a[1]) || String(a[0]).localeCompare(String(b[0])));
  return weekdayFromDate(entries[0][0]);
}

function hasPositiveValues(obj) {
  if (!obj || typeof obj !== 'object') return false;
  return Object.keys(obj).length > 0 && Object.values(obj).some((v) => Number(v) > 0);
}

function cleanSubject(value) {
  if (value === null || value === undefined) return null;
  const s = String(value);
  return s === 'Unknown' ? null : s;
}

function buildInsight({ hour, day, device, browser, country, referrer, directTop }) {
  if (directTop) return 'Most visitors come directly without referrers.';

  const period = hour === null ? null : periodOfHour(hour);
  const cleanDevice = cleanSubject(device);
  const cleanBrowser = cleanSubject(browser);
  const cleanCountry = cleanSubject(country);
  const cleanReferrer = cleanSubject(referrer);

  if (cleanDevice) {
    return period
      ? `Most visitors arrive from ${cleanDevice} devices during the ${period}.`
      : `Most visitors arrive from ${cleanDevice} devices.`;
  }
  if (cleanBrowser) return `${cleanBrowser} users generate the highest engagement.`;
  if (cleanCountry) {
    return period
      ? `Traffic is concentrated from ${cleanCountry} during ${period} hours.`
      : `Traffic is concentrated from ${cleanCountry}.`;
  }
  if (cleanReferrer) return `Most traffic comes via ${cleanReferrer}.`;
  if (period) return `Traffic peaks during the ${period}.`;
  if (day) return `Traffic is highest on ${day}s.`;
  return 'No traffic data available yet.';
}

function generateTrafficInsights(input = {}) {
  const {
    browserBreakdown,
    deviceBreakdown,
    countryBreakdown,
    referrerBreakdown,
    dailyTrend,
    hourlyDistribution,
  } = input;

  const hour = bestHourFrom(hourlyDistribution);
  const day = bestDayFrom(dailyTrend);
  const device = topKey(deviceBreakdown);
  const browser = topKey(browserBreakdown);
  const country = topKey(countryBreakdown);
  const referrer = topKey(referrerBreakdown);

  const directTop = hasPositiveValues(referrerBreakdown) && referrer === 'Direct';
  const hasAnyData =
    hour !== null || day !== null || device !== null || browser !== null ||
    country !== null || referrer !== null;

  return {
    bestHour: hourLabel(hour),
    bestDay: day,
    bestDevice: device,
    bestBrowser: browser,
    bestCountry: country,
    bestReferrer: referrer,
    insight: hasAnyData
      ? buildInsight({ hour, day, device, browser, country, referrer, directTop })
      : 'No traffic data available yet.',
  };
}

module.exports = { generateTrafficInsights };
