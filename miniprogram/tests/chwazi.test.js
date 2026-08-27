const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  MAX_TOUCHES,
  PROGRESS_DURATION_MS,
  SELECT_DELAY_MS,
  getTouchId,
  getProgress,
  allProgressComplete,
  getTouchColor
} = require("../utils/chwazi");

const pageDir = path.join(__dirname, "../pages/chwazi");

 test("Chwazi timing and touch limits are explicit", () => {
  assert.equal(MAX_TOUCHES, 5);
  assert.equal(PROGRESS_DURATION_MS, 1500);
  assert.equal(SELECT_DELAY_MS, 350);
});

test("Chwazi progress clamps between zero and one", () => {
  assert.equal(getProgress(1000, 500, 1500), 0);
  assert.equal(getProgress(1000, 1750, 1500), 0.5);
  assert.equal(getProgress(1000, 3000, 1500), 1);
});

test("Chwazi identifies touches and uses the five prototype colors", () => {
  assert.equal(getTouchId({ identifier: 7 }, 0), "7");
  assert.equal(getTouchId({}, 2), "touch-2");
  assert.deepEqual(getTouchColor(0), { outer: "#FFD500", inner: "#FFE663" });
  assert.deepEqual(getTouchColor(4), { outer: "#49B675", inner: "#75D69B" });
});

test("selection only becomes eligible after every participant is full", () => {
  assert.equal(allProgressComplete([]), false);
  assert.equal(allProgressComplete([{ progress: 1 }, { progress: 0.99 }]), false);
  assert.equal(allProgressComplete([{ progress: 1 }, { progress: 1 }]), true);
});

test("Chwazi page wires multi-touch, progress ring, winner and over-five state", () => {
  const js = fs.readFileSync(path.join(pageDir, "chwazi.js"), "utf8");
  const wxml = fs.readFileSync(path.join(pageDir, "chwazi.wxml"), "utf8");
  const wxss = fs.readFileSync(path.join(pageDir, "chwazi.wxss"), "utf8");

  assert.match(js, /bindtouchstart|onStageTouchStart/);
  assert.match(js, /MAX_TOUCHES/);
  assert.match(js, /SELECT_DELAY_MS/);
  assert.match(js, /Math\.random\(\) \* this\.data\.touches\.length/);
  assert.match(wxml, /bindtouchstart="onStageTouchStart"/);
  assert.match(wxml, /bindtouchmove="onStageTouchMove"/);
  assert.match(wxml, /bindtouchend="onStageTouchEnd"/);
  assert.match(wxml, /conic-gradient\(/);
  assert.match(wxml, /id="qa-chwazi-stage"/);
  assert.match(js, /iPhone 不支持 5 个以上的触摸/);
  assert.match(wxss, /\.touch-point--selected::before/);
});
