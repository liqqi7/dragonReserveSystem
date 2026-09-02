const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const detail = require("../utils/activityDetail");
const { enrichSingleActivity } = require("../utils/activityEnrich");
const pageDir = path.join(__dirname, "../pages/activity_detail");
const js = fs.readFileSync(path.join(pageDir, "activity_detail.js"), "utf8");
const wxml = fs.readFileSync(path.join(pageDir, "activity_detail.wxml"), "utf8");
const wxss = fs.readFileSync(path.join(pageDir, "activity_detail.wxss"), "utf8");

test("activity detail formats date, time and the prototype hero meta", () => {
  assert.equal(detail.formatActivityDate("2026-09-05 16:30"), "9月5日 周六");
  assert.equal(detail.formatActivityTime("2026-09-05 16:30", "2026-09-05 19:00"), "16:30 - 19:00");
  assert.equal(detail.formatHeroMeta({
    startTime: "2026-09-05 16:30",
    typeBadgeLabel: "outdoor",
    typeDisplayName: "户外"
  }), "OUTDOOR · 09/05");
  assert.equal(detail.formatHeroMeta({
    startTime: "2026-09-05 16:30",
    activityType: "other",
    typeDisplayName: "其它"
  }), "OTHER · 09/05");
});

test("activity title is limited to ten characters for the one-line hero display", () => {
  assert.equal(detail.truncateActivityTitle("一二三四五六七八九十"), "一二三四五六七八九十");
  assert.equal(detail.truncateActivityTitle("一二三四五六七八九十一"), "一二三四五六七八九十…");
  assert.equal(detail.truncateActivityTitle("周末😀一起玩桌游超长标题"), "周末😀一起玩桌游超长…");
  assert.match(wxml, /class="hero-title">\{\{activityTitleText\}\}<\/text>/);
  assert.match(js, /activityTitleText: truncateActivityTitle\(activity\.name\)/);
  assert.match(wxss, /\.hero-title\s*\{[^}]*overflow:\s*hidden;[^}]*text-overflow:\s*ellipsis;[^}]*white-space:\s*nowrap;/s);
});

test("activity remark uses measured one-line overflow and restores the prototype toggle", () => {
  assert.match(wxml, /class="remark-toggle"/);
  assert.match(wxml, /\{\{remarkExpanded \? '收起' : '展开'\}\}/);
  assert.match(wxml, /class="hero-remark-measure"/);
  assert.match(wxml, /class="remark-toggle-measure"/);
  assert.match(js, /updateRemarkOverflow\(\)/);
  assert.match(js, /select\("\.hero-remark-row"\)\.boundingClientRect\(\)/);
  assert.match(js, /select\("\.hero-remark-measure"\)\.boundingClientRect\(\)/);
  assert.match(js, /select\("\.remark-toggle-measure"\)\.boundingClientRect\(\)/);
  assert.match(js, /rowRect\.width - toggleWidth - 7\.69/);
  assert.doesNotMatch(js, /remark\.length\s*>/);
  assert.match(wxss, /\.hero-remark\s*\{[^}]*-webkit-line-clamp:\s*1;[^}]*overflow:\s*hidden;/s);
  assert.match(wxss, /\.remark-toggle-text\s*\{[^}]*font-size:\s*23\.08rpx;[^}]*font-weight:\s*500;/s);
});

test("activity detail calculates and formats location distance", () => {
  assert.equal(Math.round(detail.calculateDistanceMeters(39.9042, 116.4074, 39.9042, 116.4074)), 0);
  assert.equal(detail.formatDistance(428), "约 430m");
  assert.equal(detail.formatDistance(2400), "约 2.4km");
  assert.equal(detail.formatDistance(null), "");
});

test("weather view uses one temperature and degrades air quality independently", () => {
  const view = detail.buildWeatherView({
    available: true,
    temperature: 24,
    temperature_min: 18,
    temperature_max: 24,
    condition: "晴间多云",
    icon_code: "103",
    humidity: 58,
    wind_direction: "东南风",
    wind_scale: "2",
    air_quality: null
  });
  assert.equal(view.temperature, "24°");
  assert.equal(view.humidity, "58%");
  assert.equal(view.wind, "东南风 2级");
  assert.equal(view.airQuality, "—");
  assert.equal(view.icon, "/images/weather-sunny.svg");
});

test("weather unavailable state is independent from location state", () => {
  assert.deepEqual(detail.buildWeatherView(null), {
    loading: false,
    available: false,
    message: "距离活动时间较远，暂不展示天气信息",
    attribution: "天气服务驱动 by QWeather"
  });
});

