function createTraceId(prefix = "trace") {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

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

function logInfo(event, payload) {
  console.info(`[mini] ${event}`, payload || {});
}

function logError(event, payload) {
  console.error(`[mini] ${event}`, payload || {});
}

module.exports = {
  createTraceId,
  summarizeError,
  logInfo,
  logError
};
