const app = getApp();
const authService = require("../../services/auth");
const userService = require("../../services/user");
const { logPageError } = require("../../services/logger");
const { resolveLocalMediaUrl, isLocalTestMediaUrl } = require("../../services/config");
const { isTemporaryAvatarUrl } = require("../../utils/profileUtils");
const { chooseUploadedAvatar } = require("../../utils/avatarPicker");
const { patchTabBarIfNeeded } = require("../../utils/tabBarSync");
const { getBottomSafeAreaRpx } = require("../../utils/safeArea");
const { getProfileSubtitle } = require("../../utils/profilePresentation");
const DEFAULT_AVATAR = "/images/default-avatar.svg";
const LOCAL_TEST_AVATAR_PREFIX = "/images/avatars";

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
  if (value.toLowerCase().startsWith("http://")) {
    const resolved = resolveLocalMediaUrl(value);
    return isLocalTestMediaUrl(value) ? resolved : DEFAULT_AVATAR;
  }
  return value;
}

function syncProfileTabBarModalMask(page, visible) {
  const applyMask = () => {
    const tabBar = page && typeof page.getTabBar === "function" ? page.getTabBar() : null;
    if (tabBar && typeof tabBar.setModalMaskVisible === "function") {
      tabBar.setModalMaskVisible(visible);
    }
  };
  applyMask();
  if (visible && typeof wx !== "undefined" && typeof wx.nextTick === "function") {
    wx.nextTick(applyMask);
  }
}

