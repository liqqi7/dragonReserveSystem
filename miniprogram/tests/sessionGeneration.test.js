const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function setup() {
  let app;
  const storage = new Map(), users = [], logins = [], prompts = [];
  const wx = {
    getStorageSync: key => storage.get(key),
    setStorageSync: (key, value) => storage.set(key, value),
    removeStorageSync: key => storage.delete(key),
    login: options => options.success({ code: 'wechat-code' })
  };
  const userService = { getMe() { const pending = deferred(); users.push(pending); return pending.promise; } };
  const logger = { resumeDiagnosticUploads() {}, createTraceId: () => 'test', logInfo() {}, logError() {}, summarizeError: () => '' };
  const authModule = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../services/auth.js'), 'utf8'), {
    module: authModule, wx, setTimeout, clearTimeout,
    require(name) {
      if (name === './user') return userService;
      if (name === './logger') return logger;
      if (name === './request') return { request() { const pending = deferred(); logins.push(pending); return pending.promise; } };
      throw new Error(name);
    }
  });
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8'), {
    App: value => { app = value; }, wx, console, setTimeout: callback => prompts.push(callback),
    getCurrentPages: () => [{ selectComponent: () => ({ open: () => prompts.push('opened') }) }],
    require(name) {
      if (name === './services/user') return userService;
      if (name === './services/auth') return authModule.exports;
      if (name === './services/logger') return logger;
      throw new Error(name);
    }
  });
  return { app, storage, users, logins, prompts, auth: authModule.exports };
}

const tick = () => new Promise(resolve => setImmediate(resolve));
const firstUser = { id: 7, role: 'user', nickname: 'first' };
const nextUser = { id: 8, role: 'admin', nickname: 'next' };

test('concurrent session validation is coalesced and commits a current response', async () => {
  const h = setup();
  h.app.applyCurrentUser(firstUser, 'first-token');
  const pending = h.app.validateStoredSession();
  assert.equal(h.app.validateStoredSession(), pending);
  h.users[0].resolve({ ...firstUser, nickname: 'updated' });
  assert.equal(await pending, true);
  assert.equal(h.storage.get('userNickname'), 'updated');
  assert.equal(h.app.globalData._sessionValidationPromise, null);
});

for (const outcome of ['success', 'expired']) {
  test(`late session validation ${outcome} cannot restore a logged-out account`, async () => {
    const h = setup();
    h.app.applyCurrentUser(firstUser, 'first-token');
    const pending = h.app.validateStoredSession({ promptOnExpired: true });
    h.app.logout();
    if (outcome === 'success') h.users[0].resolve(firstUser);
    else h.users[0].reject({ statusCode: 401 });
    assert.equal(await pending, false);
    assert.equal(h.app.globalData.userId, '');
    assert.equal(h.app.globalData.isAuthenticated, false);
    assert.equal(h.app.globalData.sessionValidated, false);
    assert.equal(h.storage.size, 0);
    assert.equal(h.prompts.length, 0);
  });

  test(`late session validation ${outcome} cannot overwrite a new account or its pending validation`, async () => {
    const h = setup();
    h.app.applyCurrentUser(firstUser, 'first-token');
    const old = h.app.validateStoredSession({ promptOnExpired: true });
    h.app.applyCurrentUser(nextUser, 'next-token');
    const current = h.app.validateStoredSession();
    if (outcome === 'success') h.users[0].resolve(firstUser);
    else h.users[0].reject({ statusCode: 403 });
    assert.equal(await old, false);
    assert.equal(h.app.globalData._sessionValidationPromise, current);
    assert.equal(h.app.globalData.userId, '8');
    assert.equal(h.storage.get('accessToken'), 'next-token');
    assert.equal(h.prompts.length, 0);
    h.users[1].resolve(nextUser);
    assert.equal(await current, true);
  });
}

