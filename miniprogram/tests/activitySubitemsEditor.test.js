const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

let definition;
const previousComponent = global.Component;
global.Component = value => { definition = value; };
const exported = require("../components/activity-subitems-editor/index.js");
global.Component = previousComponent;

const componentDir = path.join(__dirname, "../components/activity-subitems-editor");
const wxml = fs.readFileSync(path.join(componentDir, "index.wxml"), "utf8");
const wxss = fs.readFileSync(path.join(componentDir, "index.wxss"), "utf8");

function context(items, locked = false, maxParticipants = 12) {
  return {
    ...definition.methods,
    properties: { items, enabled: true, locked, maxParticipants },
    data: {
      ...definition.data,
      rowStates: items.map((item, index) => ({
        key: item.id != null ? `subitem-${item.id}` : `subitem-new-${index}`,
        offsetX: 0,
        actionOpen: false
      }))
    },
    triggerEvent(name, detail) { this.result = detail; },
    setData(patch, callback) { Object.assign(this.data, patch); if (callback) callback(); },
    syncItems(itemsToSync = this.result.items) {
      this.properties.items = itemsToSync;
      definition.observers.items.call(this, itemsToSync);
    }
  };
}

test("subitems editor caps projects at four and inserts a default item with animation state", () => {
  const c = context([{ id: 1, name: "A", max_participants: 4 }]);
  c.add();
  assert.equal(c.result.items.length, 2);
  assert.equal(c.result.items[0].id, 1);
  assert.deepEqual(c.result.items[1], { name: "", max_participants: 12 });
  assert.equal(c.data.insertingIndex, 1);
  assert.equal(c.data.insertVisible, false);

  c.properties.items = Array.from({ length: 4 }, () => ({ name: "A" }));
  c.result = null;
  c.add();
  assert.equal(c.result, null);
});

test("new subitem expands and fades after its transparent first frame", () => {
  const originalSetTimeout = global.setTimeout;
  const scheduled = [];
  global.setTimeout = (callback, delay) => {
    const timer = { callback, delay, unref() {} };
    scheduled.push(timer);
    return timer;
  };
  try {
    const c = context([{ id: 1, name: "A", max_participants: 4 }]);
    c.add();
    assert.equal(c.data.insertingIndex, 1);
    assert.equal(c.data.insertVisible, false);
    assert.equal(scheduled[0].delay, exported.INSERT_ACTIVATION_DELAY_MS);

    scheduled[0].callback();
    assert.equal(c.data.insertVisible, true);
    assert.equal(scheduled[1].delay, exported.INSERT_ANIMATION_MS);

    scheduled[1].callback();
    assert.equal(c.data.insertingIndex, -1);
    assert.equal(c.data.insertVisible, false);
  } finally {
    global.setTimeout = originalSetTimeout;
  }
});

test("subitem capacity and new-item defaults never exceed the activity quota", () => {
  const c = context([{ id: 1, max_participants: 7 }], false, 8);
  c.step({ currentTarget: { dataset: { index: 0, delta: 1 } } });
  assert.equal(c.result.items[0].max_participants, 8);
  c.properties.items = c.result.items;
  c.step({ currentTarget: { dataset: { index: 0, delta: 1 } } });
  assert.equal(c.result.items[0].max_participants, 8);

  const empty = context([], false, 8);
  empty.add();
  assert.equal(empty.result.items[0].max_participants, 8);
});

test("subitem capacity cannot fall below existing signup count", () => {
  const c = context([{ id: 1, max_participants: 3, current_participants: 3 }]);
  c.step({ currentTarget: { dataset: { index: 0, delta: -1 } } });
  assert.equal(c.result.items[0].max_participants, 3);
  assert.equal(c.properties.items[0].max_participants, 3);
});

test("occupied subitems cannot be removed and signup locks mode changes", () => {
  const oldWx = global.wx;
  global.wx = { showToast() {} };
  try {
    const c = context([
      { id: 1, current_participants: 1 },
      { id: 2, current_participants: 0 },
      { id: 3, current_participants: 0 }
    ], true);
    c.remove({ currentTarget: { dataset: { index: 0 } } });
    assert.equal(c.result, undefined);
    c.toggle({ detail: { value: false } });
    assert.equal(c.result, undefined);
  } finally {
    global.wx = oldWx;
  }
});

