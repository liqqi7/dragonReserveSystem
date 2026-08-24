const { getApiBaseUrl } = require("./config");
const KEY_CLIENT_CACHE_VERSION = "clientCacheVersion";
const KEY_ACTIVITY_STYLE_SIGNATURE = "activityStyleSignature";
const KEY_ACTIVITY_LIST_CACHE = "activityListCache";
const KEY_ACTIVITY_TYPE_STYLES_CACHE = "activityTypeStylesCache";
const KEY_CACHE_METADATA_CHECKED_AT = "cacheMetadataCheckedAt";

function cacheKey(key) {
  const api = String(getApiBaseUrl() || "default").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return `${key}:${api || "default"}`;
}

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
  return String(_safeGet(cacheKey(KEY_CLIENT_CACHE_VERSION), ""));
}

function setClientCacheVersion(version) {
  _safeSet(cacheKey(KEY_CLIENT_CACHE_VERSION), String(version || ""));
}

function getActivityStyleSignature() {
  return String(_safeGet(cacheKey(KEY_ACTIVITY_STYLE_SIGNATURE), ""));
}

function setActivityStyleSignature(signature) {
  _safeSet(cacheKey(KEY_ACTIVITY_STYLE_SIGNATURE), String(signature || ""));
}

function getCacheMetadataCheckedAt() {
  const value = Number(_safeGet(cacheKey(KEY_CACHE_METADATA_CHECKED_AT), 0));
  return Number.isFinite(value) ? value : 0;
}

function setCacheMetadataCheckedAt(timestamp = Date.now()) {
  _safeSet(cacheKey(KEY_CACHE_METADATA_CHECKED_AT), Number(timestamp) || Date.now());
}

function getCachedActivityList() {
  return _safeGet(cacheKey(KEY_ACTIVITY_LIST_CACHE), null);
}

function setCachedActivityList(list, userId = "") {
  _safeSet(cacheKey(KEY_ACTIVITY_LIST_CACHE), {
    list: Array.isArray(list) ? list : [],
    userId: String(userId || ""),
    updatedAt: Date.now()
  });
}

function clearCachedActivityList() {
  try {
    wx.removeStorageSync(cacheKey(KEY_ACTIVITY_LIST_CACHE));
  } catch (_e) {}
}

function getCachedActivityTypeStyles() {
  return _safeGet(cacheKey(KEY_ACTIVITY_TYPE_STYLES_CACHE), null);
}

function setCachedActivityTypeStyles(styles) {
  _safeSet(cacheKey(KEY_ACTIVITY_TYPE_STYLES_CACHE), {
    styles: Array.isArray(styles) ? styles : [],
    updatedAt: Date.now()
  });
}

function clearBusinessCaches() {
  [KEY_ACTIVITY_LIST_CACHE, KEY_ACTIVITY_TYPE_STYLES_CACHE].forEach((k) => {
    try {
      wx.removeStorageSync(cacheKey(k));
    } catch (_e) {}
  });
}

module.exports = {
  getClientCacheVersion,
  setClientCacheVersion,
  getActivityStyleSignature,
  setActivityStyleSignature,
  getCacheMetadataCheckedAt,
  setCacheMetadataCheckedAt,
  getCachedActivityList,
  setCachedActivityList,
  clearCachedActivityList,
  getCachedActivityTypeStyles,
  setCachedActivityTypeStyles,
  clearBusinessCaches
};
