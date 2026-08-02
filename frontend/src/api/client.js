const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function messageForStatus(status) {
  switch (status) {
    case 401:
      return 'Your session has expired. Please log in again.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return 'The requested resource was not found.';
    case 429:
      return 'Too many requests. Please try again later.';
    case 500:
      return 'Something went wrong on the server. Please try again.';
    case 502:
    case 503:
    case 504:
      return 'The server is temporarily unavailable. Please try again.';
    default:
      return 'Request failed';
  }
}

export function buildHeaders(custom = {}, skipContentType = false) {
  const token = localStorage.getItem('token');
  const headers = { ...custom };
  if (!skipContentType && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function textOrNull(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function parseResponse(res) {
  const data = await textOrNull(res);
  if (!res.ok) {
    const message = (data && (data.error || data.message)) || messageForStatus(res.status);
    throw new ApiError(message, res.status);
  }
  return data;
}

async function request(path, options = {}) {
  const { headers, body, ...rest } = options;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...rest,
      headers: buildHeaders(headers, isFormData),
      body,
    });
  } catch {
    throw new ApiError('Network error. Please check your connection and try again.');
  }

  return parseResponse(res);
}

export async function requestBlob(path) {
  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, { headers: buildHeaders() });
  } catch {
    throw new ApiError('Network error. Please check your connection and try again.');
  }

  if (!res.ok) {
    const data = await textOrNull(res);
    const message = (data && (data.error || data.message)) || messageForStatus(res.status);
    throw new ApiError(message, res.status);
  }

  return res.blob();
}

export { BASE_URL };
export default request;
