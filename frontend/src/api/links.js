import request from './client.js';

export async function getDashboard() {
  return request('/api/dashboard');
}

export async function getTopLinks() {
  return request('/api/dashboard/top-links');
}

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

export async function updateLink(id, data) {
  return request(`/api/links/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteLink(id) {
  return request(`/api/links/${id}`, {
    method: 'DELETE',
  });
}

export async function getLinkAnalytics(id) {
  return request(`/api/links/${id}/analytics`);
}
