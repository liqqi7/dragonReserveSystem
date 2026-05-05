const { request } = require("./request");

function listActivities() {
  return request({ url: "/activities" });
}

function listMyActivities() {
  return request({ url: "/activities/me/signed-up" });
}

function listActivityTypeStyles() {
  return request({ url: "/activities/type-styles" });
}

function getActivityStyleSignature() {
  return request({ url: "/activities/style-signature" });
}

function getClientConfig() {
  return request({ url: "/client-config" });
}

function getActivity(activityId) {
  return request({ url: `/activities/${activityId}` });
}

function getActivitySharePreview(activityId) {
  return request({ url: `/activities/${activityId}/share-preview`, timeout: 20000 });
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

function adminCheckinParticipant(activityId, participantId) {
  return request({
    url: `/activities/${activityId}/participants/${participantId}/admin-checkin`,
    method: "POST"
  });
}

function adminCancelCheckinParticipant(activityId, participantId) {
  return request({
    url: `/activities/${activityId}/participants/${participantId}/admin-checkin`,
    method: "DELETE"
  });
}

module.exports = {
  listActivities,
  listMyActivities,
  listActivityTypeStyles,
  getActivityStyleSignature,
  getClientConfig,
  getActivity,
  getActivitySharePreview,
  createActivity,
  updateActivity,
  deleteActivity,
  signupActivity,
  cancelSignup,
  removeParticipant,
  checkinActivity,
  adminCheckinParticipant,
  adminCancelCheckinParticipant
};
