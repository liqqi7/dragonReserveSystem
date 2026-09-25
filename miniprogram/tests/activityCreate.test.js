const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

let definition;
const previous = { Page: global.Page, getApp: global.getApp, wx: global.wx };
global.Page = value => { definition = value; };
global.getApp = () => ({ globalData: {} });
global.wx = { getStorageSync: () => "" };
require("../pages/activity_create/activity_create.js");
global.Page = previous.Page;
global.getApp = previous.getApp;
global.wx = previous.wx;

function context(data) {
  return { ...definition, data: { ...definition.data, ...data }, setData(patch) { Object.assign(this.data, patch); } };
}

test("cover category uses 游戏 to match the cover catalog", () => {
  assert.deepEqual(definition.data.categories, ["派对", "运动", "外出", "游戏", "电影", "生日", "吃饭", "杂项"]);
  assert.doesNotMatch(fs.readFileSync(path.join(__dirname, "../pages/activity_create/activity_create.js"), "utf8"), /const CATEGORIES = .*桌游/);
});

test("cover swiper advances exactly four covers per slide", () => {
  const c = context({ covers: Array.from({ length: 12 }, (_, index) => ({ id: index + 1, categories: ["派对"] })), category: "派对" });
  c.filterCovers();
  assert.equal(c.data.galleryPages.length, 3);
  assert.equal(c.data.galleryPages[0].id, "1-3");
  assert.deepEqual(c.data.galleryPages[0].columns.flatMap(column => column.items.map(item => item.id)), [1, 2, 3, 4]);
  assert.deepEqual(c.data.galleryPages[1].columns.flatMap(column => column.items.map(item => item.id)), [5, 6, 7, 8]);
});

test("cover swiper change keeps its visible page state in sync", () => {
  const c = context({ galleryCurrent: 0, galleryPages: [{}, {}, {}] });
  c.onGalleryChange({ detail: { current: 2 } });
  assert.equal(c.data.galleryCurrent, 2);
});

