const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const componentDir = path.join(__dirname, "../components/participants-drawer");
const js = fs.readFileSync(path.join(componentDir, "index.js"), "utf8");
const wxml = fs.readFileSync(path.join(componentDir, "index.wxml"), "utf8");
const wxss = fs.readFileSync(path.join(componentDir, "index.wxss"), "utf8");
const definition = require(path.join(componentDir, "logic.js"));

function readSvg(name) {
  return fs.readFileSync(path.join(__dirname, `../images/${name}.svg`), "utf8");
}

test("participants drawer uses prototype RPX geometry and palette", () => {
  assert.match(wxss, /height:\s*auto/);
  assert.match(wxss, /min-height:\s*0/);
  assert.match(wxml, /max-height:\s*\{\{maxHeightRpx\}\}rpx/);
  assert.match(wxml, /class="drawer-body"[^>]*style="max-height: \{\{bodyMaxHeightRpx\}\}rpx"/);
  assert.match(wxss, /participants-drawer-sheet-enter/);
  assert.match(wxss, /participants-drawer-mask-enter/);
  assert.match(wxss, /border-radius:\s*46\.15rpx\s+46\.15rpx\s+0\s+0/);
  assert.match(wxss, /background:\s*#f5f5f5/);
  assert.match(wxss, /width:\s*73\.08rpx/);
  assert.match(wxss, /height:\s*7\.69rpx/);
  assert.match(wxss, /background:\s*#9ca3af/);
  assert.match(wxss, /padding:\s*0\s+30\.77rpx/);
  assert.match(wxss, /\.drawer-title\s*\{[^}]*font-size:\s*38\.46rpx;[^}]*font-weight:\s*700;/s);
  assert.match(wxss, /\.checkin-progress-card\s*\{[^}]*height:\s*153\.85rpx;[^}]*padding:\s*23\.08rpx\s+30\.77rpx;[^}]*border-radius:\s*30\.77rpx;/s);
  assert.match(wxss, /\.participant-row-wrap\s*\{[^}]*height:\s*123\.08rpx;[^}]*border-radius:\s*23\.08rpx;/s);
  assert.match(wxss, /\.member-avatar\s*\{[^}]*width:\s*76\.92rpx;[^}]*height:\s*76\.92rpx;[^}]*border-radius:\s*50%;/s);
  assert.match(wxss, /\.participant-list\s*\{[^}]*gap:\s*7\.69rpx;/s);
  assert.match(wxss, /\.progress-track\s*\{[^}]*height:\s*11\.54rpx;[^}]*border-radius:\s*5\.77rpx;[^}]*background:\s*#ffe0b2;/s);
  assert.match(wxss, /\.progress-complete\s*\{[^}]*background:\s*#ff9800;/s);
});


test("drawer height follows the viewport and caps at 85 percent", () => {
  const previousWx = global.wx;
  global.wx = {
    getWindowInfo() {
      return { windowWidth: 390, windowHeight: 844 };
    }
  };
  assert.equal(definition.DRAWER_MAX_HEIGHT_RATIO, 0.85);
  assert.equal(definition.getMaxHeightRpx(), 1379.62);
  if (previousWx === undefined) delete global.wx;
  else global.wx = previousWx;
});

test("swipe handlers are mounted once on the full row wrapper", () => {
  const wrapper = wxml.match(/<view\s+\n?\s*wx:for="\{\{rows\}\}"[\s\S]*?<\/view>\s*<\/view>/);
  assert.ok(wrapper);
  assert.match(wrapper[0], /class="participant-row-wrap"/);
  assert.match(wrapper[0], /data-index="\{\{index\}\}"/);
  assert.match(wrapper[0], /bindtouchstart="onTouchStart"/);
  assert.match(wrapper[0], /bindtouchmove="onTouchMove"/);
  assert.match(wrapper[0], /bindtouchend="onTouchEnd"/);
  assert.match(wrapper[0], /bindtouchcancel="onTouchCancel"/);
  const actions = wxml.match(/<view\s+class="participant-actions"[\s\S]*?<\/view>\s*<view\s+class="participant-row"/);
  assert.ok(actions);
  assert.doesNotMatch(actions[0], /bindtouch(start|move|end|cancel)="onTouch/);
});

test("participant progress formats limited and unlimited activities", () => {
  assert.deepEqual(definition.buildProgressView(18, 7, 24), {
    participantCountText: "18",
    participantLimitText: "24 人",
    participantHasLimit: true,
    progressPercent: 38.89,
    progressWidth: "38.88888888888889%",
    progressMessage: "还有 11 人未签到"
  });
  assert.deepEqual(definition.buildProgressView(18, 18, null), {
    participantCountText: "18",
    participantLimitText: "",
    participantHasLimit: false,
    progressPercent: 100,
    progressWidth: "100%",
    progressMessage: "已全部签到"
  });
  assert.equal(definition.hasParticipantLimit(0), false);
  assert.equal(definition.hasParticipantLimit("0"), false);
  assert.equal(definition.hasParticipantLimit(""), false);
  assert.deepEqual(definition.buildProgressView(18, 7, 0), {
    participantCountText: "18",
    participantLimitText: "",
    participantHasLimit: false,
    progressPercent: 38.89,
    progressWidth: "38.88888888888889%",
    progressMessage: "还有 11 人未签到"
  });
});

test("zero participants uses the prototype empty-state message and empty track state", () => {
  const view = definition.buildProgressView(0, 0, 24);
  assert.equal(view.progressWidth, "0%");
  assert.equal(view.progressMessage, "暂无成员报名");
  assert.match(wxml, /还没有人报名/);
  assert.match(wxml, /有成员报名后，会在这里生成人员名单/);
  assert.match(wxss, /\.drawer-empty\s*\{[^}]*height:\s*576\.92rpx;/s);
});

test("check-in dates retain zero-padded months and the time column keeps them on one line", () => {
  assert.deepEqual(definition.formatCheckinParts("2026-08-29 16:20:31"), {
    date: "08月29日",
    time: "16:20:31"
  });
  assert.deepEqual(definition.formatCheckinParts("2026-12-09 08:05:04"), {
    date: "12月09日",
    time: "08:05:04"
  });
  assert.match(wxss, /\.head-time,\s*\.time-cell\s*\{[^}]*flex:\s*0 0 153\.85rpx;[^}]*width:\s*153\.85rpx;/s);
  assert.match(wxss, /\.time-cell\s*\{[^}]*white-space:\s*nowrap;/s);
});

