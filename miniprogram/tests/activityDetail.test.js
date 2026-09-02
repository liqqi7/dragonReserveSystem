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
const pageJson = JSON.parse(fs.readFileSync(path.join(pageDir, "activity_detail.json"), "utf8"));

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
  assert.equal(view.icon, "/images/weather-partly-cloudy.svg");
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

test("basic information header has no right-side status text", () => {
  assert.match(wxml, /class="hero-status-row"/);
  assert.match(wxml, /class="status-pill \{\{detailStatusClass\}\}"/);
  assert.match(wxml, /participant-current/);
  assert.match(wxml, /participant-separator/);
  assert.match(wxml, /participant-limit/);
  assert.doesNotMatch(wxml, /signupStatusText|section-assist|报名进行中/);
  assert.doesNotMatch(js, /signupStatusText|resolveBasicInfoStatusText/);
  assert.equal(detail.resolveBasicInfoStatusText, undefined);
});



test("activity detail locks the viewport instead of exposing page overscroll", () => {
  assert.equal(pageJson.disableScroll, true);
  assert.match(wxml, /<view\s+class="main-scroll"[\s\S]*?height: calc\(100vh - \{\{bottomBarHeightRpx\}\}rpx\)/);
  assert.doesNotMatch(wxml, /<scroll-view\s+[\s\S]*?class="main-scroll"/);
  assert.doesNotMatch(wxml, /class="scroll-bottom-spacer"/);
  assert.match(wxss, /^page\s*\{[^}]*height:\s*100%;[^}]*overflow:\s*hidden;/s);
  assert.match(wxss, /\.page-wrap\s*\{[^}]*height:\s*100vh;[^}]*overflow:\s*hidden;/s);
  assert.match(wxss, /\.main-scroll\s*\{[^}]*overflow:\s*hidden;/s);
});

test("activity location uses a native coordinate marker instead of a viewport cover layer", () => {
  assert.match(wxml, /<map[\s\S]*?markers="\{\{locationMapMarkers\}\}"[\s\S]*?\/>/);
  assert.doesNotMatch(wxml, /<cover-view class="map-pin-wrap">/);
  assert.doesNotMatch(wxss, /\.map-pin(?:-wrap|-shadow|-icon)?\s*\{/);
  assert.match(js, /function buildLocationMapMarkers\(latitude, longitude, windowWidthPx\)/);
  assert.match(js, /iconPath:\s*LOCATION_MAP_MARKER_ICON/);
  assert.match(js, /anchor:\s*\{ x:\s*0\.5, y:\s*LOCATION_MAP_MARKER_ANCHOR_Y \}/);
  assert.match(js, /locationMapMarkers:\s*locationMapAvailable/);
  const markerPath = path.join(__dirname, "../images/icon-activity-map-marker.png");
  assert.equal(fs.existsSync(markerPath), true);
});

test("location card uses the activity coordinates for a real non-interactive map", () => {
  assert.match(wxml, /<map[\s\S]*id="qaActivityLocationMap"/);
  assert.match(wxml, /latitude="\{\{locationMapLatitude\}\}"/);
  assert.match(wxml, /longitude="\{\{locationMapLongitude\}\}"/);
  assert.match(wxml, /scale="10"/);
  assert.match(wxml, /enable-scroll="\{\{false\}\}"/);
  assert.match(wxml, /enable-zoom="\{\{false\}\}"/);
  assert.match(wxml, /enable-rotate="\{\{false\}\}"/);
  assert.match(wxml, /enable-overlooking="\{\{false\}\}"/);
  assert.match(wxml, /wx:if="\{\{locationMapAvailable\}\}"/);
  assert.match(wxml, /markers="\{\{locationMapMarkers\}\}"/);
  assert.doesNotMatch(wxml, /map-water|map-road|map-label/);
  assert.match(js, /const rawLocationMapLatitude = activity\.locationLatitude;/);
  assert.match(js, /rawLocationMapLatitude !== null/);
  assert.match(js, /rawLocationMapLongitude !== ""/);
  assert.match(js, /Number\.isFinite\(locationMapLatitude\)/);
  assert.match(js, /locationMapLatitude >= -90/);
  assert.match(js, /locationMapLongitude <= 180/);
});

test("native map marker preserves the prototype size across viewport widths", () => {
  assert.match(js, /const LOCATION_MAP_MARKER_DESIGN_SIZE_PX = 54;/);
  assert.match(js, /LOCATION_MAP_MARKER_DESIGN_SIZE_PX \* viewportWidth \/ 390/);
  assert.match(js, /width:\s*markerSizePx/);
  assert.match(js, /height:\s*markerSizePx/);
  assert.match(js, /const LOCATION_MAP_MARKER_ANCHOR_Y = 23 \/ 54;/);
});

test("activity detail follows the latest eight-pixel drawer rhythm", () => {
  assert.match(wxss, /\.detail-panel\s*\{[^}]*margin-top:\s*-94\.23rpx;[^}]*padding:\s*30\.77rpx;[^}]*box-shadow:\s*0 -7\.69rpx 34\.62rpx rgba\(0, 0, 0, 0\.102\);/s);
  assert.match(wxss, /\.facts-row\s*\{[^}]*margin-top:\s*15\.38rpx;/s);
  assert.match(wxss, /\.location-card,\s*\n\.weather-card\s*\{[^}]*margin-top:\s*15\.38rpx;/s);
  assert.match(wxss, /\.hero-copy\s*\{[^}]*bottom:\s*140\.38rpx;[^}]*gap:\s*23\.08rpx;/s);
});

