const test = require("node:test");
const assert = require("node:assert/strict");
const { toUserMessage } = require("../services/request");

test("request errors are converted to concise Chinese user messages", () => {
  assert.equal(toUserMessage("You are outside the allowed check-in radius"), "你当前不在签到范围内");
  assert.equal(toUserMessage("request:fail timeout", null, true), "网络暂时不可用，请检查网络后重试");
  assert.equal(toUserMessage("some unexpected upstream exception"), "操作失败，请稍后重试");
  assert.equal(toUserMessage("签到失败，请稍后重试"), "签到失败，请稍后重试");
  assert.equal(toUserMessage("ignored", "AUTH_FAILED"), "登录状态已失效，请重新登录");
});
