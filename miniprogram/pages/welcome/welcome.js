const authService = require("../../services/auth");
const app = getApp();

Page({
  data: {
    submitting: false
  },

  onLoad() {
    this.checkUserExists();
  },

  checkUserExists() {
    if (!wx.getStorageSync("accessToken")) return;

    app.ensureUserReady(() => {
      wx.reLaunch({ url: "/pages/activity_list/activity_list" });
    });
  },

  onWechatLogin() {
    if (this.data.submitting) return;
    this.setData({ submitting: true });

    authService.loginWithWechat(app)
      .then(() => {
        this.setData({ submitting: false });
        wx.reLaunch({ url: "/pages/activity_list/activity_list" });
      })
      .catch((err) => {
        console.error("wechat login error", err);
        wx.removeStorageSync("accessToken");
        this.setData({ submitting: false });
        wx.showToast({
          title: (err && err.message) || "微信登录失败",
          icon: "none",
          duration: 3000
        });
      });
  }
});