test("rows preserve check-in time and location for ordinary users", () => {
  assert.match(js, /isAdmin: \{ type: Boolean, value: false \}/);
  assert.match(js, /const checkinLocation = checked[\s\S]*?String\(row\.checkinLocationName \|\| row\.checkinAddress \|\| ""\)\.trim\(\)/);
  assert.match(js, /hasCheckinLocation: Boolean\(checkinLocation\)/);
  assert.match(js, /checkinLocationText: checkinLocation \|\| "—"/);
  assert.match(wxml, /签到时间/);
  assert.match(wxml, /签到位置/);
  assert.match(wxml, /<block wx:if="\{\{row\.hasCheckedIn\}\}">\s*<text>\{\{row\.checkinDateText\}\}<\/text>\s*<text>\{\{row\.checkinTimeText\}\}<\/text>\s*<\/block>\s*<text wx:else>—<\/text>/s);
  assert.match(wxml, /checkinDateText/);
  assert.match(wxml, /checkinTimeText/);
  assert.match(wxml, /checkinLocationText/);
  assert.match(wxml, /wx:if="\{\{isAdmin\}\}"/);
  assert.match(js, /availableActions: this\.properties\.isAdmin \?/);
});

test("unchecked check-in placeholders are centered while checked-in details remain left aligned", () => {
  assert.match(wxml, /class="time-cell \{\{row\.hasCheckedIn \? '' : 'time-cell--empty'\}\}"/);
  assert.match(wxml, /class="location-cell \{\{row\.hasCheckinLocation \? '' : 'location-cell--empty'\}\}"/);
  assert.match(wxml, /<view class="location-cell \{\{row\.hasCheckinLocation \? '' : 'location-cell--empty'\}\}">\s*<text>\{\{row\.checkinLocationText\}\}<\/text>\s*<\/view>/s);
  assert.match(wxss, /\.time-cell--empty\s*\{[^}]*align-items:\s*center;[^}]*text-align:\s*center;/s);
  assert.match(wxss, /\.location-cell--empty\s*\{[^}]*justify-content:\s*center;[^}]*text-align:\s*center;/s);
});

test("admin actions are bound to check-in state and participant drawer events", () => {
  assert.match(wxml, /wx:if="\{\{row\.hasCheckedIn\}\}"[^>]*data-action="cancelcheckin"/);
  assert.match(wxml, /wx:else[^>]*class="row-action row-action-retro"[^>]*data-action="retrocheckin"/);
  assert.match(wxml, /data-action="remove"/);
  assert.match(wxml, /bindtap="onActionTap"/);
  assert.match(wxml, /bindtouchstart="onTouchStart"/);
  assert.match(wxml, /bindtouchmove="onTouchMove"/);
  assert.match(wxml, /bindtouchend="onTouchEnd"/);
  assert.match(wxml, /bindtouchcancel="onTouchCancel"/);
  assert.match(js, /this\.triggerEvent\(action, \{ id: row\.id, name: row\.name, row \}\)/);
  assert.match(js, /this\.triggerEvent\("close"\)/);
});

test("unchecked check-in time renders one dash while checked time keeps two lines", () => {
  assert.match(wxml, /<block wx:if="\{\{row\.hasCheckedIn\}\}">[\s\S]*<text wx:else>—<\/text>/);
  assert.match(js, /checkinDateText: checked \? parts\.date : "—"/);
  assert.match(js, /checkinTimeText: checked \? parts\.time : "—"/);
});

