/**
 * Browser wiring for the E2EE client: one crypto device per browser profile and user.
 * - device id + key-store passphrase are random values kept in this browser only
 * - the crypto engine keeps its keys in IndexedDB (encrypted with that passphrase)
 * - requests go to /api/e2ee with the normal login token (added by config/httpAuth) and the device id
 * Nothing here comes from or goes to the login password.
 */
import { API_BASE_URL } from '../config/api';
import { E2eeClient } from './E2eeClient';

let current = null; // { userId, client, ready }

const randomId = (n) => {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(n));
  return Array.from(bytes, (b) => abc[b % abc.length]).join('');
};
const keyOf = (userId, k) => `tl_e2ee_${k}_${userId}`;
const local = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
  del: (k) => { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};

const browserName = () => {
  const ua = navigator.userAgent;
  const b = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  const os = /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'Mac' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Linux/.test(ua) ? 'Linux' : '';
  return `${b}${os ? ` on ${os}` : ''}`;
};

const http = async (method, path, body, { device } = {}) => {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(device ? { 'X-E2EE-Device': device } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    const e = new Error(json.message || `Request failed (${res.status})`);
    e.status = res.status; e.code = json.code;
    throw e;
  }
  return json;
};

/** The ready client for this user (creates the device on first use). */
export const getE2ee = (userId) => {
  if (current && current.userId === userId) return current.ready;
  const ready = (async () => {
    const M = await import('@matrix-org/matrix-sdk-crypto-wasm');
    await M.initAsync();
    let deviceId = local.get(keyOf(userId, 'device'));
    let pass = local.get(keyOf(userId, 'store'));
    if (!deviceId || !pass) {
      deviceId = randomId(10);
      pass = randomId(32);
      local.set(keyOf(userId, 'device'), deviceId);
      local.set(keyOf(userId, 'store'), pass);
    }
    const client = new E2eeClient({ M, http, userId, deviceId, storeName: `tl-e2ee-${userId}-${deviceId}`, storePassphrase: pass });
    client.displayName = browserName();
    try {
      await client.start();
    } catch (err) {
      if (err.code === 'E2EE_UNKNOWN_DEVICE' || err.code === 'E2EE_DEVICE_KEYS_CHANGED') {
        // this browser was removed from the account (or its store was wiped): start as a new device
        await forget(userId, deviceId);
        current = null;
        return getE2ee(userId);
      }
      throw err;
    }
    return client;
  })();
  current = { userId, ready };
  ready.catch(() => { if (current && current.ready === ready) current = null; });
  return ready;
};

const deleteDb = (name) => new Promise((resolve) => {
  try {
    const r = indexedDB.deleteDatabase(name);
    r.onsuccess = r.onerror = r.onblocked = () => resolve();
  } catch { resolve(); }
});

/** Removes this browser's keys (used by "Remove secure chat from this browser"). */
export const forget = async (userId, deviceId) => {
  if (current && current.userId === userId) {
    try { (await current.ready).machine?.close?.(); } catch { /* not started */ }
    current = null;
  }
  for (const suffix of ['', '::matrix-sdk-crypto', '::matrix-sdk-crypto-meta']) await deleteDb(`tl-e2ee-${userId}-${deviceId}${suffix}`);
  local.del(keyOf(userId, 'device'));
  local.del(keyOf(userId, 'store'));
};

export const removeThisBrowser = async (userId) => {
  const client = await getE2ee(userId).catch(() => null);
  const deviceId = local.get(keyOf(userId, 'device'));
  if (client) await http('DELETE', `/api/e2ee/devices/${deviceId}`).catch(() => {});
  await forget(userId, deviceId);
};
