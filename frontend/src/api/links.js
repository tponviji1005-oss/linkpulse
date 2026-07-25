import request from './client.js';

export async function getLinks() {
  return request('/api/links');
}

export async function createLink(originalUrl, customSlug) {
  const body = { originalUrl };
  if (customSlug) body.customSlug = customSlug;

  return request('/api/links', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
