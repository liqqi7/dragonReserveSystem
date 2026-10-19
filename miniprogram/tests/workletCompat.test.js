const test = require("node:test");
const assert = require("node:assert/strict");
const {workletRuntime, supportsWorkletAnimations} = require("../utils/workletCompat");

test("WebView initializes shared interaction state without any worklet API", () => {
  for (const api of [undefined, null, {}]) {
    const runtime = workletRuntime(api), holder = runtime.shared(3);
    holder.value = 4;
    assert.equal(holder.value, 4);
    assert.equal(runtime.runOnJS(value => value + 1)(4), 5);
    assert.equal(runtime.timing(7, {duration: 240}), 7);
    assert.doesNotThrow(() => runtime.cancelAnimation(holder));
    assert.equal(runtime.Easing.linear(0.5), 0.5);
    assert.equal(runtime.Easing.out(runtime.Easing.cubic)(0.5), 0.875);
  }
});

test("native worklet functions are preserved but WebView never binds animated styles", () => {
  const api = {shared() {}, runOnJS() {}, timing() {}, cancelAnimation() {}, Easing: {}};
  const runtime = workletRuntime(api);
  for (const key of Object.keys(api)) assert.equal(runtime[key], api[key]);
  assert.equal(supportsWorkletAnimations({renderer: "webview", applyAnimatedStyle() {}}, {worklet: api}), false);
  assert.equal(supportsWorkletAnimations({renderer: "skyline", applyAnimatedStyle() {}}, {worklet: api}), true);
  assert.equal(supportsWorkletAnimations({renderer: "skyline"}, {worklet: api}), false);
  assert.equal(supportsWorkletAnimations({applyAnimatedStyle() {}}, null), false);
});