test("removing the first subitem exits left, collapses its space, and does not transfer delete state", () => {
  const originalSetTimeout = global.setTimeout;
  const scheduled = [];
  global.setTimeout = (callback, delay) => {
    const timer = { callback, delay, unref() {} };
    scheduled.push(timer);
    return timer;
  };
  try {
    const c = context([
      { name: "A", current_participants: 0 },
      { name: "B", current_participants: 0 },
      { name: "C", current_participants: 0 }
    ]);
    c.data.rowStates[0] = {
      ...c.data.rowStates[0],
      offsetX: -exported.ACTION_OFFSET_RPX,
      actionOpen: true
    };
    c.remove({ currentTarget: { dataset: { index: 0 } } });
    assert.equal(c.data.removingIndex, 0);
    assert.equal(c.data.removalPhase, "exiting");
    assert.equal(c.data.suppressSwipeTransition, true);
    assert.deepEqual(c.data.rowStates.map(row => row.offsetX), [0, 0, 0]);
    assert.deepEqual(c.data.rowStates.map(row => row.actionOpen), [false, false, false]);
    assert.equal(scheduled[0].delay, exported.ITEM_REMOVE_COLLAPSE_DELAY_MS);

    scheduled[0].callback();
    assert.equal(c.data.removalPhase, "collapsing");
    assert.equal(scheduled[1].delay, exported.ITEM_REMOVE_COLLAPSE_ANIMATION_MS);

    scheduled[1].callback();
    assert.equal(c.data.removalPhase, "committing");
    assert.deepEqual(c.result.items.map(item => item.name), ["B", "C"]);
    c.syncItems();
    assert.equal(c.data.rowStates.length, 2);
    assert.equal(c.data.rowStates[0].key, "subitem-new-0");
    assert.equal(c.data.rowStates[0].offsetX, 0);
    assert.equal(c.data.rowStates[0].actionOpen, false);
    assert.equal(c.data.removingIndex, -1);
    assert.equal(c.data.removalPhase, "");
    assert.equal(c.data.suppressSwipeTransition, true);
    assert.equal(scheduled[2].delay, exported.SWIPE_TRANSITION_RESTORE_DELAY_MS);
    scheduled[2].callback();
    assert.equal(c.data.suppressSwipeTransition, false);
  } finally {
    global.setTimeout = originalSetTimeout;
  }
});


test("switching off fades the content before unmounting it", async () => {
  const c = context([{ id: 1 }]);
  c.data.renderContent = true;
  c.toggle({ detail: { value: false } });
  assert.equal(c.result.enabled, false);
  assert.equal(c.result.items[0].id, 1);
  assert.equal(c.data.contentLeaving, true);
  assert.equal(c.data.renderContent, true);
  await new Promise(resolve => setTimeout(resolve, exported.CONTENT_EXIT_ANIMATION_MS + 20));
  assert.equal(c.data.renderContent, false);
  assert.equal(c.data.contentLeaving, false);
});
test("two subitems cannot reveal or trigger deletion", () => {
  const oldWx = global.wx;
  global.wx = { getWindowInfo: () => ({ windowWidth: 390 }) };
  try {
    const c = context([{ id: 1 }, { id: 2 }]);
    c.startSwipe({ currentTarget: { dataset: { index: 0 } }, touches: [{ clientX: 200, clientY: 20 }] });
    c.moveSwipe({ touches: [{ clientX: 140, clientY: 20 }] });
    c.endSwipe();
    assert.equal(c.data.rowStates[0].offsetX, 0);
    assert.equal(c.data.rowStates[0].actionOpen, false);

    c.remove({ currentTarget: { dataset: { index: 0 } } });
    assert.equal(c.result, undefined);
    assert.equal(c.data.removingIndex, -1);
    assert.equal(c.data.removalPhase, "");
  } finally {
    global.wx = oldWx;
  }
});

test("row swipe follows the finger, opens one delete action, and a short right swipe closes it", () => {
  const oldWx = global.wx;
  global.wx = { getWindowInfo: () => ({ windowWidth: 390 }) };
  try {
    const c = context([{ id: 1 }, { id: 2 }, { id: 3 }]);
    c.startSwipe({ currentTarget: { dataset: { index: 0 } }, touches: [{ clientX: 200, clientY: 20 }] });
    c.moveSwipe({ touches: [{ clientX: 150, clientY: 21 }] });
    assert.ok(c.data.rowStates[0].offsetX < 0);
    c.endSwipe();
    assert.equal(c.data.rowStates[0].offsetX, -exported.ACTION_OFFSET_RPX);
    assert.equal(c.data.rowStates[0].actionOpen, true);

    c.startSwipe({ currentTarget: { dataset: { index: 1 } }, touches: [{ clientX: 200, clientY: 20 }] });
    assert.equal(c.data.rowStates[0].offsetX, 0);
    c.moveSwipe({ touches: [{ clientX: 145, clientY: 21 }] });
    c.endSwipe();
    assert.equal(c.data.rowStates[1].actionOpen, true);

    c.startSwipe({ currentTarget: { dataset: { index: 1 } }, touches: [{ clientX: 100, clientY: 20 }] });
    c.moveSwipe({ touches: [{ clientX: 112, clientY: 20 }] });
    c.endSwipe();
    assert.equal(c.data.rowStates[1].offsetX, 0);
    assert.equal(c.data.rowStates[1].actionOpen, false);
  } finally {
    global.wx = oldWx;
  }
});

