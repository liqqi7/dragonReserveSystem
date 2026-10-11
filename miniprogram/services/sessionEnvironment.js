const config = require("./config");

const SESSION_KEYS = [
  "hasWeChatAuth", "accessToken", "userId", "userNickname", "userAvatarUrl",
  "userCreatedAt", "userRole", "isAuthenticated",
];

function activateSessionEnvironment() {
  const environment = config.getApiEnvironment();
  const scope = environment === "production"
    ? "production"
    : `${environment}:${config.getApiBaseUrl().replace(/\/api\/v\d+\/?$/, "")}`;
  const previous = wx.getStorageSync("authSessionScope") || "production";
  if (scope !== previous) {
    const snapshot = {};
    SESSION_KEYS.forEach((key) => { snapshot[key] = wx.getStorageSync(key); });
    // Unmarked sessions belong to the existing production installation; never discard them.
    wx.setStorageSync(`authSession:${previous}`, snapshot);
    const restored = wx.getStorageSync(`authSession:${scope}`) || {};
    SESSION_KEYS.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(restored, key) && restored[key] !== "")
        wx.setStorageSync(key, restored[key]);
      else wx.removeStorageSync(key);
    });
  }
  wx.setStorageSync("authSessionScope", scope);
}

module.exports = { activateSessionEnvironment };