test("primary action keeps signup, cancel, checkin and disabled business states", () => {
  assert.deepEqual(detail.resolvePrimaryAction({ status: "未开始", hasSignedUp: false }, false), {
    label: "立即报名", disabled: false, action: "signup"
  });
  assert.deepEqual(detail.resolvePrimaryAction({ status: "未开始", hasSignedUp: true, signupDeadlinePassed: false }, false), {
    label: "取消报名", disabled: false, action: "cancel"
  });
  assert.deepEqual(detail.resolvePrimaryAction({ status: "进行中", hasSignedUp: true }, true), {
    label: "签到", disabled: false, action: "checkin"
  });
  assert.deepEqual(detail.resolvePrimaryAction({ status: "已结束", hasSignedUp: false }, false), {
    label: "已停止报名", disabled: true, action: "none"
  });
});

test("activity detail keeps QA anchors and the existing participants drawer", () => {
  for (const id of [
    "qaActivityDetailHero",
    "qaActivityDetailContent",
    "qaActivityLocationCard",
    "qaActivityWeatherCard",
    "qaActivityDetailBottomBar"
  ]) {
    assert.match(wxml, new RegExp(`id="${id}"`));
  }
  assert.match(wxml, /bindtap="openParticipantsDrawer"/);
  assert.match(wxml, /class="participants-drawer-sheet"/);
  assert.match(wxml, /participantDrawerList/);
});

test("activity detail removes the legacy countdown and standalone pigeon sections", () => {
  assert.doesNotMatch(wxml, /报名倒计时|鸽子名单/);
  assert.doesNotMatch(js, /countdownVisible|showPigeonDrawer|pigeonList|pigeonPreviewList|startCountdownTimer/);
});

test("signup status remains global after the current user has signed up", () => {
  const activity = enrichSingleActivity({
    id: 49,
    name: "未来活动",
    status: "未开始",
    start_time: "2026-10-18T10:00:00",
    end_time: "2026-10-18T12:00:00",
    signup_deadline: "2026-10-17T23:00:00",
    signup_enabled: true,
    max_participants: null,
    activity_type: "other",
    participants: [{
      id: 1,
      user_id: 7,
      display_nickname: "当前用户",
      display_avatar_url: "",
      checked_in_at: null,
      created_at: "2026-09-01T08:00:00"
    }]
  }, [], "7", "当前用户", new Date("2026-09-02T10:00:00"));

  assert.equal(activity.hasSignedUp, true);
  assert.equal(activity.detailStatusTag, "报名中");
});

test("prototype status, basic information and participant structures are present", () => {
  assert.match(wxml, /class="hero-status-row"/);
  assert.match(wxml, /class="status-pill \{\{detailStatusClass\}\}"/);
  assert.match(wxml, /\{\{signupStatusText\}\}/);
  assert.match(wxml, /participant-current/);
  assert.match(wxml, /participant-separator/);
  assert.match(wxml, /participant-limit/);
  assert.match(js, /signupStatusText = resolveBasicInfoStatusText\(activity\)/);
  assert.equal(detail.resolveBasicInfoStatusText({ detailStatusTag: "报名中" }), "报名进行中");
  assert.equal(detail.resolveBasicInfoStatusText({ status: "未开始", signupEnabled: true, isSignupClosed: false, isFull: false }), "报名进行中");
  assert.equal(detail.resolveBasicInfoStatusText({ status: "未开始", signupEnabled: true, isSignupClosed: true, isFull: false }), "");
  assert.equal(detail.resolveBasicInfoStatusText({ detailStatusTag: "进行中" }), "活动进行中");
  assert.equal(detail.resolveBasicInfoStatusText({ status: "进行中" }), "活动进行中");
  assert.equal(detail.resolveBasicInfoStatusText({ detailStatusTag: "已结束", status: "已结束" }), "");
  assert.doesNotMatch(wxml, /section-assist-chevron/);
});


test("location card uses the activity coordinates for a real non-interactive map", () => {
  assert.match(wxml, /<map[\s\S]*id="qaActivityLocationMap"/);
  assert.match(wxml, /latitude="\{\{locationMapLatitude\}\}"/);
  assert.match(wxml, /longitude="\{\{locationMapLongitude\}\}"/);
  assert.match(wxml, /scale="15"/);
  assert.match(wxml, /enable-scroll="\{\{false\}\}"/);
  assert.match(wxml, /enable-zoom="\{\{false\}\}"/);
  assert.match(wxml, /enable-rotate="\{\{false\}\}"/);
  assert.match(wxml, /enable-overlooking="\{\{false\}\}"/);
  assert.match(wxml, /wx:if="\{\{locationMapAvailable\}\}"/);
  assert.match(wxml, /<cover-view class="map-pin-wrap">/);
  assert.doesNotMatch(wxml, /map-water|map-road|map-label/);
  assert.match(js, /const rawLocationMapLatitude = activity\.locationLatitude;/);
  assert.match(js, /rawLocationMapLatitude !== null/);
  assert.match(js, /rawLocationMapLongitude !== ""/);
  assert.match(js, /Number\.isFinite\(locationMapLatitude\)/);
  assert.match(js, /locationMapLatitude >= -90/);
  assert.match(js, /locationMapLongitude <= 180/);
});

