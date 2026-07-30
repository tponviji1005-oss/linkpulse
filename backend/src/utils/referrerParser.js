const SEARCH_ENGINES = [
  "google.", "bing.", "yahoo.", "duckduckgo.", "baidu.", "yandex.", "ask.",
  "ecosia.", "qwant.", "aol.", "search.",
];

const SOCIAL_MEDIA = [
  "facebook.", "twitter.", "x.com", "instagram.", "linkedin.", "pinterest.",
  "reddit.", "tumblr.", "snapchat.", "tiktok.", "whatsapp.", "telegram.",
  "discord.", "slack.", "threads.", "mastodon.", "bluesky.",
];

const EMAIL_SERVICES = [
  "mail.google.", "outlook.", "mail.yahoo.", "protonmail.", "mailchi.mp",
  "constantcontact.", "sendgrid.", "mailgun.", "postmark.", "resend.",
];

function classifyReferrer(referer) {
  if (!referer || referer.trim() === "") return "Direct";

  try {
    const url = new URL(referer);
    const hostname = url.hostname.toLowerCase();

    if (hostname === "") return "Direct";

    for (const pattern of EMAIL_SERVICES) {
      if (hostname.includes(pattern)) return "Email";
    }

    for (const pattern of SEARCH_ENGINES) {
      if (hostname.includes(pattern)) return "Search Engine";
    }

    for (const pattern of SOCIAL_MEDIA) {
      if (hostname.includes(pattern)) return "Social Media";
    }

    return "External Website";
  } catch {
    return "Unknown";
  }
}

module.exports = { classifyReferrer };