test("category tabs use the scroll-view scrollbar API without masking or clipping", () => {
  const pageDir = path.join(__dirname, "../pages/activity_create");
  const wxml = fs.readFileSync(path.join(pageDir, "activity_create.wxml"), "utf8");
  const wxss = fs.readFileSync(path.join(pageDir, "activity_create.wxss"), "utf8");
  assert.match(wxml, /<scroll-view id="categoryScroller" type="list" scroll-x="\{\{true\}\}" enable-flex="\{\{true\}\}" enhanced="\{\{true\}\}" show-scrollbar="\{\{false\}\}" fast-deceleration="\{\{true\}\}" bounces="\{\{false\}\}" min-drag-distance="8" class="categories">/);
  assert.match(wxml, /<view list-item class="category-edge-spacer"><\/view><view wx:for="\{\{categories\}\}"[^>]*list-item[^>]*class="category-slot">/);
  assert.doesNotMatch(wxml, /categories-(?:viewport|scrollbar-mask)/);
  assert.match(wxml, /<view class="category \{\{category === item \? 'category--active' : ''\}\}" data-category="\{\{item\}\}" bindtap="categoryTap">/);
  assert.doesNotMatch(wxml, /class="category-row"/);
  assert.doesNotMatch(wxss, /categories-(?:viewport|scrollbar-mask)|::-webkit-scrollbar|scrollbar-width/);
  assert.match(wxss, /\.categories \{[^}]*height:61\.54rpx;[^}]*margin-top:61\.54rpx;[^}]*display:flex;[^}]*flex-direction:row;[^}]*white-space:nowrap;/);
  assert.match(wxss, /\.category-edge-spacer \{[^}]*flex:0 0 38\.46rpx;[^}]*width:38\.46rpx;/);
  assert.match(wxss, /\.category-slot \{[^}]*flex:0 0 113\.46rpx;[^}]*width:113\.46rpx;/);
  assert.match(wxss, /\.category \{[^}]*width:98\.08rpx;[^}]*height:61\.54rpx;/);
  assert.match(wxss, /\.gallery \{[^}]*margin-top:30\.77rpx;/);
});
test("category scrollbar is disabled through the Skyline ScrollViewContext", () => {
  const js = fs.readFileSync(path.join(__dirname, "../pages/activity_create/activity_create.js"), "utf8");
  assert.match(js, /onReady\(\) \{\s*this\.configureCategoryScroller\(\);\s*\}/);
  assert.match(js, /this\.createSelectorQuery\(\)\.select\("#categoryScroller"\)\.node\(\)\.exec\(/);
  assert.match(js, /scroller\.showScrollbar = false;/);
  assert.match(js, /scroller\.bounces = false;/);
  assert.match(js, /scroller\.fastDeceleration = true;/);
  assert.match(js, /if \(targetStep === 1\) \{\s*this\.configureCategoryScroller\(\);/);
});
test("activity creation scrolls overflow above its fixed transparent footer", () => {
  const pageDir = path.join(__dirname, "../pages/activity_create");
  const wxml = fs.readFileSync(path.join(pageDir, "activity_create.wxml"), "utf8");
  const wxss = fs.readFileSync(path.join(pageDir, "activity_create.wxss"), "utf8");
  const json = JSON.parse(fs.readFileSync(path.join(pageDir, "activity_create.json"), "utf8"));
  assert.match(wxml, /<view class="body body--step-\{\{step\}\} body--subitems-\{\{form\.subItemsEnabled \? 'open' : 'closed'\}\} \{\{subItemsClosing \? 'body--subitems-closing' : ''\}\}"/);
  assert.doesNotMatch(wxml, /class="body body--step-\{\{step\}\}"[^>]*scroll-y/);
  assert.match(wxml, /class="step-scroll" type="list" scroll-y="\{\{true\}\}"[^>]*scroll-into-view="create-step-\{\{step\}\}"/);
  assert.match(wxml, /id="create-step-\{\{step\}\}" style="padding-bottom:\{\{footerSafeAreaRpx \+ \(step > 1 \? 207\.69 : 130\.77\)\}\}rpx;"/);
  assert.match(wxss, /\.step-scroll \{[^}]*flex:1;[^}]*height:0;[^}]*min-height:0;/);
  assert.equal(json.disableScroll, true);
  assert.match(wxss, /\.body \{[^}]*flex:1;[^}]*min-height:0;[^}]*overflow:visible;/);
  assert.match(wxss, /\.step-stage \{[^}]*overflow:visible;/);
  assert.match(wxss, /\.step-scene \{[^}]*overflow:visible;/);
  assert.match(wxss, /\.footer \{[^}]*position:absolute;[^}]*left:0;[^}]*right:0;[^}]*bottom:0;[^}]*background:transparent;[^}]*z-index:2;/);
  assert.doesNotMatch(wxss, /\.footer \{[^}]*background:#FFFFFF;/);
});
test("cover page keeps the prototype spacing and full-width action", () => {
  const pageDir = path.join(__dirname, "../pages/activity_create");
  const wxml = fs.readFileSync(path.join(pageDir, "activity_create.wxml"), "utf8");
  const wxss = fs.readFileSync(path.join(pageDir, "activity_create.wxss"), "utf8");
  assert.match(wxss, /\.body--step-1 \.heading \{ padding-top:38\.46rpx; \}/);
  assert.doesNotMatch(wxml, /<button[^>]*class="primary/);
  assert.match(wxml, /<view class="primary [^>]*aria-role="button"[^>]*aria-disabled=/);
  assert.match(wxss, /\.primary \{[^}]*width:100%;[^}]*display:flex;[^}]*justify-content:center;/);
  assert.match(wxml, /previous-margin="38\.46rpx" next-margin="30\.77rpx"/);
  assert.match(wxss, /\.gallery-page \{ width:657\.69rpx;/);
  assert.match(wxml, /<view class="wizard" style="padding-top:\{\{statusBarHeight\}\}px;">/);
  assert.doesNotMatch(wxml, /class="wizard"[^>]*padding-bottom/);
  assert.match(wxml, /<view class="footer" style="padding-bottom:\{\{footerSafeAreaRpx\}\}rpx;">/);
  assert.doesNotMatch(wxml, /footer" style="bottom:/);
  assert.match(wxss, /\.footer \{[^}]*position:absolute;[^}]*left:0;[^}]*right:0;[^}]*bottom:0;[^}]*padding:23\.08rpx 46\.15rpx 0;[^}]*background:transparent;[^}]*z-index:2;/);
  assert.match(wxml, /<view class="gallery-indicator" aria-hidden="true"><view wx:for="\{\{galleryPages\}\}" wx:key="id" wx:for-item="indicatorPage" wx:for-index="indicatorIndex" class="\{\{galleryCurrent === indicatorIndex \? 'gallery-indicator-active' : 'gallery-indicator-dot'\}\}"><\/view><\/view>/);
  assert.match(wxml, /bindchange="onGalleryChange"/);
});
test("selected cover keeps the image size and uses an unclipped prototype outline", () => {
  const pageDir = path.join(__dirname, "../pages/activity_create");
  const wxml = fs.readFileSync(path.join(pageDir, "activity_create.wxml"), "utf8");
  const wxss = fs.readFileSync(path.join(pageDir, "activity_create.wxss"), "utf8");
  assert.match(wxml, /<view class="cover-media"><image wx:if="\{\{coverImagePaths\[item\.id\]\}\}" class="cover-image"/);
  assert.match(wxml, /class="cover-outline \{\{form\.activityCoverId === item\.id \? 'cover-outline--selected' : ''\}\}"/);
  assert.match(wxss, /\.cover \{[^}]*width:317\.31rpx;[^}]*height:423\.08rpx;[^}]*overflow:visible;/);
  assert.match(wxss, /\.cover-media \{[^}]*width:100%;[^}]*height:100%;[^}]*overflow:hidden;/);
  assert.match(wxss, /\.cover-image \{[^}]*width:100%;[^}]*height:100%;/);
  assert.match(wxss, /\.cover-outline \{[^}]*position:absolute;[^}]*z-index:2;[^}]*width:100%;[^}]*height:100%;[^}]*border:1\.92rpx solid/);
  assert.match(wxss, /\.cover-outline--selected \{ border:3\.85rpx solid #FF9800; \}/);
  assert.doesNotMatch(wxss, /\.cover--selected \{[^}]*border:/);
});
test("activity cover uses the homepage-quality source with the same shimmer and crossfade", () => {
  const pageDir = path.join(__dirname, "../pages/activity_create");
  const wxml = fs.readFileSync(path.join(pageDir, "activity_create.wxml"), "utf8");
  const js = fs.readFileSync(path.join(pageDir, "activity_create.js"), "utf8");
  const wxss = fs.readFileSync(path.join(pageDir, "activity_create.wxss"), "utf8");
  assert.match(wxml, /<image wx:if="\{\{coverImagePaths\[item\.id\]\}\}" class="cover-image" src="\{\{coverImagePaths\[item\.id\]\}\}" mode="aspectFill" fade-in="\{\{true\}\}" bindload="onCoverImageLoad" binderror="onCoverImageError" data-id="\{\{item\.id\}\}" \/>/);
  assert.doesNotMatch(wxml, /<image class="cover-image" src="\{\{item\.thumbnailUrl\}\}"/);
  assert.match(wxml, /class="cover-skeleton \{\{coverImageStates\[item\.id\] === 'loaded' \? 'cover-skeleton--revealed' : ''\}\}"/);
  assert.match(wxml, /wx:if="\{\{coverImageStates\[item\.id\] === 'loading'\}\}" class="cover-skeleton-shimmer/);
  assert.doesNotMatch(wxml, /正在加载封面/);
  assert.equal((wxml.match(/is="activity-cover-loading-gallery"/g) || []).length, 2);
  const loadingTemplate = wxml.match(/<template name="activity-cover-loading-gallery">([\s\S]*?)<\/template>/);
  assert.ok(loadingTemplate);
  assert.equal((loadingTemplate[1].match(/<view class="cover"/g) || []).length, 4);
  assert.match(loadingTemplate[1], /class="cover-skeleton-shimmer \{\{shimmerRunning \? 'cover-skeleton-shimmer--running' : ''\}\}"/);
  assert.match(wxml, /此分类暂无封面，请选择其他分类/);
  assert.match(js, /this\.setData\(\{ loadingCovers: true, coverError: "" \}, \(\) => this\.startCoverSkeletonShimmer\(\)\);/);
  assert.match(js, /const hasPendingCover = this\.data\.loadingCovers \|\|/);
  assert.match(js, /id: item.id, thumbnailUrl: item.thumbnail_url, imageUrl: item.image_url,/);
  assert.match(js, /coverImageStates: {}, coverImagePaths: {}, coverSkeletonShimmerRunning: false/);
  assert.match(js, /onCoverImageLoad\(e\) \{/);
  assert.match(js, /this\.updateCoverImageState\(e\.currentTarget\.dataset\.id, "loaded"\);/);
  assert.match(js, /onCoverImageError\(e\) \{/);
  assert.match(js, /this\._coverImageLoader\.invalidateReady\(cover\.imageUrl\)/);
  assert.ok(wxss.includes(".cover-skeleton { position:absolute;") && wxss.includes("transition:opacity 440ms ease-out;"));
  assert.ok(wxss.includes(".cover-skeleton--revealed { opacity:0; }"));
  assert.ok(wxss.includes(".cover-skeleton-shimmer { position:absolute;") && wxss.includes("width:45%;") && wxss.includes("transform:translateX(-100%);"));
  assert.ok(wxss.includes(".cover-skeleton-shimmer--running { transform:translateX(325%); transition:transform 1400ms linear; }"));
});
test("cover image callbacks keep each cover's load state independent", () => {
  const c = context({ coverImageStates: { first: "loading", second: "loading" } });
  c.onCoverImageLoad({ currentTarget: { dataset: { id: "first" } } });
  assert.deepEqual(c.data.coverImageStates, { first: "loaded", second: "loading" });
  c.onCoverImageError({ currentTarget: { dataset: { id: "second" } } });
  assert.deepEqual(c.data.coverImageStates, { first: "loaded", second: "error" });
});
test("selection badge and back icon match the prototype geometry", () => {
  const pageDir = path.join(__dirname, "../pages/activity_create");
  const wxml = fs.readFileSync(path.join(pageDir, "activity_create.wxml"), "utf8");
  const wxss = fs.readFileSync(path.join(pageDir, "activity_create.wxss"), "utf8");
  const checkSvg = fs.readFileSync(path.join(__dirname, "../images/activity-create-check.svg"), "utf8");
  const backSvg = fs.readFileSync(path.join(__dirname, "../images/activity-create-chevron-left.svg"), "utf8");
  assert.match(wxml, /<image class="selected-icon" src="\/images\/activity-create-check\.svg" mode="aspectFit" \/>/);
  assert.doesNotMatch(wxml, /<text>✓<\/text>/);
  assert.match(wxss, /\.selected \{[^}]*left:15\.38rpx;[^}]*top:15\.38rpx;[^}]*z-index:3;[^}]*width:46\.15rpx;[^}]*height:46\.15rpx;/);
  assert.match(wxss, /\.selected-icon \{ width:26\.92rpx; height:26\.92rpx; \}/);
  assert.match(checkSvg, /data-prototype-id="lO3gg"/);
  assert.match(checkSvg, /viewBox="0 0 13\.99993896484375 14"/);
  assert.match(checkSvg, /M11\.48096 2\.95313/);
  assert.match(wxml, /<image class="back-icon" src="\/images\/activity-create-chevron-left\.svg" mode="aspectFit" \/>/);
  assert.match(wxss, /\.nav \{[^}]*padding:0 44\.23rpx;/);
  assert.match(wxss, /\.back \{[^}]*width:69\.23rpx;[^}]*height:88rpx;/);
  assert.match(wxss, /\.back-icon \{ width:34\.62rpx; height:34\.62rpx; \}/);
  assert.match(backSvg, /data-prototype-id="QJrbo"/);
  assert.match(backSvg, /viewBox="0 0 13\.99993896484375 14"/);
  assert.match(backSvg, /M8\.59619 2\.93945/);
});
test("disabled cover action cannot advance without a selected cover", () => {
  const c = context({ step: 1, submitting: false, form: { activityCoverId: null } });
  c.next();
  assert.equal(c.data.step, 1);
});

