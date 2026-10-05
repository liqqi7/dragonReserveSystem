const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const pageDir = path.join(__dirname, "../pages/activity_list");
const imageDir = path.join(__dirname, "../images");

test("administrator home tools follow the Pencil module and card content", () => {
  const wxml = fs.readFileSync(path.join(pageDir, "activity_list.wxml"), "utf8");
  const wxss = fs.readFileSync(path.join(pageDir, "activity_list.wxss"), "utf8");
  const acceptanceEnd = wxml.indexOf("<!-- ── 未开始 ── -->");
  const toolsStart = wxml.indexOf("<!-- ── 小工具（管理员首页原型） ── -->");
  assert.ok(toolsStart > wxml.indexOf("<!-- ── 接受报名 ── -->"));
  assert.ok(toolsStart < acceptanceEnd);
  const toolsMarkup = wxml.slice(toolsStart, acceptanceEnd);
  assert.match(toolsMarkup, /wx:if="\{\{isAdmin\}\}"/);
  assert.match(toolsMarkup, /<text class="group-title">小工具<\/text>/);
  assert.match(toolsMarkup, /<text class="home-tool-title">Chwazi<\/text>/);
  assert.match(toolsMarkup, /<text class="home-tool-title">桌游库<\/text>/);
  assert.match(toolsMarkup, /home-tool-chwazi\.png/);
  assert.match(toolsMarkup, /home-tool-boardgames\.png/);
  assert.doesNotMatch(toolsMarkup, /<scroll-view|scroll-x/);
  // 分页 swiper 保留紧凑卡片视口，并预留字体像素取整余量。
  assert.match(wxss, /\.home-tools-swiper\s*\{[^}]*height:\s*calc\(187\.69rpx \+ 3\.85rpx \+ 23\.08rpx \+ 38\.46rpx\);[^}]*margin-top:\s*23\.08rpx;[^}]*margin-bottom:\s*0;/);
  assert.match(wxss, /\.home-tool-slide\s*\{[^}]*overflow:\s*visible;[^}]*padding-top:\s*23\.08rpx;[^}]*padding-bottom:\s*38\.46rpx;/s);
  const cardStyle = wxss.match(/\.home-tool-card\s*\{([^}]*)\}/)[1];
  assert.match(cardStyle, /width:\s*538\.46rpx;/);
  assert.match(cardStyle, /padding:\s*30\.77rpx;/);
  assert.match(cardStyle, /border-radius:\s*46\.15rpx/);
  assert.doesNotMatch(cardStyle, /(?:^|;)\s*height:/);
  assert.match(wxss, /\.home-tool-glow\s*\{[^}]*top:\s*-15\.38rpx;[^}]*right:\s*-48\.08rpx;[^}]*width:\s*240\.38rpx;[^}]*height:\s*240\.38rpx;/);
  assert.match(wxss, /\.home-tool-art\s*\{[^}]*top:\s*0;[^}]*right:\s*0;[^}]*width:\s*253\.85rpx;[^}]*height:\s*253\.85rpx;/);
  assert.match(wxss, /\.home-tool-description-lines\s*\{[^}]*flex-direction:\s*column;/);
  assert.equal((toolsMarkup.match(/class="home-tool-description"/g) || []).length, 4);
  assert.equal((toolsMarkup.match(/mode="aspectFill"/g) || []).length, 2);
  assert.match(wxss, /\.home-tool-title\s*\{[\s\S]*?font-size:\s*30\.77rpx;[\s\S]*?font-weight:\s*700/);
  assert.match(wxss, /\.home-tool-description\s*\{[\s\S]*?font-size:\s*26\.92rpx;[\s\S]*?font-weight:\s*400/);
});

test("home tool artwork preserves the referenced prototype originals and uses upload-sized app copies", () => {
  const prototypeDir = path.join(__dirname, "../../prototype");
  for (const [source, target] of [
    ["image-36.png", "home-tool-chwazi.png"],
    ["image-29.png", "home-tool-boardgames.png"]
  ]) {
    const sourceBytes = fs.readFileSync(path.join(prototypeDir, source));
    const appBytes = fs.readFileSync(path.join(imageDir, target));
    assert.equal(sourceBytes.toString("hex", 0, 8), "89504e470d0a1a0a");
    assert.equal(appBytes.toString("hex", 0, 8), "89504e470d0a1a0a");
    assert.equal(sourceBytes.readUInt32BE(16), 2048);
    assert.equal(sourceBytes.readUInt32BE(20), 2048);
    assert.ok(appBytes.readUInt32BE(16) <= 768);
    assert.ok(appBytes.readUInt32BE(20) <= 768);
    assert.equal(appBytes[24], 8);
    assert.ok([3, 6].includes(appBytes[25]), "app artwork should use indexed or RGBA PNG");
    if (appBytes[25] === 3) {
      assert.ok(appBytes.includes(Buffer.from("tRNS")), "indexed PNG should retain alpha transparency");
    }
    assert.ok(appBytes.length < 100 * 1024, `${target} should stay under 100KB`);
  }
});

