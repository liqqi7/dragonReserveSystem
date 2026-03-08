const LOCAL_API_BASE_URL = "http://127.0.0.1:8000/api/v1";
const PRODUCTION_API_BASE_URL = "https://dragon.liqqihome.top/api/v1";

function getEnvVersion() {
  try {
    const info = wx.getAccountInfoSync && wx.getAccountInfoSync();
    return info && info.miniProgram ? info.miniProgram.envVersion : "develop";
  } catch (err) {
    return "develop";
  }
}

function getApiBaseUrl() {
  const customApiBaseUrl = wx.getStorageSync("apiBaseUrl");
  if (customApiBaseUrl) return customApiBaseUrl;

  return getEnvVersion() === "develop" ? LOCAL_API_BASE_URL : PRODUCTION_API_BASE_URL;
}

module.exports = {
  LOCAL_API_BASE_URL,
  PRODUCTION_API_BASE_URL,
  getApiBaseUrl
};
