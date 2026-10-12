/**
 * Global API plumbing for every fetch()/axios call to our backend:
 *  - adds the stored access token when a call does not send one
 *  - sends cookies (credentials) on /api/auth/* and invitation accept, so the
 *    httpOnly refresh-token cookie can be set / read
 *  - when the access token expires (401 TOKEN_EXPIRED) it refreshes ONCE
 *    (single-flight) and retries the original request
 *  - reacts to account gates: session ended -> login, MFA required -> security
 *    page, email not verified -> verify page, client account -> portal
 * Requests to other hosts are untouched.
 */
import axios from 'axios';
import { API_BASE_URL } from './api';

const isApiUrl = (url) => typeof url === 'string' && url.startsWith(API_BASE_URL);
const needsCookies = (url) => isApiUrl(url) && /\/api\/(auth\/|invitations\/accept)/.test(url);
const isRefreshUrl = (url) => isApiUrl(url) && url.includes('/api/auth/refresh');
// Meta Ads screens: the ad account chosen in the picker (our row id, never a token) goes with every ads call
export const AD_ACCOUNT_KEY = 'tl_meta_ad_account';
const isAdsUrl = (url) => isApiUrl(url) && /\/api\/(meta-ads|facebook\/campaigns)(\/|\?|$)/.test(url);
const chosenAdAccount = () => {
  try { const v = window.localStorage.getItem(AD_ACCOUNT_KEY); return v && /^\d{1,9}$/.test(v) ? v : null; } catch { return null; }
};

const store = {
  get token() {
    try { return localStorage.getItem('token'); } catch { return null; }
  },
  set token(v) {
    try { v ? localStorage.setItem('token', v) : localStorage.removeItem('token'); } catch { /* ignore */ }
  },
};

const AUTH_PAGES = ['/authentication/', '/portal'];
const goTo = (path) => {
  if (typeof window === 'undefined') return;
  if (window.location.pathname === path) return;
  window.location.assign(path);
};

export const clearLocalSession = () => {
  try {
    ['token', 'user', 'permissions', 'lastChatId', 'auth_me', 'refresh_token'].forEach((k) => localStorage.removeItem(k));
  } catch { /* ignore */ }
};

let originalFetch = null;
let refreshing = null;

/** Single-flight refresh using the httpOnly cookie (or a body token if the backend is configured that way). */
export const refreshAccessToken = () => {
  if (!refreshing) {
    refreshing = (async () => {
      let body;
      try { body = localStorage.getItem('refresh_token') ? JSON.stringify({ refresh_token: localStorage.getItem('refresh_token') }) : undefined; } catch { body = undefined; }
      const res = await originalFetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.data?.token) throw new Error(json?.code || 'REFRESH_FAILED');
      store.token = json.data.token;
      if (json.data.refresh_token) localStorage.setItem('refresh_token', json.data.refresh_token);
      return json.data.token;
    })().finally(() => {
      setTimeout(() => { refreshing = null; }, 0);
    });
  }
  return refreshing;
};

const handleGate = (code) => {
  const onAuthPage = AUTH_PAGES.some((p) => window.location.pathname.startsWith(p));
  switch (code) {
    case 'SESSION_REVOKED':
    case 'ACCOUNT_DISABLED':
    case 'WORKSPACE_SUSPENDED':
    case 'TOKEN_INVALID':
    case 'TOKEN_MISSING':
      if (!onAuthPage) {
        clearLocalSession();
        goTo(`/authentication/login?reason=${encodeURIComponent(code)}`);
      }
      break;
    case 'MFA_SETUP_REQUIRED':
      goTo('/account/security?setup=mfa');
      break;
    case 'EMAIL_NOT_VERIFIED':
      goTo('/authentication/verify-email');
      break;
    case 'CLIENT_PORTAL_ONLY':
      goTo('/portal');
      break;
    default:
  }
};

const readCode = async (res) => {
  if (res.status !== 401 && res.status !== 403) return null;
  try {
    const j = await res.clone().json();
    return j && j.code;
  } catch {
    return null;
  }
};

export const installAuthInterceptors = () => {
  if (typeof window === 'undefined' || window.__tlsAuthInstalled) return;
  window.__tlsAuthInstalled = true;

  originalFetch = window.fetch.bind(window);

  const withAuth = (input, init, token) => {
    const url = typeof input === 'string' ? input : input && input.url;
    const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
    if (token && isApiUrl(url) && !isRefreshUrl(url)) headers.set('Authorization', `Bearer ${token}`);
    if (isAdsUrl(url) && !headers.has('X-Meta-Ad-Account') && chosenAdAccount()) headers.set('X-Meta-Ad-Account', chosenAdAccount());
    return { ...init, headers, ...(needsCookies(url) ? { credentials: 'include' } : {}) };
  };

  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input && input.url;
    if (!isApiUrl(url)) return originalFetch(input, init);

    const existing = new Headers(init.headers || (input instanceof Request ? input.headers : undefined)).get('Authorization');
    const token = store.token;
    // keep an explicitly passed token unless it is the stale stored one
    const useToken = existing && existing !== `Bearer ${token}` ? existing.replace(/^Bearer\s+/, '') : token;
    const res = await originalFetch(input, withAuth(input, init, useToken));

    const code = await readCode(res);
    if (code === 'TOKEN_EXPIRED' && !isRefreshUrl(url)) {
      try {
        const fresh = await refreshAccessToken();
        return originalFetch(input, withAuth(input, init, fresh));
      } catch {
        handleGate('SESSION_REVOKED');
        return res;
      }
    }
    if (code) handleGate(code);
    return res;
  };

  axios.interceptors.request.use((config) => {
    const url = config.baseURL ? `${config.baseURL}${config.url || ''}` : config.url;
    if (isApiUrl(url)) {
      const token = store.token;
      config.headers = config.headers || {};
      if (token) config.headers.Authorization = `Bearer ${token}`;
      if (isAdsUrl(url) && chosenAdAccount() && !(config.headers['X-Meta-Ad-Account'] || config.headers['x-meta-ad-account'])) config.headers['X-Meta-Ad-Account'] = chosenAdAccount();
      if (needsCookies(url)) config.withCredentials = true;
    }
    return config;
  });

  axios.interceptors.response.use(
    (r) => r,
    async (error) => {
      const { config, response } = error || {};
      const code = response && response.data && response.data.code;
      const url = config && (config.baseURL ? `${config.baseURL}${config.url || ''}` : config.url);
      if (code === 'TOKEN_EXPIRED' && config && !config.__retried && isApiUrl(url)) {
        try {
          const fresh = await refreshAccessToken();
          config.__retried = true;
          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${fresh}`;
          return axios(config);
        } catch {
          handleGate('SESSION_REVOKED');
        }
      } else if (code) {
        handleGate(code);
      }
      return Promise.reject(error);
    }
  );
};
