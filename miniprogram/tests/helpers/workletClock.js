function createWorkletClock() {
  let now = 0;
  const active = new Map();
  const requests = [];
  const linear = value => value;
  const api = {
    shared(initial) {
      let current = initial;
      const ref = {
        get value() {
          const animation = active.get(ref);
          if (!animation) return current;
          const fraction = Math.min(1, (now - animation.started) / animation.duration);
          current = animation.from + (animation.target - animation.from) * animation.easing(fraction);
          if (fraction >= 1) active.delete(ref);
          return current;
        },
        set value(next) {
          const from = ref.value;
          active.delete(ref);
          if (next && next.animation === "timing") {
            active.set(ref, {...next, from, started: now});
          } else current = next;
        },
      };
      return ref;
    },
    timing(target, options) {
      const animation = {animation: "timing", target, duration: options.duration,
        easing: options.easing || linear};
      requests.push(animation);
      return animation;
    },
    cancelAnimation(ref) {
      const value = ref.value;
      active.delete(ref);
      ref.value = value;
    },
    Easing: {linear, cubic: value => value ** 3, out: easing => value => 1 - easing(1 - value)},
    runOnJS: callback => callback,
  };
  return {api, requests, active, advance: milliseconds => {now += milliseconds;}};
}

module.exports = {createWorkletClock};
