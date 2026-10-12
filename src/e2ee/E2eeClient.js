/**
 * End-to-end encryption client (runs in the browser; also used by the backend security tests in Node).
 *
 * Cryptography is done ONLY by the audited Matrix crypto engine (@matrix-org/matrix-sdk-crypto-wasm,
 * built on vodozemac): Olm (double ratchet, X3DH-style session setup) between devices and Megolm for
 * chat messages, cross-signing, SAS emoji verification, encrypted attachments and encrypted
 * key backup. This file only moves the engine's requests to our key server (/api/e2ee) and back.
 *
 * The one thing done here with the browser's standard WebCrypto (AES-256-GCM + HKDF-SHA-256) is
 * wrapping the user's secrets bundle (cross-signing private keys + backup key) with the RECOVERY KEY
 * (32 random bytes shown to the user once). The server stores only that encrypted blob.
 *
 * Nothing here is derived from the login password, OTPs or access tokens.
 */

const DOMAIN = 'techleela';
export const mxid = (userId) => `@u${userId}:${DOMAIN}`;
export const userIdOf = (m) => { const r = /^@u(\d+):/.exec(String(m || '')); return r ? Number(r[1]) : null; };
export const roomIdOf = (chatId) => `!c${chatId}:${DOMAIN}`;

/* global Buffer */ // Node (tests) has Buffer; browsers use btoa/atob - both paths are guarded
const MEGOLM = 'm.megolm.v1.aes-sha2';
const SECRET_ALG = 'tl.aes-256-gcm.hkdf-sha256.v1';
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/* ---------------------------------------------------------------- small helpers (encoding only) */
const b64 = {
  enc: (u8) => (typeof Buffer !== 'undefined' ? Buffer.from(u8).toString('base64') : btoa(String.fromCharCode(...u8))),
  dec: (s) => (typeof Buffer !== 'undefined' ? new Uint8Array(Buffer.from(s, 'base64')) : Uint8Array.from(atob(s), (c) => c.charCodeAt(0))),
};
const base32 = (bytes) => {
  let bits = 0; let value = 0; let out = '';
  for (const byte of bytes) {
    value = (value << 8) | byte; bits += 8;
    while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
};
const unbase32 = (s) => {
  const clean = String(s || '').toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0; let value = 0; const out = [];
  for (const ch of clean) {
    value = (value << 5) | B32.indexOf(ch); bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return new Uint8Array(out);
};
/** Canonical JSON (sorted keys, no spaces) - what Matrix signs. */
export const canonicalJson = (v) => {
  if (Array.isArray(v)) return `[${v.map(canonicalJson).join(',')}]`;
  if (v && typeof v === 'object') return `{${Object.keys(v).sort().filter((k) => v[k] !== undefined).map((k) => `${JSON.stringify(k)}:${canonicalJson(v[k])}`).join(',')}}`;
  return JSON.stringify(v);
};
const subtle = () => globalThis.crypto.subtle;
const randomBytes = (n) => globalThis.crypto.getRandomValues(new Uint8Array(n));

/* ---------------------------------------------------------------- recovery key wrapping (WebCrypto) */
export const formatRecoveryKey = (bytes) => base32(bytes).match(/.{1,4}/g).join(' ');
export const parseRecoveryKey = (text) => {
  const bytes = unbase32(text);
  if (bytes.length !== 32) throw new E2eeError('BAD_RECOVERY_KEY', 'That recovery key is not valid. Check it and try again.');
  return bytes;
};
const deriveKey = async (recoveryBytes, usage) => {
  const base = await subtle().importKey('raw', recoveryBytes, 'HKDF', false, ['deriveKey', 'deriveBits']);
  if (usage === 'check') {
    const bits = await subtle().deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: new TextEncoder().encode('techleela-e2ee-recovery-check') }, base, 256);
    return b64.enc(new Uint8Array(bits)).replace(/[^A-Za-z0-9]/g, '').slice(0, 32);
  }
  return subtle().deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: new TextEncoder().encode('techleela-e2ee-secret-storage') }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
};
export const sealSecrets = async (recoveryBytes, obj) => {
  const key = await deriveKey(recoveryBytes, 'enc');
  const iv = randomBytes(12);
  const ct = new Uint8Array(await subtle().encrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(SECRET_ALG) }, key, new TextEncoder().encode(JSON.stringify(obj))));
  return { algorithm: SECRET_ALG, payload: `${b64.enc(iv)}.${b64.enc(ct)}`, key_id: await deriveKey(recoveryBytes, 'check') };
};
export const openSecrets = async (recoveryBytes, stored) => {
  if (stored.algorithm !== SECRET_ALG) throw new E2eeError('UNSUPPORTED', 'Unsupported recovery data');
  if (stored.key_id !== await deriveKey(recoveryBytes, 'check')) throw new E2eeError('WRONG_RECOVERY_KEY', 'That recovery key does not match your account.');
  const [iv, ct] = stored.payload.split('.');
  const key = await deriveKey(recoveryBytes, 'enc');
  try {
    const pt = await subtle().decrypt({ name: 'AES-GCM', iv: b64.dec(iv), additionalData: new TextEncoder().encode(SECRET_ALG) }, key, b64.dec(ct));
    return JSON.parse(new TextDecoder().decode(pt));
  } catch (e) {
    throw new E2eeError('WRONG_RECOVERY_KEY', 'The recovery data could not be decrypted with this key.');
  }
};