test("touchend uses the latest gesture offset instead of stale setData rows", () => {
  assert.match(js, /gesture\.currentOffsetX = next/);
  assert.match(js, /Number\.isFinite\(gesture\.currentOffsetX\)/);
  assert.match(js, /const endOffsetX = Number\.isFinite\(gesture\.currentOffsetX\)/);
});

test("an open row closes after a short right swipe without changing the left-open threshold", () => {
  const openOffset = -definition.ACTION_WIDTH_RPX;
  assert.deepEqual(definition.getSwipeSettledState(openOffset, openOffset + 40), {
    offsetX: openOffset,
    actionOpen: true
  });
  assert.deepEqual(definition.getSwipeSettledState(openOffset, openOffset + 50), {
    offsetX: 0,
    actionOpen: false
  });
  assert.deepEqual(definition.getSwipeSettledState(0, -90), {
    offsetX: openOffset,
    actionOpen: true
  });
  assert.deepEqual(definition.getSwipeSettledState(0, -50), {
    offsetX: 0,
    actionOpen: false
  });
});

test("swipe action width and threshold stay in RPX and close other rows", () => {
  assert.equal(definition.ACTION_WIDTH_RPX, 323.08);
  assert.equal(definition.ACTION_AREA_WIDTH_RPX, 315.38);
  assert.equal(definition.SWIPE_OPEN_THRESHOLD_RATIO, 0.25);
  assert.equal(definition.SWIPE_CLOSE_THRESHOLD_RATIO, 0.15);
  assert.match(wxml, /translate3d\(\{\{row\.offsetX\}\}rpx/);
  assert.match(js, /const dxRpx = dx \* getRpxPerPx\(\)/);
  assert.match(js, /actionWidthRpx: ACTION_AREA_WIDTH_RPX/);
  assert.match(js, /bodyMaxHeightRpx: 1253\.85/);
  assert.match(js, /fixedChromeRpx = 130\.77/);
  assert.match(js, /clamp\(gesture\.startOffsetX \+ dxRpx, -ACTION_WIDTH_RPX, 0\)/);
  assert.match(js, /getSwipeSettledState\(gesture\.startOffsetX, endOffsetX\)/);
  assert.match(js, /this\.closeOpenRows\(index\)/);
  assert.match(wxss, /\.participant-actions\s*\{[^}]*right:\s*0;[^}]*bottom:\s*0;/s);
  assert.match(wxss, /\.participant-actions\s*\{[^}]*gap:\s*7\.69rpx;/s);
  assert.match(wxss, /\.row-action\s*\{[^}]*width:\s*153\.85rpx;[^}]*height:\s*123\.08rpx;[^}]*border-radius:\s*23\.08rpx;/s);
  assert.match(wxss, /\.participant-row-wrap\s*\{[^}]*overflow:\s*hidden;[^}]*border-radius:\s*23\.08rpx;/s);
  assert.match(wxss, /\.participant-row\s*\{[^}]*border-radius:\s*23\.08rpx;[^}]*transition:\s*transform\s+0\.18s\s+ease-out;[^}]*will-change:\s*transform;/s);
});

test("drawer keeps stable QA anchors and page integration events", () => {
  assert.match(wxml, /id="qaParticipantsDrawer"/);
  assert.match(wxml, /id="qaParticipantsProgress"/);
  assert.match(wxml, /id="qaParticipantsTable"/);
  assert.match(wxml, /id="qaParticipantsEmpty"/);
  const pageWxml = fs.readFileSync(path.join(__dirname, "../pages/activity_detail/activity_detail.wxml"), "utf8");
  const pageJson = JSON.parse(fs.readFileSync(path.join(__dirname, "../pages/activity_detail/activity_detail.json"), "utf8"));
  assert.match(pageWxml, /<participants-drawer/);
  assert.match(pageWxml, /id="qaParticipantsDrawer"/);
  assert.match(pageWxml, /bindclose="closeParticipantsDrawer"/);
  assert.match(pageWxml, /bindretrocheckin="adminRetroCheckin"/);
  assert.match(pageWxml, /bindcancelcheckin="adminCancelCheckin"/);
  assert.match(pageWxml, /bindremove="removeParticipant"/);
  assert.doesNotMatch(pageWxml, /activity-status=/);
  assert.doesNotMatch(js, /activityStatus/);
  assert.equal(pageJson.usingComponents["participants-drawer"], "../../components/participants-drawer/index");
});

test("admin action SVGs are valid stroked assets with non-empty paths", () => {
  for (const name of ["icon-clipboard-x", "icon-assignment-turned-in", "icon-trash"]) {
    const svg = readSvg(name);
    assert.match(svg, /<svg\b/);
    assert.match(svg, /viewBox="0 0 24 24"/);
    assert.match(svg, /fill="none"/);
    assert.match(svg, /stroke-width="1\.5"/);
    assert.match(svg, /<path\b[^>]*d="[^"]+"/);
  }
  assert.match(wxml, /src="\/images\/icon-clipboard-x\.svg"/);
  assert.match(wxml, /src="\/images\/icon-assignment-turned-in\.svg"/);
  assert.match(wxml, /src="\/images\/icon-trash\.svg"/);
});
