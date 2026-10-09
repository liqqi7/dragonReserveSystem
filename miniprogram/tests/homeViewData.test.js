const test = require("node:test");
const assert = require("node:assert/strict");
const { isSameHomeViewData } = require("../utils/homeViewData");

test("home data comparison preserves primitive types and nullable values", () => {
  for (const value of [null, undefined, true, false, 0, 1, "", "1"]) {
    assert.equal(isSameHomeViewData(value, value), true);
  }
  for (const [previous, next] of [[null, undefined], [0, false], [1, "1"], ["", null], [{}, []]]) {
    assert.equal(isSameHomeViewData(previous, next), false);
  }
});

test("equal home objects do not depend on key insertion order", () => {
  const previous = { _id: "1", participants: [{ avatarUrl: "avatar" }], flags: { ready: true, error: false } };
  const next = { flags: { error: false, ready: true }, participants: [{ avatarUrl: "avatar" }], _id: "1" };
  assert.equal(isSameHomeViewData(previous, next), true);
  assert.equal(isSameHomeViewData(previous, structuredClone(previous)), true);
});

test("home comparison detects nested edits, added or removed fields and array order", () => {
  const previous = { name: "A", participants: [{ avatarUrl: "one" }, { avatarUrl: "two" }], extra: null };
  for (const next of [
    { ...previous, name: "B" },
    { ...previous, participants: [{ avatarUrl: "other" }, { avatarUrl: "two" }] },
    { ...previous, participants: [...previous.participants].reverse() },
    { ...previous, participants: [{ avatarUrl: "one" }] },
    { ...previous, added: true },
    { name: previous.name, participants: previous.participants },
    { name: previous.name, participants: previous.participants, different: null }
  ]) assert.equal(isSameHomeViewData(previous, next), false);
  assert.equal(isSameHomeViewData({ value: undefined }, {}), false);
  assert.equal(isSameHomeViewData({}, { value: undefined }), false);
  assert.equal(isSameHomeViewData([undefined], [null]), false);
});

test("home comparison skips shared references and stops at the first changed value", () => {
  const shared = { get expensive() { assert.fail("shared data must not be traversed"); } };
  assert.equal(isSameHomeViewData({ shared }, { shared }), true);
  const previous = { name: "A", get expensive() { assert.fail("comparison must stop after a change"); } };
  const next = { name: "B", get expensive() { assert.fail("comparison must stop after a change"); } };
  assert.equal(isSameHomeViewData(previous, next), false);
});
