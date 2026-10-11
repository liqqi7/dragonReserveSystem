const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");
function setup(initial = {}) {
  const storage = new Map(Object.entries(initial));
  let environment = "production", base = "https://dragon.liqqihome.top/api/v1";
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../services/sessionEnvironment.js"), "utf8"), {
    module, wx: { getStorageSync: (key) => storage.get(key) || "",
      setStorageSync: (key, value) => storage.set(key, value), removeStorageSync: (key) => storage.delete(key) },
    require: () => ({ getApiEnvironment: () => environment, getApiBaseUrl: () => base }),
  });
  return { storage, activate: module.exports.activateSessionEnvironment,
    select(env, url) { environment = env; base = url; } };
}
test("existing unmarked production credentials survive adoption unchanged", () => {
  const h = setup({ accessToken: "production-token", userId: "99", userRole: "admin" });
  h.activate(); h.activate();
  assert.equal(h.storage.get("accessToken"), "production-token");
  assert.equal(h.storage.get("userId"), "99");
});
test("test credentials never overwrite production and both environments restore their own session", () => {
  const h = setup({ accessToken: "production-token", userId: "99", userRole: "admin" });
  h.select("test", "http://192.168.10.2:8002/api/v1"); h.activate();
  assert.equal(h.storage.has("accessToken"), false);
  assert.equal(h.storage.has("userRole"), false);
  h.storage.set("accessToken", "test-token"); h.storage.set("userId", "100003");
  h.select("production", "https://dragon.liqqihome.top/api/v1"); h.activate();
  assert.equal(h.storage.get("accessToken"), "production-token");
  assert.equal(h.storage.get("userId"), "99");
  h.select("test", "http://192.168.10.2:8002/api/v1"); h.activate();
  assert.equal(h.storage.get("accessToken"), "test-token");
});
test("different test servers are isolated, and a logged-out session cannot resurrect", () => {
  const h = setup();
  h.select("test", "http://192.168.10.2:8002/api/v1"); h.activate();
  h.storage.set("accessToken", "test-token");
  h.select("test", "http://192.168.10.3:8002/api/v1"); h.activate();
  assert.equal(h.storage.has("accessToken"), false);
  h.select("test", "http://192.168.10.2:8002/api/v1"); h.activate();
  h.storage.delete("accessToken");
  h.select("production", "https://dragon.liqqihome.top/api/v1"); h.activate();
  h.select("test", "http://192.168.10.2:8002/api/v1"); h.activate();
  assert.equal(h.storage.has("accessToken"), false);
});