export class E2eeError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

/* ---------------------------------------------------------------- the client */
export class E2eeClient {
  /**
   * @param {object} o
   * @param {object} o.M        the matrix-sdk-crypto-wasm module (already initialised)
   * @param {Function} o.http   (method, path, body?, {device}) => parsed JSON; throws {status, code, message}
   * @param {number} o.userId   our user id
   * @param {string} o.deviceId this browser's device id
   * @param {string} [o.storeName] IndexedDB store (browser); omitted = in memory (tests)
   * @param {string} [o.storePassphrase]
   */
  constructor({ M, http, userId, deviceId, storeName, storePassphrase }) {
    Object.assign(this, { M, http, userId, deviceId, storeName, storePassphrase });
    this.me = mxid(userId);
    this.since = null;
    this.busy = Promise.resolve();
    this.roomMembers = new Map(); // roomId -> last member set we shared keys with
    this.listeners = new Set();
  }

  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit(type, data) { for (const fn of this.listeners) { try { fn(type, data); } catch (e) { /* listener error */ } } }

  api(method, path, body) { return this.http(method, `/api/e2ee${path}`, body, { device: this.deviceId }); }

  /** Serialises engine work (the engine is not re-entrant for request handling). */
  lock(fn) {
    const run = this.busy.then(fn, fn);
    this.busy = run.catch(() => {});
    return run;
  }

  async start() {
    const { M } = this;
    await this.http('POST', '/api/e2ee/devices', { device_id: this.deviceId, display_name: this.displayName || 'Browser' });
    this.machine = await M.OlmMachine.initialize(new M.UserId(this.me), new M.DeviceId(this.deviceId), this.storeName, this.storePassphrase);
    await this.lock(() => this.processOutgoing());
    await this.sync();
    return this;
  }

  /* -------------------------------------------------- engine <-> key server */
  async sendRequest(req) {
    const { M } = this;
    const body = req.body ? JSON.parse(req.body) : {};
    switch (req.type) {
      case M.RequestType.KeysUpload: return this.api('POST', '/keys/upload', body);
      case M.RequestType.KeysQuery: return this.api('POST', '/keys/query', body);
      case M.RequestType.KeysClaim: return this.api('POST', '/keys/claim', body);
      case M.RequestType.ToDevice: return this.api('PUT', `/sendToDevice/${encodeURIComponent(req.event_type)}/${encodeURIComponent(req.txn_id)}`, body);
      case M.RequestType.SignatureUpload: return this.api('POST', '/keys/signatures/upload', body);
      case M.RequestType.KeysBackup: return this.api('PUT', `/room_keys/keys?version=${encodeURIComponent(req.version)}`, body);
      default: return null; // room-message verification is not used
    }
  }

