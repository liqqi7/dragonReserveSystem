const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createRequire } = require("node:module");

const root = path.join(__dirname, "..");
const sheets = ["date-time-picker-sheet", "activity-form-sheet", "activity-cover-picker-sheet", "participants-drawer"];
const clone = value => JSON.parse(JSON.stringify(value));

function componentHarness(name, embedded = false) {
  const sourcePath = path.join(root, "components", name, "index.js");
  const localRequire = createRequire(sourcePath);
  let definition;
  let nextTimer = 1;
  const timers = new Map();
  const ticks = [];
  const patches = [];
  const events = [];
  vm.runInNewContext(fs.readFileSync(sourcePath, "utf8"), {
    module: { exports: {} },
    Component: value => { definition = value; },
    require: specifier => /dateTimePicker|activityForm|\.\/logic$/.test(specifier) ? localRequire(specifier) : {},
    wx: { nextTick: callback => ticks.push(callback), getWindowInfo: () => ({ windowWidth: 390, windowHeight: 844 }) },
    setTimeout(callback) { const id = nextTimer++; timers.set(id, callback); return id; },
    clearTimeout(id) { timers.delete(id); },
    console
  });
  const properties = Object.fromEntries(Object.entries(definition.properties).map(([key, spec]) => [key, spec.value]));
  properties.visible = true;
  properties.embedded = embedded;
  let syncParent = true;
  const instance = {
    ...definition.methods,
    properties,
    data: clone(definition.data),
    setData(patch, callback) {
      patches.push(patch);
      Object.assign(this.data, patch);
      if (callback) callback();
    },
    triggerEvent(name) {
      events.push(name);
      if (name === "close" && syncParent) setVisible(false);
    }
  };
  function setVisible(value) {
    instance.properties.visible = value;
    const observer = Object.entries(definition.observers).find(([key]) => key.split(/,\s*/).includes("visible"))[1];
    observer.call(instance, value);
  }
  function open() {
    instance.properties.visible = true;
    instance.mountContainer();
    while (ticks.length) ticks.shift()();
  }
  open();
  return { instance, definition, events, patches, timers, open, setVisible,
    flushTicks() { while (ticks.length) ticks.shift()(); },
    delayParent() { syncParent = false; },
    runTimer(id) { const callback = timers.get(id); timers.delete(id); if (callback) callback(); }
  };
}

for (const name of sheets) {
  test(`${name}: native back synchronizes the parent before completing dismissal`, () => {
    const h = componentHarness(name);
    const wxml = fs.readFileSync(path.join(root, "components", name, "index.wxml"), "utf8");
    assert.match(wxml, /bind:beforeleave="onContainerBeforeLeave"/);
    assert.match(wxml, /bind:afterleave="onContainerAfterLeave"/);
    assert.equal(h.instance.properties.visible, true);
    h.instance.onContainerBeforeLeave();
    assert.equal(h.instance.properties.visible, false);
    assert.equal(h.instance.data.containerVisible, false);
    h.instance.onContainerAfterLeave();
    assert.equal(h.instance.data.containerRendered, false);
    assert.equal(h.events.filter(event => event === "close").length, 1);
  });

  test(`${name}: application close and repeated native events do not notify twice`, () => {
    const h = componentHarness(name);
    const close = h.instance.onClose || h.instance.onCloseTap;
    close.call(h.instance);
    h.instance.onContainerBeforeLeave();
    h.instance.onContainerBeforeLeave();
    h.instance.onContainerAfterLeave();
    const count = h.patches.length;
    h.instance.onContainerAfterLeave();
    assert.equal(h.events.filter(event => event === "close").length, 1);
    assert.ok(h.events.filter(event => event === "afterleave").length <= 1);
    assert.equal(h.patches.length, count);
  });

  test(`${name}: late afterleave cannot destroy a reopened sheet`, () => {
    const h = componentHarness(name);
    h.instance.onContainerBeforeLeave();
    h.open();
    h.instance.onContainerAfterLeave();
    assert.equal(h.instance.properties.visible, true);
    assert.equal(h.instance.data.containerRendered, true);
    assert.equal(h.instance.data.containerVisible, true);
    assert.equal(h.events.includes("afterleave"), false);
    h.instance.onContainerBeforeLeave();
    h.instance.onContainerAfterLeave();
    assert.equal(h.events.filter(event => event === "close").length, 2);
    assert.equal(h.instance.data.containerRendered, false);
  });

  test(`${name}: repeated beforeleave while parent binding is pending emits one close`, () => {
    const h = componentHarness(name);
    h.delayParent();
    h.instance.onContainerBeforeLeave();
    h.instance.onContainerBeforeLeave();
    assert.deepEqual(h.events, ["close"]);
    h.setVisible(false);
    h.instance.onContainerAfterLeave();
    assert.equal(h.instance.data.containerRendered, false);
  });

  test(`${name}: external property close does not synthesize another close event`, () => {
    const h = componentHarness(name);
    h.setVisible(false);
    h.instance.onContainerBeforeLeave();
    h.instance.onContainerAfterLeave();
    assert.equal(h.events.includes("close"), false);
    assert.equal(h.instance.data.containerRendered, false);
  });

  test(`${name}: remounting does not mistake its temporary hidden state for system back`, () => {
    const h = componentHarness(name);
    h.instance.mountContainer();
    assert.equal(h.instance.data.containerVisible, false);
    h.instance.onContainerBeforeLeave();
    h.instance.onContainerAfterLeave();
    assert.equal(h.instance.properties.visible, true);
    assert.equal(h.events.includes("close"), false);
    h.flushTicks();
    assert.equal(h.instance.data.containerRendered, true);
    assert.equal(h.instance.data.containerVisible, true);
  });
}

