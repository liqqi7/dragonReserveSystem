const KEY_CLIENT_CACHE_VERSION = "clientCacheVersion";
const KEY_ACTIVITY_STYLE_SIGNATURE = "activityStyleSignature";
const KEY_ACTIVITY_LIST_CACHE = "activityListCache";
const KEY_ACTIVITY_TYPE_STYLES_CACHE = "activityTypeStylesCache";

function _safeGet(key, fallback = null) {
  try {
    const value = wx.getStorageSync(key);
    return value == null || value === "" ? fallback : value;
  } catch (_e) {
    return fallback;
  }
}

function _safeSet(key, value) {
  try {
    wx.setStorageSync(key, value);
  } catch (_e) {}
}

function getClientCacheVersion() {
  return String(_safeGet(KEY_CLIENT_CACHE_VERSION, ""));
}

function setClientCacheVersion(version) {
  _safeSet(KEY_CLIENT_CACHE_VERSION, String(version || ""));
}

function getActivityStyleSignature() {
  return String(_safeGet(KEY_ACTIVITY_STYLE_SIGNATURE, ""));
}

function setActivityStyleSignature(signature) {
  _safeSet(KEY_ACTIVITY_STYLE_SIGNATURE, String(signature || ""));
}

function getCachedActivityList() {
  return _safeGet(KEY_ACTIVITY_LIST_CACHE, null);
}

function setCachedActivityList(list, userId = "") {
  _safeSet(KEY_ACTIVITY_LIST_CACHE, {
    list: Array.isArray(list) ? list : [],
    userId: String(userId || ""),
    updatedAt: Date.now()
  });
}

function getCachedActivityTypeStyles() {
  return _safeGet(KEY_ACTIVITY_TYPE_STYLES_CACHE, null);
}

function setCachedActivityTypeStyles(styles) {
  _safeSet(KEY_ACTIVITY_TYPE_STYLES_CACHE, {
    styles: Array.isArray(styles) ? styles : [],
    updatedAt: Date.now()
  });
}

function clearBusinessCaches() {
  [KEY_ACTIVITY_LIST_CACHE, KEY_ACTIVITY_TYPE_STYLES_CACHE].forEach((k) => {
    try {
      wx.removeStorageSync(k);
    } catch (_e) {}
  });
}

module.exports = {
  getClientCacheVersion,
  setClientCacheVersion,
  getActivityStyleSignature,
  setActivityStyleSignature,
  getCachedActivityList,
  setCachedActivityList,
  getCachedActivityTypeStyles,
  setCachedActivityTypeStyles,
  clearBusinessCaches
};
