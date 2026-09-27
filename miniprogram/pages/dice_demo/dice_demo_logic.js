const DICE_TYPES = [6, 8, 10, 12, 20];
const MAX_DICE_COUNT = 4;
const THROW_DURATION_MS = 1280;
const STABLE_DURATION_MS = 180;
const MIN_THROW_SPEED = 0.06;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeDegrees(value) {
  const number = Number(value) || 0;
  return ((number % 360) + 360) % 360;
}

function normalizeCount(value) {
  const count = Number(value);
  if (!Number.isFinite(count)) return 0;
  return clamp(Math.round(count), 0, MAX_DICE_COUNT);
}

function createDiceConfig() {
  return DICE_TYPES.map((sides) => ({ sides, count: sides === 6 ? 1 : 0 }));
}

function getSelectedDice(config) {
  return (Array.isArray(config) ? config : [])
    .flatMap((item) => {
      const sides = Number(item && item.sides);
      const count = normalizeCount(item && item.count);
      return Number.isInteger(sides) && DICE_TYPES.includes(sides)
        ? Array.from({ length: count }, () => ({ sides }))
        : [];
    });
}

function getThrowVelocity(start, end, durationMs) {
  const duration = Math.max(16, Number(durationMs) || 16);
  const dx = Number(end && end.x) - Number(start && start.x);
  const dy = Number(end && end.y) - Number(start && start.y);
  const speed = Math.sqrt(dx * dx + dy * dy) / duration;
  return {
    x: clamp(dx / duration * 10, -1.2, 1.2),
    y: clamp(dy / duration * 10, -1.2, 1.2),
    speed
  };
}

function getThrowStrength(velocity) {
  const speed = Number(velocity && velocity.speed) || 0;
  return clamp(speed / MIN_THROW_SPEED, 0, 1.8);
}

function rotateVector(vector, rx, ry, rz) {
  const x = Number(vector[0]) || 0;
  const y = Number(vector[1]) || 0;
  const z = Number(vector[2]) || 0;
  const ax = Number(rx) * Math.PI / 180;
  const ay = Number(ry) * Math.PI / 180;
  const az = Number(rz) * Math.PI / 180;

  const cx = Math.cos(ax);
  const sx = Math.sin(ax);
  const cy = Math.cos(ay);
  const sy = Math.sin(ay);
  const cz = Math.cos(az);
  const sz = Math.sin(az);

  const x1 = x;
  const y1 = y * cx - z * sx;
  const z1 = y * sx + z * cx;
  const x2 = x1 * cy + z1 * sy;
  const y2 = y1;
  const z2 = -x1 * sy + z1 * cy;
  return [x2 * cz - y2 * sz, x2 * sz + y2 * cz, z2];
}

function readD6TopFace(rotation) {
  const faces = [
    { number: 1, normal: [0, 0, 1] },
    { number: 6, normal: [0, 0, -1] },
    { number: 3, normal: [1, 0, 0] },
    { number: 4, normal: [-1, 0, 0] },
    { number: 2, normal: [0, -1, 0] },
    { number: 5, normal: [0, 1, 0] }
  ];
  const rx = Number(rotation && rotation.x) || 0;
  const ry = Number(rotation && rotation.y) || 0;
  const rz = Number(rotation && rotation.z) || 0;
  return faces.reduce((best, face) => {
    const normal = rotateVector(face.normal, rx, ry, rz);
    return normal[1] > best.dot ? { number: face.number, dot: normal[1] } : best;
  }, { number: 2, dot: -Infinity }).number;
}

function isStable(previous, current, elapsedMs) {
  if (!previous || !current) return false;
  const delta = Math.abs(Number(current.x) - Number(previous.x))
    + Math.abs(Number(current.y) - Number(previous.y))
    + Math.abs(Number(current.z) - Number(previous.z));
  return delta < 2.4 && Number(elapsedMs) >= STABLE_DURATION_MS;
}

function readD6Quaternion(q) {
  if (!q || ![q.x, q.y, q.z, q.w].every(Number.isFinite)) return null;
  const length = Math.hypot(q.x, q.y, q.z, q.w);
  if (length < 1e-8) return null;
  const [x, y, z, w] = [q.x, q.y, q.z, q.w].map(v => v / length);
  const upX = 2 * (x * y + w * z);
  const upY = 1 - 2 * (x * x + z * z);
  const upZ = 2 * (y * z - w * x);
  const faces = [[3, upX], [4, -upX], [5, upY], [2, -upY], [1, upZ], [6, -upZ]];
  const top = faces.reduce((a, b) => a[1] > b[1] ? a : b);
  return top[1] >= 0.98 ? top[0] : null;
}

module.exports = {
  readD6Quaternion,
  DICE_TYPES,
  MAX_DICE_COUNT,
  THROW_DURATION_MS,
  STABLE_DURATION_MS,
  clamp,
  normalizeDegrees,
  normalizeCount,
  createDiceConfig,
  getSelectedDice,
  getThrowVelocity,
  getThrowStrength,
  readD6TopFace,
  isStable
};
