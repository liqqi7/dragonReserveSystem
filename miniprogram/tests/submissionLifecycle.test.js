const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const read = relativePath => fs.readFileSync(path.join(__dirname, relativePath), "utf8");
const serviceSource = read("../services/activity.js");

function createFixture(name) {
  const requests = [], ui = [], events = [], logs = [], locations = [];
  const invalidated = { list: 0, history: 0, mine: 0 };
  let pages = [], definition;
  const wx = {
    getStorageSync: () => "user-1",
    showLoading: value => ui.push({ type: "showLoading", value }),
    hideLoading: () => ui.push({ type: "hideLoading" }),
    showToast: value => ui.push({ type: "toast", value }),
    navigateBack: () => ui.push({ type: "navigateBack" }),
    getLocation: options => locations.push(options),
    chooseLocation: options => locations.push(options)
  };
  const services = { exports: {} };
  // Use the real service so page lifecycle guards also exercise cache invalidation.
  vm.runInNewContext(serviceSource, {
    module: services,
    wx,
    require: name => {
      if (name === "./request") return {
        request(options) {
          return new Promise((resolve, reject) => requests.push({ options, resolve, reject }));
        }
      };
      if (name === "./cacheManager") return { clearCachedActivityList: () => { invalidated.list++; } };
      if (name === "../utils/historyStatsCache") return { clear: () => { invalidated.history++; } };
      if (name === "../utils/myActivitiesCache") return { removeForUser: () => { invalidated.mine++; } };
      throw Error(`Unexpected service import: ${name}`);
    }
  });
  vm.runInNewContext(read(`../pages/${name}/${name}.js`), {
    Page: value => { definition = value; },
    getApp: () => ({ globalData: {} }),
    getCurrentPages: () => pages,
    wx,
    console: { error: (...args) => logs.push(args) },
    setTimeout,
    clearTimeout,
    require: name => {
      if (name === "../../services/activity") return services.exports;
      if (name === "../../utils/activityForm") return {
        validateActivityForm: () => ({ ok: true }),
        buildActivityPayload: value => value
      };
      return {};
    }
  });
  const page = {
    ...definition,
    data: {
      ...structuredClone(definition.data),
      step: 3,
      form: { name: "Test activity" },
      activityId: "activity-1",
      activityLatitude: 30,
      activityLongitude: 120,
      userLatitude: 30,
      userLongitude: 120,
      distanceKm: 0
    },
    setData(patch, callback) {
      ui.push({ type: "setData", patch });
      Object.assign(this.data, patch);
      if (callback) callback();
    },
    getOpenerEventChannel: () => ({ emit: (...args) => events.push(args) }),
    prepareCoverImages() {},
    startCoverSkeletonShimmer() {}
  };
  pages = [{ route: "pages/activity_detail/activity_detail" }, page];
  page.onShow();
  ui.length = 0;
  return {
    page, requests, ui, events, logs, locations, invalidated,
    submit: () => name === "activity_create" ? page.next() : page.confirmCheckin(),
    setPages: value => { pages = value; }
  };
}

for (const name of ["activity_create", "checkin_map"]) {
  const mineInvalidations = name === "checkin_map" ? 1 : 0;

  test(`${name}: duplicate taps send one request and visible success returns once`, async () => {
    const h = createFixture(name);
    const pending = h.submit();
    h.submit();
    assert.equal(h.requests.length, 1);
    assert.equal(h.page.data.submitting, true);
    h.requests[0].resolve({ id: "activity-1" });
    await pending;
    assert.equal(h.ui.filter(call => call.type === "navigateBack").length, 1);
    assert.equal(h.ui.filter(call => call.type === "toast").length, 1);
    assert.equal(h.page.data.submitting, false);
    assert.deepEqual(h.invalidated, { list: 1, history: 1, mine: mineInvalidations });
    h.submit();
    h.page.onShow();
    assert.equal(h.requests.length, 1, "a completed POST must never be resubmitted");
    assert.equal(h.ui.filter(call => call.type === "navigateBack").length, 1);
  });

  test(`${name}: success after system back updates caches without UI or navigation`, async () => {
    const h = createFixture(name);
    const pending = h.submit();
    h.page.onHide();
    h.page.onUnload();
    h.setPages([{ route: "pages/activity_detail/activity_detail" }]);
    h.ui.length = 0;
    h.requests[0].resolve({ id: "activity-1" });
    await pending;
    assert.deepEqual(h.ui, []);
    assert.deepEqual(h.events, []);
    assert.deepEqual(h.invalidated, { list: 1, history: 1, mine: mineInvalidations });
    h.submit();
    assert.equal(h.requests.length, 1);
  });

  test(`${name}: rejection after unload cannot change or hide the next page UI`, async () => {
    const h = createFixture(name);
    const pending = h.submit();
    h.page.onUnload();
    h.setPages([{ route: "pages/another/another" }]);
    h.ui.length = 0;
    h.requests[0].reject({ message: "Network failed" });
    await pending;
    assert.deepEqual(h.ui, []);
    assert.deepEqual(h.invalidated, { list: 0, history: 0, mine: 0 });
  });

  test(`${name}: a hidden success waits for its original page to become topmost`, async () => {
    const h = createFixture(name);
    const pending = h.submit();
    h.page.onHide();
    h.setPages([h.page, { route: "pages/another/another" }]);
    h.ui.length = 0;
    h.requests[0].resolve({ id: "activity-1" });
    await pending;
    assert.deepEqual(h.ui, []);
    assert.deepEqual(h.events, []);
    h.page.onShow();
    assert.deepEqual(h.ui, [], "onShow alone cannot authorize popping a different top page");
    h.setPages([h.page]);
    h.page.onShow();
    assert.equal(h.ui.filter(call => call.type === "navigateBack").length, 1);
    assert.equal(h.page.data.submitting, false);
  });

  test(`${name}: hidden failure unlocks retry only when the original page returns`, async () => {
    const h = createFixture(name);
    const pending = h.submit();
    h.page.onHide();
    h.ui.length = 0;
    h.requests[0].reject({ message: "Network failed" });
    await pending;
    assert.deepEqual(h.ui, []);
    assert.equal(h.page.data.submitting, true);
    h.page.onShow();
    assert.equal(h.page.data.submitting, false);
    assert.equal(h.ui.filter(call => call.type === "toast").at(-1).value.title, "Network failed");
    assert.equal(h.ui.filter(call => call.type === "navigateBack").length, 0);
    const retry = h.submit();
    assert.equal(h.requests.length, 2);
    h.requests[1].resolve({ id: "activity-1" });
    await retry;
    assert.equal(h.ui.filter(call => call.type === "navigateBack").length, 1);
  });
}

