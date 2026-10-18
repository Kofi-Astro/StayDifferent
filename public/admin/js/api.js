/**
 * Tiny wrapper around fetch() for the admin JSON API (/admin/api/…).
 * - Sends/receives JSON
 * - Turns error responses into thrown Errors with a readable message
 * - Sends you back to the login page if the session has expired
 */

export async function api(path, { method = 'GET', body, headers = {}, raw = false } = {}) {
  const res = await fetch(`/admin/api${path}`, {
    method,
    headers: raw ? headers : { 'Content-Type': 'application/json', ...headers },
    body: raw ? body : body === undefined ? undefined : JSON.stringify(body),
    credentials: 'same-origin',
  });
  if (res.status === 401) {
    window.location.href = '/admin/login';
    throw new Error('Session expired');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.details = data.errors || [];
    throw err;
  }
  return data;
}

/** Upload one image file; resolves to { url, name }. */
export function uploadImage(file) {
  return api('/upload', {
    method: 'POST',
    raw: true,
    body: file,
    headers: { 'Content-Type': file.type, 'X-Filename': file.name },
  });
}
