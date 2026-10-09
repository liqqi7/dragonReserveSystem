const test = require("node:test");
const assert = require("node:assert/strict");
const { clamp } = require("../utils/number");
const picker = require("../utils/dateTimePicker");
const { pad, formatDate, formatTime } = require("../utils/dateFormat");
const { getSwipeSettledState } = require("../utils/swipe");
const drawer = require("../components/participants-drawer/logic");

test("clamp preserves numeric conversion, NaN and both legacy bound priorities", () => {
  for (const value of [-Infinity, -1, 0, 5, 10, 11, Infinity, "5", null, undefined, NaN]) {
    assert.equal(clamp(value, 0, 10), Math.max(0, Math.min(10, value)));
    assert.equal(picker.clamp(value, 0, 10), Math.min(10, Math.max(0, value)));
  }
  assert.equal(clamp(5, 10, 0), 10);
  assert.equal(picker.clamp(5, 10, 0), 0);
});

test("date helpers retain padding, delimiters and picker exports", () => {
  for (const value of [0, 1, 9, 10, 31, "01", -1, undefined]) {
    assert.equal(pad(value), String(value).padStart(2, "0"));
    assert.equal(picker.pad(value), pad(value));
  }
  assert.equal(formatDate(2026, 1, 2), "2026-01-02");
  assert.equal(formatTime(0, 5), "00:05");
  assert.equal(picker.formatDate, formatDate);
  assert.equal(picker.formatTime, formatTime);
  assert.deepEqual(drawer.formatCheckinParts("invalid"), { date: "—", time: "—" });
  assert.deepEqual(drawer.formatCheckinParts("2026-01-02 03:04:05"), { date: "01月02日", time: "03:04:05" });
});

test("shared swipe keeps open/close thresholds for every action width", () => {
  for (const width of [138.46, 161.54, 323.08]) {
    const open = width * 0.25;
    const close = width * 0.15;
    assert.equal(getSwipeSettledState(0, -open + 0.001, width).actionOpen, false);
    assert.deepEqual(getSwipeSettledState(0, -open, width), { offsetX: -width, actionOpen: true });
    assert.equal(getSwipeSettledState(-width, -width + close - 0.001, width).actionOpen, true);
    assert.equal(getSwipeSettledState(-width, -width + close + 0.001, width).actionOpen, false);
    for (const start of [0, -width, "0", undefined]) {
      for (const end of [0, -width, "-50", undefined]) {
        assert.deepEqual(drawer.getSwipeSettledState(start, end, width), getSwipeSettledState(start, end, width));
      }
    }
  }
  assert.deepEqual(drawer.getSwipeSettledState(0, -100), getSwipeSettledState(0, -100, 323.08));
  for (const width of [-5, null, "invalid"]) {
    assert.deepEqual(drawer.getSwipeSettledState(0, 0, width), getSwipeSettledState(0, 0, 0));
  }
});
