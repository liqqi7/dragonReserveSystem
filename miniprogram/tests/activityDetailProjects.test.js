const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const pageDirectory = path.join(__dirname, "../pages/activity_detail");
const pageSource = fs.readFileSync(path.join(pageDirectory, "activity_detail.js"), "utf8");
const wxml = fs.readFileSync(path.join(pageDirectory, "activity_detail.wxml"), "utf8");
const plain = value => JSON.parse(JSON.stringify(value));
const tap = dataset => ({ currentTarget: { dataset } });
const tick = () => new Promise(resolve => setImmediate(resolve));

function makePage() {
  let definition;
  const nextTicks = [];
  const patches = [];
  const requests = [];
  const notifications = [];
  const refreshes = [];
  const app = { globalData: {
    accessToken: "fixture-token",
    userId: "17",
    userRole: "user",
    userProfile: { nickname: "报名用户", avatarUrl: "https://example.test/avatar.jpg" }
  } };
  vm.runInNewContext(pageSource, {
    getApp: () => app,
    Page: value => { definition = value; },
    require: name => {
      if (name === "../../services/activity") return {
        signupActivity(activityId, selectedIds) {
          return new Promise((resolve, reject) => {
            requests.push({ activityId, selectedIds: plain(selectedIds), resolve, reject });
          });
        }
      };
      if (name === "../../utils/profileUtils") return {
        isDefaultNickname: () => false,
        isDefaultAvatar: () => false
      };
      return {};
    },
    wx: {
      nextTick: callback => nextTicks.push(callback),
      getStorageSync: () => "",
      showLoading() {},
      hideLoading() {},
      showToast: value => notifications.push(value)
    },
    console: { error() {} },
    setTimeout,
    clearTimeout
  });
  const page = {
    ...definition,
    data: plain(definition.data),
    setData(patch, callback) {
      patches.push(plain(patch));
      Object.assign(this.data, patch);
      if (callback) callback();
    },
    refreshDetail(options) { refreshes.push(options); return Promise.resolve(); }
  };
  page.data.activity = {
    _id: 91,
    status: "未开始",
    participants: [],
    subItems: [
      { id: 101, name: "露营", current_participants: 1, max_participants: 4 },
      { id: 102, name: "烧烤", current_participants: 0, max_participants: 4 },
      { id: 103, name: "飞盘", current_participants: 4, max_participants: 4 }
    ]
  };
  return {
    page, patches, requests, notifications, refreshes,
    flushNextTick() { while (nextTicks.length) nextTicks.shift()(); }
  };
}

test("signup opens project options without a request and supports multi-select, deselect and full-capacity blocking", () => {
  const h = makePage();
  h.page.directSignup(h.page.data.activity);
  assert.equal(h.requests.length, 0);
  assert.equal(h.page.data.subItemSignupContainerRendered, true);
  assert.equal(h.page.data.showSubItemSignup, false);
  h.flushNextTick();
  assert.equal(h.page.data.showSubItemSignup, true);
  assert.deepEqual(plain(h.page.data.signupOptions).map(item => [item.id, item.selected, item.full]), [
    [101, false, false], [102, false, false], [103, false, true]
  ]);

  h.page.toggleSignupOption(tap({ id: "101" }));
  h.page.toggleSignupOption(tap({ id: "102" }));
  h.page.toggleSignupOption(tap({ id: "103" }));
  assert.deepEqual(plain(h.page.data.signupSelection), [101, 102]);
  h.page.toggleSignupOption(tap({ id: "101" }));
  h.page.toggleSignupOption(tap({ id: "unknown" }));
  assert.deepEqual(plain(h.page.data.signupSelection), [102]);
  assert.equal(h.page.data.signupOptions.find(item => item.id === 103).selected, false);
});

test("empty selection sends no signup; pending signup locks selection and prevents duplicate requests", async () => {
  const h = makePage();
  h.page.directSignup(h.page.data.activity);
  h.flushNextTick();
  h.page.confirmSubItemSignup();
  assert.equal(h.requests.length, 0);

  h.page.toggleSignupOption(tap({ id: 101 }));
  h.page.toggleSignupOption(tap({ id: 102 }));
  h.page.confirmSubItemSignup();
  assert.equal(h.page.data.signupSubmitting, true);
  assert.equal(h.requests.length, 1);
  assert.equal(h.requests[0].activityId, 91);
  assert.deepEqual(h.requests[0].selectedIds, [101, 102]);

  h.page.toggleSignupOption(tap({ id: 101 }));
  h.page.closeSubItemSignup();
  h.page.confirmSubItemSignup();
  assert.equal(h.requests.length, 1);
  assert.deepEqual(plain(h.page.data.signupSelection), [101, 102]);
  assert.equal(h.page.data.showSubItemSignup, true);

  h.requests[0].resolve();
  await tick();
  assert.equal(h.page.data.signupSubmitting, false);
  assert.equal(h.page.data.showSubItemSignup, false);
  assert.deepEqual(plain(h.page.data.signupSelection), []);
  assert.equal(h.refreshes.length, 1);
  assert.equal(h.notifications.at(-1).title, "报名成功");
});

