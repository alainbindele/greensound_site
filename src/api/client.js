/**
 * Thin fetch wrapper around the Greensound API.
 *
 * Relative URLs by default, so the same build runs on localhost, a staging
 * host or the production domain with no configuration. Set VITE_API_URL only
 * when the API lives on a different origin than the site.
 */
const BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function request(pathname, { method = 'GET', body, headers, ...rest } = {}) {
  const isFormData = body instanceof FormData;

  const response = await fetch(`${BASE_URL}${pathname}`, {
    method,
    // Session lives in an HTTP-only cookie; it must ride along on every call.
    credentials: 'include',
    headers: {
      ...(isFormData || body === undefined
        ? {}
        : { 'Content-Type': 'application/json' }),
      ...headers,
    },
    body: isFormData ? body : body === undefined ? undefined : JSON.stringify(body),
    ...rest,
  });

  if (response.status === 204) return null;

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    throw new ApiError(
      data?.error || `Request failed with status ${response.status}`,
      response.status,
      data
    );
  }

  return data;
}

export const api = {
  get: (pathname, options) => request(pathname, { ...options, method: 'GET' }),
  post: (pathname, body, options) => request(pathname, { ...options, method: 'POST', body }),
  patch: (pathname, body, options) => request(pathname, { ...options, method: 'PATCH', body }),
  delete: (pathname, options) => request(pathname, { ...options, method: 'DELETE' }),
};
