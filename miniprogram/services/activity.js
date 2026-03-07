const { request } = require("./request");

function listActivities() {
  return request({ url: "/activities" });
}

function getActivity(activityId) {
  return request({ url: `/activities/${activityId}` });
}

function createActivity(payload) {
  return request({
    url: "/activities",
    method: "POST",
    data: payload
  });
}

function updateActivity(activityId, payload) {
  return request({
    url: `/activities/${activityId}`,
    method: "PATCH",
    data: payload
  });
}

function deleteActivity(activityId) {
  return request({
    url: `/activities/${activityId}`,
    method: "DELETE"
  });
}

function signupActivity(activityId) {
  return request({
    url: `/activities/${activityId}/signup`,
    method: "POST"
  });
}

function cancelSignup(activityId) {
  return request({
    url: `/activities/${activityId}/signup`,
    method: "DELETE"
  });
}

function removeParticipant(activityId, participantId) {
  return request({
    url: `/activities/${activityId}/participants/${participantId}`,
    method: "DELETE"
  });
}

function checkinActivity(activityId, payload) {
  return request({
    url: `/activities/${activityId}/checkin`,
    method: "POST",
    data: payload
  });
}

module.exports = {
  listActivities,
  getActivity,
  createActivity,
  updateActivity,
  deleteActivity,
  signupActivity,
  cancelSignup,
  removeParticipant,
  checkinActivity
};
