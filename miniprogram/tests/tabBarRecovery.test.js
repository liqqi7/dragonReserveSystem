const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function harness() {
  const app = { globalData: { userRole: "user", isAuthenticated: true, accessToken: "token" } };
  const ticks = [], navigations = [], toasts = [], timers = new Map();
  let timerId = 0, route = "pages/tools/tools", component, definition;
  const wx = {
    nextTick: fn => ticks.push(fn),
    navigateTo: options => navigations.push(options),
    switchTab: () => { route = "pages/activity_list/activity_list"; },
    getStorageSync: () => "",
    showToast: options => toasts.push(options)
  };
  const globals = {
    wx, getApp: () => app, getCurrentPages: () => [{ route }],
    setTimeout: fn => { timers.set(++timerId, fn); return timerId; },
    clearTimeout: id => timers.delete(id), console
  };
  const source = relative => fs.readFileSync(path.join(__dirname, "..", relative), "utf8");
  vm.runInNewContext(source("custom-tab-bar/index.js"), {
    ...globals, Component: value => { component = value; },
    require: () => ({ getWindowInfoCompat: () => ({}), getBottomSafeAreaRpx: () => 0 })
  });
  const tab = {
    ...component.methods, data: { ...component.data, hidden: false, selected: 1 },
    setData(patch, callback) { Object.assign(this.data, patch); callback?.(); }
  };
  vm.runInNewContext(source("pages/activity_list/activity_list.js"), {
    ...globals, Page: value => { definition = value; },
    require: () => ({ patchTabBarIfNeeded() {}, cancelScheduledPrefetch() {} })
  });
  const page = {
    ...definition, data: structuredClone(definition.data), _pageVisible: true,
    getTabBar: () => tab,
    setData(patch, callback) { Object.assign(this.data, patch); callback?.(); },
    syncGuestState() {}, _ensureHomePresentationDiagnostics() {}, loadActivityListByCachePolicy() {},
    _scheduleColdStartCardEntrance() {}, _startSkeletonShimmer() {}, _revealCreatedCard() {}
  };
  return {
    app, tab, page, navigations, toasts, component,
    flushTicks() { while (ticks.length) ticks.shift()(); },
    crossTabCreate() { tab.onCreateActivityTap(); page.onShow(); this.flushTicks(); }
  };
}

test("cross-tab create navigation failure restores the real tab and permits retry", () => {
  const h = harness(); h.crossTabCreate();
  assert.equal(h.tab.data.hidden, true);
  assert.equal(h.navigations.length, 1);
  h.navigations[0].fail({ errMsg: "navigateTo:fail cancelled" });
  h.navigations[0].complete();
  assert.equal(h.app.globalData.pendingOpenCreateActivity, false);
  assert.equal(h.app.globalData.tabBarHidden, false);
  assert.equal(h.tab.data.hidden, false);
  h.component.pageLifetimes.show.call(h.tab);
  assert.equal(h.tab.data.hidden, false);
  h.page.showCreateModal();
  assert.equal(h.navigations.length, 2);
});

test("repeated create taps open at most one page while navigation is in flight", () => {
  const h = harness(); h.crossTabCreate();
  h.page.showCreateModal(); h.page.showCreateModal();
  assert.equal(h.navigations.length, 1);
});

test("a delayed create intent cannot navigate after the homepage becomes hidden", () => {
  const h = harness();
  h.tab.onCreateActivityTap(); h.page.onShow();
  h.page._pageVisible = false;
  h.flushTicks();
  assert.equal(h.navigations.length, 0);
});

test("permission lost before deferred navigation releases the hidden tab", () => {
  const h = harness();
  h.tab.onCreateActivityTap(); h.page.onShow();
  h.app.globalData.isAuthenticated = false;
  h.flushTicks();
  assert.equal(h.navigations.length, 0);
  assert.equal(h.tab.data.hidden, false);
});

test("failed navigation does not override an active home entrance or drawer", () => {
  const h = harness(); h.crossTabCreate();
  h.page._coldStartTabEntrancePending = true;
  h.navigations[0].fail();
  assert.equal(h.tab.data.hidden, true);
  h.page._coldStartTabEntrancePending = false;
  h.page.data.showCreateForm = true;
  h.navigations[0].fail();
  assert.equal(h.tab.data.hidden, true);
});

test("page show clears an interrupted tab entrance even when hidden is already false", () => {
  const h = harness();
  h.tab.data.entering = true;
  h.component.pageLifetimes.show.call(h.tab);
  assert.equal(h.tab.data.hidden, false);
  assert.equal(h.tab.data.entering, false);
});

test("native dismissal releases the legacy home drawer and the tab", () => {
  const h = harness();
  h.page.data.createFormContainerRendered = true;
  h.page.data.showCreateForm = true;
  h.page._setTabBarHidden(true);
  h.page.onCreateFormBeforeLeave(); h.page.onCreateFormAfterLeave();
  assert.equal(h.page.data.showCreateForm, false);
  assert.equal(h.page.data.createFormContainerRendered, false);
  assert.equal(h.tab.data.hidden, false);
});