test("swipe geometry matches the prototype single-delete state", () => {
  assert.equal(exported.ACTION_OFFSET_RPX, 138.46);
  assert.equal(exported.ACTION_AREA_WIDTH_RPX, 130.77);
  assert.equal(exported.SWIPE_OPEN_THRESHOLD_RATIO, 0.25);
  assert.equal(exported.SWIPE_CLOSE_THRESHOLD_RATIO, 0.15);
  assert.equal(exported.MIN_SUBITEM_COUNT, 2);
  assert.equal(exported.canRemoveSubitem([{ id: 1 }, { id: 2 }]), false);
  assert.equal(exported.canRemoveSubitem([{ id: 1 }, { id: 2 }, { id: 3 }]), true);
  assert.deepEqual(exported.getSwipeSettledState(0, -40), { offsetX: -138.46, actionOpen: true });
  assert.deepEqual(exported.getSwipeSettledState(-138.46, -110), { offsetX: 0, actionOpen: false });
  assert.match(wxml, /bindtouchstart="startSwipe"/);
  assert.match(wxml, /bindtouchmove="moveSwipe"/);
  assert.match(wxml, /bindtouchend="endSwipe"/);
  assert.match(wxml, /wx:if="{{items\.length > 2}}" class="delete"/);
  assert.match(wxml, /translate3d\(\{\{rowStates\[index\]\.offsetX \|\| 0\}\}rpx,0,0\)/);
  assert.match(wxss, /\.delete \{[^}]*width:130\.77rpx;[^}]*height:107\.69rpx;[^}]*border-radius:30\.77rpx;[^}]*background:#FFF5F5;/);
  assert.match(wxss, /\.project-row \{[^}]*transition:transform 180ms ease-out;/);
});

test("stepper spacing, prototype SVG icons, and dashed add button match the expanded prototype", () => {
  assert.match(wxss, /\.project-row \{[^}]*padding:0 38\.46rpx;/);
  assert.match(wxss, /\.stepper \{[^}]*gap:15\.38rpx;/);
  assert.match(wxss, /\.count \{[^}]*width:76\.92rpx;[^}]*font-size:26\.92rpx;[^}]*font-weight:600;/);
  assert.match(wxss, /\.step-icon \{[^}]*width:26\.92rpx;[^}]*height:26\.92rpx;/);
  assert.match(wxss, /\.add \{[^}]*border:0;[^}]*border-radius:30\.77rpx;[^}]*gap:15\.38rpx;[^}]*overflow:visible;/);
  assert.match(wxss, /\.add-border \{[^}]*position:absolute;[^}]*width:100%;[^}]*height:100%;/);
  assert.match(wxml, /src="\/images\/activity-subitem-add-border\.svg"/);
  assert.match(wxml, /src="\/images\/activity-subitem-minus\.svg"/);
  assert.equal((wxml.match(/src="\/images\/activity-subitem-plus\.svg"/g) || []).length, 1);
  assert.match(wxml, /class="step-icon step-plus"/);
  assert.match(wxss, /\.plus-bar \{[^}]*background:#FF9800;/);
  assert.match(wxml, /src="\/images\/activity-subitem-trash\.svg"/);
  assert.doesNotMatch(wxml, /[−＋]/);
  assert.match(wxml, />添加项目</);
});

