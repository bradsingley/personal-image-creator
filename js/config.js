/**
 * lab-api client (cookie-authenticated against api.bradsingley.com).
 * Mirrors the pattern used in mudbord/js/config.js.
 */

const API_BASE = window.LAB_API_BASE || 'https://api.bradsingley.com';

async function api(path, options = {}) {
    const method = options.method || 'GET';
    const headers = { ...(options.headers || {}) };
    let body;
    if (options.body !== undefined) {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(options.body);
    }

    let res;
    try {
        res = await fetch(`${API_BASE}${path}`, {
            method,
            headers,
            body,
            credentials: 'include',
            cache: 'no-store',
        });
    } catch (err) {
        return { data: null, error: { message: err.message || 'Network error', status: 0 } };
    }

    if (res.status === 204) return { data: null, error: null };

    let json = null;
    try {
        json = await res.json();
    } catch {
        // No JSON body
    }

    if (!res.ok) {
        const msg = json?.message || json?.error || `Request failed (${res.status})`;
        return { data: null, error: { message: msg, status: res.status } };
    }

    return { data: json, error: null };
}
