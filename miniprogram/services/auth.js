const { request, DEFAULT_REQUEST_TIMEOUT } = require("./request");
const { createTraceId, logInfo, logError, summarizeError } = require("./logger");
const userService = require("./user");

const LOGIN_FLOW_TIMEOUT = 20000;

function withTimeout(promiseFactory, timeout, message, meta = {}) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject({
        message,
        code: "TIMEOUT",
        ...meta
      });
    }, timeout);

    Promise.resolve()
      .then(promiseFactory)
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

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
    auth: false,
    timeout: DEFAULT_REQUEST_TIMEOUT
  });
}

function fetchWechatProfile(flowId) {
  return withTimeout(() => new Promise((resolve) => {
    if (!wx.getUserProfile) {
      resolve({ nickname: "", avatarUrl: "" });
      return;
    }

    wx.getUserProfile({
      desc: "用于完善你的昵称和头像",
      success: (res) => resolve(res.userInfo || { nickname: "", avatarUrl: "" }),
      fail: () => resolve({ nickname: "", avatarUrl: "" })
    });
  }), 8000, "获取微信资料超时", { flowId, stage: "getUserProfile" });
}

function fetchLoginCode(flowId) {
  return withTimeout(() => new Promise((resolve, reject) => {
    wx.login({
      timeout: 8000,
      success: (res) => {
        if (res.code) {
          resolve(res.code);
          return;
        }
        reject({ message: "未获取到微信登录 code", flowId, stage: "wx.login" });
      },
      fail: (err) => {
        reject({ message: (err && err.errMsg) || "微信登录失败", flowId, stage: "wx.login" });
      }
    });
  }), 9000, "微信登录超时", { flowId, stage: "wx.login" });
}

function loginWithWechat(app) {
  const flowId = createTraceId("login");
  const startAt = Date.now();

  logInfo("login_flow_start", { flowId });

  return withTimeout(
    () => fetchWechatProfile(flowId)
      .then((profile) => fetchLoginCode(flowId).then((code) => ({ profile, code })))
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
        logInfo("login_flow_success", {
          flowId,
          duration: Date.now() - startAt,
          userId: user.id,
          role: user.role
        });
        return { authRes, user, flowId };
      }),
    LOGIN_FLOW_TIMEOUT,
    "登录超时，请稍后重试",
    { flowId, stage: "login_flow" }
  ).catch((err) => {
    wx.removeStorageSync("accessToken");
    logError("login_flow_fail", {
      flowId,
      duration: Date.now() - startAt,
      stage: err && err.stage,
      summary: summarizeError(err),
      requestId: err && err.requestId,
      traceId: err && err.traceId
    });
    throw err;
  });
}

module.exports = {
  login,
  register,
  wechatLogin,
  loginWithWechat
};
