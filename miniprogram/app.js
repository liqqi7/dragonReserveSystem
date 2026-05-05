const userService = require("./services/user");



App({

  globalData: {

    /** 自定义 TabBar 重挂载时 data.selected 会重置，用此值在 attached 中立即恢复，避免 0→正确值 二次 transition */
    tabBarSelected: 0,

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

    try {
      const uid =
        String((this.globalData && this.globalData.userId) || "").trim() ||
        String(wx.getStorageSync("userId") || "").trim();
      if (uid) {
        const myActivitiesCache = require("./utils/myActivitiesCache");
        myActivitiesCache.removeForUser(uid);
      }
    } catch (e) {
      console.error("clear signed-up cache failed", e);
    }

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

