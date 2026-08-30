const MIN_TOUCHES = 2;
const MAX_TOUCHES = 5;
const PROGRESS_DURATION_MS = 1500;
const SELECT_DELAY_MS = 350;
const TOO_MANY_DURATION_MS = 3000;
const WINNER_TRANSITION_DURATION_MS = 480;
const DESIGN_WIDTH_PX = 390;
const STAGE_HEIGHT_PX = 540;
const TOUCH_DIAMETER_PX = 120;
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
  if (startedAt === null || startedAt === undefined || startedAt === "") return 0;
  if (now === null || now === undefined || now === "") return 0;
  if (!Number.isFinite(Number(startedAt)) || !Number.isFinite(Number(now))) return 0;
  const duration = Math.max(1, Number(durationMs) || PROGRESS_DURATION_MS);
  return Math.max(0, Math.min(1, (Number(now) - Number(startedAt)) / duration));
}

function getTouchColor(index) {
  return TOUCH_COLORS[Math.max(0, Number(index) || 0) % TOUCH_COLORS.length];
}

function getAvailableTouchColorIndex(usedIndexes) {
  const used = usedIndexes instanceof Set ? usedIndexes : new Set(usedIndexes || []);
  for (let index = 0; index < TOUCH_COLORS.length; index += 1) {
    if (!used.has(index)) return index;
  }
  return 0;
}

function readFiniteNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function getSelectionWaitMs(touches, now = Date.now()) {
  if (!Array.isArray(touches) || touches.length < MIN_TOUCHES) return null;
  const startedAtValues = touches.map((touch) => readFiniteNumber(touch && touch.startedAt));
  if (startedAtValues.some((startedAt) => startedAt === null)) return null;
  const currentTime = readFiniteNumber(now);
  if (currentTime === null) return null;
  const readyAt = Math.max(...startedAtValues) + PROGRESS_DURATION_MS + SELECT_DELAY_MS;
  return Math.max(0, readyAt - currentTime);
}

function normalizeTouchPosition(touch, rect, options = {}) {
  const width = Number(rect && rect.width);
  const height = Number(rect && rect.height);
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) return null;

  const left = Number(rect.left) || 0;
  const top = Number(rect.top) || 0;
  const clientX = readFiniteNumber(touch && touch.clientX);
  const clientY = readFiniteNumber(touch && touch.clientY);
  const pageX = readFiniteNumber(touch && touch.pageX);
  const pageY = readFiniteNumber(touch && touch.pageY);
  const localX = readFiniteNumber(touch && touch.x);
  const localY = readFiniteNumber(touch && touch.y);
  let x;
  let y;

  if (clientX !== null && clientY !== null) {
    x = clientX - left;
    y = clientY - top;
  } else if (pageX !== null && pageY !== null) {
    x = pageX - left;
    y = pageY - top;
  } else if (localX !== null && localY !== null) {
    x = localX;
    y = localY;
  } else {
    return null;
  }

  const scale = width / DESIGN_WIDTH_PX;
  const radius = TOUCH_DIAMETER_PX / 2;
  const designX = x / scale;
  const designY = y / scale;
  const minY = Number.isFinite(Number(options.minY)) ? Number(options.minY) : radius;
  const maxY = Number.isFinite(Number(options.maxY))
    ? Number(options.maxY)
    : STAGE_HEIGHT_PX - radius;
  return {
    xPx: Math.max(radius, Math.min(DESIGN_WIDTH_PX - radius, designX)),
    yPx: Math.max(minY, Math.min(maxY, designY))
  };
}

module.exports = {
  MIN_TOUCHES,
  MAX_TOUCHES,
  PROGRESS_DURATION_MS,
  SELECT_DELAY_MS,
  TOO_MANY_DURATION_MS,
  WINNER_TRANSITION_DURATION_MS,
  DESIGN_WIDTH_PX,
  STAGE_HEIGHT_PX,
  TOUCH_DIAMETER_PX,
  TOUCH_COLORS,
  getTouchId,
  getProgress,
  getTouchColor,
  getAvailableTouchColorIndex,
  getSelectionWaitMs,
  normalizeTouchPosition
};