  async processOutgoing() {
    for (let round = 0; round < 10; round += 1) {
      const reqs = await this.machine.outgoingRequests();
      if (!reqs.length) return;
      for (const req of reqs) {
        const res = await this.sendRequest(req);
        if (res !== null && req.id) await this.machine.markRequestAsSent(req.id, req.type, JSON.stringify(res));
      }
    }
  }

  async sendOutgoingVerification(req) {
    if (!req) return;
    const { M } = this;
    if (req instanceof M.ToDeviceRequest || req.type === M.RequestType.ToDevice) {
      const res = await this.sendRequest(req);
      if (req.id) await this.machine.markRequestAsSent(req.id, M.RequestType.ToDevice, JSON.stringify(res || {}));
    } else if (req.type === M.RequestType.SignatureUpload) {
      const res = await this.sendRequest(req);
      if (req.id) await this.machine.markRequestAsSent(req.id, req.type, JSON.stringify(res || {}));
    }
  }

  /** Pull device-to-device messages + key changes (call on start, on socket "e2ee:sync", periodically). */
  sync() {
    return this.lock(async () => {
      const { M } = this;
      for (let i = 0; i < 20; i += 1) {
        const r = await this.api('GET', `/sync${this.since ? `?since=${encodeURIComponent(this.since)}` : ''}`);
        const counts = new Map(Object.entries(r.device_one_time_keys_count || {}));
        const lists = new M.DeviceLists((r.device_lists?.changed || []).map((u) => new M.UserId(u)), []);
        const processed = await this.machine.receiveSyncChanges(JSON.stringify(r.to_device?.events || []), lists, counts, new Set(r.device_unused_fallback_key_types || []));
        this.since = r.next_batch;
        await this.processOutgoing();
        if ((r.to_device?.events || []).length) this.emit('to-device', processed);
        if ((r.device_lists?.changed || []).length) this.emit('devices-changed', r.device_lists.changed);
        if (!r.has_more) break;
      }
      await this.backupNow();
    });
  }

  /* -------------------------------------------------- identity, recovery, linking */
  async status() { return this.http('GET', '/api/e2ee/status'); }

  /** True when this device is cross-signed by our own identity (i.e. trusted by contacts). */
  async isDeviceTrusted() {
    const d = await this.machine.getDevice(new this.M.UserId(this.me), new this.M.DeviceId(this.deviceId));
    return !!(d && d.isCrossSignedByOwner());
  }

  /**
   * First device of a user: create the cross-signing identity, an encrypted key backup and the
   * recovery key. Returns the recovery key text (show it once; it is never sent to the server).
   * `reset` replaces an existing identity (contacts will see a security-key change warning).
   */
  async setupIdentity({ reset = false } = {}) {
    const key = await this.lock(async () => {
      const { M } = this;
      const boot = await this.machine.bootstrapCrossSigning(true);
      if (boot.uploadKeysRequest) {
        const r = await this.sendRequest(boot.uploadKeysRequest);
        if (boot.uploadKeysRequest.id) await this.machine.markRequestAsSent(boot.uploadKeysRequest.id, M.RequestType.KeysUpload, JSON.stringify(r));
      }
      await this.api('POST', '/keys/device_signing/upload', { ...JSON.parse(boot.uploadSigningKeysRequest.body), ...(reset ? { confirm_reset: true } : {}) });
      await this.api('POST', '/keys/signatures/upload', JSON.parse(boot.uploadSignaturesRequest.body));
      await this.processOutgoing();
      // encrypted key backup (only the backup key, kept inside the secrets bundle, can read it)
      const backupKey = M.BackupDecryptionKey.createRandomKey();
      const authData = { public_key: backupKey.megolmV1PublicKey.publicKeyBase64 };
      const sigs = await this.machine.sign(canonicalJson(authData));
      authData.signatures = JSON.parse(sigs.asJSON());
      const { version } = await this.api('POST', '/room_keys/version', { algorithm: 'm.megolm_backup.v1.curve25519-aes-sha2', auth_data: authData });
      await this.machine.saveBackupDecryptionKey(backupKey, version);
      await this.machine.enableBackupV1(backupKey.megolmV1PublicKey.publicKeyBase64, version);
      // recovery key wraps the secrets bundle (cross-signing private keys + backup key)
      const recovery = randomBytes(32);
      const bundle = await this.machine.exportSecretsBundle();
      await this.api('PUT', '/secret-storage', await sealSecrets(recovery, bundle.to_json()));
      return formatRecoveryKey(recovery);
    });
    await this.refreshKeys(); // pick up our own new signatures so this device counts as trusted
    return key;
  }

