const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const tabDir = path.join(__dirname, "../custom-tab-bar");
const imageDir = path.join(__dirname, "../images");

const iconNames = [
  "tab-home-lucide",
  "tab-calendar-days-lucide",
  "tab-ranking-lucide",
  "tab-user-round-lucide"
];

test("custom tab bar follows the four-item Pencil component", () => {
  const wxml = fs.readFileSync(path.join(tabDir, "index.wxml"), "utf8");
  const wxss = fs.readFileSync(path.join(tabDir, "index.wxss"), "utf8");
  const js = fs.readFileSync(path.join(tabDir, "index.js"), "utf8");
  const syncJs = fs.readFileSync(path.join(__dirname, "../utils/tabBarSync.js"), "utf8");
  const listWxml = fs.readFileSync(path.join(__dirname, "../pages/activity_list/activity_list.wxml"), "utf8");
  const calendarWxss = fs.readFileSync(path.join(__dirname, "../pages/activity_calendar/activity_calendar.wxss"), "utf8");

  assert.equal((wxml.match(/class="tab-item /g) || []).length, 4);
  assert.match(wxml, />首页<\/text>/);
  assert.match(wxml, />日程<\/text>/);
  assert.match(wxml, />排行<\/text>/);
  assert.match(wxml, />我的<\/text>/);
  assert.doesNotMatch(wxml, /工具|tab-indicator|tab-bottom-fade|data:image\/svg/);

  for (const iconName of iconNames) {
    assert.match(wxml, new RegExp(`/images/${iconName}\\.svg`));
    assert.match(wxml, new RegExp(`/images/${iconName}-active\\.svg`));
  }

  assert.match(wxss, /height:\s*calc\(112rpx \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(wxss, /border-top:\s*2rpx solid #e5e7eb/);
  assert.match(wxss, /box-shadow:\s*0 -6rpx 24rpx rgba\(0, 0, 0, 0\.07\)/);
  assert.match(wxss, /\.tab-items-wrap\s*{[\s\S]*?height:\s*112rpx;[\s\S]*?padding:\s*4rpx 32rpx;/);
  assert.match(wxss, /\.tab-item\s*{[\s\S]*?height:\s*104rpx;[\s\S]*?gap:\s*2rpx;/);
  assert.match(wxss, /\.tab-item--active\s*{[\s\S]*?gap:\s*4rpx;/);
  assert.match(wxss, /\.tab-icon\s*{[\s\S]*?width:\s*44rpx;[\s\S]*?height:\s*44rpx;/);
  assert.match(wxss, /\.tab-label\s*{[\s\S]*?color:\s*#4b5563;[\s\S]*?font-size:\s*24rpx;[\s\S]*?font-weight:\s*400;/);
  assert.match(wxss, /\.tab-label--active\s*{[\s\S]*?color:\s*#ff9800;[\s\S]*?font-weight:\s*600;/);
  assert.doesNotMatch(wxss, /border-radius:\s*999px|backdrop-filter|tab-indicator/);

  assert.equal((js.match(/"\/pages\//g) || []).length, 4);
  assert.doesNotMatch(js, /TAB_SWITCH_COMMIT_DELAY_MS|_pendingSwitchIndex/);
  assert.doesNotMatch(syncJs, /indicatorTransitionEnabled/);
  assert.match(listWxml, /height: calc\(107\.69rpx \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(calendarWxss, /\.today-fab\s*{[\s\S]*?right:\s*32rpx;[\s\S]*?bottom:\s*calc\(112rpx \+ env\(safe-area-inset-bottom\) \+ 76\.92rpx\);/);
  assert.doesNotMatch(calendarWxss, /90\.256vw/);
});

test("tab icons use the Pencil Lucide names and state styling", () => {
  for (const iconName of iconNames) {
    const inactive = fs.readFileSync(path.join(imageDir, `${iconName}.svg`), "utf8");
    const active = fs.readFileSync(path.join(imageDir, `${iconName}-active.svg`), "utf8");

    assert.match(inactive, /viewBox="0 0 24 24"/);
    assert.match(inactive, /stroke="#4B5563"/);
    assert.match(inactive, /stroke-width="1\.8"/);
    assert.match(active, /viewBox="0 0 24 24"/);
    assert.match(active, /stroke="#FF9800"/);
    assert.match(active, /stroke-width="2\.4"/);
  }
});
