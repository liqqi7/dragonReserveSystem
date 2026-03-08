const app = getApp();
const userService = require("../../services/user");

Page({
  data: {
    hasUser: false,
    isGuest: true,
    user: {
      nickname: "",
      userIdShort: "",
      avatarUrl: ""
    },
    showEditModal: false,
    editNickname: "",
    editAvatarUrl: "",
    showPermissionModal: false,
    permissionInput: ""
  },

  onShow() {
    this.syncGuestState();
    const hasLocalAuth = !!wx.getStorageSync("accessToken");
    const userId = app.globalData.userId;
    const profile = app.globalData.userProfile;
    if (hasLocalAuth && userId && profile) {
      this.setData({
        hasUser: true,
        isGuest: !app.globalData.isAuthenticated,
        user: {
          nickname: profile.nickname || "",
          userIdShort: (userId || "").slice(0, 8),
          avatarUrl: profile.avatarUrl || ""
        }
      });
    } else {
      this.setData({ hasUser: false });
    }

    app.ensureUserReady(() => {
      this.loadUserProfile();
    });
  },

  syncGuestState() {
    const isGuest = !app.globalData.isAuthenticated;
    this.setData({ isGuest });
  },

  loadUserProfile() {
    if (!app.globalData.accessToken) {
      this.setData({ hasUser: false, isGuest: !app.globalData.isAuthenticated });
      return;
    }

    userService.getMe()
      .then((user) => {
        app.applyCurrentUser(user);
        const userId = String(user.id || "");
        this.setData({
          hasUser: true,
          isGuest: !app.globalData.isAuthenticated,
          user: {
            nickname: user.nickname || "",
            userIdShort: userId.slice(0, 8),
            avatarUrl: user.avatar_url || ""
          }
        });
      })
      .catch((err) => {
        console.error("查询用户失败:", err);
        this.setData({
          hasUser: false,
          isGuest: !app.globalData.isAuthenticated
        });
      });
  },

  startRegister() {
    wx.reLaunch({ url: "/pages/welcome/welcome" });
  },

  openPermissionModal() {
    this.setData({ showPermissionModal: true, permissionInput: "" });
  },

  closePermissionModal() {
    this.setData({ showPermissionModal: false, permissionInput: "" });
  },

  onPermissionInput(e) {
    this.setData({ permissionInput: e.detail.value || "" });
  },

  submitPermission() {
    const input = (this.data.permissionInput || "").trim();
    userService.updateMyRole(input)
      .then((user) => {
        app.applyCurrentUser(user);
        this.setData({ showPermissionModal: false, permissionInput: "", isGuest: false });
        wx.showToast({ title: "已获取权限", icon: "success" });
      })
      .catch((err) => {
        wx.showToast({ title: err.message || "邀请码错误", icon: "none" });
      });
  },

  removePermission() {
    wx.showModal({
      title: "确认删除权限",
      content: "确定要恢复为游客吗？将无法查看活动与记账数据。",
      success: (res) => {
        if (!res.confirm) return;
        userService.clearMyRole()
          .then((user) => {
            app.applyCurrentUser(user);
            this.setData({ isGuest: true });
            wx.showToast({ title: "已恢复为游客", icon: "success" });
          })
          .catch((err) => {
            wx.showToast({ title: err.message || "恢复失败", icon: "none" });
          });
      }
    });
  },

  logout() {
    wx.showModal({
      title: "退出登录",
      content: "退出后将清除本机的账号信息，下次需要重新登录。",
      success: (res) => {
        if (!res.confirm) return;

        app.logout();
        this.setData({
          hasUser: false,
          isGuest: true,
          user: {
            nickname: "",
            userIdShort: "",
            avatarUrl: ""
          }
        });

        wx.showToast({ title: "已退出登录", icon: "success" });
      }
    });
  },

  openEditModal() {
    const { user } = this.data;
    this.setData({
      showEditModal: true,
      editNickname: user.nickname,
      editAvatarUrl: user.avatarUrl || ""
    });
  },

  closeEditModal() {
    this.setData({ showEditModal: false });
  },

  stopTap() {},

  onInputNickname(e) {
    this.setData({ editNickname: e.detail.value || "" });
  },

  onChooseAvatar(e) {
    const avatarUrl = e.detail && e.detail.avatarUrl;
    if (!avatarUrl) {
      wx.showToast({ title: "未选择头像", icon: "none" });
      return;
    }

    this.setData({ editAvatarUrl: avatarUrl });
    wx.showToast({ title: "已选择微信头像", icon: "success" });
  },

  saveProfile() {
    const nickname = (this.data.editNickname || "").trim();
    const avatarUrl = (this.data.editAvatarUrl || "").trim();
    const userId = app.globalData.userId;

    if (!nickname) {
      wx.showToast({ title: "请输入昵称", icon: "none" });
      return;
    }
    if (!userId) {
      wx.showToast({ title: "用户信息异常", icon: "none" });
      return;
    }

    wx.showLoading({ title: "保存中...", mask: true });
    userService.updateMe({
      nickname,
      avatar_url: avatarUrl
    })
      .then((user) => {
        app.applyCurrentUser(user);
        this.setData({
          hasUser: true,
          user: {
            nickname: user.nickname || "",
            userIdShort: String(user.id || "").slice(0, 8),
            avatarUrl: user.avatar_url || ""
          },
          editAvatarUrl: user.avatar_url || "",
          showEditModal: false
        });
        wx.hideLoading();
        wx.showToast({ title: "保存成功", icon: "success" });
      })
      .catch((err) => {
        console.error("更新失败", err);
        wx.hideLoading();
        wx.showToast({ title: err.message || "保存失败", icon: "none" });
      });
  }
});