test("failed signup releases the lock and refreshes project availability before reopening", async () => {
  const h = makePage();
  h.page.directSignup(h.page.data.activity);
  h.flushNextTick();
  h.page.toggleSignupOption(tap({ id: 101 }));
  h.page.confirmSubItemSignup();
  h.requests[0].reject(new Error("该子项目人数已满"));
  await tick();
  assert.equal(h.page.data.signupSubmitting, false);
  assert.equal(h.page.data.showSubItemSignup, false);
  assert.deepEqual(plain(h.page.data.signupSelection), []);
  assert.equal(h.refreshes.length, 1);
  assert.equal(h.notifications.at(-1).title, "该子项目人数已满");

  h.page.data.activity.subItems[0].current_participants = 4;
  h.page.directSignup(h.page.data.activity);
  h.flushNextTick();
  h.page.toggleSignupOption(tap({ id: 101 }));
  assert.equal(h.page.data.showSubItemSignup, true);
  assert.deepEqual(plain(h.page.data.signupSelection), []);
  assert.equal(h.page.data.signupOptions[0].full, true);
});

test("activities without sub-projects retain direct signup and do not open the project picker", async () => {
  for (const subItems of [[], undefined]) {
    const h = makePage();
    h.page.data.activity.subItems = subItems;
    h.page.directSignup(h.page.data.activity);
    h.flushNextTick();
    assert.equal(h.requests.length, 1);
    assert.deepEqual(h.requests[0].selectedIds, []);
    assert.equal(h.page.data.subItemSignupContainerRendered, false);
    assert.equal(h.page.data.showSubItemSignup, false);
    h.requests[0].resolve();
    await tick();
    assert.equal(h.page.data.signupSubmitting, false);
    assert.equal(h.notifications.at(-1).title, "报名成功");
  }
});

test("project members contain only that project's registrations, including people who joined several projects", () => {
  const h = makePage();
  h.page.data.activity.participants = [
    { userId: 1, nickname: "露营用户", subItemIds: [101] },
    { userId: 2, nickname: "两个项目", subItemIds: [101, 102] },
    { userId: 3, nickname: "烧烤用户", subItemIds: [102] },
    { userId: 4, nickname: "活动级报名" }
  ];
  h.page.openProjectMembers(tap({ id: "101" }));
  assert.equal(h.page.data.projectMembersContainerRendered, true);
  assert.equal(h.page.data.showProjectMembers, false);
  assert.equal(h.page.data.projectMemberTitle, "露营");
  assert.deepEqual(plain(h.page.data.projectMembers).map(person => person.userId), [1, 2]);
  h.flushNextTick();
  assert.equal(h.page.data.showProjectMembers, true);

  h.page.openProjectMembers(tap({ id: "102" }));
  h.flushNextTick();
  assert.equal(h.page.data.projectMemberTitle, "烧烤");
  assert.deepEqual(plain(h.page.data.projectMembers).map(person => person.userId), [2, 3]);
  const before = plain(h.page.data);
  h.page.openProjectMembers(tap({ id: "999" }));
  h.flushNextTick();
  assert.deepEqual(plain(h.page.data), before);

  h.page.closeProjectMembers();
  assert.equal(h.page.data.projectMembersContainerRendered, true, "keep content mounted for the leave animation");
  h.page.onProjectMembersAfterLeave();
  assert.equal(h.page.data.projectMembersContainerRendered, false);
});

test("project details follow the basic information, map and weather in the prototype", () => {
  const anchors = ["basicInformation", "qaActivityLocationCard", "qaActivityWeatherCard", "optionalProjects"];
  const positions = anchors.map(anchor => wxml.indexOf(`id="${anchor}"`));
  assert.ok(positions.every(position => position >= 0), "each section has a real scroll or validation target");
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
  assert.doesNotMatch(wxml, /project-tabs|project-tab|selectDetailSection|scroll-into-view/);
  assert.match(wxml, /class="detail-panel">\s*<view id="basicInformation"/);
});

test("project signup uses the prototype's title and empty versus selected confirmation copy", () => {
  assert.match(wxml, /选择报名子项目/);
  assert.match(wxml, /请选择报名的子项目/);
  assert.match(wxml, /确定报名/);
  assert.doesNotMatch(wxml, /已选\s*\{\{signupSelection\.length\}\}\s*项/);
});
