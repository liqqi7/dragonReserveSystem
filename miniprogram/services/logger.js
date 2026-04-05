const { getApiBaseUrl } = require("./config");

function createTraceId(prefix = "trace") {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

let realtimeLogger;
let realtimeLoggerReady = false;
let cachedSystemMeta;
const backendUploadThrottleMap = new Map();

function summarizeError(err) {
  if (!err) return "unknown error";
  return (
    err.message ||
    err.errMsg ||
    err.code ||
    err.statusCode ||
    "unknown error"
  );
}

function getRealtimeLogger() {
  if (realtimeLoggerReady) return realtimeLogger;
  realtimeLoggerReady = true;
  try {
    if (typeof wx !== "undefined" && wx && typeof wx.getRealtimeLogManager === "function") {
      realtimeLogger = wx.getRealtimeLogManager();
    }
  } catch (err) {
    realtimeLogger = null;
  }
  return realtimeLogger;
}

function shouldReportRealtime(event) {
  return (
    event === "request_fail" ||
    event === "activity_card_media_scan" ||
    event === "activity_card_media_pending" ||
    event === "activity_card_media_stalled" ||
    event === "activity_card_media_error" ||
    event === "activity_card_video_waiting" ||
    event === "activity_card_media_all_resolved"
  );
}

function shouldUploadBackend(event) {
  return shouldReportRealtime(event);
}

function normalizeRealtimeValue(value, depth = 0) {
  if (value == null) return value;
  if (depth >= 3) {
    return typeof value === "string" ? value.slice(0, 160) : String(value);
  }
  if (Array.isArray(value)) {
    return value.slice(0, 8).map((item) => normalizeRealtimeValue(item, depth + 1));
  }
  if (typeof value === "object") {
    const next = {};
    Object.keys(value).slice(0, 20).forEach((key) => {
      next[key] = normalizeRealtimeValue(value[key], depth + 1);
    });
    return next;
  }
  if (typeof value === "string") {
    return value.length > 300 ? `${value.slice(0, 297)}...` : value;
  }
  return value;
}

function getCurrentPageRoute() {
  try {
    if (typeof getCurrentPages !== "function") return "";
    const pages = getCurrentPages();
    if (!pages || !pages.length) return "";
    return pages[pages.length - 1].route || "";
  } catch (err) {
    return "";
  }
}

function getSystemMeta() {
  if (cachedSystemMeta) return cachedSystemMeta;
  try {
    const info = wx.getSystemInfoSync();
    cachedSystemMeta = {
      clientVersion: info.version || "",
      baseLibVersion: info.SDKVersion || "",
      systemType: info.platform || ""
    };
  } catch (err) {
    cachedSystemMeta = {
      clientVersion: "",
      baseLibVersion: "",
      systemType: ""
    };
  }
  return cachedSystemMeta;
}

function shouldThrottleBackendUpload(event, payload) {
  const signature = JSON.stringify({
    event,
    traceId: payload && payload.traceId,
    activityId: payload && payload.activityId,
    mediaType: payload && payload.mediaType,
    group: payload && payload.group,
    url: payload && payload.url,
    summary: payload && payload.summary,
    duration: payload && payload.duration,
    pendingImages: payload && payload.pendingImages,
    pendingVideos: payload && payload.pendingVideos
  });
  const now = Date.now();
  const prev = backendUploadThrottleMap.get(signature) || 0;
  if (now - prev < 1500) {
    return true;
  }
  backendUploadThrottleMap.set(signature, now);
  if (backendUploadThrottleMap.size > 200) {
    const entries = Array.from(backendUploadThrottleMap.entries()).sort((a, b) => a[1] - b[1]);
    entries.slice(0, 50).forEach(([key]) => backendUploadThrottleMap.delete(key));
  }
  return false;
}

function uploadBackendLog(level, event, payload) {
  if (!shouldUploadBackend(event)) return;
  if (typeof wx === "undefined" || !wx || typeof wx.request !== "function") return;
  const token = wx.getStorageSync("accessToken");
  if (!token) return;
  if (shouldThrottleBackendUpload(event, payload || {})) return;

  const systemMeta = getSystemMeta();
  const body = {
    event,
    level,
    traceId: (payload && payload.traceId) || "",
    sessionId: (payload && payload.sessionId) || "",
    page: getCurrentPageRoute(),
    clientVersion: systemMeta.clientVersion,
    baseLibVersion: systemMeta.baseLibVersion,
    systemType: systemMeta.systemType,
    payload: normalizeRealtimeValue(payload || {})
  };

  try {
    wx.request({
      url: `${getApiBaseUrl()}/diagnostics/client-logs`,
      method: "POST",
      timeout: 5000,
      header: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      data: body
    });
  } catch (err) {
    // Never let diagnostic upload affect app behavior.
  }
}

function reportRealtime(level, event, payload) {
  if (!shouldReportRealtime(event)) return;
  const logger = getRealtimeLogger();
  if (!logger || typeof logger[level] !== "function") return;

  try {
    logger[level](
      {
        event,
        ...normalizeRealtimeValue(payload || {})
      },
      `[mini] ${event}`
    );
  } catch (err) {
    // Swallow realtime logging failures so normal app flow is never affected.
  }
}

function logInfo(event, payload) {
  console.info(`[mini] ${event}`, payload || {});
  reportRealtime("info", event, payload);
  uploadBackendLog("info", event, payload);
}

function logError(event, payload) {
  console.error(`[mini] ${event}`, payload || {});
  reportRealtime("error", event, payload);
  uploadBackendLog("error", event, payload);
}

module.exports = {
  createTraceId,
  summarizeError,
  logInfo,
  logError
};
