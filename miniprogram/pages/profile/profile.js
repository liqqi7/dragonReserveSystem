const app = getApp();
const authService = require("../../services/auth");
const userService = require("../../services/user");
const { getApiBaseUrl } = require("../../services/config");
const { isDefaultNickname, isDefaultAvatar } = require("../../utils/profileUtils");
const DEFAULT_AVATAR = "/images/default-avatar.svg";
const MEDIA_BASE_URL = String(getApiBaseUrl() || "").replace(/\/api\/v\d+\/?$/, "");
const LOCAL_TEST_AVATAR_PREFIX = "/images/avatars";

function isTemporaryAvatarUrl(url) {
  if (!url) return false;
  const normalized = String(url).trim().toLowerCase();
  return normalized.startsWith("http://tmp/")
    || normalized.startsWith("https://tmp/")
    || normalized.startsWith("wxfile://")
    || normalized.startsWith("tmp/");
}

function normalizeAvatarUrl(url) {
  const value = (url && String(url).trim()) || "";
  if (!value) return "";
  if (value.toLowerCase().includes("example.com/")) return DEFAULT_AVATAR;
  if (value.startsWith("/media/")) {
    const m = value.match(/test-avatar-(\d{2})\.svg$/i);
    const output = m ? `${LOCAL_TEST_AVATAR_PREFIX}/test-avatar-${m[1]}.svg` : DEFAULT_AVATAR;
    return output;
  }
  if (value.startsWith("media/")) {
    const m = value.match(/test-avatar-(\d{2})\.svg$/i);
    const output = m ? `${LOCAL_TEST_AVATAR_PREFIX}/test-avatar-${m[1]}.svg` : DEFAULT_AVATAR;
    return output;
  }
  if (value.toLowerCase().startsWith("http://")) return DEFAULT_AVATAR;
  return value;
}

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
    forceProfileForSignup: false,
    forceProfileHint: "",
    forceProfileCanSubmit: true,
    showPermissionModal: false,
    permissionInput: ""
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }
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
          avatarUrl: normalizeAvatarUrl(profile.avatarUrl || "")
        }
      });
    } else {
      this.setData({ hasUser: false });
    }

    const shouldAutoLoginAndEdit = !!app.globalData._pendingAutoLoginAndEditProfile;
    if (shouldAutoLoginAndEdit) {
      app.globalData._pendingAutoLoginAndEditProfile = false;
      const hasAccessToken = !!(app.globalData.accessToken || wx.getStorageSync("accessToken"));
      if (!hasAccessToken) {
        this.startRegister({ openEditAfterLogin: true });
        return;
      }
      app.globalData._pendingOpenEditProfile = true;
    }

    app.ensureUserReady(() => {
      this.loadUserProfile();
      if (app.globalData._pendingOpenEditProfile) {
        app.globalData._pendingOpenEditProfile = false;
        this.openEditModal({
          forceProfileForSignup: !!app.globalData._pendingForceProfileForSignup
        });
        app.globalData._pendingForceProfileForSignup = false;
      }
    });
  },

  syncGuestState() {
    const hasWeChatAuth = !!wx.getStorageSync("hasWeChatAuth");
    const isGuest = !hasWeChatAuth || !app.globalData.isAuthenticated;
    this.setData({ isGuest });
  },

  loadUserProfile() {
    if (!app.globalData.accessToken) {
      this.setData({ hasUser: false, isGuest: !app.globalData.isAuthenticated });
      return Promise.resolve(null);
    }

    return userService.getMe()
      .then((user) => {
        app.applyCurrentUser(user);
        const userId = String(user.id || "");
        this.setData({
          hasUser: true,
          isGuest: !app.globalData.isAuthenticated,
          user: {
            nickname: user.nickname || "",
            userIdShort: userId.slice(0, 8),
            avatarUrl: normalizeAvatarUrl(user.avatar_url || "")
          }
        });
        return user;
      })
      .catch((err) => {
        console.error("查询用户失败:", err);
        this.setData({
          hasUser: false,
          isGuest: !app.globalData.isAuthenticated
        });
        throw err;
      });
  },

  startRegister(options = {}) {
    const openEditAfterLogin = !!options.openEditAfterLogin;
    wx.showLoading({ title: "登录中...", mask: true });
    authService.loginWithWechat(app)
      .then(() => {
        return this.loadUserProfile();
      })
      .then(() => {
        if (openEditAfterLogin) {
          this.openEditModal();
        }
        wx.hideLoading();
        wx.showToast({ title: "登录成功", icon: "success" });
      })
      .catch((err) => {
        console.error("wechat login error", err);
        wx.hideLoading();
        wx.showToast({
          title: (err && err.message) || "微信登录失败",
          icon: "none",
          duration: 3000
        });
      });
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

  updateForceProfileValidation() {
    if (!this.data.forceProfileForSignup) {
      this.setData({ forceProfileCanSubmit: true });
      return;
    }
    const nickname = (this.data.editNickname || "").trim();
    const avatarUrl = (this.data.editAvatarUrl || "").trim();
    const canSubmit = !isDefaultNickname(nickname) && !isDefaultAvatar(avatarUrl);
    this.setData({ forceProfileCanSubmit: canSubmit });
  },

  openEditModal(options = {}) {
    const { user } = this.data;
    const forceProfileForSignup = !!options.forceProfileForSignup;
    this.setData({
      showEditModal: true,
      editNickname: user.nickname,
      editAvatarUrl: normalizeAvatarUrl(user.avatarUrl || ""),
      forceProfileForSignup,
      forceProfileHint: forceProfileForSignup ? "请修改昵称和头像后再进行报名" : ""
    }, () => this.updateForceProfileValidation());
  },

  closeEditModal() {
    this.setData({
      showEditModal: false,
      forceProfileForSignup: false,
      forceProfileHint: "",
      forceProfileCanSubmit: true
    });
  },

  stopTap() {},

  onProfileAvatarError() {
    this.setData({
      "user.avatarUrl": DEFAULT_AVATAR
    });
  },

  onInputNickname(e) {
    this.setData({ editNickname: e.detail.value || "" }, () => this.updateForceProfileValidation());
  },

  onChooseAvatar(e) {
    const avatarUrl = e.detail && e.detail.avatarUrl;
    if (!avatarUrl) {
      wx.showToast({ title: "未选择头像", icon: "none" });
      return;
    }

    this.setData({ editAvatarUrl: avatarUrl }, () => this.updateForceProfileValidation());
    wx.showToast({ title: "已选择微信头像", icon: "success" });
  },

  saveProfile() {
    const nickname = (this.data.editNickname || "").trim();
    const avatarUrl = (this.data.editAvatarUrl || "").trim();
    const currentAvatarUrl = (this.data.user.avatarUrl || "").trim();
    const userId = app.globalData.userId;

    if (!nickname) {
      wx.showToast({ title: "请输入昵称", icon: "none" });
      return;
    }
    if (this.data.forceProfileForSignup && !this.data.forceProfileCanSubmit) {
      wx.showToast({ title: "请修改昵称和头像后再进行报名", icon: "none" });
      return;
    }
    if (!userId) {
      wx.showToast({ title: "用户信息异常", icon: "none" });
      return;
    }

    wx.showLoading({ title: "保存中...", mask: true });

    const avatarTask = avatarUrl && isTemporaryAvatarUrl(avatarUrl)
      ? userService.uploadAvatar(avatarUrl).then((res) => res.avatar_url)
      : Promise.resolve(avatarUrl || currentAvatarUrl);

    avatarTask
      .then((resolvedAvatarUrl) => userService.updateMe({
        nickname,
        avatar_url: resolvedAvatarUrl || ""
      }))
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
          showEditModal: false,
          forceProfileForSignup: false,
          forceProfileHint: "",
          forceProfileCanSubmit: true
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