test("home tool taps use the existing Chwazi route and tabletop placeholder behavior", () => {
  const js = fs.readFileSync(path.join(pageDir, "activity_list.js"), "utf8");
  assert.match(js, /onHomeChwaziTap\(\)\s*\{\s*wx\.navigateTo\(\{\s*url:\s*"\/pages\/chwazi\/chwazi"\s*\}\);/);
  assert.match(js, /onHomeBoardGameTap\(\)\s*\{\s*wx\.showToast\(\{\s*title:\s*"黑黑正在做，别催"/);
});


test("home tools page with the same timing and easing as the activity carousels", () => {
  const wxml = fs.readFileSync(path.join(pageDir, "activity_list.wxml"), "utf8");
  const wxss = fs.readFileSync(path.join(pageDir, "activity_list.wxss"), "utf8");
  const toolsSwiper = wxml.match(/<swiper\s+id="qaHomeToolsSwiper"([\s\S]*?)<\/swiper>/)[1];
  assert.match(toolsSwiper, /class="cards-swiper home-tools-swiper"/);
  assert.match(toolsSwiper, /current="\{\{homeToolIndex\}\}"/);
  assert.match(toolsSwiper, /bindchange="onHomeToolsSwiperChange"/);
  assert.match(toolsSwiper, /cache-extent="1"/);
  assert.doesNotMatch(toolsSwiper, /autoplay|circular|indicator-dots/);
  assert.equal((toolsSwiper.match(/<swiper-item class="home-tool-slide">/g) || []).length, 2);
  const activitySwiper = wxml.match(/<swiper\s+id="qaAcceptingCardSwiper"([^>]*)>/)[1];
  for (const attribute of ["duration", "easing-function"]) {
    const value = activitySwiper.match(new RegExp(`${attribute}="([^"]+)"`))[1];
    assert.ok(toolsSwiper.includes(`${attribute}="${value}"`));
  }
  // 保留原型左侧 20px、280px 卡宽和 12px 卡间距，一个分页步长为 292px。
  const previous = Number(toolsSwiper.match(/previous-margin="([\d.]+)rpx"/)[1]);
  const next = Number(toolsSwiper.match(/next-margin="([\d.]+)rpx"/)[1]);
  assert.ok(Math.abs((750 - previous - next) - (538.46 + 23.08)) < 0.02);
  assert.match(wxss, /\.home-tool-slide\s*\{[^}]*padding-right:\s*23\.08rpx;/);
  assert.doesNotMatch(wxss, /\.home-tools-scroll\s*\{|\.home-tools-list\s*\{/);
});

test("home tools maintain their own focused card without changing activity focus", () => {
  const vm = require("node:vm");
  const js = fs.readFileSync(path.join(pageDir, "activity_list.js"), "utf8");
  let definition;
  vm.runInNewContext(js, {
    getApp: () => ({ globalData: {} }),
    Page: (value) => { definition = value; },
    require: () => ({}), console, setTimeout, clearTimeout
  });
  assert.equal(definition.data.homeToolIndex, 0);
  const focusedCardIndex = { joined: 2, accepting: 1, notStarted: 0, ended: 0 };
  const patches = [];
  const context = {
    data: { homeToolIndex: 0, focusedCardIndex },
    setData(patch) { patches.push(patch); Object.assign(this.data, patch); }
  };
  const change = (current) => definition.onHomeToolsSwiperChange.call(context, { detail: { current } });
  change(1);
  assert.equal(context.data.homeToolIndex, 1);
  change(1);
  assert.equal(patches.length, 1);
  change(0);
  assert.equal(context.data.homeToolIndex, 0);
  for (const invalid of [-1, 2, undefined, "1", 0.5]) change(invalid);
  definition.onHomeToolsSwiperChange.call(context, undefined);
  assert.equal(patches.length, 2);
  assert.equal(context.data.focusedCardIndex, focusedCardIndex);
});