  /** Replaces the recovery key (same identity, nothing changes for contacts). Returns the new key text. */
  rotateRecoveryKey() {
    return this.lock(async () => {
      const bundle = await this.machine.exportSecretsBundle();
      const recovery = randomBytes(32);
      await this.api('PUT', '/secret-storage', await sealSecrets(recovery, bundle.to_json()));
      return formatRecoveryKey(recovery);
    });
  }

  /** New device: unlock with the recovery key -> trusted device + message history restored. */
  async restoreWithRecoveryKey(text) {
    await this.lock(async () => {
      const { M } = this;
      const recovery = parseRecoveryKey(text);
      const stored = await this.http('GET', '/api/e2ee/secret-storage');
      const bundleJson = await openSecrets(recovery, stored);
      await this.machine.importSecretsBundle(M.SecretsBundle.from_json(bundleJson));
      await this.trustOwnDevice();
      await this.enableBackupFromStore();
    });
    await this.refreshKeys();
    await this.lock(() => this.restoreBackup());
  }

  /** Let the engine pick up signature / device changes published by the server. */
  async refreshKeys() { await this.sync(); await this.sync(); }

  /** Sign this device with our self-signing key and publish the signature. */
  async trustOwnDevice() {
    const { M } = this;
    await this.machine.updateTrackedUsers([new M.UserId(this.me)]);
    await this.processOutgoing();
    const dev = await this.machine.getDevice(new M.UserId(this.me), new M.DeviceId(this.deviceId));
    if (dev && !dev.isCrossSignedByOwner()) {
      const req = await dev.verify();
      await this.api('POST', '/keys/signatures/upload', JSON.parse(req.body));
    }
    const own = await this.machine.getIdentity(new M.UserId(this.me));
    if (own && !own.isVerified()) {
      const req = await own.verify();
      await this.api('POST', '/keys/signatures/upload', JSON.parse(req.body));
    }
    await this.machine.updateTrackedUsers([new M.UserId(this.me)]);
    await this.processOutgoing();
  }

  async enableBackupFromStore() {
    const keys = await this.machine.getBackupKeys();
    if (!keys?.decryptionKey) return false;
    const info = await this.api('GET', '/room_keys/version').catch(() => null);
    if (!info) return false;
    if (info.auth_data?.public_key !== keys.decryptionKey.megolmV1PublicKey.publicKeyBase64) return false;
    await this.machine.saveBackupDecryptionKey(keys.decryptionKey, info.version);
    await this.machine.enableBackupV1(keys.decryptionKey.megolmV1PublicKey.publicKeyBase64, info.version);
    return true;
  }

  async backupNow() {
    try {
      if (!(await this.machine.isBackupEnabled())) return;
      for (let i = 0; i < 20; i += 1) {
        const req = await this.machine.backupRoomKeys();
        if (!req) return;
        const res = await this.sendRequest(req);
        await this.machine.markRequestAsSent(req.id, this.M.RequestType.KeysBackup, JSON.stringify(res));
      }
    } catch (e) {
      this.emit('warning', `Key backup failed: ${e.message}`);
    }
  }

  /** Downloads the encrypted key backup and imports the room keys it can decrypt. */
  async restoreBackup() {
    const { M } = this;
    const keys = await this.machine.getBackupKeys();
    if (!keys?.decryptionKey) return 0;
    const info = await this.api('GET', '/room_keys/version').catch(() => null);
    if (!info) return 0;
    const data = await this.api('GET', `/room_keys/keys?version=${encodeURIComponent(info.version)}`);
    const map = new Map();
    for (const [room, { sessions }] of Object.entries(data.rooms || {})) {
      const inner = new Map();
      for (const [sid, s] of Object.entries(sessions || {})) {
        try {
          const plain = keys.decryptionKey.decryptV1(s.session_data.ephemeral, s.session_data.mac, s.session_data.ciphertext);
          inner.set(sid, JSON.parse(plain));
        } catch (e) { /* skip a damaged entry */ }
      }
      map.set(new M.RoomId(room), inner);
    }
    if (!map.size) return 0;
    const r = await this.machine.importBackedUpRoomKeys(map, undefined, info.version);
    return r.importedCount;
  }

