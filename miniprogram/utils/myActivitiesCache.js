/**
 * 「我的已报名活动」列表缓存，供日程页秒开 + 后台刷新。
 * 按 userId 分桶，登出时清除，避免串号。
 */

const PREFIX = "signedUpActivities_v1";

function storageKey(userId) {
  return `${PREFIX}_${String(userId || "").trim() || "anon"}`;
}

function readPayload(userId) {
  const uid = String(userId || "").trim();
  if (!uid) return null;
  try {
    const raw = wx.getStorageSync(storageKey(uid));
    if (!raw) return null;
    const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!obj || !Array.isArray(obj.list)) return null;
    return { savedAt: Number(obj.savedAt) || 0, list: obj.list };
  } catch (e) {
    return null;
  }
}

function readRawList(userId) {
  const p = readPayload(userId);
  return p ? p.list : null;
}

function writeRawList(userId, list) {
  const uid = String(userId || "").trim();
  if (!uid) return;
  try {
    wx.setStorageSync(
      storageKey(uid),
      JSON.stringify({ savedAt: Date.now(), list: list || [] })
    );
  } catch (e) {}
}

function removeForUser(userId) {
  const uid = String(userId || "").trim();
  if (!uid) return;
  try {
    wx.removeStorageSync(storageKey(uid));
  } catch (e) {}
}

module.exports = {
  readRawList,
  writeRawList,
  removeForUser,
  readPayload,
};
