const { request } = require("./request");

const activityRankingInFlight = new Map();
let pigeonRankingInFlight = null;

function getActivityRanking({ offset = 0, limit = 8 } = {}) {
  const key = `${offset}:${limit}`;
  if (activityRankingInFlight.has(key)) return activityRankingInFlight.get(key);
  const pending = request({
    url: "/stats/ranking/activity",
    data: { offset, limit }
  });
  const coalesced = pending.finally(() => {
    if (activityRankingInFlight.get(key) === coalesced) activityRankingInFlight.delete(key);
  });
  activityRankingInFlight.set(key, coalesced);
  return coalesced;
}

function getPigeonRanking() {
  if (pigeonRankingInFlight) return pigeonRankingInFlight;
  const pending = request({ url: "/stats/ranking/pigeon" });
  const coalesced = pending.finally(() => {
    if (pigeonRankingInFlight === coalesced) pigeonRankingInFlight = null;
  });
  pigeonRankingInFlight = coalesced;
  return coalesced;
}

function getHistoryStats() {
  return request({ url: "/stats/history" });
}

function getHistorySummary() {
  return request({ url: "/stats/history-summary" });
}

module.exports = {
  getActivityRanking,
  getPigeonRanking,
  getHistoryStats,
  getHistorySummary
};
