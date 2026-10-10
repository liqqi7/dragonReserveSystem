const { isNormalHomeDiagnostic } = require("./diagnosticPolicy");

const MAX_RECORD_BYTES = 4096;
const EVENTS = new Set(["request_fail", "request_slow", "page_error", "home_presentation_snapshot", "home_media_attempt"]);
const PRIVATE_KEY = /^(?:.*token|authorization|cookie|.*password|.*secret|.*openid|unionid|nickname|avatar.*|phone.*|email|address|latitude|longitude|lat|lng|headers?|body|rawdata|code|invite_?code|file_?path|user_?id|session_?key|api_?key)$/i;
const reportedErrors = new WeakSet();
const recentEvents = new Map();
let realtimeLogger, metadata, initialized = false;
let networkType = "unknown";
const sessionId = createTraceId("sess");

function createTraceId(prefix = "trace") {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function summarizeError(err) {
  if (!err) return "unknown error";
  if (typeof err === "string") return err;
  const parts = [err.message || err.errMsg || err.code || "unknown error"];
  if (err.errno !== undefined && err.errno !== "") parts.push(`errno:${err.errno}`);
  if (err.statusCode) parts.push(`status:${err.statusCode}`);
  return parts.join(" ");
}

function cleanString(value) {
  return value
    .replace(/Bearer\s+[^\s,;]+/gi, "Bearer [redacted]")
    .replace(/\b(token|access_token|openid|unionid|password|secret|code|invite_code)\s*[=:]\s*[^\s,;]+/gi, "$1=[redacted]")
    .replace(/https?:\/\/[^\s"'<>]+/gi, url => url.split(/[?#]/)[0].replace(/(https?:\/\/)[^/]*@/i, "$1"))
    .replace(/(^|[\s(])((?:\/|\.\.?\/)[^\s"'<>?#]+)[?#][^\s"'<>]*/g, "$1$2")
    .slice(0, 300);
}

function sanitize(value, depth = 0, ancestors = new Set(), key = "") {
  if (value == null || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    return cleanString(/(?:url|path|api)$/i.test(key) ? value.split(/[?#]/)[0] : value);
  }
  if (typeof value !== "object") return cleanString(String(value));
  if (depth >= 6) return "[depth limit]";
  if (ancestors.has(value)) return "[circular]";
  ancestors.add(value);
  const result = Array.isArray(value) ? [] : {};
  const keys = Array.isArray(value) ? Object.keys(value).slice(0, 8) : Object.keys(value).slice(0, 32);
  for (const childKey of keys) {
    if (PRIVATE_KEY.test(childKey) || ["__proto__", "constructor", "prototype"].includes(childKey)) continue;
    try { result[childKey] = sanitize(value[childKey], depth + 1, ancestors, childKey); } catch (_) { /* Ignore unsafe getters. */ }
  }
  ancestors.delete(value);
  return result;
}

function utf8Bytes(value) {
  const text = JSON.stringify(value);
  let size = 0;
  for (const character of text) {
    const point = character.codePointAt(0);
    size += point < 0x80 ? 1 : point < 0x800 ? 2 : point < 0x10000 ? 3 : 4;
  }
  return size;
}

function currentPage() {
  try {
    const pages = typeof getCurrentPages === "function" ? getCurrentPages() : [];
    return pages[pages.length - 1];
  } catch (_) { return null; }
}

function getMetadata() {
  if (metadata) return metadata;
  let account = {}, device = {}, base = {};
  try { account = wx.getAccountInfoSync().miniProgram || {}; } catch (_) {}
  try { device = wx.getDeviceInfo(); } catch (_) {}
  try { base = wx.getAppBaseInfo(); } catch (_) {}
  metadata = sanitize({
    appVersion: account.version || "", releaseEnv: account.envVersion || "unknown",
    wechatVersion: base.version || "", baseLibVersion: base.SDKVersion || "",
    platform: device.platform || "", model: device.model || "", system: device.system || ""
  });
  Object.keys(metadata).forEach(key => { metadata[key] = String(metadata[key]).slice(0, 80); });
  return metadata;
}

function initializeLogging() {
  if (initialized || typeof wx === "undefined") return;
  initialized = true;
  // Remove only the retired diagnostic queue, never session or media caches.
  for (const key of ["client-diagnostic-outbox-v1", "client-diagnostic-delivery-metrics-v1"]) {
    try { wx.removeStorageSync(key); } catch (_) {}
  }
  try { wx.getNetworkType({ success: res => { networkType = res.networkType || "unknown"; } }); } catch (_) {}
  try { wx.onNetworkStatusChange(res => { networkType = res.isConnected ? res.networkType : "none"; }); } catch (_) {}
}

function buildRecord(level, event, payload, page) {
  const record = { event, level, timestamp: new Date().toISOString(), sessionId,
    page: cleanString(String(page && page.route || "")).slice(0, 160), ...getMetadata(),
    networkType: cleanString(String(networkType)).slice(0, 32) };
  const safe = sanitize(payload || {});
  const priority = ["traceId", "requestId", "flowId", "operation", "summary", "reason", "stage", "statusCode", "method", "url", "duration"];
  const keys = [...new Set([...priority, ...Object.keys(safe)])];
  // Reserve room for the truncation marker; retain correlation before bulky evidence.
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(safe, key) || Object.prototype.hasOwnProperty.call(record, key)) continue;
    const candidate = { ...record, [key]: safe[key], truncated: true };
    if (utf8Bytes(candidate) <= MAX_RECORD_BYTES) {
      record[key] = safe[key];
    } else {
      record.truncated = true;
      if (Array.isArray(safe[key])) {
        record[key] = [];
        for (const item of safe[key]) {
          record[key].push(item);
          if (utf8Bytes(record) > MAX_RECORD_BYTES) { record[key].pop(); break; }
        }
        if (utf8Bytes(record) > MAX_RECORD_BYTES) delete record[key];
      }
    }
  }
  return record;
}

function report(level, event, payload) {
  // Logging failures, including malformed payloads, must never affect business code.
  try {
    if (!EVENTS.has(event) || isNormalHomeDiagnostic(event, payload)) return;
    if (event === "request_slow" || event.startsWith("home_")) level = "warn";
    const page = currentPage();
    const record = buildRecord(level, event, payload, page);
    const signature = JSON.stringify([event, record.page, record.traceId, record.requestId,
      record.operation, record.reason, record.stage, record.activityId, record.group,
      record.url, record.summary, record.sequence]);
    const now = Date.now();
    if (recentEvents.has(signature) && now - recentEvents.get(signature) < 2000) return;
    recentEvents.set(signature, now);
    if (recentEvents.size > 200) recentEvents.delete(recentEvents.keys().next().value);
    try {
      if (!realtimeLogger && typeof wx !== "undefined" && typeof wx.getRealtimeLogManager === "function") {
        realtimeLogger = wx.getRealtimeLogManager();
      }
      if (realtimeLogger) {
        try { realtimeLogger.setFilterMsg(record.page || "app"); realtimeLogger.addFilterMsg(event); } catch (_) {}
        try { if (page && typeof realtimeLogger.in === "function") realtimeLogger.in(page); } catch (_) {}
        if (typeof realtimeLogger[level] === "function") realtimeLogger[level](record);
      }
    } catch (_) {}
    if (record.releaseEnv === "develop" || record.platform === "devtools") {
      if (typeof console[level] === "function") console[level]("[mini]", record);
    }
  } catch (_) {}
}

function isReported(err) {
  return err && typeof err === "object" && reportedErrors.has(err);
}

function rememberError(err) {
  if (err && typeof err === "object") reportedErrors.add(err);
}

function logPageError(operation, err, context = {}) {
  try {
    if (isReported(err) || (err && err.code === "STALE_LOGIN_ATTEMPT")) return;
    rememberError(err);
    report("error", "page_error", { ...context, operation, summary: summarizeError(err),
      stack: err && err.stack, traceId: err && err.traceId, requestId: err && err.requestId });
  } catch (_) {}
}

function logRequestFailure(context, error, rawError = error) {
  try {
    if (isReported(error)) return;
    rememberError(error);
    report("error", "request_fail", { ...context, summary: summarizeError(rawError),
      errNo: rawError && rawError.errno });
  } catch (_) {}
}

module.exports = {
  initializeLogging, createTraceId, summarizeError, logPageError, logRequestFailure,
  logInfo: (event, payload) => report("info", event, payload),
  logWarn: (event, payload) => report("warn", event, payload)
};