test("insert and removal animations move surrounding layout without leaking delete state", () => {
  assert.equal(exported.INSERT_ACTIVATION_DELAY_MS, 32);
  assert.equal(exported.INSERT_ANIMATION_MS, 240);
  assert.equal(exported.CONTENT_ENTER_ANIMATION_MS, 360);
  assert.equal(exported.CONTENT_EXIT_ANIMATION_MS, 360);
  assert.equal(exported.ITEM_REMOVE_EXIT_ANIMATION_MS, 150);
  assert.equal(exported.ITEM_REMOVE_COLLAPSE_DELAY_MS, 48);
  assert.equal(exported.ITEM_REMOVE_COLLAPSE_ANIMATION_MS, 240);
  assert.equal(exported.ITEM_REMOVE_ANIMATION_MS, 288);
  assert.equal(exported.SWIPE_TRANSITION_RESTORE_DELAY_MS, 32);
  assert.ok(exported.ITEM_REMOVE_COLLAPSE_DELAY_MS < exported.ITEM_REMOVE_EXIT_ANIMATION_MS);
  assert.ok(
    exported.ITEM_REMOVE_ANIMATION_MS
      < exported.ITEM_REMOVE_EXIT_ANIMATION_MS + exported.ITEM_REMOVE_COLLAPSE_ANIMATION_MS
  );
  assert.match(wxml, /wx:if="{{renderContent}}"/);
  assert.match(wxml, /subitems-content--leaving/);
  assert.match(wxml, /class="item-visual"/);
  assert.match(wxml, /removalPhase !== 'committing'/);
  assert.match(wxml, /removalPhase === 'exiting' \? 'item-wrap--removing-exiting'/);
  assert.match(wxml, /removalPhase === 'collapsing' \? 'item-wrap--removing-collapsing'/);
  assert.match(wxml, /removalPhase === 'committing' \? 'item-wrap--removing-committing'/);
  assert.match(wxss, /\.subitems-content--leaving \{[^}]*animation-name:subitems-content-leave;[^}]*animation-duration:360ms;[^}]*animation-timing-function:cubic-bezier\(0\.42,0,0\.58,1\);[^}]*animation-fill-mode:forwards;/);
  assert.match(wxss, /\.item-wrap--removing \.item-visual \{[^}]*animation-name:subitem-remove-left;[^}]*animation-duration:150ms;[^}]*animation-fill-mode:forwards;/);
  assert.match(wxss, /\.item-wrap--removing-collapsing \{ height:0; margin-top:0; transition:height 240ms[^}]*margin-top 240ms/);
  assert.match(wxss, /\.item-wrap--removing-committing \{ height:0; margin-top:0; pointer-events:none; \}/);
  assert.match(wxss, /\.item-wrap--removing-committing \.item-visual \{ opacity:0; transform:none; \}/);
  assert.match(wxml, /suppressSwipeTransition \? 'project-row--no-transition'/);
  assert.match(wxss, /\.project-row--no-transition \{ transition:none; \}/);
  assert.match(wxss, /@keyframes subitem-remove-left \{ from \{ opacity:1; transform:translateX\(0\); \} to \{ opacity:0; transform:translateX\(-100%\); \} \}/);
  assert.match(wxml, /subitems-content--entering/);
  assert.match(wxml, /item-wrap--inserting/);
  assert.match(wxml, /item-wrap--insert-visible/);
  assert.match(wxml, /wx:for="{{items}}"/);
  assert.match(wxml, /wx:key="index"/);
  assert.match(wxss, /\.subitems-content--entering \{[^}]*animation-name:subitems-content-enter;[^}]*animation-duration:360ms;[^}]*animation-timing-function:cubic-bezier\(0\.42,0,0\.58,1\);[^}]*animation-fill-mode:forwards;/);
  assert.match(wxss, /\.item-wrap--inserting \{[^}]*height:0;[^}]*margin-top:0;[^}]*pointer-events:none;[^}]*transition:height 240ms[^}]*margin-top 240ms/);
  assert.match(wxss, /\.item-wrap--inserting \.item-visual \{ opacity:0; transition:opacity 240ms ease-out; \}/);
  assert.match(wxss, /\.item-wrap--inserting\.item-wrap--insert-visible \{ height:107\.69rpx; margin-top:15\.38rpx; \}/);
  assert.match(wxss, /\.item-wrap--inserting\.item-wrap--insert-visible \.item-visual \{ opacity:1; \}/);
  assert.doesNotMatch(wxss, /\.item-wrap--inserting \{[^}]*overflow:visible;/);
  assert.match(wxss, /\.add \{[^}]*position:relative;[^}]*height:107\.69rpx;/);
  assert.doesNotMatch(wxss, /@keyframes subitem-insert/);
  assert.match(wxss, /@keyframes subitems-content-leave \{ from \{ opacity:1; transform:translateY\(0\); \} to \{ opacity:0; transform:translateY\(15\.38rpx\); \} \}/);
});

test("closed switch matches the prototype track and thumb geometry", () => {
  assert.match(wxss, /\.prototype-switch \{[^}]*width:84\.62rpx;[^}]*height:46\.15rpx;[^}]*border-radius:23\.08rpx;[^}]*background:#E5E7EB;/);
  assert.match(wxss, /\.prototype-switch-thumb \{[^}]*left:3\.85rpx;[^}]*top:3\.85rpx;[^}]*width:38\.46rpx;[^}]*height:38\.46rpx;[^}]*border-radius:19\.23rpx;[^}]*background:#FFFFFF;[^}]*box-shadow:0 1\.92rpx 5\.77rpx rgba\(0,0,0,0\.15\);[^}]*transition:left 150ms ease-out;/);
});









