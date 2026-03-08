const { request } = require("./request");

function getHistoryStats() {
  return request({ url: "/stats/history" });
}

function getBillStats() {
  return request({ url: "/stats/bills" });
}

module.exports = {
  getHistoryStats,
  getBillStats
};
