const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "../pages/profile/profile.js"), "utf8");

function loadProfile(role, list) {
  let page;
  const app = { globalData: { accessToken: "test-token", userRole: role } };
  const errors = [];
  vm.runInNewContext(source, {
    getApp: () => app,
    Page: definition => { page = definition; },
    require: name => {
      if (name === "../../services/memory") return { list };
      if (name === "../../services/logger") return { logPageError: (...args) => errors.push(args) };
      return {};
    }
  });
  page.setData = patch => Object.assign(page.data, patch);
  return { page, app, errors };
}

test("badge failures do not hide the admin memory review entry", async () => {
  for (const error of [new Error("network unavailable"), { body: { code: "MEMORY_DISABLED" } }]) {
    const { page, errors } = loadProfile("admin", async () => { throw error; });
    await page.refreshMemoryReviewState();
    assert.equal(page.data.isMemoryAdmin, true);
    assert.equal(page.data.memoryPendingCount, 0);
    assert.equal(errors[0][0], "refresh_memory_review_state");
    assert.equal(errors[0][1], error);
  }
});

test("review entry still requires the admin role and a login token", async () => {
  let calls = 0;
  for (const role of ["user", "guest", "admin"]) {
    const { page, app } = loadProfile(role, async () => { calls++; });
    if (role === "admin") app.globalData.accessToken = "";
    await page.refreshMemoryReviewState();
    assert.equal(page.data.isMemoryAdmin, false);
  }
  assert.equal(calls, 0);
});

test("admin pending count is loaded and stale responses cannot restore it after logout", async () => {
  const { page } = loadProfile("admin", async () => ({ pending_count: 3 }));
  await page.refreshMemoryReviewState();
  assert.equal(page.data.memoryPendingCount, 3);
  let resolve;
  const pending = loadProfile("admin", () => new Promise(done => { resolve = done; }));
  const request = pending.page.refreshMemoryReviewState();
  pending.app.globalData.userRole = "guest";
  pending.app.globalData.accessToken = "";
  await pending.page.refreshMemoryReviewState();
  resolve({ pending_count: 9 });
  await request;
  assert.equal(pending.page.data.isMemoryAdmin, false);
  assert.equal(pending.page.data.memoryPendingCount, 0);
});
