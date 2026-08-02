import request, { requestBlob } from './client.js';

export async function getDashboard() {
  return request('/api/dashboard');
}

export async function getTopLinks() {
  return request('/api/dashboard/top-links');
}

export async function getLinks(params = {}) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.status) query.set('status', params.status);
  if (params.sort) query.set('sort', params.sort);
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);
  const qs = query.toString();
  return request(`/api/links${qs ? '?' + qs : ''}`);
}

export async function createLink(originalUrl, options = {}) {
  const body = { originalUrl };
  if (options.customAlias) body.customAlias = options.customAlias;
  if (options.expiresAt) body.expiresAt = options.expiresAt;
  if (options.password) body.password = options.password;
  if (options.maxClicks != null) body.maxClicks = options.maxClicks;

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

export async function updateGeoRules(id, rules) {
  return request(`/api/links/${id}/geo-rules`, {
    method: 'PUT',
    body: JSON.stringify({ rules }),
  });
}

export async function updateDeviceRules(id, rules) {
  return request(`/api/links/${id}/device-rules`, {
    method: 'PUT',
    body: JSON.stringify({ rules }),
  });
}

export async function updateABVariants(id, variants) {
  return request(`/api/links/${id}/ab-variants`, {
    method: 'PUT',
    body: JSON.stringify({ variants }),
  });
}

export async function deleteLink(id) {
  return request(`/api/links/${id}`, {
    method: 'DELETE',
  });
}

export async function getAdvancedAnalytics(id, period = 'all') {
  return request(`/api/analytics/${id}?period=${period}`);
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

export async function bulkCreateLinks(links) {
  return request('/api/bulk', {
    method: 'POST',
    body: JSON.stringify({ links }),
  });
}

export async function csvUpload(file) {
  const formData = new FormData();
  formData.append('file', file);
  return request('/api/bulk/csv', {
    method: 'POST',
    body: formData,
  });
}

export async function exportCSV() {
  return requestBlob('/api/bulk/export');
}

export async function bulkDelete(ids) {
  return request('/api/bulk', {
    method: 'DELETE',
    body: JSON.stringify({ ids }),
  });
}

export async function bulkActivate(ids) {
  return request('/api/bulk/activate', {
    method: 'PUT',
    body: JSON.stringify({ ids }),
  });
}

export async function bulkDeactivate(ids) {
  return request('/api/bulk/deactivate', {
    method: 'PUT',
    body: JSON.stringify({ ids }),
  });
}
