const app = getApp();
const statsService = require("../../services/stats");
const cacheManager = require("../../services/cacheManager");
const historyStatsCache = require("../../utils/historyStatsCache");
const { patchTabBarIfNeeded } = require("../../utils/tabBarSync");

const ACTIVITY_LIST_CACHE_TTL_MS = 60 * 1000;

function resolveActivityStatus(activity) {
  const currentStatus = activity.status || "进行中";
  if (currentStatus === "已取消") return "已取消";

  const now = Date.now();
  const startValue = activity.start_time || activity.startTime;
  const endValue = activity.end_time || activity.endTime;
  const start = startValue ? new Date(startValue).getTime() : NaN;
  const end = endValue ? new Date(endValue).getTime() : NaN;

  if (!Number.isNaN(start) && !Number.isNaN(end)) {
    if (now < start) return "未开始";
    if (now < end) return "进行中";
    return "已结束";
  }

  return currentStatus;
}

Page({
  data: {
    statusBarHeight: 20,
    pigeonStats: [],
    endedActivityCount: 0,
    isLoadingPigeonStats: true
  },

  onLoad() {
    try {
      const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      this.setData({ statusBarHeight: info.statusBarHeight || 20 });
    } catch (error) {
      console.warn("Failed to read status bar height", error);
    }
  },

  onShow() {
    patchTabBarIfNeeded(this, {
      selected: 2,
      isAdmin: app.globalData.userRole === "admin"
    });
    this.loadEndedActivityCount();
    this.loadPigeonStats();
  },

  loadEndedActivityCount() {
    const cached = cacheManager.getCachedActivityList();
    const cacheAge = Date.now() - Number((cached && cached.updatedAt) || 0);
    if (
      cached &&
      Array.isArray(cached.list) &&
      cacheAge >= 0 &&
      cacheAge < ACTIVITY_LIST_CACHE_TTL_MS
    ) {
      const endedActivityCount = cached.list.filter(
        (activity) => resolveActivityStatus(activity) === "已结束"
      ).length;
      this.setData({ endedActivityCount });
      return;
    }

    statsService
      .getHistorySummary()
      .then((summary) => {
        this.setData({ endedActivityCount: Number((summary && summary.ended_activity_count) || 0) });
      })
      .catch((error) => console.error(error));
  },

  loadPigeonStats() {
    const cached = historyStatsCache.read();
    if (cached) {
      this.setData({
        pigeonStats: this.formatPigeonStats(cached.list),
        isLoadingPigeonStats: false
      });
    } else {
      this.setData({ isLoadingPigeonStats: true });
    }

    const requestSequence = (this._historyStatsRequestSequence || 0) + 1;
    this._historyStatsRequestSequence = requestSequence;

    statsService
      .getHistoryStats()
      .then((stats) => {
        if (this._historyStatsRequestSequence !== requestSequence) return;
        const rawStats = Array.isArray(stats) ? stats : [];
        historyStatsCache.write(rawStats);
        this.setData({
          pigeonStats: this.formatPigeonStats(rawStats),
          isLoadingPigeonStats: false
        });
      })
      .catch((error) => {
        if (this._historyStatsRequestSequence !== requestSequence) return;
        console.error(error);
        this.setData({ isLoadingPigeonStats: false });
        if (!cached) {
          wx.showToast({ title: (error && error.message) || "加载排行榜失败", icon: "none" });
        }
      });
  },

  formatPigeonStats(stats) {
    return (stats || []).map((item) => ({
      userId: String(item.user_id),
      name: item.nickname,
      signupCount: item.signup_count,
      checkinCount: item.checkin_count,
      pigeonCount: item.pigeon_count,
      pigeonRate: item.pigeon_rate
    }));
  }
});
