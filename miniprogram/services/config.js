// 获取当前小程序的环境信息
const accountInfo = wx.getAccountInfoSync();
const env = accountInfo.miniProgram.envVersion;

// 定义不同环境的地址
const baseUrls = {
  develop: "http://127.0.0.1:8001/api/v1",       // 开发版（模拟器/真机调试）：连本地
  trial: "https://dragon.liqqihome.top/api/v1",   // 体验版：连公网
  release: "https://dragon.liqqihome.top/api/v1" // 正式版：连公网
};

// 根据环境自动选择 URL，如果匹配不到则默认使用正式版地址
const API_BASE_URL = baseUrls[env] || baseUrls.release;

function getApiBaseUrl() {
  return API_BASE_URL;
}

module.exports = {
  API_BASE_URL,
  getApiBaseUrl
};