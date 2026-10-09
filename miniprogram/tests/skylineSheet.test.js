const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const sheets = [
  {
    wxml: "components/date-time-picker-sheet/index.wxml",
    js: "components/date-time-picker-sheet/index.js",
    containerId: "qaDateTimePickerContainer",
    surfaceId: "qaDateTimePickerSurface",
    duration: 220,
    closeHandler: "onClose"
  },
  {
    wxml: "components/participants-drawer/index.wxml",
    js: "components/participants-drawer/index.js",
    containerId: "qaParticipantsDrawer",
    surfaceId: "qaParticipantsSurface",
    duration: 240,
    closeHandler: "onMaskTap"
  }
];

test("activity drawers keep native page-container fallbacks without draggable-sheet or Worklet", () => {
  sheets.forEach(({ wxml: wxmlPath, js: jsPath, containerId, surfaceId, duration, closeHandler }) => {
    const wxml = read(wxmlPath);
    const surfacePath = containerId === "qaDateTimePickerContainer"
        ? "components/date-time-picker-sheet/surface.wxml"
            : "";
    const expandedWxml = surfacePath ? `${wxml}\n${read(surfacePath)}` : wxml;
    const js = read(jsPath);
    if (containerId === "qaDateTimePickerContainer") {
      assert.match(wxml, /<block wx:if="{{embedded && containerRendered}}">/);
      assert.match(wxml, /<page-container[\s\S]*wx:if="{{!embedded && containerRendered}}"/);
    } else {
      assert.match(wxml, /^<page-container\b/);
      assert.match(wxml, /wx:if="{{containerRendered}}"/);
    }
    assert.match(wxml, new RegExp(`id="${containerId}"`));
    assert.match(wxml, /show="{{containerVisible}}"/);
    assert.match(wxml, /position="bottom"/);
    assert.match(wxml, /overlay="{{true}}"/);
    assert.match(wxml, new RegExp(`duration="${duration}"`));
    assert.match(wxml, /close-on-slide-down="{{false}}"/);
    assert.match(wxml, new RegExp(`bind:clickoverlay="${closeHandler}"`));
    assert.match(expandedWxml, new RegExp(`id="${surfaceId}"`));
    assert.doesNotMatch(expandedWxml, /draggable-sheet|root-portal|worklet:onsizeupdate|associative-container/);
    assert.match(js, /containerVisible:\s*false/);
    assert.match(js, /containerRendered:\s*false/);
    assert.match(js, /onContainerAfterLeave/);
    assert.doesNotMatch(js, /wx\.worklet|applyAnimatedStyle|runOnJS|skylineSheet|scrollTo\(/);
  });
});

test("page-container owns overlay, geometry and entrance animation while scroll bodies fill the inner panel", () => {
  const pickerWxml = read("components/date-time-picker-sheet/index.wxml");
  const participantsWxml = read("components/participants-drawer/index.wxml");
  const pickerCss = read("components/date-time-picker-sheet/index.wxss");
  const participantsCss = read("components/participants-drawer/index.wxss");

  [pickerWxml, participantsWxml].forEach((wxml) => {
    assert.match(wxml, /overlay-style="background: rgba\(/);
    assert.match(wxml, /custom-style="[^"]*height:/);
    assert.match(wxml, /bind:afterleave="onContainerAfterLeave"/);
  });
  assert.match(pickerWxml, /custom-style="height: 761\.54rpx;[^\"]*bottom: {{bottomOffsetRpx}}rpx;[^\"]*border-radius: 46\.15rpx 46\.15rpx 0 0;/);
  assert.match(participantsWxml, /custom-style="height: {{drawerHeightRpx}}rpx;[^\"]*border-radius: 46\.15rpx 46\.15rpx 0 0;/);
  assert.match(participantsCss, /\.drawer-sheet\s*\{[^}]*height:\s*100%;/s);
  assert.match(participantsCss, /\.drawer-body\s*\{[^}]*flex:\s*1 1 0;[^}]*height:\s*0;[^}]*padding:\s*16rpx 32rpx 0;[^}]*display:\s*flex;/s);
  assert.match(participantsWxml, /<view class="drawer-table-head">[\s\S]*<scroll-view[\s\S]*id="qaParticipantListScroll"/);

  [pickerCss, participantsCss].forEach((wxss) => {
    assert.doesNotMatch(wxss, /@keyframes/);
  });
});



test("home opens the three-step create route and receives the created activity", () => {
  const listJs = read("pages/activity_list/activity_list.js");
  const appJson = JSON.parse(read("app.json"));
  assert.match(listJs, /showCreateModal\(\)\s*\{[\s\S]*?hasCreateActivityPermission[\s\S]*?wx\.navigateTo/);
  assert.match(listJs, /url: "\/pages\/activity_create\/activity_create"/);
  assert.ok(appJson.pages.includes("pages/activity_create/activity_create"));
  assert.match(listJs, /activityCreated: \(activity\) => this\.insertCreatedActivity\(activity\)/);
});
