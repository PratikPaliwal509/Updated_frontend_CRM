/**
 * Small helpers shared by the auth / account / workspace screens.
 */
import { API_BASE_URL } from '../config/api';
import { clearLocalSession } from '../config/httpAuth';

/** fetch JSON from our API; throws an Error with the server message (and .code / .status). */
export const api = async (path, { method = 'GET', body, headers } = {}) => {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(headers || {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json = {};
  try { json = await res.json(); } catch { json = {}; }
  if (!res.ok || json.success === false) {
    const err = new Error(json.message || `Request failed (${res.status})`);
    err.code = json.code;
    err.status = res.status;
    err.data = json;
    throw err;
  }
  return json.data;
};

/** Store tokens returned by login / signup / invitation accept, then load /auth/me. */
export const saveSession = async (data) => {
  localStorage.setItem('token', data.token);
  if (data.refresh_token) localStorage.setItem('refresh_token', data.refresh_token);
  const u = data.user || {};
  // the existing screens read these fields from localStorage.user
  localStorage.setItem('user', JSON.stringify({
    user_id: u.user_id, agency_id: u.agency_id, role_id: u.role_id, department_id: u.department_id, team_id: u.team_id,
    email: u.email, first_name: u.first_name, last_name: u.last_name, full_name: u.full_name, phone: u.phone,
    avatar_url: u.avatar_url, job_title: u.job_title, timezone: u.timezone, language: u.language,
    is_active: u.is_active, is_verified: u.is_verified, user_type: u.user_type,
    notification_preferences: u.notification_preferences, permissions: {},
  }));
  return loadMe(true);
};

let meCache = null;
/** Current user + workspace context (cached for the page lifetime). */
export const loadMe = async (force = false) => {
  if (meCache && !force) return meCache;
  meCache = await api('/api/auth/me');
  try { localStorage.setItem('auth_me', JSON.stringify(meCache)); } catch { /* ignore */ }
  return meCache;
};

export const cachedMe = () => {
  if (meCache) return meCache;
  try { return JSON.parse(localStorage.getItem('auth_me') || 'null'); } catch { return null; }
};

/** Where to go right after signing in. */
export const landingPath = (me, fallback = '/') => {
  if (!me) return fallback;
  if (me.user.user_type === 'client') return '/portal';
  if (me.workspace && me.workspace.is_owner && !me.workspace.onboarding_completed) return '/onboarding';
  return fallback;
};

/** Only same-app paths are accepted as a post-login redirect target. */
export const safeNext = (n) => (typeof n === 'string' && n.startsWith('/') && !n.startsWith('//') && !n.startsWith('/authentication') ? n : null);

export const logout = async () => {
  try {
    await fetch(`${API_BASE_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' });
  } catch { /* offline: still clear locally */ }
  meCache = null;
  clearLocalSession();
};

export const PASSWORD_HINT = 'At least 8 characters, including a letter and a number.';
export const passwordProblem = (p) => {
  if (!p || p.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Za-z]/.test(p) || !/[0-9]/.test(p)) return 'Password must contain a letter and a number';
  return null;
};
