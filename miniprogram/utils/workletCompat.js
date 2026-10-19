const linear = value => value;
const fallbackEasing = {linear, cubic: value => value ** 3, out: easing => value => 1 - easing(1 - value)};

// Plain values keep the shared interaction model usable when WebView has no worklet API.
function workletRuntime(api = {}) {
  api = api || {};
  return {
    shared: api.shared || (value => ({value})),
    runOnJS: api.runOnJS || (callback => callback),
    timing: api.timing || (value => value),
    cancelAnimation: api.cancelAnimation || (() => {}),
    Easing: api.Easing || fallbackEasing,
  };
}
function supportsWorkletAnimations(context, wxApi) {
  return context.renderer !== "webview" && typeof wxApi?.worklet?.shared === "function" &&
    typeof context.applyAnimatedStyle === "function";
}
module.exports = {workletRuntime, supportsWorkletAnimations};
