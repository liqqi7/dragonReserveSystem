const { getApiBaseUrl } = require("./config");
const { createTraceId, logInfo, logError, summarizeError } = require("./logger");

const DEFAULT_REQUEST_TIMEOUT = 15000;

function request({ url, method = "GET", data, auth = true, timeout = DEFAULT_REQUEST_TIMEOUT }) {
  const traceId = createTraceId("req");
  const startAt = Date.now();
  const header = {
    "Content-Type": "application/json",
    "X-Request-Id": traceId
  };
  const token = wx.getStorageSync("accessToken");

  if (auth && token) {
    header.Authorization = `Bearer ${token}`;
  }

  logInfo("request_start", { url, method, traceId, timeout });

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${getApiBaseUrl()}${url}`,
      method,
      data,
      header,
      timeout,
      success(res) {
        const duration = Date.now() - startAt;
        const responseRequestId = res.header && (res.header["X-Request-Id"] || res.header["x-request-id"]);

        if (res.statusCode >= 200 && res.statusCode < 300) {
          logInfo("request_success", {
            url,
            method,
            traceId,
            requestId: responseRequestId || traceId,
            duration,
            statusCode: res.statusCode
          });
          resolve(res.data);
          return;
        }

        const error = {
          statusCode: res.statusCode,
          message: (res.data && res.data.message) || "请求失败",
          body: res.data,
          traceId,
          requestId: (res.data && res.data.request_id) || responseRequestId || traceId,
          duration,
          api: url
        };
        logError("request_fail", {
          url,
          method,
          traceId,
          requestId: error.requestId,
          duration,
          statusCode: res.statusCode,
          summary: summarizeError(error)
        });
        reject(error);
      },
      fail(err) {
        const duration = Date.now() - startAt;
        const error = {
          statusCode: 0,
          message: err.errMsg || "网络请求失败",
          body: err,
          traceId,
          requestId: traceId,
          duration,
          api: url
        };
        logError("request_fail", {
          url,
          method,
          traceId,
          requestId: traceId,
          duration,
          statusCode: 0,
          summary: summarizeError(error)
        });
        reject(error);
      }
    });
  });
}

module.exports = {
  request,
  DEFAULT_REQUEST_TIMEOUT
};
