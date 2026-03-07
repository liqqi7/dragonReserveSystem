const authService = require("../../services/auth");
const userService = require("../../services/user");

const app = getApp();

Page({
  data: {
    mode: "login",
    submitting: false,
    username: "",
    nickname: "",
    password: "",
    canSubmit: false
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

  switchMode(e) {
    this.setData({ mode: e.currentTarget.dataset.mode }, () => this.updateCanSubmit());
  },

  onUsernameInput(e) {
    this.setData({ username: e.detail.value || "" }, () => this.updateCanSubmit());
  },

  onNicknameInput(e) {
    this.setData({ nickname: e.detail.value || "" }, () => this.updateCanSubmit());
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value || "" }, () => this.updateCanSubmit());
  },

  updateCanSubmit() {
    const username = (this.data.username || "").trim();
    const password = (this.data.password || "").trim();
    const nickname = (this.data.nickname || "").trim();
    const canSubmit = this.data.mode === "register"
      ? !!(username && password && nickname)
      : !!(username && password);
    this.setData({ canSubmit });
  },

  onFormSubmit(e) {
    if (this.data.submitting) return;

    const username = (this.data.username || e.detail.value?.username || "").trim();
    const nickname = (this.data.nickname || e.detail.value?.nickname || "").trim();
    const password = (this.data.password || e.detail.value?.password || "").trim();

    if (!username || !password || (this.data.mode === "register" && !nickname)) {
      wx.showToast({ title: "请完整填写表单", icon: "none" });
      return;
    }

    this.setData({ submitting: true });

    if (this.data.mode === "register") {
      this.doRegister({ username, password, nickname });
      return;
    }

    this.doLogin({ username, password });
  },

  doRegister(payload) {
    authService.register(payload)
      .then(() => this.doLogin({ username: payload.username, password: payload.password }))
      .catch((err) => {
        console.error("register error", err);
        this.setData({ submitting: false });
        wx.showToast({
          title: err.message || "注册失败",
          icon: "none",
          duration: 3000
        });
      });
  },

  doLogin(payload) {
    authService.login(payload)
      .then((authRes) => {
        wx.setStorageSync("accessToken", authRes.access_token);
        return userService.getMe().then((user) => ({ authRes, user }));
      })
      .then(({ authRes, user }) => {
        app.applyCurrentUser(user, authRes.access_token);
        this.setData({ submitting: false });
        wx.reLaunch({ url: "/pages/activity_list/activity_list" });
      })
      .catch((err) => {
        console.error("login error", err);
        wx.removeStorageSync("accessToken");
        this.setData({ submitting: false });
        wx.showToast({
          title: err.message || "登录失败，请重试",
          icon: "none",
          duration: 3000
        });
      });
  }
});
