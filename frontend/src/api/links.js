import request, { requestBlob } from './client.js';

export async function getDashboard() {
  return request('/api/dashboard');
}

export async function getTopLinks() {
  return request('/api/dashboard/top-links');
}

export async function getLinks() {
  return request('/api/links');
}

export async function createLink(originalUrl, options = {}) {
  const body = { originalUrl };
  if (options.expiresAt) body.expiresAt = options.expiresAt;
  if (options.password) body.password = options.password;

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

export async function getLinkQRCode(id) {
  return requestBlob(`/api/links/${id}/qrcode`);
}

export async function verifyPassword(id, password) {
  return request(`/api/links/${id}/verify-password`, {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
}
