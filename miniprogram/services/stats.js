const { request } = require("./request");

let historyStatsInFlight = null;

function getHistoryStats() {
  if (historyStatsInFlight) return historyStatsInFlight;

  const pending = request({ url: "/stats/history" });
  const coalesced = pending.finally(() => {
    if (historyStatsInFlight === coalesced) historyStatsInFlight = null;
  });
  historyStatsInFlight = coalesced;
  return coalesced;
}

function getHistorySummary() {
  return request({ url: "/stats/history-summary" });
}

module.exports = {
  getHistoryStats,
  getHistorySummary
};