  /* -------------------------------------------------- own-device linking (emoji / SAS) */
  /** New device asks an existing (trusted) device of ours to verify it. */
  async requestSelfVerification() {
    return this.lock(async () => {
      const { M } = this;
      await this.machine.updateTrackedUsers([new M.UserId(this.me)]);
      await this.processOutgoing();
      const own = await this.machine.getIdentity(new M.UserId(this.me));
      if (!own) throw new E2eeError('NO_IDENTITY', 'No secure chat identity found for your account.');
      const [request, out] = await own.requestVerification([M.VerificationMethod.SasV1]);
      await this.sendOutgoingVerification(out);
      this.pendingRequest = request;
      return request;
    });
  }

  /** Incoming verification requests from our other devices (shown as "approve new device"). */
  incomingSelfRequests() {
    const { M } = this;
    return this.machine.getVerificationRequests(new M.UserId(this.me)).filter((r) => !r.weStarted() && !r.isDone() && !r.isCancelled());
  }

  async acceptRequest(request) {
    return this.lock(async () => {
      await this.sendOutgoingVerification(request.acceptWithMethods([this.M.VerificationMethod.SasV1]));
    });
  }

  async startSas(request) {
    return this.lock(async () => {
      const r = await request.startSas();
      if (!r) return null;
      const [sas, out] = r;
      await this.sendOutgoingVerification(out);
      return sas;
    });
  }

  /** The SAS object of a request once both sides started it (null until then). */
  sasOf(request) {
    const v = request.getVerification();
    return v && v.constructor && v.constructor.name === 'Sas' ? v : (v && typeof v.emoji === 'function' ? v : null);
  }

  async acceptSas(sas) { return this.lock(async () => this.sendOutgoingVerification(sas.accept())); }

  async confirmSas(sas) {
    return this.lock(async () => {
      const outs = await sas.confirm();
      for (const o of outs) await this.sendOutgoingVerification(o);
      await this.processOutgoing();
    });
  }

  async cancelVerification(requestOrSas) { return this.lock(async () => this.sendOutgoingVerification(requestOrSas.cancel())); }

