const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const tabDir = path.join(__dirname, "../custom-tab-bar");
const imageDir = path.join(__dirname, "../images");

const iconNames = [
  "tab-home-material-rounded",
  "tab-calendar-month-material-rounded",
  "tab-leaderboard-material-rounded",
  "tab-person-material-rounded"
];

test("custom tab bar follows the updated floating glass Pencil component", () => {
  const wxml = fs.readFileSync(path.join(tabDir, "index.wxml"), "utf8");
  const wxss = fs.readFileSync(path.join(tabDir, "index.wxss"), "utf8");
  const strokeSvg = fs.readFileSync(path.join(imageDir, "tab-glass-stroke.svg"), "utf8");
  const js = fs.readFileSync(path.join(tabDir, "index.js"), "utf8");
  const syncJs = fs.readFileSync(path.join(__dirname, "../utils/tabBarSync.js"), "utf8");
  const listWxml = fs.readFileSync(path.join(__dirname, "../pages/activity_list/activity_list.wxml"), "utf8");
  const calendarWxml = fs.readFileSync(path.join(__dirname, "../pages/activity_calendar/activity_calendar.wxml"), "utf8");
  const calendarWxss = fs.readFileSync(path.join(__dirname, "../pages/activity_calendar/activity_calendar.wxss"), "utf8");
  const historyWxml = fs.readFileSync(path.join(__dirname, "../pages/history/history.wxml"), "utf8");
  const historyWxss = fs.readFileSync(path.join(__dirname, "../pages/history/history.wxss"), "utf8");
  const profileWxml = fs.readFileSync(path.join(__dirname, "../pages/profile/profile.wxml"), "utf8");
  const profileWxss = fs.readFileSync(path.join(__dirname, "../pages/profile/profile.wxss"), "utf8");

  assert.equal((wxml.match(/class="tab-item /g) || []).length, 4);
  assert.match(wxml, /id="qa-custom-tab-bar"/);
  assert.match(wxml, /id="qa-tab-glass"/);
  assert.match(wxml, /id="qa-tab-glass-blur"[^>]*opacity: \{\{tabGlassBlurOpacity\}\}[^>]*blur\(\{\{tabGlassBlurRadiusRpx\}\}rpx\)/);
  assert.match(wxml, /id="qa-tab-glass-fill"[^>]*rgba\(255, 255, 255, \{\{tabGlassFillOpacity\}\}\)/);
  assert.match(wxml, /id="qa-tab-glass-stroke"/);
  assert.match(wxml, /class="tab-glass-stroke"/);
  assert.match(wxml, /src="\/images\/tab-glass-stroke\.svg"/);
  for (const qaId of ["home", "calendar", "ranking", "profile"]) {
    assert.match(wxml, new RegExp(`id="qa-tab-${qaId}"`));
  }
  assert.match(wxml, />首页<\/text>/);
  assert.match(wxml, />日程<\/text>/);
  assert.match(wxml, />排行<\/text>/);
  assert.match(wxml, />我的<\/text>/);
  assert.doesNotMatch(wxml, /工具|tab-indicator|tab-bottom-fade|data:image\/svg|lucide/);

  for (const iconName of iconNames) {
    assert.match(wxml, new RegExp(`/images/${iconName}\\.svg`));
    assert.match(wxml, new RegExp(`/images/${iconName}-active\\.svg`));
  }

  assert.match(wxml, /style="height: calc\(100rpx \+ \{\{safeBottomRpx\}\}rpx\); padding-bottom: \{\{safeBottomRpx\}\}rpx;"/);
  assert.doesNotMatch(wxss, /107\.69231rpx|safe-area-inset-bottom/);
  assert.doesNotMatch(wxml, /107\.69231rpx|safe-area-inset-bottom/);
  assert.match(wxss, /background:\s*transparent/);
  assert.doesNotMatch(wxss, /border-top:/);
  assert.match(wxss, /\.tab-items-wrap\s*{[\s\S]*?width:\s*calc\(100% - 76\.92308rpx\);[\s\S]*?height:\s*100rpx;[\s\S]*?margin:\s*0 38\.46154rpx;[\s\S]*?padding:\s*7\.69231rpx;[\s\S]*?border-radius:\s*50rpx;[\s\S]*?background:\s*transparent;/);
  assert.match(wxss, /box-shadow:\s*0 5\.76923rpx 23\.07692rpx rgba\(100, 116, 139, 0\.101961\)/);
  assert.match(wxss, /\.tab-glass-blur\s*\{[\s\S]*?z-index:\s*0;[\s\S]*?background:\s*transparent;/);
  assert.match(wxss, /\.tab-glass-fill\s*\{[\s\S]*?z-index:\s*1;/);
  assert.doesNotMatch(wxss, /backdrop-filter:|opacity:\s*1;|rgba\(255, 255, 255, 0\)/);
  assert.match(js, /const TAB_GLASS_TUNING = Object\.freeze\(\{[\s\S]*?blurRadiusRpx:\s*12,[\s\S]*?blurLayerOpacity:\s*1,[\s\S]*?whiteFillOpacity:\s*0\.4/);
  assert.match(js, /setGlassTuning\(\{ blurRadiusRpx, blurLayerOpacity, whiteFillOpacity \} = \{\}\)/);
  assert.doesNotMatch(wxss, /border:\s*1\.92308rpx solid transparent|background:[^;]*(?:padding-box|border-box|linear-gradient\()/);
  assert.doesNotMatch(wxss, /\.tab-items-wrap::before/);
  assert.match(wxss, /\.tab-glass-stroke\s*{[\s\S]*?position:\s*absolute;[\s\S]*?z-index:\s*3;[\s\S]*?width:\s*100%;[\s\S]*?height:\s*100%;[\s\S]*?pointer-events:\s*none;/);

  assert.match(strokeSvg, /width="350" height="52" viewBox="0 0 350 52" preserveAspectRatio="none"/);
  assert.match(strokeSvg, /<linearGradient id="tabGlassStroke" x1="0" y1="1" x2="1" y2="0">/);
  assert.match(strokeSvg, /<stop offset="0" stop-color="#FFFFFF" stop-opacity="0"\/>/);
  assert.match(strokeSvg, /<stop offset="0\.319628" stop-color="#FFF7ED" stop-opacity="0\.219608"\/>/);
  assert.match(strokeSvg, /<stop offset="0\.691822" stop-color="#FFFFFF" stop-opacity="0\.439216"\/>/);
  assert.match(strokeSvg, /<stop offset="1" stop-color="#FFFFFF" stop-opacity="0\.658824"\/>/);
  assert.match(strokeSvg, /<rect x="0\.5" y="0\.5" width="349" height="51" rx="25\.5" ry="25\.5" fill="none" stroke="url\(#tabGlassStroke\)" stroke-width="1"\/>/);

  assert.match(wxss, /\.tab-item\s*{[\s\S]*?height:\s*84\.61538rpx;[\s\S]*?gap:\s*1\.92308rpx;[\s\S]*?border-radius:\s*calc\(50rpx - 7\.69231rpx\);/);
  assert.match(wxss, /\.tab-item--active\s*{[\s\S]*?background:\s*rgba\(255, 255, 255, 0\.901961\);[\s\S]*?box-shadow:\s*0 1\.92308rpx 7\.69231rpx rgba\(100, 116, 139, 0\.05\)/);
  assert.match(wxss, /\.tab-icon\s*{[\s\S]*?width:\s*34\.61538rpx;[\s\S]*?height:\s*34\.61538rpx;/);
  assert.match(wxss, /\.tab-label\s*{[\s\S]*?color:\s*#111827;[\s\S]*?font-size:\s*21\.15385rpx;[\s\S]*?font-weight:\s*300;/);
  assert.match(wxss, /\.tab-label--active\s*{[\s\S]*?color:\s*#f59e0b;/);
  assert.doesNotMatch(wxss, /border-radius:\s*999(?:r?px)|tab-indicator/);

  assert.equal((js.match(/"\/pages\//g) || []).length, 4);
  assert.doesNotMatch(js, /TAB_SWITCH_COMMIT_DELAY_MS|_pendingSwitchIndex/);
  assert.doesNotMatch(syncJs, /indicatorTransitionEnabled/);
  assert.match(listWxml, /height: calc\(100rpx \+ \{\{bottomSafeAreaRpx\}\}rpx\)/);
  assert.match(wxss, /:host\s*\{[\s\S]*?background:\s*transparent;/);
  assert.doesNotMatch(calendarWxss, /\.timeline-scroll\s*\{[\s\S]*?padding-bottom:/);
  assert.match(calendarWxml, /class="timeline-tab-spacer" style="height: calc\(100rpx \+ \{\{bottomSafeAreaRpx\}\}rpx\);"/);
  assert.match(calendarWxml, /class="today-fab"[^>]*bottom: calc\(100rpx \+ \{\{bottomSafeAreaRpx\}\}rpx \+ 76\.92308rpx\)/);
  assert.doesNotMatch(calendarWxss, /107\.69231rpx|safe-area-inset-bottom/);
  assert.doesNotMatch(historyWxml, /bottom: calc\(107\.69231rpx/);
  assert.match(historyWxss, /\.ranking-scroll\s*\{[^}]*bottom:\s*0;/);
  assert.match(historyWxml, /class="ranking-content"[^>]*padding-bottom: calc\(123\.07692rpx \+ \{\{bottomSafeAreaRpx\}\}rpx\)/);
  assert.doesNotMatch(historyWxss, /safe-area-inset-bottom|123\.07692rpx/);
  assert.match(profileWxml, /class="container" style="padding-bottom: calc\(131\.69231rpx \+ \{\{bottomSafeAreaRpx\}\}rpx\);"/);
  assert.doesNotMatch(profileWxss, /safe-area-inset-bottom|131\.69231rpx/);
});

test("tab icons use the Pencil Material Symbols Rounded assets", () => {
  for (const iconName of iconNames) {
    const inactive = fs.readFileSync(path.join(imageDir, `${iconName}.svg`), "utf8");
    const active = fs.readFileSync(path.join(imageDir, `${iconName}-active.svg`), "utf8");

    assert.match(inactive, /width="18" height="18"/);
    assert.match(inactive, /data-library="Material Symbols Rounded"/);
    assert.match(inactive, /data-weight="300"/);
    assert.match(inactive, /viewBox="0 -960 960 960"/);
    assert.match(inactive, /fill="#111827"/);
    assert.doesNotMatch(inactive, /stroke=/);
    assert.match(active, /width="18" height="18"/);
    assert.match(active, /data-library="Material Symbols Rounded"/);
    assert.match(active, /data-weight="300"/);
    assert.match(active, /viewBox="0 -960 960 960"/);
    assert.match(active, /fill="#F59E0B"/);
    assert.doesNotMatch(active, /stroke=/);
  }
});
test("four tab routes and selected states stay aligned", () => {
  const appJson = JSON.parse(fs.readFileSync(path.join(__dirname, "../app.json"), "utf8"));
  const expected = [
    ["pages/activity_list/activity_list", "activity_list/activity_list.js", 0],
    ["pages/activity_calendar/activity_calendar", "activity_calendar/activity_calendar.js", 1],
    ["pages/history/history", "history/history.js", 2],
    ["pages/profile/profile", "profile/profile.js", 3]
  ];

  assert.equal(appJson.tabBar.custom, true);
  assert.deepEqual(
    appJson.tabBar.list.map((item) => item.pagePath),
    expected.map(([route]) => route)
  );

  for (const [, relativeFile, selected] of expected) {
    const pageJs = fs.readFileSync(path.join(__dirname, "../pages", relativeFile), "utf8");
    assert.match(pageJs, new RegExp(`patchTabBarIfNeeded\\(this, \\{[\\s\\S]*?selected: ${selected}`));
  }
});

test("tab selection follows the visible route without mutating the page being left", () => {
  const componentPath = path.join(tabDir, "index.js");
  const previousGlobals = {
    Component: global.Component,
    getApp: global.getApp,
    getCurrentPages: global.getCurrentPages,
    wx: global.wx
  };
  let definition;
  let currentRoute = "pages/profile/profile";
  let switchedUrl = "";
  const app = { globalData: { tabBarSelected: 1, userRole: "user" } };

  try {
    global.Component = (value) => { definition = value; };
    global.getApp = () => app;
    global.getCurrentPages = () => [{ route: currentRoute }];
    global.wx = {
      switchTab({ url }) {
        switchedUrl = url;
      }
    };
    delete require.cache[require.resolve(componentPath)];
    require(componentPath);

    const patches = [];
    const ctx = {
      data: { selected: 1, hidden: false, isAdmin: false },
      syncBottomSafeArea() {},
      setData(patch) {
        patches.push(patch);
        Object.assign(this.data, patch);
      }
    };

    definition.pageLifetimes.show.call(ctx);
    assert.equal(ctx.data.selected, 3);
    assert.equal(app.globalData.tabBarSelected, 3);

    patches.length = 0;
    definition.methods.onTabTap.call(ctx, {
      currentTarget: { dataset: { index: "0" } }
    });
    assert.equal(switchedUrl, "/pages/activity_list/activity_list");
    assert.equal(app.globalData.tabBarSelected, 0);
    assert.deepEqual(patches, []);

    currentRoute = "pages/activity_list/activity_list";
    definition.pageLifetimes.show.call(ctx);
    assert.equal(ctx.data.selected, 0);
  } finally {
    delete require.cache[require.resolve(componentPath)];
    for (const [key, value] of Object.entries(previousGlobals)) {
      if (value === undefined) delete global[key];
      else global[key] = value;
    }
  }
});
