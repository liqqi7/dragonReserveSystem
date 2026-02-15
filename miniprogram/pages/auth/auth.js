const app = getApp();

Page({
  data: {
    inviteCodeInput: ""
  },

  onLoad() {
    // 如果已登录，直接跳转到活动管理页
    if (app.globalData.isAuthenticated) {
      wx.switchTab({
        url: '/pages/activity_list/activity_list'
      });
    }
  },

  onInviteCodeInput(e) {
    this.setData({ inviteCodeInput: e.detail.value });
  },

  checkInvite() {
    const input = (this.data.inviteCodeInput || "").trim();
    
    let role = null;
    if (input === "dragon") {
      role = "user";
    } else if (input === "manage") {
      role = "admin";
    }

    if (role) {
      app.setAuthState(role, true);
      wx.showToast({ title: "验证成功", icon: "success" });
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/activity_list/activity_list'
        });
      }, 500);
    } else {
      wx.showToast({ title: "邀请码错误", icon: "none" });
    }
  }
});
