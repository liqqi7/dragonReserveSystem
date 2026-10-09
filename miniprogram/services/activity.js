const { request: baseRequest } = require("./request");
const cacheManager = require("./cacheManager");

let listActivitiesInFlight = null;

function request(options) {
  return baseRequest({ ...options, apiVersion: 2 });
}

function invalidateActivityCaches() {
  cacheManager.clearCachedActivityList();
}

function listActivities() {
  if (listActivitiesInFlight) return listActivitiesInFlight;

  const pending = request({ url: "/activities" });
  const coalesced = pending.finally(() => {
    if (listActivitiesInFlight === coalesced) listActivitiesInFlight = null;
  });
  listActivitiesInFlight = coalesced;
  return coalesced;
}


function listActivityCovers() {
  return request({ url: "/activity-covers" });
}

function getActivity(activityId) {
  return request({ url: `/activities/${activityId}` });
}


function createActivity(payload) {
  return request({
    url: "/activities",
    method: "POST",
    data: payload
  }).then((result) => {
    invalidateActivityCaches();
    return result;
  });
}

function updateActivity(activityId, payload) {
  return request({
    url: `/activities/${activityId}`,
    method: "PATCH",
    data: payload
  }).then((result) => {
    invalidateActivityCaches();
    return result;
  });
}

function signupActivity(activityId, subItemIds = []) {
  return request({
    url: `/activities/${activityId}/signup`,
    method: "POST",
    data: { sub_item_ids: subItemIds }
  }).then((result) => {
    invalidateActivityCaches();
    return result;
  });
}

function cancelActivity(activityId) {
  return request({
    url: `/activities/${activityId}/cancel`,
    method: "POST"
  }).then((result) => {
    invalidateActivityCaches();
    return result;
  });
}

function removeParticipant(activityId, participantId) {
  return request({
    url: `/activities/${activityId}/participants/${participantId}`,
    method: "DELETE"
  }).then((result) => {
    invalidateActivityCaches();
    return result;
  });
}

function checkinActivity(activityId, payload) {
  return request({
    url: `/activities/${activityId}/checkin`,
    method: "POST",
    data: payload
  }).then((result) => {
    invalidateActivityCaches();
    return result;
  });
}

function adminCheckinParticipant(activityId, participantId) {
  return request({
    url: `/activities/${activityId}/participants/${participantId}/admin-checkin`,
    method: "POST"
  }).then((result) => {
    invalidateActivityCaches();
    return result;
  });
}

function adminCancelCheckinParticipant(activityId, participantId) {
  return request({
    url: `/activities/${activityId}/participants/${participantId}/admin-checkin`,
    method: "DELETE"
  }).then((result) => {
    invalidateActivityCaches();
    return result;
  });
}

module.exports = {
  listActivities,
  listActivityCovers,
  getActivity,
  createActivity,
  updateActivity,
  cancelActivity,
  signupActivity,
  removeParticipant,
  checkinActivity,
  adminCheckinParticipant,
  adminCancelCheckinParticipant
};
