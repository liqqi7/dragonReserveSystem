const userService = require("./services/user");

App({
  globalData: {
    userRole: null,
    isAuthenticated: false,
    userInfo: null,
    accessToken: "",
    userId: "",
    userDocId: "",
    userProfile: null,
    sessionValidated: false
  },

  onLaunch() {
    this.restoreSessionFromStorage();
    this.restoreAuthState();
  },

  restoreSessionFromStorage() {
    try {
      const accessToken = wx.getStorageSync("accessToken");
      const userId = wx.getStorageSync("userId");
      const nickname = wx.getStorageSync("userNickname") || "";
      const avatarUrl = wx.getStorageSync("userAvatarUrl") || "";

      if (!accessToken || !userId) return;

      this.globalData.accessToken = accessToken;
      this.globalData.userId = userId;
      this.globalData.userProfile = { nickname, avatarUrl };
    } catch (e) {
      console.error("恢复用户缓存失败", e);
    }
  },

  restoreAuthState() {
    try {
      const userRole = wx.getStorageSync("userRole");
      const isAuthenticated = wx.getStorageSync("isAuthenticated");

      if (userRole) {
        this.globalData.userRole = userRole;
        this.globalData.isAuthenticated = !!isAuthenticated;
        this.globalData.userInfo = {
          role: userRole
        };
      }
    } catch (e) {
      console.error("恢复登录状态失败", e);
    }
  },

  applyCurrentUser(user, accessToken) {
    const role = user.role || "guest";
    const isAuthenticated = role === "user" || role === "admin";

    if (accessToken) {
      this.globalData.accessToken = accessToken;
      wx.setStorageSync("accessToken", accessToken);
    }

    this.globalData.userId = String(user.id || "");
    this.globalData.userDocId = "";
    this.globalData.userRole = role;
    this.globalData.isAuthenticated = isAuthenticated;
    this.globalData.userInfo = { role };
    this.globalData.userProfile = {
      nickname: user.nickname || "",
      avatarUrl: user.avatar_url || ""
    };
    this.globalData.sessionValidated = true;

    wx.setStorageSync("hasWeChatAuth", true);
    wx.setStorageSync("userId", String(user.id || ""));
    wx.setStorageSync("userNickname", user.nickname || "");
    wx.setStorageSync("userAvatarUrl", user.avatar_url || "");
    wx.setStorageSync("userRole", role);
    wx.setStorageSync("isAuthenticated", isAuthenticated);
  },

  setAuthState(role, isAuthenticated) {
    this.globalData.userRole = role;
    this.globalData.isAuthenticated = isAuthenticated;
    this.globalData.userInfo = { role };

    try {
      wx.setStorageSync("userRole", role);
      wx.setStorageSync("isAuthenticated", isAuthenticated);
    } catch (e) {
      console.error("保存登录状态失败", e);
    }
  },

  clearAuthState() {
    this.setAuthState("guest", false);
  },

  logout() {
    this.globalData.userRole = null;
    this.globalData.isAuthenticated = false;
    this.globalData.userInfo = null;
    this.globalData.accessToken = "";
    this.globalData.userId = "";
    this.globalData.userDocId = "";
    this.globalData.userProfile = null;
    this.globalData.sessionValidated = false;

    [
      "hasWeChatAuth",
      "accessToken",
      "userId",
      "userNickname",
      "userAvatarUrl",
      "userRole",
      "isAuthenticated"
    ].forEach((key) => wx.removeStorageSync(key));
  },

  checkProfileCompleteness() {
    if (!this.globalData.isAuthenticated || !this.globalData.userProfile) return;

    const profile = this.globalData.userProfile;
    const nickname = (profile.nickname || "").trim();
    const avatarUrl = (profile.avatarUrl || "").trim();

    const isNicknameDefault = !nickname || nickname === "微信用户";
    const isAvatarDefault =
      !avatarUrl ||
      avatarUrl.includes("thirdwx.qlogo.cn/mmopen/vi_32") ||
      avatarUrl.includes("/0") ||
      avatarUrl.endsWith("/0") ||
      avatarUrl.endsWith("/132") ||
      avatarUrl.startsWith("https://thirdwx.qlogo.cn/mmopen/");

    if (!isNicknameDefault && !isAvatarDefault) return;

    wx.showModal({
      title: "完善个人信息",
      content: "您的昵称或头像尚未设置，是否立刻修改？",
      confirmText: "修改",
      cancelText: "稍后再说",
      success: (res) => {
        if (res.confirm) {
          this.globalData._pendingOpenEditProfile = true;
          wx.switchTab({ url: "/pages/profile/profile" });
        }
      }
    });
  },

  ensureUserReady(callback) {
    if (
      this.globalData.sessionValidated &&
      this.globalData.accessToken &&
      this.globalData.userId &&
      this.globalData.userProfile
    ) {
      callback && callback();
      return;
    }

    if (!this.globalData.accessToken) {
      this.logout();
      return;
    }

    userService.getMe()
      .then((user) => {
        this.applyCurrentUser(user);
        callback && callback();
      })
      .catch((err) => {
        console.error("ensureUserReady error", err);
        this.logout();
      });
  }
});
