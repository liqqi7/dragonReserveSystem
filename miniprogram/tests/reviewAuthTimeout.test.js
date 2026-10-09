const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

function loadAuth() {
  const authPath = path.resolve(__dirname, "../services/auth.js");
  delete require.cache[authPath];
  return require(authPath);
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

test("late login response after timeout cannot write token or update user", async () => {
  const originalSetTimeout = global.setTimeout;
  const originalClearTimeout = global.clearTimeout;
  const originalWx = global.wx;
  const originalApp = global.getApp;
  const authResponse = deferred();
  const storage = new Map();
  const applied = [];
  const timers = new Map();
  let timerId = 0;
  global.setTimeout = (callback, _delay) => { const id = ++timerId; timers.set(id, callback); return id; };
  global.clearTimeout = (id) => timers.delete(id);
  global.wx = {
    login(options) { options.success({ code: "wx-code" }); },
    setStorageSync(key, value) { storage.set(key, value); },
    removeStorageSync(key) { storage.delete(key); }
  };
  global.getApp = () => ({ applyCurrentUser: (...args) => applied.push(args) });
  const requestPath = require.resolve("../services/request.js");
  const userPath = require.resolve("../services/user.js");
  const requestModule = require(requestPath);
  const userModule = require(userPath);
  const originalRequest = requestModule.request;
  const originalGetMe = userModule.getMe;
  let requestStarted;
  const started = new Promise((resolve) => { requestStarted = resolve; });
  requestModule.request = () => { requestStarted(); return authResponse.promise; };
  userModule.getMe = () => Promise.resolve({ id: 7, role: "user" });
  const auth = loadAuth();
  try {
    const loginPromise = auth.loginWithWechat(global.getApp());
    await started;
    const outerTimeout = timers.get(1);
    assert.equal(typeof outerTimeout, "function");
    timers.delete(1);
    outerTimeout();
    await assert.rejects(loginPromise, (error) => error && error.code === "TIMEOUT");
    authResponse.resolve({ access_token: "late-token" });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(storage.has("accessToken"), false);
    assert.deepEqual(applied, []);
  } finally {
    requestModule.request = originalRequest;
    userModule.getMe = originalGetMe;
    global.setTimeout = originalSetTimeout;
    global.clearTimeout = originalClearTimeout;
    global.wx = originalWx;
    global.getApp = originalApp;
  }
});