test("weather card matches the prototype structure and unavailable state", () => {
  assert.match(wxml, /weather-icon-wrap/);
  assert.match(wxml, /weather-humidity\.svg/);
  assert.match(wxml, /weather-wind\.svg/);
  assert.match(wxml, /weather-air-quality\.svg/);
  assert.match(wxml, />空气湿度</);
  assert.match(wxml, />风向风速</);
  assert.match(wxml, /wx:if="\{\{weather\.available\}\}" class="weather-attribution"/);
  assert.doesNotMatch(wxml, /天气暂不可用/);
});

test("activity detail uses the shared rpx safe-area resolver", () => {
  assert.match(js, /getBottomSafeAreaRpx/);
  assert.match(wxml, /padding-bottom: \{\{safeBottomRpx\}\}rpx/);
  assert.match(wxml, /bottomBarHeightRpx\}\}rpx/);
  assert.doesNotMatch(wxml, /safeBottom\}\}px/);
});

test("prototype key sizes, colors, typography and action layout do not regress", () => {
  assert.match(wxss, /\.immersive-hero\s*\{[^}]*height:\s*750rpx;/s);
  assert.match(wxss, /\.hero-shade\s*\{[\s\S]*?radial-gradient\([\s\S]*?linear-gradient\([\s\S]*?background-blend-mode:\s*multiply, normal;/);
  assert.match(wxss, /\.status-pill\s*\{[^}]*height:\s*53\.85rpx;[^}]*border-radius:\s*26\.92rpx;[^}]*font-size:\s*26\.92rpx;/s);
  assert.match(wxss, /\.hero-title\s*\{[^}]*font-size:\s*61\.54rpx;/s);
  assert.match(wxss, /\.section-assist\s*\{[^}]*width:\s*128\.85rpx;/s);
  assert.match(wxss, /\.facts-row\s*\{[^}]*height:\s*88\.46rpx;[^}]*padding:\s*0 23\.08rpx;/s);
  assert.match(wxss, /\.fact-participants\s*\{[^}]*flex:\s*0 0 211\.54rpx;/s);
  assert.match(wxss, /\.location-card\s*\{[^}]*height:\s*388\.46rpx;/s);
  assert.match(wxss, /\.location-address\s*\{[^}]*font-weight:\s*500;/s);
  assert.match(wxss, /\.navigate-button\s*\{[^}]*width:\s*130\.77rpx;[^}]*height:\s*69\.23rpx;[^}]*border-radius:\s*23\.08rpx;/s);
  assert.match(wxss, /\.weather-card\s*\{[^}]*height:\s*192\.31rpx;/s);
  assert.match(wxss, /\.weather-unavailable-message\s*\{[^}]*font-size:\s*23\.08rpx;[^}]*font-weight:\s*400;/s);
  assert.match(wxss, /\.weather-attribution\s*\{[^}]*display:\s*flex;[^}]*align-items:\s*center;[^}]*justify-content:\s*flex-end;/s);
  assert.match(wxss, /\.weather-attribution-text\s*\{[^}]*font-size:\s*19\.23rpx;[^}]*font-weight:\s*400;[^}]*line-height:\s*1;/s);
  assert.match(wxss, /\.bottom-icon-button:first-child\s*\{[^}]*left:\s*38\.46rpx;/s);
  assert.match(wxss, /\.bottom-icon-button:nth-child\(2\)\s*\{[^}]*left:\s*138\.46rpx;/s);
  assert.match(wxss, /\.bottom-icon-button-wide\s*\{[^}]*width:\s*184\.62rpx;/s);
  assert.match(wxss, /\.bottom-primary\s*\{[^}]*left:\s*238\.46rpx;[^}]*width:\s*473\.08rpx;[^}]*height:/s);
  assert.match(wxss, /\.bottom-primary-disabled\s*\{[^}]*background:\s*#e5e7eb;[^}]*color:\s*#9ca3af;/s);
  const shareIcon = fs.readFileSync(path.join(__dirname, "../images/icon-share.svg"), "utf8");
  const editIcon = fs.readFileSync(path.join(__dirname, "../images/icon-edit.svg"), "utf8");
  const navigationIcon = fs.readFileSync(path.join(__dirname, "../images/icon-navigation.svg"), "utf8");
  assert.match(shareIcon, /<circle cx="18" cy="5" r="3"\/>/);
  assert.match(editIcon, /viewBox="0 0 14 14"/);
  assert.match(editIcon, /M11\.00244 0\.60156/);
  assert.doesNotMatch(editIcon, /M12 20h9/);
  assert.match(navigationIcon, /width="15" height="15" viewBox="0 0 14 14"/);
  assert.match(navigationIcon, /M12\.73877 0\.60156/);
  assert.doesNotMatch(navigationIcon, /stroke-width="1\.6"/);
});
