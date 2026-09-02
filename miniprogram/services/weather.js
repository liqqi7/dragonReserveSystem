const { request } = require("./request");

function getActivityWeather({ longitude, latitude, date }) {
  return request({
    url: "/weather/activity",
    data: { longitude, latitude, date },
    timeout: 10000
  });
}

module.exports = { getActivityWeather };
