const test = require("node:test");
const assert = require("node:assert/strict");
const { getProfileSubtitle } = require("../utils/profilePresentation");

test("profile subtitle displays the live role label and account creation year", () => {
  assert.equal(getProfileSubtitle("user", "2024-11-03T14:20:00Z"), "俱乐部成员  /Joined in 2024");
  assert.equal(getProfileSubtitle("admin", "2025-01-01T00:00:00Z"), "管理员  /Joined in 2025");
  assert.equal(getProfileSubtitle("guest", "2026-09-29T00:00:00Z"), "游客  /Joined in 2026");
});

test("profile subtitle does not invent a join date when unavailable", () => {
  assert.equal(getProfileSubtitle("user", ""), "俱乐部成员");
  assert.equal(getProfileSubtitle("unknown", null), "游客");
});
