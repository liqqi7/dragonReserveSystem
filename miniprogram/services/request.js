const { getApiBaseUrl } = require("./config");

function request({ url, method = "GET", data, auth = true }) {
  const header = {
    "Content-Type": "application/json"
  };
  const token = wx.getStorageSync("accessToken");

  if (auth && token) {
    header.Authorization = `Bearer ${token}`;
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${getApiBaseUrl()}${url}`,
      method,
      data,
      header,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
          return;
        }

        reject({
          statusCode: res.statusCode,
          message: (res.data && res.data.message) || "请求失败",
          body: res.data
        });
      },
      fail(err) {
        reject({
          statusCode: 0,
          message: err.errMsg || "网络请求失败",
          body: err
        });
      }
    });
  });
}

module.exports = {
  request
};
