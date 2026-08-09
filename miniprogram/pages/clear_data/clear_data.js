const app = getApp();
const activityService = require("../../services/activity");

Page({
  data: {
    clearing: false,
    result: ""
  },

  onLoad() {
    if (app.globalData.userRole !== "admin") {
      wx.showToast({ title: "无权限", icon: "none" });
      setTimeout(() => wx.navigateBack(), 1500);
    }
  },

  clearAllData() {
    wx.showModal({
      title: "确认清空",
      content: "确定要清空所有活动数据吗？此操作不可恢复！",
      confirmText: "确认清空",
      confirmColor: "#fa5151",
      success: (res) => {
        if (res.confirm) this.doClearAllData();
      }
    });
  },

  doClearAllData() {
    this.setData({ clearing: true, result: "正在清空活动数据..." });

    activityService
      .listActivities()
      .then((activities) => Promise.all(
        (activities || []).map((activity) => activityService.deleteActivity(activity.id || activity._id))
      ))
      .then(() => {
        this.setData({ clearing: false, result: "所有活动数据已清空" });
        wx.showToast({ title: "清空成功", icon: "success" });
      })
      .catch((error) => {
        console.error(error);
        this.setData({ clearing: false, result: `清空失败：${(error && error.message) || "未知错误"}` });
        wx.showToast({ title: "清空失败", icon: "none" });
      });
  }
});