test("weather card matches the prototype structure and unavailable state", () => {
  assert.match(wxml, /weather-icon-wrap/);
  assert.match(wxml, /weather-humidity\.svg/);
  assert.match(wxml, /weather-wind\.svg/);
  assert.match(wxml, /activity-detail-chevron-down\.svg/);
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

test("detail hero avatar composition scales the home large-card layout by width", () => {
  assert.match(wxss, /\.hero-avatar-tl\s*\{[^}]*top:\s*43\.48rpx;[^}]*left:\s*43\.48rpx;[^}]*width:\s*448\.37rpx;[^}]*height:\s*448\.37rpx;/s);
  assert.match(wxss, /\.hero-avatar-tr\s*\{[^}]*top:\s*364\.13rpx;[^}]*left:\s*451\.09rpx;[^}]*width:\s*255\.43rpx;[^}]*height:\s*255\.43rpx;/s);
  assert.match(wxss, /\.hero-avatar-mid\s*\{[^}]*top:\s*505\.43rpx;[^}]*left:\s*233\.70rpx;[^}]*width:\s*222\.83rpx;[^}]*height:\s*222\.83rpx;/s);
  assert.doesNotMatch(wxss, /\.hero-avatar-tr\s*\{[^}]*right:/s);
});

test("prototype key sizes, colors, typography and action layout do not regress", () => {
  assert.match(wxss, /\.immersive-hero\s*\{[^}]*height:\s*750rpx;/s);
  assert.match(wxss, /\.hero-shade\s*\{[\s\S]*?radial-gradient\([\s\S]*?linear-gradient\([\s\S]*?background-blend-mode:\s*multiply, normal;/);
  assert.match(wxss, /\.status-pill\s*\{[^}]*height:\s*53\.85rpx;[^}]*border-radius:\s*26\.92rpx;[^}]*font-size:\s*26\.92rpx;/s);
  assert.match(wxss, /\.hero-title\s*\{[^}]*height:\s*84\.62rpx;[^}]*font-size:\s*61\.54rpx;/s);
  assert.match(wxss, /\.hero-title\s*\{[^}]*display:\s*flex;[^}]*align-items:\s*center;/s);
  assert.doesNotMatch(wxss, /\.section-assist(?:-text)?\s*\{/);
  assert.match(wxss, /\.hero-copy\s*\{[^}]*gap:\s*23\.08rpx;/s);
  assert.match(wxss, /\.facts-row\s*\{[^}]*height:\s*78\.85rpx;[^}]*padding:\s*0 23\.08rpx;/s);
  assert.match(wxss, /\.fact-item\s*\{[^}]*height:\s*78\.85rpx;/s);
  assert.match(wxss, /\.nav-back-icon\s*\{[^}]*width:\s*34\.62rpx;[^}]*height:\s*34\.62rpx;/s);
  assert.match(wxss, /\.fact-item\s*\{[^}]*padding:\s*0 15\.38rpx;[^}]*gap:\s*7\.69rpx;/s);
  assert.match(wxml, /class="fact-item fact-item-time"/);
  assert.match(wxss, /\.fact-item-time\s*\{[^}]*padding-left:\s*15\.38rpx;/s);
  assert.match(wxss, /\.fact-label\s*\{[^}]*font-size:\s*23\.08rpx;[^}]*font-weight:\s*500;[^}]*line-height:\s*34\.62rpx;/s);
  assert.match(wxss, /\.fact-value,[\s\S]*?\{[^}]*font-size:\s*26\.92rpx;[^}]*font-weight:\s*600;[^}]*line-height:\s*42\.31rpx;/s);
  assert.match(wxss, /\.participant-separator\s*\{[^}]*font-size:\s*23\.08rpx;[^}]*font-weight:\s*500;[^}]*line-height:\s*34\.62rpx;/s);
  assert.match(wxss, /\.fact-participants\s*\{[^}]*flex:\s*0 0 211\.54rpx;/s);
  assert.match(wxss, /\.location-card\s*\{[^}]*height:\s*388\.46rpx;/s);
  assert.match(wxss, /\.location-name\s*\{[^}]*font-size:\s*26\.92rpx;/s);
  assert.match(wxss, /\.location-distance,\s*\n\.location-address\s*\{[^}]*font-size:\s*23\.08rpx;/s);
  assert.match(wxss, /\.location-address\s*\{[^}]*font-weight:\s*400;[^}]*line-height:\s*1\.3;/s);
  assert.match(wxss, /\.navigate-button\s*\{[^}]*width:\s*130\.77rpx;[^}]*height:\s*69\.23rpx;[^}]*border-radius:\s*23\.08rpx;/s);
  assert.match(wxss, /\.weather-card\s*\{[^}]*height:\s*192\.31rpx;/s);
  assert.match(wxss, /\.weather-metric-value\s*\{[^}]*height:\s*32\.31rpx;[^}]*line-height:\s*32\.31rpx;/s);
  assert.match(wxss, /\.weather-metric-label\s*\{[^}]*font-size:\s*19\.23rpx;[^}]*font-weight:\s*500;[^}]*line-height:\s*1\.4;/s);
  assert.match(wxss, /\.weather-unavailable-message\s*\{[^}]*font-size:\s*23\.08rpx;[^}]*font-weight:\s*400;/s);
  assert.match(wxss, /\.weather-attribution\s*\{[^}]*display:\s*flex;[^}]*align-items:\s*center;[^}]*justify-content:\s*flex-end;/s);
  assert.match(wxss, /\.weather-attribution-text\s*\{[^}]*font-size:\s*19\.23rpx;[^}]*font-weight:\s*400;[^}]*line-height:\s*1;/s);
  assert.match(wxss, /\.bottom-icon-button:first-child\s*\{[^}]*left:\s*38\.46rpx;/s);
  assert.match(wxss, /\.bottom-icon-button:nth-child\(2\)\s*\{[^}]*left:\s*138\.46rpx;/s);
  assert.match(wxss, /\.bottom-icon-button-wide\s*\{[^}]*width:\s*184\.62rpx;/s);
  assert.match(wxss, /\.bottom-primary\s*\{[^}]*left:\s*238\.46rpx;[^}]*width:\s*473\.08rpx;[^}]*height:/s);
  assert.match(wxss, /\.bottom-primary-disabled\s*\{[^}]*background:\s*#e5e7eb;[^}]*color:\s*#9ca3af;/s);
  assert.match(wxml, /src="\/images\/activity-detail-chevron-left\.svg"/);
  assert.match(wxml, /activity-detail-chevron-up\.svg/);
  assert.match(wxml, /activity-detail-chevron-down\.svg/);
  assert.match(wxml, /src="\/images\/activity-detail-chevron-right\.svg"/);
  assert.match(wxml, /src="\/images\/icon-navigation\.svg"/);
  assert.match(wxml, /src="\/images\/weather-humidity\.svg"/);
  assert.match(wxml, /src="\/images\/weather-wind\.svg"/);
  assert.match(wxml, /src="\/images\/weather-air-quality\.svg"/);
  assert.match(wxml, /src="\/images\/icon-share\.svg"/);
  assert.match(wxml, /src="\/images\/icon-edit\.svg"/);
  assert.doesNotMatch(wxml, /icon-chevron-down-light\.svg/);
  assert.doesNotMatch(wxss, /remark-chevron-up/);
});