  /** After an existing device verified us: fetch the secrets it shares with verified own devices. */
  async collectSecretsFromOtherDevice() {
    await this.lock(async () => {
      await this.machine.requestMissingSecretsIfNeeded();
      await this.processOutgoing();
    });
    for (let i = 0; i < 20; i += 1) {
      await this.sync();
      const status = await this.machine.crossSigningStatus();
      const backup = await this.machine.getSecretsFromInbox('m.megolm_backup.v1');
      if (backup.size) {
        const key = this.M.BackupDecryptionKey.fromBase64([...backup][0]);
        const info = await this.api('GET', '/room_keys/version').catch(() => null);
        if (info) await this.machine.saveBackupDecryptionKey(key, info.version);
        await this.machine.deleteSecretsFromInbox('m.megolm_backup.v1');
      }
      if (status.hasMaster && status.hasSelfSigning && status.hasUserSigning) {
        await this.lock(() => this.trustOwnDevice());
        await this.enableBackupFromStore();
        await this.refreshKeys();
        await this.lock(() => this.restoreBackup());
        return true;
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    return false;
  }

  /* -------------------------------------------------- contacts: safety numbers */
  async identityOf(userId) {
    const { M } = this;
    await this.machine.updateTrackedUsers([new M.UserId(mxid(userId))]);
    await this.lock(() => this.processOutgoing());
    return this.machine.getIdentity(new M.UserId(mxid(userId)));
  }

  /**
   * Safety number for a contact: derived from both users' master signing keys (sorted), so both
   * people see the same 60 digits. Compare it in person / by phone, then mark as verified.
   */
  async safetyNumber(userId) {
    const theirs = await this.identityOf(userId);
    const mine = await this.machine.getIdentity(new this.M.UserId(this.me));
    if (!theirs || !mine) return null;
    const keyOf = (id) => Object.values(JSON.parse(id.masterKey).keys)[0];
    const parts = [[this.me, keyOf(mine)], [mxid(userId), keyOf(theirs)]].sort((a, b) => a[0].localeCompare(b[0]));
    const digest = new Uint8Array(await subtle().digest('SHA-512', new TextEncoder().encode(parts.map((p) => p.join('|')).join('||'))));
    let digits = '';
    for (let i = 0; digits.length < 60; i += 5) {
      const n = ((digest[i] * 2 ** 32) + (digest[i + 1] << 24 >>> 0) + (digest[i + 2] << 16) + (digest[i + 3] << 8) + digest[i + 4]) % 100000;
      digits += String(n).padStart(5, '0');
    }
    return { digits: digits.match(/.{5}/g).join(' '), verified: theirs.isVerified(), changed: theirs.hasVerificationViolation() || theirs.identityNeedsUserApproval() };
  }

  async markVerified(userId) {
    const theirs = await this.identityOf(userId);
    if (!theirs) throw new E2eeError('NO_IDENTITY', 'This person has not set up secure chat yet.');
    const req = await theirs.verify();
    await this.api('POST', '/keys/signatures/upload', JSON.parse(req.body));
    await this.refreshKeys();
  }

  /** Accept a contact's new security key after a reset (unverified identities only). */
  async acceptIdentityChange(userId) {
    const theirs = await this.identityOf(userId);
    if (!theirs) return;
    if (theirs.hasVerificationViolation()) await theirs.withdrawVerification();
    else if (theirs.identityNeedsUserApproval()) await theirs.pinCurrentMasterKey();
    this.roomMembers.clear();
  }

  /* -------------------------------------------------- messages */
  /**
   * Shares this chat's Megolm key with every cross-signed device of the members (identity-based
   * strategy: devices not signed by their owner get nothing, so the server cannot add a device),
   * rotating the key when someone left since the last share.
   */
  async prepareRoom(roomId, memberIds) {
    const { M } = this;
    const ids = [...new Set([...memberIds, this.userId])].map(mxid).sort();
    // wasm-bindgen takes ownership of UserId objects passed in arrays: build a fresh list per call
    const users = () => ids.map((u) => new M.UserId(u));
    const key = ids.join(',');
    const prev = this.roomMembers.get(roomId);
    if (prev && prev.split(',').some((u) => !ids.includes(u))) {
      await this.machine.invalidateGroupSession(new M.RoomId(roomId));
    }
    await this.machine.updateTrackedUsers(users());
    await this.processOutgoing();
    const claim = await this.machine.getMissingSessions(users());
    if (claim) {
      const res = await this.sendRequest(claim);
      await this.machine.markRequestAsSent(claim.id, claim.type, JSON.stringify(res));
    }
    const settings = new M.EncryptionSettings();
    settings.sharingStrategy = M.CollectStrategy.identityBasedStrategy();
    const toDevice = await this.machine.shareRoomKey(new M.RoomId(roomId), users(), settings);
    for (const req of toDevice) {
      const res = await this.sendRequest(req);
      await this.machine.markRequestAsSent(req.id, req.type, JSON.stringify(res));
    }
    this.roomMembers.set(roomId, key);
  }

  /** Called when the chat's member list changed: the next message uses a fresh key. */
  async rotateRoom(roomId) {
    await this.lock(() => this.machine.invalidateGroupSession(new this.M.RoomId(roomId)));
    this.roomMembers.delete(roomId);
  }

  /** Encrypts message content (any JSON) for the chat. Returns the ciphertext object to store. */
  encrypt(roomId, memberIds, content) {
    return this.lock(async () => {
      await this.prepareRoom(roomId, memberIds);
      const out = await this.machine.encryptRoomEvent(new this.M.RoomId(roomId), 'm.room.message', JSON.stringify(content));
      const ct = JSON.parse(out);
      if (ct.algorithm !== MEGOLM) throw new E2eeError('ENCRYPT_FAILED', 'Encryption failed');
      setTimeout(() => { this.lock(() => this.backupNow()).catch(() => {}); }, 0);
      return ct;
    });
  }

  /**
   * Decrypts a stored message. Sender devices must be cross-signed by their owner; the engine also
   * checks the key really belongs to the claimed sender and to this chat.
   * Returns { content, verified, shield } or throws E2eeError(code).
   */
  async decrypt(roomId, message) {
    const { M } = this;
    const event = {
      type: 'm.room.encrypted', content: message.ciphertext, sender: mxid(message.sender_id),
      event_id: `$m${message.message_id}`, origin_server_ts: new Date(message.created_at).getTime(), room_id: roomId,
    };
    const strict = new M.DecryptionSettings(M.TrustRequirement.CrossSigned);
    const attempt = (settings) => this.machine.decryptRoomEvent(JSON.stringify(event), new M.RoomId(roomId), settings);
    const deviceProblem = (e) => [M.DecryptionErrorCode.UnknownSenderDevice, M.DecryptionErrorCode.UnsignedSenderDevice].includes(e?.code);
    let res;
    let note = null;
    try {
      res = await attempt(strict);
    } catch (e) {
      if (!deviceProblem(e)) throw this.decryptError(e);
      // we may simply not know the sender's newest device yet
      await this.lock(async () => { await this.machine.updateTrackedUsers([new M.UserId(event.sender)]); await this.processOutgoing(); });
      try {
        res = await attempt(new M.DecryptionSettings(M.TrustRequirement.CrossSigned));
      } catch (e2) {
        if (!deviceProblem(e2)) throw this.decryptError(e2);
        // keys restored from the backup cannot prove which device sent them ("authenticity not
        // guaranteed"); accept ONLY that case, never unknown / unsigned / mismatched senders
        const loose = await attempt(new M.DecryptionSettings(M.TrustRequirement.Untrusted)).catch((e3) => { throw this.decryptError(e3); });
        const code = loose.shieldState(false).code;
        if (code !== M.ShieldStateCode.AuthenticityNotGuaranteed) throw this.decryptError(e2);
        res = loose;
        note = 'Restored from your encrypted backup: the sending device cannot be confirmed.';
      }
    }
    const inner = JSON.parse(res.event);
    const shield = res.shieldState(false);
    if (shield.code === M.ShieldStateCode.MismatchedSender) throw new E2eeError('FORGED', 'The message does not come from the person shown.');
    return { content: inner.content, verified: shield.color === M.ShieldColor.None, shield: note || shield.message || null };
  }

  decryptError(e) {
    const { M } = this;
    const map = {
      [M.DecryptionErrorCode.MissingRoomKey]: ['MISSING_KEY', 'This message was sent before this device could read it.'],
      [M.DecryptionErrorCode.UnknownMessageIndex]: ['MISSING_KEY', 'This message was sent before this device could read it.'],
      [M.DecryptionErrorCode.UnsignedSenderDevice]: ['UNTRUSTED_SENDER', 'Sent from a device its owner has not verified.'],
      [M.DecryptionErrorCode.UnknownSenderDevice]: ['UNTRUSTED_SENDER', 'Sent from an unknown device.'],
      [M.DecryptionErrorCode.SenderIdentityVerificationViolation]: ['IDENTITY_CHANGED', "The sender's security key changed."],
      [M.DecryptionErrorCode.MismatchedSender]: ['FORGED', 'The message does not come from the person shown.'],
      [M.DecryptionErrorCode.MismatchedIdentityKeys]: ['FORGED', 'The message keys do not match the sender.'],
    };
    const [code, msg] = map[e?.code] || ['UNABLE_TO_DECRYPT', 'This message could not be decrypted.'];
    return new E2eeError(code, msg);
  }

  /* -------------------------------------------------- files */
  /** Encrypts bytes; returns { data: Uint8Array ciphertext, info: string (key/iv/hash JSON, goes in the encrypted message) }. */
  encryptFile(bytes) {
    const enc = this.M.Attachment.encrypt(bytes);
    return { data: enc.encryptedData, info: enc.mediaEncryptionInfo };
  }

  decryptFile(cipherBytes, info) {
    return this.M.Attachment.decrypt(new this.M.EncryptedAttachment(cipherBytes, info));
  }
}

export default E2eeClient;
