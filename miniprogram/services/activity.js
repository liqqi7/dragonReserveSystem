const { request: baseRequest } = require("./request");
const cacheManager = require("./cacheManager");

let listActivitiesInFlight = null;
let latestActivityListRead = null;
let activityListGeneration = 0;

function request(options) {
  return baseRequest({ ...options, apiVersion: 2 });
}

function invalidateActivityCaches() {
  activityListGeneration += 1;
  listActivitiesInFlight = null;
  latestActivityListRead = null;
  cacheManager.clearCachedActivityList();
}

function listActivities() {
  if (listActivitiesInFlight) return listActivitiesInFlight;

  const generation = activityListGeneration;
  // Existing callers must also receive a fresh list after a successful mutation.
  const coalesced = request({ url: "/activities" }).finally(() => {
    if (listActivitiesInFlight === coalesced) listActivitiesInFlight = null;
  }).then(
    (result) => generation === activityListGeneration ? result : (latestActivityListRead || listActivities()),
    (error) => {
      if (generation !== activityListGeneration) return latestActivityListRead || listActivities();
      throw error;
    }
  );
  listActivitiesInFlight = coalesced;
  // Only superseded callers reuse this completed read; ordinary reads still fetch.
  latestActivityListRead = coalesced;
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
