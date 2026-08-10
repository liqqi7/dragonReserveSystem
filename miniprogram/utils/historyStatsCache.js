const STORAGE_KEY = "historyStatsCache_v1";

function read() {
  try {
    const raw = wx.getStorageSync(STORAGE_KEY);
    if (!raw) return null;
    const payload = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!payload || !Array.isArray(payload.list)) return null;
    return {
      savedAt: Number(payload.savedAt) || 0,
      list: payload.list
    };
  } catch (_error) {
    return null;
  }
}

function write(list) {
  try {
    wx.setStorageSync(STORAGE_KEY, JSON.stringify({
      savedAt: Date.now(),
      list: Array.isArray(list) ? list : []
    }));
  } catch (_error) {}
}

function clear() {
  try {
    wx.removeStorageSync(STORAGE_KEY);
  } catch (_error) {}
}

module.exports = {
  read,
  write,
  clear
};
