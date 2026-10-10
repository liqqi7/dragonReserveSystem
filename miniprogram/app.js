const userService = require("./services/user");
const authService = require("./services/auth");
const { logPageError, initializeLogging } = require("./services/logger");



// Session validation remains immediate; unchanged primitive profile values need no write.
function storeIfChanged(key, value) {
  if (wx.getStorageSync(key) !== value) wx.setStorageSync(key, value);
}

App({

  globalData: {

    /** 自定义 TabBar 重挂载时 data.selected 会重置，用此值在 attached 中立即恢复，避免 0→正确值 二次 transition */
    tabBarSelected: 0,

    /** 首页全屏抽屉存续期间跨原生页面生命周期保留隐藏态，避免 Tab 重挂载后覆盖抽屉。 */
    tabBarHidden: false,

    /** 冷启动首页卡片入场前，Tab 与卡片共用同一个延迟触发点。 */
    homeTabEntrancePending: true,

    /** 从其他 Tab 点击中央新建入口后，由首页 onShow 消费并打开一级抽屉。 */
    pendingOpenCreateActivity: false,

    /** 中央新建入口被权限拦截后，由“我的”页消费登录或获取权限引导。 */
    pendingCreateAccessAction: "",

    userRole: null,

    isAuthenticated: false,

    accessToken: "",

    userId: "",

    userProfile: null,

    sessionValidated: false,

    _sessionValidationPromise: null,

    _sessionLoginPromise: null,

    _sessionGeneration: 0,

    _sessionExpiredPromptShown: false

  },



  onLaunch() {
    initializeLogging();

    this.installGlobalErrorLogging();

    this.restoreSessionFromStorage();

    this.restoreAuthState();

    this.validateStoredSession({ promptOnExpired: true });

  },



  restoreSessionFromStorage() {

    try {

      const accessToken = wx.getStorageSync("accessToken");

      const userId = wx.getStorageSync("userId");

      const nickname = wx.getStorageSync("userNickname") || "";

      const avatarUrl = wx.getStorageSync("userAvatarUrl") || "";

      const createdAt = wx.getStorageSync("userCreatedAt") || "";

      if (!accessToken || !userId) return;



      this.globalData.accessToken = accessToken;

      this.globalData.userId = userId;

      this.globalData.userProfile = { nickname, avatarUrl, createdAt };

    } catch (e) {

      logPageError("restore_user_cache", e);

    }

  },



  restoreAuthState() {

    try {

      const userRole = wx.getStorageSync("userRole");

      const isAuthenticated = wx.getStorageSync("isAuthenticated");



      if (userRole) {

        this.globalData.userRole = userRole;

        this.globalData.isAuthenticated = !!isAuthenticated;

      }

    } catch (e) {

      logPageError("restore_auth_state", e);

    }

  },



  applyCurrentUser(user, accessToken) {

    this.invalidateSessionValidation();

    const role = user.role || "guest";

    const isAuthenticated = role === "user" || role === "admin";



    if (accessToken) {

      this.globalData.accessToken = accessToken;

      storeIfChanged("accessToken", accessToken);

    }



    this.globalData.userId = String(user.id || "");

    this.globalData.userRole = role;

    this.globalData.isAuthenticated = isAuthenticated;

    this.globalData.userProfile = {

      nickname: user.nickname || "",

      avatarUrl: user.avatar_url || "",

      createdAt: user.created_at || ""

    };

    this.globalData.sessionValidated = true;

    this.globalData._sessionExpiredPromptShown = false;



    storeIfChanged("hasWeChatAuth", true);

    storeIfChanged("userId", String(user.id || ""));

    storeIfChanged("userNickname", user.nickname || "");

    storeIfChanged("userAvatarUrl", user.avatar_url || "");

    if (user.created_at) storeIfChanged("userCreatedAt", user.created_at);

    storeIfChanged("userRole", role);

    storeIfChanged("isAuthenticated", isAuthenticated);

  },



  invalidateSessionValidation() {
    this.globalData._sessionGeneration += 1;
    this.globalData._sessionValidationPromise = null;
    this.globalData._sessionLoginPromise = null;
    this.globalData.sessionValidated = false;
    return this.globalData._sessionGeneration;
  },






  logout() {

    this.invalidateSessionValidation();

    this.globalData.userRole = null;

    this.globalData.isAuthenticated = false;

    this.globalData.accessToken = "";

    this.globalData.userId = "";

    this.globalData.userProfile = null;

    this.globalData.sessionValidated = false;



    [

      "hasWeChatAuth",

      "accessToken",

      "userId",

      "userNickname",

      "userAvatarUrl",

      "userCreatedAt",

      "userRole",

      "isAuthenticated"

    ].forEach((key) => wx.removeStorageSync(key));

  },

  installGlobalErrorLogging() {
    try {
      if (typeof wx.onError === "function") {
        wx.onError((error) => {
          logPageError("uncaught_error", { message: error });
        });
      }
      if (typeof wx.onUnhandledRejection === "function") {
        wx.onUnhandledRejection((event) => {
          logPageError("unhandled_rejection", event && event.reason);
        });
      }
    } catch (error) {
      logPageError("install_global_error_logging", error);
    }
  },



  isExpiredSessionError(err) {

    const statusCode = Number(err && err.statusCode);

    return statusCode === 401 || statusCode === 403;

  },



  showSessionExpiredPrompt() {
    if (this.globalData._sessionExpiredPromptShown) return;
    this.globalData._sessionExpiredPromptShown = true;
    const generation = this.globalData._sessionGeneration;

    let attempts = 0;
    const openPrompt = () => {
      if (generation !== this.globalData._sessionGeneration) return;
      const pages = typeof getCurrentPages === "function" ? getCurrentPages() : [];
      const currentPage = pages.length ? pages[pages.length - 1] : null;
      const dialog = currentPage && typeof currentPage.selectComponent === "function"
        ? currentPage.selectComponent("#session-expired-dialog") : null;
      if (dialog && typeof dialog.open === "function") {
        dialog.open({
          type: "sessionExpired",
          title: "登录后即可使用",
          message: "登录后才能参加活动和查看个人信息",
          cancelText: "取消",
          confirmText: "立即登录",
          confirmBehavior: "reauthenticate",
          prototypeStyle: true
        });
        return;
      }
      if (++attempts < 10) {
        setTimeout(openPrompt, 100);
        return;
      }
      // 页面组件尚未挂载时，保留可操作的原生兜底。
      wx.showModal({
        title: "登录后即可使用",
        content: "登录后才能参加活动和查看个人信息",
        confirmText: "立即登录",
        cancelText: "取消",
        success: (res) => {
          if (res.confirm && generation === this.globalData._sessionGeneration) this.reauthenticateAfterExpiry();
        }
      });
    };
    setTimeout(openPrompt, 300);
  },

  reauthenticateAfterExpiry() {

    wx.showLoading({ title: "登录中...", mask: true });

    authService.loginWithWechat(this)

      .then(() => {

        wx.hideLoading();

        const pages = typeof getCurrentPages === "function" ? getCurrentPages() : [];
        const currentPage = pages.length ? pages[pages.length - 1] : null;
        if (currentPage && typeof currentPage.onShow === "function") currentPage.onShow();

        wx.showToast({ title: "登录成功", icon: "success" });

      })

      .catch((err) => {

        wx.hideLoading();
        wx.showToast({ title: (err && err.message) || "登录失败", icon: "none" });

      });

  },



  validateStoredSession({ promptOnExpired = false } = {}) {

    if (this.globalData._sessionLoginPromise) {
      return this.globalData._sessionLoginPromise.then(
        () => !!(this.globalData.sessionValidated && this.globalData.accessToken),
        () => false
      );
    }

    const token = this.globalData.accessToken || wx.getStorageSync("accessToken");

    if (!token) return Promise.resolve(false);

    if (this.globalData._sessionValidationPromise) {

      return this.globalData._sessionValidationPromise;

    }

    const generation = this.globalData._sessionGeneration;
    const isCurrentSession = () => generation === this.globalData._sessionGeneration &&
      token === (this.globalData.accessToken || wx.getStorageSync("accessToken"));

    const validation = userService.getMe()

      .then((user) => {

        if (!isCurrentSession()) return false;

        this.applyCurrentUser(user);

        return true;

      })

      .catch((err) => {

        if (isCurrentSession() && this.isExpiredSessionError(err)) {

          this.logout();

          if (promptOnExpired) this.showSessionExpiredPrompt();

        }

        return false;

      })

      .finally(() => {

        if (this.globalData._sessionValidationPromise === validation) {
          this.globalData._sessionValidationPromise = null;
        }

      });

    this.globalData._sessionValidationPromise = validation;

    return validation;

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



    this.validateStoredSession({ promptOnExpired: true })

      .then((isValid) => {

        if (isValid) callback && callback();

      });

  }

});
