// Home render data consists of plain objects, arrays and primitive values.
function isSameHomeViewData(previous, next) {
  if (previous === next) return true;
  if (!previous || !next || typeof previous !== "object" || typeof next !== "object") return false;

  const previousIsArray = Array.isArray(previous);
  if (previousIsArray !== Array.isArray(next)) return false;
  if (previousIsArray) {
    if (previous.length !== next.length) return false;
    for (let index = 0; index < previous.length; index++) {
      if (!isSameHomeViewData(previous[index], next[index])) return false;
    }
    return true;
  }

  const keys = Object.keys(previous);
  if (keys.length !== Object.keys(next).length) return false;
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(next, key) ||
      !isSameHomeViewData(previous[key], next[key])) return false;
  }
  return true;
}

module.exports = { isSameHomeViewData };
