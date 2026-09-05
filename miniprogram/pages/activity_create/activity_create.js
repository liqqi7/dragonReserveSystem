const activityService = require("../../services/activity");

const DEFAULT_ACTIVITY_TYPE_VALUES = ["badminton", "boardgame", "other"];
const DEFAULT_ACTIVITY_TYPE_LABELS = ["羽毛球", "桌游", "其它"];

Page({
  data: {
    activityTypeOptionValues: DEFAULT_ACTIVITY_TYPE_VALUES,
    activityTypeOptionLabels: DEFAULT_ACTIVITY_TYPE_LABELS,
    submitting: false
  },

  onLoad() {
    const eventChannel = this.getOpenerEventChannel();
    this._openerEventChannel = eventChannel;
    if (!eventChannel || typeof eventChannel.on !== "function") return;
    eventChannel.on("initCreateActivity", (options = {}) => {
      const values = Array.isArray(options.activityTypeOptionValues)
        ? options.activityTypeOptionValues
        : [];
      const labels = Array.isArray(options.activityTypeOptionLabels)
        ? options.activityTypeOptionLabels
        : [];
      if (!values.length || values.length !== labels.length) return;
      this.setData({
        activityTypeOptionValues: values,
        activityTypeOptionLabels: labels
      });
    });
  },

  closeCreateRoute() {
    if (this.data.submitting) return;
    wx.navigateBack();
  },

  submitCreateActivity(e) {
    if (this.data.submitting) return;
    const payload = e && e.detail && e.detail.payload;
    if (!payload) {
      wx.showToast({ title: "活动信息缺失", icon: "none" });
      return;
    }

    this.setData({ submitting: true });
    wx.showLoading({ title: "创建中...", mask: true });
    activityService.createActivity(payload)
      .then(() => {
        wx.hideLoading();
        wx.showToast({ title: "创建成功", icon: "success" });
        if (this._openerEventChannel && typeof this._openerEventChannel.emit === "function") {
          this._openerEventChannel.emit("activityCreated");
        }
        wx.navigateBack();
      })
      .catch((error) => {
        console.error(error);
        wx.hideLoading();
        this.setData({ submitting: false });
        wx.showToast({ title: (error && error.message) || "创建失败", icon: "none" });
      });
  }
});
