const authService = require("../../services/auth");
const userService = require("../../services/user");

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

    this.fetchWechatProfile()
      .then((profile) => this.fetchLoginCode().then((code) => ({ profile, code })))
      .then(({ profile, code }) => authService.wechatLogin({
        code,
        profile: {
          nickname: profile.nickname || "",
          avatar_url: profile.avatarUrl || ""
        }
      }))
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
        console.error("wechat login error", err);
        wx.removeStorageSync("accessToken");
        this.setData({ submitting: false });
        wx.showToast({
          title: (err && err.message) || "微信登录失败",
          icon: "none",
          duration: 3000
        });
      });
  },

  fetchWechatProfile() {
    return new Promise((resolve) => {
      if (!wx.getUserProfile) {
        resolve({ nickname: "", avatarUrl: "" });
        return;
      }

      wx.getUserProfile({
        desc: "用于完善你的昵称和头像",
        success: (res) => resolve(res.userInfo || { nickname: "", avatarUrl: "" }),
        fail: () => resolve({ nickname: "", avatarUrl: "" })
      });
    });
  },

  fetchLoginCode() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: (res) => {
          if (res.code) {
            resolve(res.code);
            return;
          }
          reject({ message: "未获取到微信登录 code" });
        },
        fail: (err) => {
          reject({ message: (err && err.errMsg) || "微信登录失败" });
        }
      });
    });
  }
});