test('current expired session logs out, but delayed expiry prompt cannot cover a new login', async () => {
  const h = setup();
  h.app.applyCurrentUser(firstUser, 'first-token');
  const pending = h.app.validateStoredSession({ promptOnExpired: true });
  h.users[0].reject({ statusCode: 401 });
  assert.equal(await pending, false);
  assert.equal(h.storage.size, 0);
  assert.equal(h.prompts.length, 1);
  h.app.applyCurrentUser(nextUser, 'next-token');
  h.prompts.shift()();
  assert.equal(h.prompts.length, 0);
});

test('starting login invalidates an older session check before the new token arrives', async () => {
  const h = setup();
  h.app.applyCurrentUser(firstUser, 'first-token');
  const old = h.app.validateStoredSession({ promptOnExpired: true });
  const login = h.auth.loginWithWechat(h.app);
  await tick();
  h.users[0].reject({ statusCode: 401 });
  assert.equal(await old, false);
  assert.equal(h.prompts.length, 0);
  h.logins[0].resolve({ access_token: 'next-token' });
  await tick();
  h.users[1].resolve(nextUser);
  await login;
  assert.equal(h.app.globalData.userId, '8');
  assert.equal(h.app.globalData.sessionValidated, true);
});

for (const stage of ['token', 'profile']) {
  test(`logout during login ${stage} request prevents late credentials and profile commits`, async () => {
    const h = setup();
    const login = h.auth.loginWithWechat(h.app);
    const rejected = assert.rejects(login, error => error.code === 'STALE_LOGIN_ATTEMPT');
    await tick();
    if (stage === 'profile') {
      h.logins[0].resolve({ access_token: 'late-token' });
      await tick();
    }
    h.app.logout();
    if (stage === 'token') h.logins[0].resolve({ access_token: 'late-token' });
    else h.users[0].resolve(firstUser);
    await rejected;
    assert.equal(h.storage.size, 0);
    assert.equal(h.app.globalData.userId, '');
    assert.equal(h.app.globalData.sessionValidated, false);
  });
}

test('a stale failed login cannot remove the newer account token', async () => {
  const h = setup();
  const login = h.auth.loginWithWechat(h.app);
  const rejected = assert.rejects(login, error => error.statusCode === 500);
  await tick();
  h.app.applyCurrentUser(nextUser, 'next-token');
  h.logins[0].reject({ statusCode: 500 });
  await rejected;
  assert.equal(h.storage.get('accessToken'), 'next-token');
  assert.equal(h.app.globalData.userId, '8');
});

for (const stage of ['token', 'profile']) {
  test(`session validation during login ${stage} waits for that login without another profile request`, async () => {
    const h = setup();
    h.app.applyCurrentUser(firstUser, 'first-token');
    const login = h.auth.loginWithWechat(h.app);
    await tick();
    if (stage === 'profile') {
      h.logins[0].resolve({ access_token: 'next-token' });
      await tick();
    }
    const validation = h.app.validateStoredSession({ promptOnExpired: true });
    assert.equal(h.users.length, stage === 'profile' ? 1 : 0);
    if (stage === 'token') {
      h.logins[0].resolve({ access_token: 'next-token' });
      await tick();
    }
    h.users[0].resolve(nextUser);
    await login;
    assert.equal(await validation, true);
    assert.equal(h.users.length, 1);
    assert.equal(h.app.globalData.accessToken, 'next-token');
    assert.equal(h.app.globalData.userId, '8');
    assert.equal(h.app.globalData._sessionLoginPromise, null);
  });
}

test('validation waiting on a failed login resolves false and the next login remains independent', async () => {
  const h = setup();
  const oldLogin = h.auth.loginWithWechat(h.app);
  const oldRejected = assert.rejects(oldLogin, error => error.statusCode === 500);
  const validation = h.app.validateStoredSession();
  await tick();
  const nextLogin = h.auth.loginWithWechat(h.app);
  await tick();
  h.logins[0].reject({ statusCode: 500 });
  await oldRejected;
  assert.equal(await validation, false);
  assert.equal(h.app.globalData._sessionLoginPromise, nextLogin);
  h.logins[1].resolve({ access_token: 'next-token' });
  await tick();
  h.users[0].resolve(nextUser);
  await nextLogin;
  assert.equal(h.app.globalData.userId, '8');
});
