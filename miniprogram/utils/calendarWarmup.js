/**
 * 在首页活动列表拉取成功后，空闲预取「已报名活动」写入 myActivitiesCache，减少切到日程 Tab 时冷启动等待。
 */
const activityService = require("../services/activity");
const myActivitiesCache = require("./myActivitiesCache");

const PREFETCH_MIN_INTERVAL_MS = 45 * 1000;

let _inflight = null;

function prefetchSignedUpList(app) {
  const token = app.globalData.accessToken || wx.getStorageSync("accessToken");
  const uid = String(app.globalData.userId || wx.getStorageSync("userId") || "").trim();
  if (!token || !uid) return null;

  const now = Date.now();
  const payload = myActivitiesCache.readPayload(uid);
  if (payload && now - payload.savedAt < PREFETCH_MIN_INTERVAL_MS) {
    return null;
  }
  if (_inflight) return _inflight;

  _inflight = activityService
    .listMyActivities()
    .then((list) => {
      myActivitiesCache.writeRawList(uid, list || []);
    })
    .catch(() => {})
    .finally(() => {
      _inflight = null;
    });
  return _inflight;
}

module.exports = {
  prefetchSignedUpList,
};
