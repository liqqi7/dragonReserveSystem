const { getApiBaseUrl } = require("./config");
const {
  createTraceId,
  logWarn,
  logRequestFailure
} = require("./logger");

const DEFAULT_REQUEST_TIMEOUT = 15000;
const SLOW_REQUEST_THRESHOLD_MS = 2000;

function estimateResponseBytes(data) {
  try {
    return JSON.stringify(data == null ? null : data).length;
  } catch (_e) {
    return 0;
  }
}

function resolveApiBaseUrl(apiVersion) {
  const baseUrl = getApiBaseUrl();
  if (!apiVersion) return baseUrl;
  return baseUrl.replace(/\/api\/v\d+\/?$/, `/api/v${apiVersion}`);
}

const API_ERROR_MESSAGES = {
  "You are outside the allowed check-in radius": "你当前不在签到范围内",
  "Signup deadline has passed; contact an admin to remove this signup": "报名已截止，请联系管理员取消报名",
  "You have already signed up for this activity": "你已报名此活动",
  "Activity has been cancelled": "活动已取消",
  "Activity is already cancelled": "活动已取消",
  "Signup is currently disabled for this activity": "此活动暂不接受报名",
  "Activity location is not configured": "活动尚未设置签到地点",
  "You must sign up before checking in": "请先报名再签到",
  "Participant has already checked in": "你已完成签到",
  "Participant not found": "未找到报名记录",
  "User not found": "未找到用户信息，请重新登录"
};

function toUserMessage(message, code, transport = false) {
  if (transport) return "网络暂时不可用，请检查网络后重试";
  if (API_ERROR_MESSAGES[message]) return API_ERROR_MESSAGES[message];
  if (typeof message === "string" && message && !/[A-Za-z]{3,}/.test(message)) return message;
  if (code === "AUTH_FAILED") return "登录状态已失效，请重新登录";
  if (code === "PERMISSION_DENIED") return "你没有执行此操作的权限";
  if (code === "NOT_FOUND") return "请求的内容不存在或已被删除";
  if (code === "INTEGRATION_ERROR") return "服务暂时不可用，请稍后重试";
  if (code === "CONFLICT") return "操作状态已变化，请刷新后重试";
  if (code === "VALIDATION_ERROR") return "提交内容不符合要求，请检查后重试";
  return "操作失败，请稍后重试";
}

function request({ url, method = "GET", data, auth = true, timeout = DEFAULT_REQUEST_TIMEOUT, apiVersion, idempotencyKey }) {
  const traceId = createTraceId("req");
  const startAt = Date.now();
  const header = {
    "Content-Type": "application/json",
    "X-Request-Id": traceId
  };
  const token = wx.getStorageSync("accessToken");

  if (idempotencyKey) header["Idempotency-Key"] = idempotencyKey;
  if (auth && token) {
    header.Authorization = `Bearer ${token}`;
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${resolveApiBaseUrl(apiVersion)}${url}`,
      method,
      data,
      header,
      timeout,
      success(res) {
        const duration = Date.now() - startAt;
        const responseRequestId = res.header && (res.header["X-Request-Id"] || res.header["x-request-id"]);

        if (res.statusCode >= 200 && res.statusCode < 300) {
          if (duration >= SLOW_REQUEST_THRESHOLD_MS) {
            logWarn("request_slow", {
              url,
              method,
              traceId,
              requestId: responseRequestId || traceId,
              duration,
              statusCode: res.statusCode,
              responseBytes: estimateResponseBytes(res.data)
            });
          }
          resolve(res.data);
          return;
        }

        const error = {
          statusCode: res.statusCode,
          message: toUserMessage(res.data && res.data.message, res.data && res.data.code),
          body: res.data,
          traceId,
          requestId: (res.data && res.data.request_id) || responseRequestId || traceId,
          duration,
          api: url
        };
        logRequestFailure({
          url,
          method,
          traceId,
          requestId: error.requestId,
          duration,
          statusCode: res.statusCode
        }, error);
        reject(error);
      },
      fail(err) {
        const duration = Date.now() - startAt;
        const error = {
          statusCode: 0,
          message: toUserMessage(err.errMsg, null, true),
          body: err,
          traceId,
          requestId: traceId,
          duration,
          api: url
        };
        logRequestFailure({ url, method, traceId, requestId: traceId, duration, statusCode: 0 }, error, err);
        reject(error);
      }
    });
  });
}

module.exports = {
  request,
  resolveApiBaseUrl,
  DEFAULT_REQUEST_TIMEOUT,
  toUserMessage
};
