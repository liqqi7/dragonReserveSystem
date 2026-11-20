const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createParticles, sampleParticle } = require("../utils/signupConfetti");

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
  const canvasQueries = [];
  const animations = [];
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
      if (name === "../../services/logger") return { logPageError() {} };
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
      if (name === "../../utils/safeArea") return { getWindowInfoCompat: () => ({ pixelRatio: 3 }) };
      if (name === "../../utils/signupConfetti") return {
        animateSignupConfetti(node, width, height, pixelRatio, finish) {
          const animation = { node, width, height, pixelRatio, finish, cancelled: false };
          animations.push(animation);
          return () => { animation.cancelled = true; };
        }
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
    console: { error() {} }
  });
  const page = {
    ...definition,
    data: plain(definition.data),
    setData(patch, callback) {
      patches.push(plain(patch));
      Object.assign(this.data, patch);
      if (callback) callback();
    },
    createSelectorQuery() {
      return {
        select(selector) { assert.equal(selector, "#signup-confetti-canvas"); return this; },
        fields() { return this; },
        exec(callback) { canvasQueries.push(callback); }
      };
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
    page, patches, requests, notifications, refreshes, canvasQueries, animations,
    flushNextTick() { while (nextTicks.length) nextTicks.shift()(); },
    finishCanvasQuery() { canvasQueries.shift()([{ node: {}, width: 390, height: 844 }]); }
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
  assert.equal(h.page.data.showSignupConfetti, false, "wait for the native sheet to finish closing");
  h.page.onSubItemSignupAfterLeave();
  assert.equal(h.page.data.showSignupConfetti, true);
  h.page.onSubItemSignupAfterLeave();
  assert.equal(h.canvasQueries.length, 1, "duplicate afterleave cannot replay the effect");
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
  h.page.onSubItemSignupAfterLeave();
  assert.equal(h.page.data.showSignupConfetti, false);

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
    assert.equal(h.page.data.showSignupConfetti, false, "wait for successful signup");
    h.requests[0].resolve();
    await tick();
    assert.equal(h.page.data.signupSubmitting, false);
    assert.equal(h.notifications.at(-1).title, "报名成功");
    assert.equal(h.page.data.showSignupConfetti, true);
    h.finishCanvasQuery();
    assert.equal(h.animations.length, 1);
    h.animations[0].finish();
    assert.equal(h.page.data.showSignupConfetti, false);
  }
});

test("leaving during grouped signup prevents a late celebration on return", async () => {
  const h = makePage();
  h.page.directSignup(h.page.data.activity);
  h.flushNextTick();
  h.page.toggleSignupOption(tap({ id: 101 }));
  h.page.confirmSubItemSignup();
  h.requests[0].resolve();
  await tick();

  h.page.onHide();
  h.page.onShow();
  h.page.onSubItemSignupAfterLeave();
  assert.equal(h.page.data.showSignupConfetti, false);
  assert.equal(h.canvasQueries.length, 0);
});

test("a canvas callback received after navigation cannot start a confetti animation", () => {
  const h = makePage();
  h.page.playSignupConfetti();
  h.page.onHide();
  h.finishCanvasQuery();

  assert.equal(h.page.data.showSignupConfetti, false);
  assert.equal(h.animations.length, 0);
});

test("signup confetti rises from the bottom, spreads across the screen, and drifts down slowly", () => {
  let seed = 5213;
  const particles = createParticles(() => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  });
  assert.equal(particles.length, 120);

  const columns = Array(8).fill(0);
  for (const particle of particles) {
    assert.ok(sampleParticle(particle, particle.delay).y > 1, "starts below the bottom edge");
    if (particle.launchY > 0.85) {
      assert.ok(sampleParticle(particle, particle.delay + 0.5).y < 0.31, "the stronger launches reach the upper third");
    }
    const spread = sampleParticle(particle, 1.5);
    if (spread && spread.y >= 0 && spread.y < 1 && spread.x >= 0 && spread.x < 1) {
      columns[Math.floor(spread.x * columns.length)]++;
    }
    const later = sampleParticle(particle, 3.5);
    if (spread && later) {
      const fallPerSecond = (later.y - spread.y) / 2;
      assert.ok(fallPerSecond >= 0.08 && fallPerSecond <= 0.15, "falls within the intended range of screen heights per second");
    }
  }
  assert.ok(Math.min(...columns) >= 7 && Math.max(...columns) <= 22, String(columns));
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
