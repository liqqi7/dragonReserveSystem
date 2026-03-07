const { request } = require("./request");

function login(payload) {
  return request({
    url: "/auth/login",
    method: "POST",
    data: payload,
    auth: false
  });
}

function register(payload) {
  return request({
    url: "/auth/register",
    method: "POST",
    data: payload,
    auth: false
  });
}

module.exports = {
  login,
  register
};
