const { request } = require("./request");

function getHistoryStats() {
  return request({ url: "/stats/history" });
}

module.exports = {
  getHistoryStats
};
