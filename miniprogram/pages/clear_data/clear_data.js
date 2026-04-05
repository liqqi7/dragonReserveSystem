const app = getApp();
const activityService = require("../../services/activity");
const billService = require("../../services/bill");

Page({
  data: {
    clearing: false,
    result: ""
  },

  onLoad() {
    if (app.globalData.userRole !== "admin") {
      wx.showToast({ title: "无权限", icon: "none" });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  clearAllData() {
    wx.showModal({
      title: "确认清空",
      content: "确定要清空所有活动数据和记账数据吗？此操作不可恢复！",
      confirmText: "确认清空",
      confirmColor: "#fa5151",
      success: (res) => {
        if (res.confirm) {
          this.doClearAllData();
        }
      }
    });
  },

  doClearAllData() {
    this.setData({ clearing: true, result: "正在清空数据..." });

    activityService
      .listActivities()
      .then((activities) => {
        const list = activities || [];
        if (!list.length) return Promise.resolve();
        return Promise.all(list.map((activity) => activityService.deleteActivity(activity.id || activity._id)));
      })
      .then(() => {
        this.setData({ result: "活动数据已清空，正在清空记账数据..." });
        return billService.listBills();
      })
      .then((bills) => {
        const list = bills || [];
        if (!list.length) return Promise.resolve();
        return Promise.all(list.map((bill) => billService.deleteBill(bill.id || bill._id)));
      })
      .then(() => {
        this.setData({
          clearing: false,
          result: "✅ 所有数据已清空！\n\n- 活动数据：已清空\n- 记账数据：已清空"
        });
        wx.showToast({ title: "清空成功", icon: "success" });
      })
      .catch((err) => {
        console.error(err);
        this.setData({
          clearing: false,
          result: `❌ 清空失败：${(err && err.message) || "未知错误"}`
        });
        wx.showToast({ title: "清空失败", icon: "none" });
      });
  }
});
