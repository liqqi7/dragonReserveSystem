const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const pageDir = path.join(__dirname, "../pages/activity_list");
const js = fs.readFileSync(path.join(pageDir, "activity_list.js"), "utf8");
const wxml = fs.readFileSync(path.join(pageDir, "activity_list.wxml"), "utf8");
const groups = ["joined", "accepting", "notStarted", "ended"];

test("home carousels use one-card-per-swipe gesture paging", () => {
  assert.equal((wxml.match(/class="cards-carousel"/g) || []).length, 4);
  assert.equal((wxml.match(/bindtouchstart="onGroupTouchStart"/g) || []).length, 4);
  assert.equal((wxml.match(/bindtouchmove="onGroupTouchMove"/g) || []).length, 4);
  assert.equal((wxml.match(/bindtouchend="onGroupTouchEnd"/g) || []).length, 4);
  assert.equal((wxml.match(/scroll-x=|scroll-left=|bindscrollend=|binddragend=/g) || []).length, 0);
  assert.equal((wxml.match(/style="transform:translate3d\(-\{\{groupOffset\./g) || []).length, 4);
  assert.match(js, /applyGroupSnap\(group, source, fallbackLeft\)/);
  assert.match(js, /Math\.round\(currentLeft \/ step\)/);
  assert.match(js, /focusedCardIndex/);
  assert.match(js, /meta\.liveLeft = meta\.touchStartOffset/);
  assert.match(js, /meta\.liveLeft = targetOffset/);
});

test("gesture paging keeps vertical page scrolling available outside horizontal lock", () => {
  assert.match(wxml, /scroll-y="\{\{mainScrollEnabled\}\}"/);
  assert.match(js, /mainScrollEnabled: true/);
  assert.match(js, /mainScrollEnabled: false/);
  assert.match(js, /mainScrollEnabled: true/);
  assert.match(js, /GESTURE_TUNING/);
  assert.match(js, /SWIPE_MOVE_SMOOTHING/);
});

test("cards do not apply native press opacity during horizontal paging", () => {
  assert.equal((wxml.match(/hover-class="\{\{isGroupSwiping \? '' : 'card-press'\}\}"/g) || []).length, 0);
  assert.equal((wxml.match(/hover-stay-time=/g) || []).length, 0);
  assert.doesNotMatch(wxml, /pressedCardKey|onCardPressMove|onCardPressCancel|card-press/);
  assert.doesNotMatch(fs.readFileSync(path.join(pageDir, "activity_list.wxss"), "utf8"), /\.card-press/);
});

test("large-card glass panel reserves the remark row when remark is empty", () => {
  assert.match(wxml, /<text class="glass-remark">\{\{item\.remark \|\| ''\}\}<\/text>/);
  const wxss = fs.readFileSync(path.join(pageDir, "activity_list.wxss"), "utf8");
  assert.match(wxss, /\.glass-bottom \{[\s\S]*padding: 30\.77rpx;/);
  assert.doesNotMatch(wxss, /\.glass-bottom \{[\s\S]*height: 188\.46rpx;/);
  assert.match(wxss, /\.glass-remark \{[\s\S]*height: 27\.69rpx;/);
});

test("large-card glass uses a pre-rendered static image with the black gradient", () => {
  const wxss = fs.readFileSync(path.join(pageDir, "activity_list.wxss"), "utf8");
  const glassBottomRule = wxss.match(/\.glass-bottom\s*\{([^}]*)\}/);
  const glassSection = wxss.slice(wxss.indexOf("/* ── 大卡片毛玻璃底部 ── */"), wxss.indexOf("/* ── 自定义底部 Tab ── */"));

  assert.ok(glassBottomRule, "glass-bottom rule should exist");
  assert.match(js, /largeCardGlassImageUrl: buildCardGlassImageUrl\(key, styleKey\)/);
  assert.match(js, /activity\.largeCardGlassImageUrl = selectedStyle/);
  assert.match(wxml, /class="glass-bottom"[\s\S]*class="glass-static-blur-layer"/);
  assert.match(wxml, /wx:if="\{\{item\.largeCardGlassImageUrl\}\}"/);
  assert.match(wxml, /class="glass-static-blur-image"[\s\S]*src="\{\{item\.largeCardGlassImageUrl\}\}"/);
  assert.match(wxml, /class="glass-tint-layer"/);
  assert.match(wxml, /class="glass-content"/);
  assert.match(glassSection, /\.glass-static-blur-layer\s*\{[\s\S]*top: 0;[\s\S]*bottom: 0;[\s\S]*overflow: hidden;[\s\S]*border-bottom-left-radius: inherit;[\s\S]*-webkit-mask-image:/);
  assert.match(glassSection, /\.glass-static-blur-stage\s*\{[\s\S]*left: 0;[\s\S]*top: -537\.69rpx;[\s\S]*width: 530\.77rpx;[\s\S]*height: 715\.38rpx;/);
  assert.match(glassSection, /background: linear-gradient\(180deg, rgba\(0,0,0,0\.102\) 0%, rgba\(0,0,0,0\.302\) 100%\)/);
  assert.equal((glassSection.match(/(?:^|[;{}\s])(?:-webkit-)?(?:backdrop-)?filter\s*:/gm) || []).length, 0);
});
