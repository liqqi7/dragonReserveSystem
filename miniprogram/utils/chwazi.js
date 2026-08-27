const MAX_TOUCHES = 5;
const PROGRESS_DURATION_MS = 1500;
const SELECT_DELAY_MS = 350;
const TOUCH_COLORS = [
  { outer: "#FFD500", inner: "#FFE663" },
  { outer: "#1C839B", inner: "#1198B9" },
  { outer: "#9B7BFF", inner: "#A994FF" },
  { outer: "#F36E8F", inner: "#FF88A5" },
  { outer: "#49B675", inner: "#75D69B" }
];

function getTouchId(touch, fallbackIndex = 0) {
  const value = touch && (touch.identifier ?? touch.id);
  return value === undefined || value === null ? `touch-${fallbackIndex}` : String(value);
}

function getProgress(startedAt, now = Date.now(), durationMs = PROGRESS_DURATION_MS) {
  if (!Number.isFinite(Number(startedAt))) return 0;
  if (!Number.isFinite(Number(now))) return 0;
  const duration = Math.max(1, Number(durationMs) || PROGRESS_DURATION_MS);
  return Math.max(0, Math.min(1, (Number(now) - Number(startedAt)) / duration));
}

function allProgressComplete(touches) {
  return Array.isArray(touches) && touches.length > 0 && touches.every((touch) => Number(touch.progress) >= 1);
}

function getTouchColor(index) {
  return TOUCH_COLORS[Math.max(0, Number(index) || 0) % TOUCH_COLORS.length];
}

module.exports = {
  MAX_TOUCHES,
  PROGRESS_DURATION_MS,
  SELECT_DELAY_MS,
  TOUCH_COLORS,
  getTouchId,
  getProgress,
  allProgressComplete,
  getTouchColor
};