Page({
  data: {
    statusBarHeight: 0,
    hasUser: false,
    isGuest: true,
    user: {
      nickname: "",
      avatarUrl: "",
      subtitle: ""
    },
    showEditModal: false,
    editNickname: "",
    editAvatarUrl: "",
    showPermissionModal: false,
    showDeletePermissionModal: false,
    permissionInput: "",
    permissionSubmitting: false,
    permissionRemoving: false,
    bottomSafeAreaRpx: 0
  },

  onLoad() {
    let statusBarHeight = 0;
    try {
      const info = typeof wx.getWindowInfo === "function" ? wx.getWindowInfo() : wx.getSystemInfoSync();
      statusBarHeight = Number(info.statusBarHeight) || 0;
    } catch (e) {}
    this.setData({ statusBarHeight });
  },

  onShow() {
    this.setData({ bottomSafeAreaRpx: getBottomSafeAreaRpx() });
    patchTabBarIfNeeded(this, {
      selected: 3,
      hidden: false
    });
    this.syncGuestState();
    if (this.data.showPermissionModal || this.data.showDeletePermissionModal) {
      syncProfileTabBarModalMask(this, true);
    }
    const hasLocalAuth = !!wx.getStorageSync("accessToken");
    const userId = app.globalData.userId;
    const profile = app.globalData.userProfile;
    if (hasLocalAuth && userId && profile) {
      this.setData({
        hasUser: true,
        isGuest: !app.globalData.isAuthenticated,
        user: {
          nickname: profile.nickname || "",
          avatarUrl: normalizeAvatarUrl(profile.avatarUrl || ""),
          subtitle: getProfileSubtitle(profile.role || app.globalData.userRole, profile.createdAt)
        }
      });
    } else {
      this.setData({ hasUser: false });
    }

    const pendingCreateAccessAction = String(app.globalData.pendingCreateAccessAction || "");
    if (pendingCreateAccessAction) {
      app.globalData.pendingCreateAccessAction = "";
      if (pendingCreateAccessAction === "login") {
        this.startRegister();
        return;
      }
      if (pendingCreateAccessAction === "permission") {
        this.openPermissionModal();
      }
    }

    app.ensureUserReady(() => {
      const currentUser = app.globalData.userProfile || {};
      this.setData({
        hasUser: true,
        isGuest: !app.globalData.isAuthenticated,
        user: {
          nickname: currentUser.nickname || "",
          avatarUrl: normalizeAvatarUrl(currentUser.avatarUrl || ""),
          subtitle: getProfileSubtitle(currentUser.role || app.globalData.userRole, currentUser.createdAt)
        }
      });

    });
  },

  onHide() {
    syncProfileTabBarModalMask(this, false);
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
        this.setData({
          hasUser: true,
          isGuest: !app.globalData.isAuthenticated,
          user: {
            nickname: user.nickname || "",
            avatarUrl: normalizeAvatarUrl(user.avatar_url || ""),
            subtitle: getProfileSubtitle(user.role || app.globalData.userRole, user.created_at)
          }
        });
        return user;
      })
      .catch((err) => {
        logPageError("load_profile", err);
        this.setData({
          hasUser: false,
          isGuest: !app.globalData.isAuthenticated
        });
        throw err;
      });
  },

  startRegister(options = {}) {
    const openEditAfterLogin = !!options.openEditAfterLogin;
    const openPermissionAfterLogin = !!options.openPermissionAfterLogin;
    wx.showLoading({ title: "登录中...", mask: true });
    authService.loginWithWechat(app)
      .then(() => {
        return this.loadUserProfile();
      })
      .then(() => {
        if (openEditAfterLogin) {
          this.openEditModal();
        } else if (openPermissionAfterLogin) {
          this.openPermissionModal();
        }
        wx.hideLoading();
        wx.showToast({ title: "登录成功", icon: "success" });
      })
      .catch((err) => {
        logPageError("wechat_login", err);
        wx.hideLoading();
        wx.showToast({
          title: (err && err.message) || "微信登录失败",
          icon: "none",
          duration: 3000
        });
      });
  },

  onProfileEditTap() {
    if (this.data.hasUser) {
      this.openEditModal();
      return;
    }
    this.startRegister({ openEditAfterLogin: true });
  },

  onAccessTap() {
    if (!this.data.hasUser) {
      this.startRegister({ openPermissionAfterLogin: true });
      return;
    }
    if (this.data.isGuest) {
      this.openPermissionModal();
      return;
    }
    this.removePermission();
  },

  openPermissionModal() {
    this.setData({
      showPermissionModal: true,
      permissionInput: "",
      permissionSubmitting: false
    });
    syncProfileTabBarModalMask(this, true);
  },

  closePermissionModal() {
    this.setData({
      showPermissionModal: false,
      permissionInput: "",
      permissionSubmitting: false
    });
    syncProfileTabBarModalMask(this, false);
  },

  onPermissionInput(e) {
    this.setData({ permissionInput: e.detail.value || "" });
  },

  submitPermission() {
    if (this.data.permissionSubmitting) return;
    const input = (this.data.permissionInput || "").trim();
    if (!input) {
      wx.showToast({ title: "请输入邀请码", icon: "none" });
      return;
    }
    this.setData({ permissionSubmitting: true });
    userService.updateMyRole(input)
      .then((user) => {
        app.applyCurrentUser(user);
        this.setData({
          showPermissionModal: false,
          permissionInput: "",
          permissionSubmitting: false,
          isGuest: false,
          user: {
            ...this.data.user,
            subtitle: getProfileSubtitle(user.role || app.globalData.userRole, user.created_at)
          }
        });
        syncProfileTabBarModalMask(this, false);
        wx.showToast({ title: "已获取权限", icon: "success" });
      })
      .catch((err) => {
        this.setData({ permissionSubmitting: false });
        wx.showToast({ title: err.message || "邀请码错误", icon: "none" });
      });
  },

  removePermission() {
    this.setData({
      showDeletePermissionModal: true,
      permissionRemoving: false
    });
    syncProfileTabBarModalMask(this, true);
  },

  closeDeletePermissionModal() {
    this.setData({
      showDeletePermissionModal: false,
      permissionRemoving: false
    });
    syncProfileTabBarModalMask(this, false);
  },

  confirmDeletePermission() {
    if (this.data.permissionRemoving) return;
    this.setData({ permissionRemoving: true });
    userService.clearMyRole()
      .then((user) => {
        app.applyCurrentUser(user);
        this.setData({
          isGuest: true,
          showDeletePermissionModal: false,
          permissionRemoving: false,
          user: {
            ...this.data.user,
            subtitle: getProfileSubtitle(user.role || app.globalData.userRole, user.created_at)
          }
        });
        syncProfileTabBarModalMask(this, false);
        wx.showToast({ title: "已恢复为游客", icon: "success" });
      })
      .catch((err) => {
        this.setData({ permissionRemoving: false });
        wx.showToast({ title: err.message || "恢复失败", icon: "none" });
      });
  },

  logout() {
    const dialog = this.selectComponent("#logout-dialog");
    if (!dialog || typeof dialog.open !== "function") return;
    dialog.open({
      type: "logout",
      title: "退出登录",
      message: "退出后将清除本机的账号信息，下次需要重新登录。",
      cancelText: "取消",
      confirmText: "确定",
      variant: "danger",
      prototypeStyle: true,
      strongMask: true,
      confirmBehavior: "emit"
    });
  },

  confirmLogout() {
    if (!this.data.hasUser) return;
    app.logout();
    this.setData({
      hasUser: false,
      isGuest: true,
      user: { nickname: "", avatarUrl: "", subtitle: "" }
    });
    wx.showToast({ title: "已退出登录", icon: "success" });
  },
  openEditModal() {
    const { user } = this.data;
    this.setData({
      showEditModal: true,
      editNickname: user.nickname,
      editAvatarUrl: normalizeAvatarUrl(user.avatarUrl || "")
    });
  },

  closeEditModal() {
    this.setData({
      showEditModal: false
    });
  },

  stopTap() {},

  stopTouchMove() {},

  onProfileAvatarError() {
    this.setData({
      "user.avatarUrl": DEFAULT_AVATAR
    });
  },

  onInputNickname(e) {
    this.setData({ editNickname: e.detail.value || "" });
  },

  onChooseAvatar() {
    chooseUploadedAvatar()
      .then((avatarUrl) => {
        this.setData({ editAvatarUrl: avatarUrl });
      })
      .catch((error) => {
        const message = (error && error.message) || "选择头像失败";
        if (!message.includes("cancel")) {
          wx.showToast({ title: message, icon: "none" });
        }
      });
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
            avatarUrl: user.avatar_url || "",
            subtitle: getProfileSubtitle(user.role || app.globalData.userRole, user.created_at)
          },
          editAvatarUrl: user.avatar_url || "",
          showEditModal: false
        });
        wx.hideLoading();
        wx.showToast({ title: "保存成功", icon: "success" });
      })
      .catch((err) => {
        logPageError("save_profile", err);
        wx.hideLoading();
        wx.showToast({ title: err.message || "保存失败", icon: "none" });
      });
  }
});
