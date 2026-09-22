const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const activityDetail = require("../utils/activityDetail");
const activityEnrich = require("../utils/activityEnrich");
const participantSort = require("../utils/participantSort");

const source = fs.readFileSync(path.join(__dirname, "../pages/activity_detail/activity_detail.js"), "utf8");

function createPage(getActivity = async () => null) {
  let definition;
  const locations = [], navigation = [], toasts = [];
  const wx = {
    getStorageSync: () => "",
    showLoading() {},
    hideLoading() {},
    showToast: value => toasts.push(value),
    getLocation: value => locations.push(value),
    openLocation: value => navigation.push(value)
  };
  vm.runInNewContext(source, {
    Page: value => { definition = value; },
    getApp: () => ({ globalData: {} }),
    require: name => {
      if (name === "../../services/activity") return { getActivity };
      if (name === "../../utils/activityDetail") return activityDetail;
      if (name === "../../utils/activityEnrich") return activityEnrich;
      if (name === "../../utils/participantSort") return participantSort;
      if (name === "../../utils/activityWeatherCache") return { resolveActivityWeather: () => null };
      return {};
    },
    wx,
    console: { error() {} },
    setTimeout,
    clearTimeout
  });
  const page = {
    ...definition,
    data: structuredClone(definition.data),
    setData(patch, callback) { Object.assign(this.data, patch); if (callback) callback(); },
    updateRemarkOverflow() {},
    refreshSharePreview() {}
  };
  return { page, locations, navigation, toasts };
}

test("back-to-top appears past the scroll threshold without updating every scroll frame", () => {
  const { page } = createPage();
  page._backToTopThresholdPx = 300;
  const changes = [];
  page.setData = patch => { changes.push(patch); Object.assign(page.data, patch); };
  for (const scrollTop of [0, 100, 299]) page.onDetailScroll({ detail: { scrollTop } });
  assert.equal(changes.length, 0);
  for (const scrollTop of [300, 400, 500]) page.onDetailScroll({ detail: { scrollTop } });
  assert.equal(page.data.showBackToTop, true);
  assert.equal(changes.length, 1);
  page.onDetailScroll({ detail: { scrollTop: 0 } });
  assert.equal(page.data.showBackToTop, false);
  assert.equal(changes.length, 2);
});

test("back-to-top can repeatedly scroll the native view and ignores a detached view", () => {
  const { page } = createPage();
  const requests = [];
  let completeQuery;
  page.createSelectorQuery = () => {
    const query = {
      select(selector) { assert.equal(selector, '.main-scroll'); return query; },
      node() { return query; },
      exec(callback) { completeQuery = callback; }
    };
    return query;
  };
  const nodes = [{ node: { scrollTo: options => requests.push(options) } }];
  for (let attempt = 0; attempt < 2; attempt += 1) {
    page.backToTop();
    completeQuery(nodes);
  }
  assert.deepEqual(requests.map(value => [value.top, value.animated]), [[0, true], [0, true]]);
  page.backToTop();
  completeQuery([null]);
  page.backToTop();
  page.onUnload();
  completeQuery(nodes);
  assert.equal(requests.length, 2);
});

test("detail retry recovers from the initial error while a failed retry keeps its error visible", async () => {
  const raw = {
    id: 73, name: "可重试的活动", start_time: "2030-01-01T12:00:00",
    end_time: "2030-01-01T14:00:00", participants: [], sub_items: [],
    location_latitude: null, location_longitude: null
  };
  let calls = 0;
  const { page, toasts } = createPage(async () => {
    calls += 1;
    if (calls < 3) throw Error("网络暂时不可用");
    return raw;
  });
  page.data.activityId = "73";
  page.bootstrap();
  await new Promise(setImmediate);
  assert.equal(page.data.loadError, "网络暂时不可用");
  assert.equal(page.data.loading, false);

  await page.refreshDetail();
  assert.equal(page.data.loadError, "网络暂时不可用");
  assert.equal(page.data.activity, null);
  assert.equal(toasts.at(-1).title, "网络暂时不可用");

  await page.refreshDetail();
  assert.equal(page.data.loadError, "", "successful retry must leave the WXML error branch");
  assert.equal(page.data.activity._id, "73");
  assert.equal(page.data.detailContentVisible, true);
  assert.equal(page.data.loading, false);
});

test("missing, blank, nonnumeric or out-of-range coordinates never request location or navigation", () => {
  const { page, locations, navigation, toasts } = createPage();
  const invalid = [
    null,
    {},
    { locationLatitude: null, locationLongitude: null },
    { locationLatitude: 31.2, locationLongitude: null },
    { locationLatitude: "", locationLongitude: "" },
    { locationLatitude: "  ", locationLongitude: 121.4 },
    { locationLatitude: "invalid", locationLongitude: 121.4 },
    { locationLatitude: 91, locationLongitude: 121.4 },
    { locationLatitude: 31.2, locationLongitude: -181 }
  ];
  for (const activity of invalid) {
    page.data.activity = activity;
    page.data.locationDistanceText = "约 1km";
    page.loadLocationDistance(activity);
    page.openLocation();
    assert.equal(page.data.locationDistanceText, "");
  }
  assert.equal(locations.length, 0);
  assert.equal(navigation.length, 0);
  assert.equal(toasts.length, invalid.length);
  assert.ok(toasts.every(item => item.title === "该活动暂无可导航地点"));
});

test("valid numeric strings and zero coordinates still support navigation and distance", () => {
  const { page, locations, navigation } = createPage();
  for (const [latitude, longitude] of [["31.2", "121.4"], [0, 121.4], [31.2, 0], [0, 0]]) {
    const activity = { locationLatitude: latitude, locationLongitude: longitude, locationName: "集合点" };
    page.data.activity = activity;
    page.loadLocationDistance(activity);
    page.openLocation();
    locations.at(-1).success({ latitude: Number(latitude), longitude: Number(longitude) });
    assert.equal(page.data.locationDistanceText, "约 1m");
    assert.equal(navigation.at(-1).latitude, Number(latitude));
    assert.equal(navigation.at(-1).longitude, Number(longitude));
    assert.equal(navigation.at(-1).name, "集合点");
  }
  assert.equal(locations.length, 4);
  assert.equal(navigation.length, 4);
});

test("removing activity coordinates invalidates an older in-flight distance response", () => {
  const { page, locations } = createPage();
  page.loadLocationDistance({ locationLatitude: 31.2, locationLongitude: 121.4 });
  page.loadLocationDistance({ locationLatitude: null, locationLongitude: null });
  locations[0].success({ latitude: 31.1, longitude: 121.3 });
  assert.equal(locations.length, 1);
  assert.equal(page.data.locationDistanceText, "");
});