test("creation: opener listener failure cannot report a successful POST as failed or allow duplicate creation", async () => {
  const h = createFixture("activity_create");
  h.page.getOpenerEventChannel = () => ({ emit() { throw Error("Opener listener failed"); } });
  const pending = h.submit();
  h.requests[0].resolve({ id: "activity-1" });
  await pending;
  assert.equal(h.logs.length, 1);
  assert.equal(h.ui.filter(call => call.type === "toast").at(-1).value.title, "发布成功");
  assert.equal(h.ui.filter(call => call.type === "navigateBack").length, 1);
  h.submit();
  assert.equal(h.requests.length, 1);
});

test("creation: navigation performed by an opener listener is not immediately popped", async () => {
  const h = createFixture("activity_create");
  h.page.getOpenerEventChannel = () => ({ emit() { h.setPages([h.page, {}]); } });
  const pending = h.submit();
  h.requests[0].resolve({ id: "activity-1" });
  await pending;
  assert.equal(h.ui.filter(call => call.type === "navigateBack").length, 0);
  assert.equal(h.ui.filter(call => call.type === "toast").length, 0);
  assert.deepEqual(h.invalidated, { list: 1, history: 1, mine: 0 });
});

test("checkin: returning while the request is pending restores its loading indicator once", async () => {
  const h = createFixture("checkin_map");
  const pending = h.submit();
  assert.equal(h.page._submissionLoadingVisible, true);
  h.page.onHide();
  assert.equal(h.page._submissionLoadingVisible, false);
  h.ui.length = 0;
  h.setPages([h.page, {}]);
  h.page.onShow();
  assert.deepEqual(h.ui, [], "a different top page must not receive the old loading indicator");
  h.setPages([h.page]);
  h.page.onShow();
  h.page.onShow();
  assert.equal(h.page._submissionLoadingVisible, true);
  assert.equal(h.ui.filter(call => call.type === "showLoading").length, 1);
  h.submit();
  assert.equal(h.requests.length, 1);
  h.requests[0].resolve({ id: "activity-1" });
  await pending;
  assert.equal(h.page._submissionLoadingVisible, false);
  assert.equal(h.ui.filter(call => call.type === "hideLoading").length, 1);
  assert.equal(h.ui.filter(call => call.type === "navigateBack").length, 1);
});

test("checkin: late location callbacks do not update an unloaded page", () => {
  const h = createFixture("checkin_map");
  h.page.fetchUserLocation();
  h.page.onUnload();
  h.ui.length = 0;
  h.locations[0].success({ latitude: 30, longitude: 120 });
  h.locations[0].fail({ errMsg: "getLocation:fail" });
  assert.deepEqual(h.ui, []);
});

test("creation: late cover listing and location callbacks ignore an unloaded page", async () => {
  const h = createFixture("activity_create");
  const pending = h.page.loadCovers();
  h.page.chooseLocation();
  h.page.onUnload();
  h.ui.length = 0;
  h.requests[0].resolve([{ artworks: [{ id: "cover-1" }] }]);
  await pending;
  h.locations[0].success({ name: "Place", latitude: 30, longitude: 120 });
  h.locations[0].fail({ errMsg: "chooseLocation:fail" });
  assert.deepEqual(h.ui, []);
});
