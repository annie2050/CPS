// Lightweight frontend auth service with silent refresh flow
// Assumes backend provides: POST /api/auth/login, POST /api/auth/refresh, POST /api/auth/logout
// Token-based authentication: access token sent via Authorization: Bearer <token>

import { TOKEN_EXPIRED_MESSAGE } from './i18n/messages.js';
import { showBanner } from './utils/banner.js';

let accessToken = null;

function getAccessToken() {
  if (!accessToken) {
    accessToken = localStorage.getItem('token');
  }
  return accessToken;
}

export function setAccessToken(token) {
  accessToken = token || null;
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
}

function clearSession() {
  accessToken = null;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

// Login and store access token in memory
export async function login(email, password) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include',
  });
  // Safely parse JSON; guard against empty/non-JSON responses
  let data = {};
  try {
    data = await res.json();
  } catch (e) {
    data = {};
  }
  if (!res.ok) {
    throw new Error(data.error || 'Login failed');
  }
  setAccessToken(data.token);
  return data.user;
}

// Refresh the access token using the refresh token cookie
async function refreshTokenIfNeeded() {
  const res = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });
  if (!res.ok) {
    clearSession();
    return false;
  }
  const data = await res.json();
  if (data?.token) {
    setAccessToken(data.token);
    return true;
  }
  return false;
}


// Generic fetch with automatic token handling
export async function fetchWithAuth(input, init = {}) {
  const headers = init.headers ? { ...init.headers } : {};
  const token = getAccessToken();
  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  }
  const res = await fetch(input, { ...init, headers });
  if (res.status === 401) {
    // Try silent refresh
    const ok = await refreshTokenIfNeeded();
    if (ok) {
      const retryHeaders = init.headers ? { ...init.headers } : {};
      if (accessToken) retryHeaders['Authorization'] = 'Bearer ' + accessToken;
      const retry = await fetch(input, { ...init, headers: retryHeaders });
      return retry;
    } else {
      showBanner(TOKEN_EXPIRED_MESSAGE, { redirectUrl: '/login' });
      return Promise.reject(new Error(TOKEN_EXPIRED_MESSAGE));
    }
  }
  return res;
}

export function logout() {
  clearSession();
  // Inform backend to clear refresh cookie
  return fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
}

export function getCurrentUser() {
  // In a full app, you would store user in context; this is a placeholder
  return null;
}
