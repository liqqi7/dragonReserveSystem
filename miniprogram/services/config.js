const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000/api/v1";

function getApiBaseUrl() {
  return wx.getStorageSync("apiBaseUrl") || DEFAULT_API_BASE_URL;
}

module.exports = {
  DEFAULT_API_BASE_URL,
  getApiBaseUrl
};
