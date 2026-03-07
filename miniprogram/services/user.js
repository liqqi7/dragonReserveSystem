const { request } = require("./request");

function getMe() {
  return request({ url: "/users/me" });
}

function updateMe(payload) {
  return request({
    url: "/users/me",
    method: "PATCH",
    data: payload
  });
}

function updateMyRole(inviteCode) {
  return request({
    url: "/users/me/role",
    method: "POST",
    data: { invite_code: inviteCode }
  });
}

function clearMyRole() {
  return request({
    url: "/users/me/role",
    method: "DELETE"
  });
}

module.exports = {
  getMe,
  updateMe,
  updateMyRole,
  clearMyRole
};