test("edit mode reuses the create wizard and submits a prefilled activity update", () => {
  const pageDir = path.join(__dirname, "../pages/activity_create");
  const js = fs.readFileSync(path.join(pageDir, "activity_create.js"), "utf8");
  const wxml = fs.readFileSync(path.join(pageDir, "activity_create.wxml"), "utf8");
  assert.match(js, /options\.mode === "edit"/);
  assert.match(js, /activityService\.getActivity\(activityId\)/);
  assert.match(js, /const form = buildEditForm\(activity\)/);
  assert.match(js, /validateActivityForm\(form, \{ mode, participantCount: this\.data\.participantCount \}\)/);
  assert.match(js, /activityService\.updateActivity\(this\.data\.editingActivityId, buildActivityPayload\(form, \{ mode \}\)\)/);
  assert.match(js, /channel\.emit\(result\.mode === "edit" \? "activityUpdated" : "activityCreated"/);
  assert.match(wxml, /isEdit \? '保存修改' : '立即发布'/);
  assert.match(wxml, /isEdit \? '返回活动详情' : '返回首页'/);
});

test("top-left back always returns to the home tab instead of an earlier wizard step", () => {
  const originalWx = global.wx;
  const switchTabCalls = [];
  global.wx = { switchTab(options) { switchTabCalls.push(options); } };
  try {
    [1, 2, 3].forEach((step) => context({ step, submitting: false }).backHome());
    assert.deepEqual(switchTabCalls, [
      { url: "/pages/activity_list/activity_list" },
      { url: "/pages/activity_list/activity_list" },
      { url: "/pages/activity_list/activity_list" }
    ]);
  } finally {
    global.wx = originalWx;
  }
});

test("wizard stages keep the outgoing view while the next view enters from the right", () => {
  const c = context({ step: 1, leavingStep: 0, stepTransitioning: false });
  let scheduled;
  c.setData = (patch, callback) => {
    Object.assign(c.data, patch);
    if (typeof callback === "function") callback();
  };
  const originalSetTimeout = global.setTimeout;
  global.setTimeout = (callback, delay) => {
    scheduled = { callback, delay };
    return 1;
  };
  try {
    c.onStepScroll({ detail: { scrollTop: 180 } });
    c.goToStep(2);
    assert.equal(c.data.step, 2);
    assert.equal(c.data.leavingStep, 1);
    assert.equal(c.data.leavingScrollTop, 180);
    assert.equal(c._stepScrollTop, 0);
    assert.equal(c.data.stepTransitioning, true);
    assert.equal(scheduled.delay, 320);
    scheduled.callback();
    assert.equal(c.data.leavingStep, 0);
    assert.equal(c.data.stepTransitioning, false);
  } finally {
    global.setTimeout = originalSetTimeout;
  }
});

test("wizard markup retains a non-interactive outgoing scene and directional fade transition", () => {
  const pageDir = path.join(__dirname, "../pages/activity_create");
  const wxml = fs.readFileSync(path.join(pageDir, "activity_create.wxml"), "utf8");
  const wxss = fs.readFileSync(path.join(pageDir, "activity_create.wxss"), "utf8");
  assert.match(wxml, /class="back" bindtap="backHome"[^>]*aria-label="\{\{isEdit \? '返回活动详情' : '返回首页'\}\}"/);
  assert.match(wxml, /class="previous" bindtap="previousStep"/);
  assert.match(wxml, /wx:if="\{\{leavingStep\}\}" class="step-scene step-scene--leaving step-scene--leaving--\{\{stepTransitionDirection\}\}"/);
  assert.match(wxss, /\.step-scene--entering\.step-scene--entering--forward \{[^}]*animation-name:create-step-enter-forward;[^}]*animation-duration:320ms;/);
  assert.match(wxss, /\.step-scene--leaving \{[^}]*pointer-events:none;/);
  assert.match(wxss, /\.step-scene--leaving--forward \{[^}]*animation-name:create-step-leave-forward;[^}]*animation-duration:320ms;/);
  assert.match(wxss, /@keyframes create-step-enter-forward \{ from \{ transform:translateX\(100%\); opacity:0; \} to \{ transform:translateX\(0\); opacity:1; \} \}/);
  assert.match(wxss, /@keyframes create-step-leave-forward \{ from \{ transform:translateX\(0\); opacity:1; \} to \{ transform:translateX\(-100%\); opacity:0; \} \}/);
});
test("footer matches the prototype action stack and keeps only the runtime safe area below it", () => {
  const pageDir = path.join(__dirname, "../pages/activity_create");
  const js = fs.readFileSync(path.join(pageDir, "activity_create.js"), "utf8");
  const wxml = fs.readFileSync(path.join(pageDir, "activity_create.wxml"), "utf8");
  const wxss = fs.readFileSync(path.join(pageDir, "activity_create.wxss"), "utf8");
  assert.match(js, /footerSafeAreaRpx: 7\.69/);
  assert.match(js, /footerSafeAreaRpx = Math\.round\(\(getBottomSafeAreaRpx\(\) \+ 7\.69\) \* 100\) \/ 100/);
  assert.match(wxml, /<view class="footer" style="padding-bottom:\{\{footerSafeAreaRpx\}\}rpx;">/);
  assert.doesNotMatch(wxml, /footerBottomPx/);
  assert.match(wxss, /\.footer \{[^}]*bottom:0;[^}]*padding:23\.08rpx 46\.15rpx 0;/);
  assert.match(wxss, /\.primary \{[^}]*height:107\.69rpx;/);
  assert.match(wxss, /\.previous \{[^}]*height:76\.92rpx;/);
});
test("remark placeholder remains before typing and hides during IME composition", () => {
  const c = context({ form: { remark: "" }, remarkComposing: false });
  const applyPatch = patch => {
    if (Object.prototype.hasOwnProperty.call(patch, "remarkComposing")) c.data.remarkComposing = patch.remarkComposing;
    if (Object.prototype.hasOwnProperty.call(patch, "form.remark")) c.data.form.remark = patch["form.remark"];
  };
  c.setData = applyPatch;

  assert.equal(c.data.remarkComposing, false);
  c.onRemarkCompositionStart();
  assert.equal(c.data.remarkComposing, true);
  c.onRemarkCompositionEnd();
  assert.equal(c.data.remarkComposing, false);

  c.onRemarkBlur({ detail: { value: "测试备注" } });
  assert.equal(c.data.remarkComposing, false);
  assert.equal(c.data.form.remark, "测试备注");

  c.onRemarkBlur({ detail: { value: "" } });
  assert.equal(c.data.remarkComposing, false);
  assert.equal(c.data.form.remark, "");
});
test("basic-information step follows the prototype copy, spacing, and placeholder color", () => {
  const pageDir = path.join(__dirname, "../pages/activity_create");
  const js = fs.readFileSync(path.join(pageDir, "activity_create.js"), "utf8");
  const wxml = fs.readFileSync(path.join(pageDir, "activity_create.wxml"), "utf8");
  const wxss = fs.readFileSync(path.join(pageDir, "activity_create.wxss"), "utf8");
  assert.match(js, /"取个正经名字吧，求求你了"/);
  assert.match(wxml, /placeholder="请输入活动名称" placeholder-style="color:#9CA3AF;font-size:26\.92rpx;font-weight:400;line-height:26\.92rpx;"/);
  assert.match(wxml, /<text wx:if="{{!form\.remark && !remarkComposing}}" class="remark-placeholder">填写活动指引、游玩要求或相关提醒…<\/text>/);
  assert.match(wxml, /<textarea class="remark-input"[^>]*bind:keyboardcompositionstart="onRemarkCompositionStart"[^>]*bind:keyboardcompositionupdate="onRemarkCompositionUpdate"[^>]*bind:keyboardcompositionend="onRemarkCompositionEnd"[^>]*bindblur="onRemarkBlur"[^>]*bindinput="input"/);
  assert.doesNotMatch(wxml, /bindfocus="onRemarkFocus"/);
  assert.match(wxml, /<textarea class="remark-input"[^>]*aria-label="填写活动指引、游玩要求或相关提醒"[^>]*disable-default-padding="{{true}}"[^>]*\/>/);
  assert.doesNotMatch(wxml, /<textarea[^>]*placeholder=/);
  assert.doesNotMatch(wxml, /placeholder-class/);
  assert.match(wxml, /<text class="location-arrow">›<\/text>/);
  assert.match(wxss, /\.body--step-2 \.heading \{ padding-top:246\.15rpx; \}/);
  assert.match(wxss, /\.body--step-2 \.fields \{ padding:69\.23rpx 53\.85rpx 38\.46rpx; \}/);
  assert.match(wxss, /\.subtitle \{ font-size:26\.92rpx; line-height:1\.4; color:#9CA3AF; font-weight:400; \}/);
  assert.match(wxss, /\.field \{[^}]*font-size:26\.92rpx; line-height:26\.92rpx;/);
  assert.match(wxss, /\.location-value \{ font-size:26\.92rpx; line-height:26\.92rpx; font-weight:400; \}/);
  assert.match(wxss, /\.location-value--placeholder, \.location-arrow \{ color:#9CA3AF; opacity:1; \}/);
  assert.doesNotMatch(wxss, /\.field-placeholder/);
  assert.match(wxss, /\.field \{[^}]*padding:0 38\.46rpx;/);
  assert.match(wxss, /\.remark \{[^}]*position:relative;[^}]*padding:30\.77rpx 38\.46rpx;/);
  assert.match(wxss, /\.remark-input \{[^}]*color:#111827;[^}]*font-size:26\.92rpx;[^}]*font-weight:400;[^}]*line-height:37\.69rpx;/);
  assert.match(wxss, /\.remark-placeholder \{[^}]*position:absolute;[^}]*left:38\.46rpx;[^}]*top:30\.77rpx;[^}]*color:#9CA3AF;[^}]*font-size:26\.92rpx;[^}]*font-weight:400;[^}]*line-height:37\.69rpx;[^}]*pointer-events:none;/);
});

test("details step closed state matches the prototype spacing, empty time, and capacity card", () => {
  const pageDir = path.join(__dirname, "../pages/activity_create");
  const js = fs.readFileSync(path.join(pageDir, "activity_create.js"), "utf8");
  const wxml = fs.readFileSync(path.join(pageDir, "activity_create.wxml"), "utf8");
  const wxss = fs.readFileSync(path.join(pageDir, "activity_create.wxss"), "utf8");

  assert.match(js, /const initialForm = isEdit\s*\? buildCreateForm\(\)\s*:\s*\{ \.\.\.buildCreateForm\(\), startDate: "", startTime: "", endDate: "", endTime: "", maxParticipants: 16 \};/);
  assert.match(wxml, /class="fields fields--subitems-\{\{form\.subItemsEnabled \? 'open' : 'closed'\}\} \{\{subItemsClosing \? 'fields--subitems-closing' : ''\}\}"/);
  assert.match(wxml, /class="body body--step-\{\{step\}\} body--subitems-\{\{form\.subItemsEnabled \? 'open' : 'closed'\}\} \{\{subItemsClosing \? 'body--subitems-closing' : ''\}\}"/);
  assert.match(js, /"工作日出去玩的话别让我知道"/);
  assert.match(wxml, /<text wx:else class="time-placeholder">开始时间<\/text>/);
  assert.match(wxml, /<text wx:else class="time-placeholder">结束时间<\/text>/);
  assert.match(wxml, /<view class="capacity-field"><text class="label">名额上限<\/text><view class="capacity-card">/);
  assert.match(wxml, /<image class="step-icon" src="\/images\/icon-minus\.svg" mode="aspectFit" \/>/);
  assert.match(wxml, /<image class="step-icon" src="\/images\/icon-plus\.svg" mode="aspectFit" \/>/);

  assert.match(wxss, /\.body--step-3\.body--subitems-closed \.heading \{ padding-top:246\.15rpx; \}/);
  assert.match(wxss, /\.body--step-3\.body--subitems-open \.heading \{ padding-top:61\.54rpx; \}/);
  assert.match(wxss, /\.body--step-3 \.fields--subitems-closed \{ padding:69\.23rpx 53\.85rpx 38\.46rpx; \}/);
  assert.match(wxss, /\.body--step-3 \.fields--subitems-open \{ padding:38\.46rpx 53\.85rpx 38\.46rpx; \}/);
  assert.match(wxss, /\.time-card \{[^}]*gap:23\.08rpx;/);
  assert.match(wxss, /\.time-placeholder \{ color:#9CA3AF; font-weight:400; \}/);
  assert.match(wxss, /\.capacity-field \{ margin-top:38\.46rpx; \}/);
  assert.match(wxss, /\.capacity-card \{[^}]*height:107\.69rpx;[^}]*padding:0 23\.08rpx;[^}]*border-radius:30\.77rpx;[^}]*background:#F3F4F6;/);
  assert.match(wxss, /\.step-button \{[^}]*width:69\.23rpx;[^}]*height:69\.23rpx;[^}]*border-radius:19\.23rpx;[^}]*background:#FFFFFF;/);
  assert.match(wxss, /\.step-icon \{ width:30\.77rpx; height:30\.77rpx; display:block; \}/);
  assert.match(wxss, /\.subitems-section \{ margin-top:38\.46rpx; \}/);
  assert.doesNotMatch(wxss, /\.body--step-3 \.fields\.fields--subitems-closing \{ transition:none; \}/);
  assert.match(js, /const SUBITEMS_LAYOUT_ANIMATION_MS = 360;/);
  assert.match(js, /subItemsClosing: closing/);
  assert.doesNotMatch(wxss, /\.capacity \{/);
});

test("expanded subitems move the page upward with an ease-in-out transition", () => {
  const pageDir = path.join(__dirname, "../pages/activity_create");
  const wxss = fs.readFileSync(path.join(pageDir, "activity_create.wxss"), "utf8");
  assert.match(wxss, /\.body--step-3 \.heading \{ transition:padding-top 360ms cubic-bezier\(0\.42,0,0\.58,1\); \}/);
  assert.match(wxss, /\.body--step-3 \.fields \{ transition:padding-top 360ms cubic-bezier\(0\.42,0,0\.58,1\); \}/);
  assert.match(wxss, /\.body--step-3\.body--subitems-closed \.heading \{ padding-top:246\.15rpx; \}/);
  assert.match(wxss, /\.body--step-3\.body--subitems-open \.heading \{ padding-top:61\.54rpx; \}/);
});



