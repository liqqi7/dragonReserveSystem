const app = getApp();
const activityService = require("../../services/activity");
const statsService = require("../../services/stats");
const { patchTabBarIfNeeded } = require("../../utils/tabBarSync");

function resolveActivityStatus(activity) {
  const currentStatus = activity.status || "进行中";
  if (currentStatus === "已取消") return "已取消";

  const now = Date.now();
  const start = activity.start_time ? new Date(activity.start_time).getTime() : NaN;
  const end = activity.end_time ? new Date(activity.end_time).getTime() : NaN;

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
    endedActivityCount: 0
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
    activityService
      .listActivities()
      .then((activities) => {
        const endedActivityCount = (activities || []).filter(
          (activity) => resolveActivityStatus(activity) === "已结束"
        ).length;
        this.setData({ endedActivityCount });
      })
      .catch((error) => console.error(error));
  },

  loadPigeonStats() {
    statsService
      .getHistoryStats()
      .then((stats) => {
        this.setData({
          pigeonStats: (stats || []).map((item) => ({
            userId: String(item.user_id),
            name: item.nickname,
            signupCount: item.signup_count,
            checkinCount: item.checkin_count,
            pigeonCount: item.pigeon_count,
            pigeonRate: item.pigeon_rate
          }))
        });
      })
      .catch((error) => {
        console.error(error);
        wx.showToast({ title: (error && error.message) || "加载排行榜失败", icon: "none" });
      });
  }
});
