const { getApiBaseUrl } = require("./config");
const { request } = require("./request");
const { createTraceId } = require("./logger");

function getMe() {
  return request({ url: "/users/me" });
}

function updateMe(payload) {
  return request({
    url: "/users/me",
    method: "PATCH",
    data: payload
  });
}

function uploadAvatar(filePath) {
  const token = wx.getStorageSync("accessToken");
  const traceId = createTraceId("upload");
  const header = {
    "X-Request-Id": traceId
  };

  if (token) {
    header.Authorization = `Bearer ${token}`;
  }

  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: `${getApiBaseUrl()}/users/me/avatar`,
      filePath,
      name: "file",
      header,
      success(res) {
        let body = null;
        try {
          body = JSON.parse(res.data || "{}");
        } catch (err) {
          reject({
            message: "头像上传响应解析失败",
            body: res.data,
            traceId,
            statusCode: res.statusCode
          });
          return;
        }

        if (res.statusCode >= 200 && res.statusCode < 300 && body.avatar_url) {
          resolve(body);
          return;
        }

        reject({
          message: (body && body.message) || "头像上传失败",
          body,
          traceId,
          requestId: body && body.request_id,
          statusCode: res.statusCode
        });
      },
      fail(err) {
        reject({
          message: (err && err.errMsg) || "头像上传失败",
          body: err,
          traceId,
          statusCode: 0
        });
      }
    });
  });
}

function updateMyRole(inviteCode) {
  return request({
    url: "/users/me/role",
    method: "POST",
    data: { invite_code: inviteCode }
  });
}

function clearMyRole() {
  return request({
    url: "/users/me/role",
    method: "DELETE"
  });
}

module.exports = {
  getMe,
  updateMe,
  uploadAvatar,
  updateMyRole,
  clearMyRole
};
