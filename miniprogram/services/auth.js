const { request } = require("./request");
const userService = require("./user");

function login(payload) {
  return request({
    url: "/auth/login",
    method: "POST",
    data: payload,
    auth: false
  });
}

function register(payload) {
  return request({
    url: "/auth/register",
    method: "POST",
    data: payload,
    auth: false
  });
}

function wechatLogin(payload) {
  return request({
    url: "/auth/wechat-login",
    method: "POST",
    data: payload,
    auth: false
  });
}

function fetchWechatProfile() {
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
}

function fetchLoginCode() {
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

function loginWithWechat(app) {
  return fetchWechatProfile()
    .then((profile) => fetchLoginCode().then((code) => ({ profile, code })))
    .then(({ profile, code }) => wechatLogin({
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
      return { authRes, user };
    })
    .catch((err) => {
      wx.removeStorageSync("accessToken");
      throw err;
    });
}

module.exports = {
  login,
  register,
  wechatLogin,
  loginWithWechat
};