for (const name of ["date-time-picker-sheet", "activity-cover-picker-sheet"]) {
  test(`${name}: embedded leave timer is cancelled on reopening and cannot clear a later close`, () => {
    const h = componentHarness(name, true);
    h.setVisible(false);
    const oldTimerId = h.instance._leaveTimer;
    const staleCallback = h.timers.get(oldTimerId);
    h.open();
    assert.equal(h.timers.has(oldTimerId), false);
    h.setVisible(false);
    const newTimerId = h.instance._leaveTimer;
    staleCallback();
    assert.equal(h.instance.data.containerRendered, true);
    assert.equal(h.instance._leaveTimer, newTimerId);
    h.runTimer(newTimerId);
    h.instance.onContainerAfterLeave();
    assert.equal(h.instance.data.containerRendered, false);
    assert.ok(h.events.filter(event => event === "afterleave").length <= 1);
  });

  test(`${name}: detaching clears the pending embedded leave timer`, () => {
    const h = componentHarness(name, true);
    h.setVisible(false);
    const timerId = h.instance._leaveTimer;
    const staleCallback = h.timers.get(timerId);
    h.definition.lifetimes.detached.call(h.instance);
    assert.equal(h.timers.has(timerId), false);
    const count = h.patches.length;
    staleCallback();
    assert.equal(h.patches.length, count);
  });
}

function detailHarness() {
  let definition;
  const patches = [];
  vm.runInNewContext(fs.readFileSync(path.join(root, "pages/activity_detail/activity_detail.js"), "utf8"), {
    Page: value => { definition = value; },
    require: () => ({}),
    getApp: () => ({ globalData: {} }),
    wx: { nextTick: callback => callback() },
    console, setTimeout, clearTimeout
  });
  return {
    ...definition,
    patches,
    data: { ...clone(definition.data), canManageActivity: true, isAdmin: true, activity: { _id: 1, status: "未开始" } },
    setData(patch, callback) { patches.push(patch); Object.assign(this.data, patch); if (callback) callback(); }
  };
}

for (const [name, visible, rendered] of [
  ["ActivityForm", "showActivityForm", "activityFormContainerRendered"],
  ["SubItemSignup", "showSubItemSignup", "subItemSignupContainerRendered"],
  ["ProjectMembers", "showProjectMembers", "projectMembersContainerRendered"]
]) {
  test(`detail ${name}: native dismissal resets state and duplicate completion is harmless`, () => {
    const page = detailHarness();
    const wxml = fs.readFileSync(path.join(root, "pages/activity_detail/activity_detail.wxml"), "utf8");
    assert.ok(wxml.includes(`bind:beforeleave="on${name}BeforeLeave"`));
    Object.assign(page.data, { [visible]: true, [rendered]: true, activityFormSubmitting: true, signupSubmitting: true });
    page[`on${name}BeforeLeave`]();
    assert.equal(page.data[visible], false);
    page[`on${name}AfterLeave`]();
    const count = page.patches.length;
    page[`on${name}BeforeLeave`]();
    page[`on${name}AfterLeave`]();
    assert.equal(page.patches.length, count);
    assert.equal(page.data[rendered], false);
    assert.equal(page.data.activityFormSubmitting, true);
    assert.equal(page.data.signupSubmitting, true);
  });

  test(`detail ${name}: prior afterleave preserves the newly opened state`, () => {
    const page = detailHarness();
    Object.assign(page.data, { [visible]: true, [rendered]: true });
    page[`on${name}BeforeLeave`]();
    page.data[visible] = true;
    page[`on${name}AfterLeave`]();
    assert.equal(page.data[rendered], true);
    assert.equal(page.data[visible], true);
  });
}

test("detail editing can reopen after native back without leaving the page", () => {
  const page = detailHarness();
  page.openAdminEdit();
  page.onActivityFormBeforeLeave();
  page.onActivityFormAfterLeave();
  page.openAdminEdit();
  assert.equal(page.data.showActivityForm, true);
  assert.equal(page.data.activityFormContainerRendered, true);
});
