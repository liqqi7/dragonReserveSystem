const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { enrichSingleActivity } = require("../utils/activityEnrich");
const activityForm = require("../utils/activityForm");

function createEditFlow() {
  const calls = [], emitted = [], listeners = new Map();
  let navigation, detailPage, editPage;
  let raw = {
    id: "activity-1", name: "Original", remark: "Remark", created_by: "user-1",
    status: "未开始", start_time: "2030-01-01T12:00:00", end_time: "2030-01-01T14:00:00",
    participants: [], sub_items: [], location_latitude: null, location_longitude: null
  };
  const service = {
    getActivity() { calls.push("GET"); return Promise.resolve(raw); },
    updateActivity() { calls.push("PATCH"); raw = { ...raw, name: "Updated" }; return Promise.resolve(raw); },
    cancelActivity() { calls.push("CANCEL"); raw = { ...raw, status: "已取消" }; return Promise.resolve(raw); }
  };
  const app = { globalData: { userId: "user-1", userRole: "admin", accessToken: "token", isAuthenticated: true } };
  const channel = {
    on(name, callback) { listeners.set(name, callback); },
    emit(name, payload) { emitted.push(name); listeners.get(name)?.(payload); }
  };
  const wx = {
    getStorageSync: () => "",
    showToast() {},
    showModal: options => options.success({ confirm: true }),
    navigateTo: options => { navigation = options; },
    navigateBack() { editPage.onUnload(); detailPage.onShow(); }
  };
  function loadPage(name) {
    const filename = path.join(__dirname, `../pages/${name}/${name}.js`);
    let definition;
    vm.runInNewContext(fs.readFileSync(filename, "utf8"), {
      Page: value => { definition = value; },
      getApp: () => app,
      wx, console, setTimeout, clearTimeout,
      require: name => {
        if (name === "../../services/activity") return service;
        if (name === "../../utils/activityForm") return { ...activityForm, validateActivityForm: () => ({ ok: true }) };
        return require(path.resolve(path.dirname(filename), name));
      }
    });
    return {
      ...definition,
      data: structuredClone(definition.data),
      setData(patch, callback) { Object.assign(this.data, patch); if (callback) callback(); },
      getOpenerEventChannel: () => channel,
      updateRemarkOverflow() {}
    };
  }
  detailPage = loadPage("activity_detail");
  detailPage.data.activityId = raw.id;
  detailPage.data.loading = false;
  detailPage._hasShownOnce = true;
  detailPage.syncUser();
  detailPage.applyActivity(enrichSingleActivity(raw, "user-1"));
  detailPage.openAdminEdit();
  detailPage.onHide();
  editPage = loadPage("activity_edit");
  editPage.onLoad({ id: raw.id });
  navigation.success({ eventChannel: channel });
  editPage.onReady();
  return { detailPage, editPage, calls, emitted };
}

for (const action of ["saveActivity", "cancelActivity"]) {
  test(`edit ${action} returns to one detail refresh after the opener prefill`, async () => {
    const { detailPage, editPage, calls, emitted } = createEditFlow();
    assert.deepEqual(calls, [], "prefilled edit entry does not fetch an unused detail");
    assert.equal(editPage.data.form.name, "Original");
    editPage[action]();
    await new Promise(setImmediate);
    assert.deepEqual(calls, [action === "saveActivity" ? "PATCH" : "CANCEL", "GET"]);
    assert.deepEqual(emitted, ["initActivityEdit"]);
    if (action === "saveActivity") assert.equal(detailPage.data.activity.name, "Updated");
    else assert.equal(detailPage.data.activity.status, "已取消");
  });
}

test("an unchanged edit returns through the same single-refresh lifecycle", async () => {
  const { detailPage, editPage, calls } = createEditFlow();
  editPage.onBack();
  await new Promise(setImmediate);
  assert.deepEqual(calls, ["GET"]);
  assert.equal(detailPage.data.activity.name, "Original");
});
