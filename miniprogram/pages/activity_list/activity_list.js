const app = getApp();
const activityService = require("../../services/activity");
const { getApiBaseUrl, resolveLocalMediaUrl, isLocalTestMediaUrl } = require("../../services/config");
const { createTraceId, logInfo, logError, summarizeError } = require("../../services/logger");
const { enrichSingleActivity } = require("../../utils/activityEnrich");
const { parseCreatedAtMs, orderParticipantsForRecentAvatarSlice } = require("../../utils/participantSort");
const cacheManager = require("../../services/cacheManager");
const { patchTabBarIfNeeded } = require("../../utils/tabBarSync");
const calendarWarmup = require("../../utils/calendarWarmup");
const { getBottomSafeAreaRpx } = require("../../utils/safeArea");

const pad = (n) => (n < 10 ? `0${n}` : `${n}`);

const WEEKDAY_LABELS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

function getWeekdayLabel(dateTimeString) {
  if (!dateTimeString) return "";
  const safe = String(dateTimeString).replace(" ", "T");
  const d = new Date(safe);
  if (Number.isNaN(d.getTime())) return "";
  return WEEKDAY_LABELS[d.getDay()];
}

const DEFAULT_AVATAR = "/images/default-avatar.svg";
const LOCAL_TEST_AVATAR_PREFIX = "/images/avatars";
const DEFAULT_ACTIVITY_TYPE_KEY = "other";
const CARD_MEDIA_DIAG_WARN_MS = 8000;
const CARD_MEDIA_DIAG_ERROR_MS = 15000;
const ENDED_ACTIVITY_PAGE_SIZE = 5;
const CACHE_METADATA_TTL_MS = 60 * 1000;
/** 须与 wxml 中 refresher-threshold 一致 */
const MAIN_REFRESH_THRESHOLD_PX = 80;
const COLD_START_CARD_ENTRANCE_DELAY_MS = 400;
const COLD_START_CARD_ENTRANCE_FRAME_MS = 17;
const DEFAULT_ACTIVITY_TYPE_STYLES = [
  {
    key: "badminton",
    display_name: "羽毛球",
    default_style_key: "badminton-default",
    styles: [
      {
        style_key: "badminton-default",
        style_name: "纯静态图（无头像）",
        badge_label: "Badminton",
        show_badge: true,
        show_avatar_cluster: false,
        large_card_bg_image_url: "https://dragon.liqqihome.top/media/images/card-bg-badminton-lg.png",
        small_card_bg_image_url: "https://dragon.liqqihome.top/media/images/card-bg-badminton-sm.png",
        bg_video_url: null
      }
    ]
  },
  {
    key: "boardgame",
    display_name: "桌游",
    default_style_key: "boardgame-default",
    styles: [
      {
        style_key: "boardgame-default",
        style_name: "纯静态图（无头像）",
        badge_label: "Boardgame",
        show_badge: true,
        show_avatar_cluster: true,
        large_card_bg_image_url: "https://dragon.liqqihome.top/media/images/card-bg-boardgame-lg.png",
        small_card_bg_image_url: "https://dragon.liqqihome.top/media/images/card-bg-boardgame-sm.jpg",
        bg_video_url: null
      }
    ]
  },
  {
    key: "other",
    display_name: "其它",
    default_style_key: "other-video",
    styles: [
      {
        style_key: "other-video",
        style_name: "纯静态图",
        badge_label: "",
        show_badge: false,
        show_avatar_cluster: false,
        large_card_bg_image_url: "https://dragon.liqqihome.top/media/images/card-bg-other-v2-lg.jpg",
        small_card_bg_image_url: "https://dragon.liqqihome.top/media/images/card-bg-other-v2-sm.jpg",
        bg_video_url: null
      }
    ]
  },
  {
    key: "eating",
    display_name: "吃饭",
    default_style_key: "image-clean",
    styles: [
      {
        style_key: "image-clean",
        style_name: "静态图无头像",
        badge_label: "Eating",
        show_badge: true,
        show_avatar_cluster: false,
        large_card_bg_image_url: "https://dragon.liqqihome.top/media/images/eating-image-clean-lg.png",
        small_card_bg_image_url: "https://dragon.liqqihome.top/media/images/eating-image-clean-sm.png",
        bg_video_url: null
      }
    ]
  },
  {
    key: "outing",
    display_name: "\u5916\u51fa",
    default_style_key: "outing-tram",
    styles: [
      {
        style_key: "outing-tram",
        style_name: "\u9759\u6001\u56fe\u65e0\u5934\u50cf",
        badge_label: "Outing",
        show_badge: true,
        show_avatar_cluster: false,
        large_card_bg_image_url: "https://dragon.liqqihome.top/media/images/outing-tram-lg.png",
        small_card_bg_image_url: "https://dragon.liqqihome.top/media/images/outing-tram-sm.png",
        bg_video_url: null
      },
      {
        style_key: "outing-cycling",
        style_name: "\u9759\u6001\u56fe\u65e0\u5934\u50cf2",
        badge_label: "Outing",
        show_badge: true,
        show_avatar_cluster: false,
        large_card_bg_image_url: "https://dragon.liqqihome.top/media/images/outing-cycling-lg.png",
        small_card_bg_image_url: "https://dragon.liqqihome.top/media/images/outing-cycling-sm.png",
        bg_video_url: null
      }
    ]
  },
  {
    key: "movie",
    display_name: "电影",
    default_style_key: "image-clean",
    styles: [
      {
        style_key: "image-clean",
        style_name: "纯静态图",
        badge_label: "Movie",
        show_badge: true,
        show_avatar_cluster: false,
        large_card_bg_image_url: "https://dragon.liqqihome.top/media/images/movie-image-clean-lg.png",
        small_card_bg_image_url: "https://dragon.liqqihome.top/media/images/movie-image-clean-sm.png",
        bg_video_url: null
      },
      {
        style_key: "image-clean-2",
        style_name: "纯静态图2",
        badge_label: "Movie",
        show_badge: true,
        show_avatar_cluster: false,
        large_card_bg_image_url: "https://dragon.liqqihome.top/media/images/movie-image-clean-2-lg.png",
        small_card_bg_image_url: "https://dragon.liqqihome.top/media/images/movie-image-clean-2-sm.png",
        bg_video_url: null
      },
      {
        style_key: "image-clean-3",
        style_name: "Static image 3",
        badge_label: "Movie",
        show_badge: true,
        show_avatar_cluster: false,
        large_card_bg_image_url: "https://dragon.liqqihome.top/media/images/movie-image-spiderverse-lg.png",
        small_card_bg_image_url: "https://dragon.liqqihome.top/media/images/movie-image-spiderverse-sm.png",
        bg_video_url: null
      }
    ]
  }
];

function normalizeTypeKey(value) {
  if (value == null) return "";
  const t = String(value).trim().toLowerCase();
  if (!t) return "";
  if (t === "羽毛球") return "badminton";
  if (t === "桌游" || t === "board game") return "boardgame";
  if (t === "其它" || t === "其他") return "other";
  if (t === "吃饭") return "eating";
  if (t === "电影") return "movie";
  if (t === "\u5916\u51fa") return "outing";
  return t;
}

function buildCardGlassImageUrl(typeKey, styleKey) {
  const apiBaseUrl = String(getApiBaseUrl() || "").replace(/\/$/, "");
  if (!apiBaseUrl || !typeKey || !styleKey) return "";
  return `${apiBaseUrl}/activities/type-styles/${encodeURIComponent(typeKey)}/${encodeURIComponent(styleKey)}/glass-image?v=2`;
}

function buildTypeStyleMap(typeStyles) {
  const source = Array.isArray(typeStyles) && typeStyles.length > 0 ? typeStyles : DEFAULT_ACTIVITY_TYPE_STYLES;
  const map = {};
  source.forEach((item) => {
    const key = normalizeTypeKey(item && item.key);
    if (!key) return;
    const styles = Array.isArray(item.styles) ? item.styles : [];
    const styleMap = {};
    styles.forEach((s) => {
      const styleKey = String(s.style_key || "").trim();
      if (!styleKey) return;
      styleMap[styleKey] = {
        styleKey,
        styleName: String(s.style_name || styleKey),
        badgeLabel: String(s.badge_label || ""),
        showBadge: s.show_badge !== false,
        showAvatarCluster: s.show_avatar_cluster !== false,
        largeCardBgImageUrl: String(s.large_card_bg_image_url || ""),
        largeCardGlassImageUrl: buildCardGlassImageUrl(key, styleKey),
        smallCardBgImageUrl: String(s.small_card_bg_image_url || ""),
        bgVideoUrl: s.bg_video_url ? String(s.bg_video_url) : ""
      };
    });
    const defaultStyleKey = String(item.default_style_key || "").trim();
    const fallbackStyleKey = defaultStyleKey && styleMap[defaultStyleKey]
      ? defaultStyleKey
      : (Object.keys(styleMap)[0] || "");
    map[key] = {
      key,
      displayName: String(item.display_name || key),
      defaultStyleKey: fallbackStyleKey,
      styleMap
    };
  });
  if (!map[DEFAULT_ACTIVITY_TYPE_KEY]) {
    map[DEFAULT_ACTIVITY_TYPE_KEY] = {
      key: DEFAULT_ACTIVITY_TYPE_KEY,
      displayName: "其它",
      defaultStyleKey: "",
      styleMap: {}
    };
  }
  return map;
}

function normalizeActivityTypeByMap(rawType, typeStyleMap) {
  const key = normalizeTypeKey(rawType);
  if (key && typeStyleMap[key]) return key;
  return DEFAULT_ACTIVITY_TYPE_KEY;
}

function resolveStyleByTypeAndKey(typeKey, styleKey, typeStyleMap) {
  const typeEntry = typeStyleMap[typeKey] || typeStyleMap[DEFAULT_ACTIVITY_TYPE_KEY];
  if (!typeEntry) return null;
  const styleMap = typeEntry.styleMap || {};
  const normalizedStyleKey = String(styleKey || "").trim();
  if (normalizedStyleKey && styleMap[normalizedStyleKey]) return styleMap[normalizedStyleKey];
  if (typeEntry.defaultStyleKey && styleMap[typeEntry.defaultStyleKey]) return styleMap[typeEntry.defaultStyleKey];
  const firstKey = Object.keys(styleMap)[0];
  return firstKey ? styleMap[firstKey] : null;
}

function normalizeAvatarUrl(url) {
  const value = (url && String(url).trim()) || "";
  if (!value) return DEFAULT_AVATAR;

  const lower = value.toLowerCase();
  // 测试造数和示例域名经常是占位地址，直接回退默认头像，避免 404
  if (lower.includes("example.com/")) return DEFAULT_AVATAR;
  if (value.startsWith("/media/")) {
    const m = value.match(/test-avatar-(\d{2})\.svg$/i);
    return m ? `${LOCAL_TEST_AVATAR_PREFIX}/test-avatar-${m[1]}.svg` : DEFAULT_AVATAR;
  }
  if (value.startsWith("media/")) {
    const m = value.match(/test-avatar-(\d{2})\.svg$/i);
    return m ? `${LOCAL_TEST_AVATAR_PREFIX}/test-avatar-${m[1]}.svg` : DEFAULT_AVATAR;
  }
  if (lower.startsWith("http://")) {
    const resolved = resolveLocalMediaUrl(value);
    return isLocalTestMediaUrl(value) ? resolved : DEFAULT_AVATAR;
  }

  return value;
}

function formatDateTime(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function adaptParticipant(participant) {
  const name = participant.display_nickname || "";
  return {
    id: participant.id,
    name,
    userId: participant.user_id != null ? String(participant.user_id) : null,
    avatarUrl: normalizeAvatarUrl(participant.display_avatar_url),
    checkedInAt: formatDateTime(participant.checked_in_at),
    checkinLat: participant.checkin_lat,
    checkinLng: participant.checkin_lng,
    signedUpAtMs: parseCreatedAtMs(participant.created_at)
  };
}

/** 按当前用户重算 hasSignedUp / hasCheckedIn（修复缓存是在旧登录态下写入导致报名态错误） */
function reapplyListParticipationFlags(list, myUserId, myNickname) {
  const myIdStr = String(myUserId || "").trim();
  const nn = String(myNickname || "").trim();
  return (list || []).map((activity) => {
    const rawParticipants = activity.participants || [];
    let hasSignedUp = false;
    let hasCheckedIn = false;
    rawParticipants.forEach((p) => {
      if (typeof p === "object" && p !== null) {
        const uidStr = p.userId != null ? String(p.userId) : "";
        const name = (p.name || "").trim();
        const checkedIn = !!p.checkedInAt;
        if (myIdStr && uidStr && uidStr === myIdStr) {
          hasSignedUp = true;
          if (checkedIn) hasCheckedIn = true;
        } else if (nn && name === nn) {
          hasSignedUp = true;
          if (checkedIn) hasCheckedIn = true;
        }
      } else if (typeof p === "string" && nn && p === nn) {
        hasSignedUp = true;
      }
    });
    return { ...activity, hasSignedUp, hasCheckedIn };
  });
}

function adaptActivity(item) {
  const participants = (item.participants || []).map(adaptParticipant);
  const startTime = formatDateTime(item.start_time);
  const rawType = item.activity_type;
  return {
    _id: String(item.id),
    date: startTime.split(" ")[0] || "",
    name: item.name,
    status: item.status || "进行中",
    remark: item.remark || "",
    participants,
    maxParticipants: item.max_participants == null ? null : item.max_participants,
    startTime,
    endTime: formatDateTime(item.end_time),
    signupDeadline: formatDateTime(item.signup_deadline),
    locationName: item.location_name || "",
    locationAddress: item.location_address || "",
    locationLatitude: item.location_latitude,
    locationLongitude: item.location_longitude,
    signupEnabled: item.signup_enabled !== false,
    activityType: rawType || "other",
    activityStyleKey: item.activity_style_key || "",
    _rawActivityType: rawType
  };
}

function buildCardMediaKey(meta) {
  const aid =
    meta.activityId != null && meta.activityId !== ""
      ? String(meta.activityId)
      : "unknown";
  return [
    meta.mediaType || "unknown",
    meta.group || "unknown",
    meta.cardSize || "unknown",
    aid,
    meta.url || ""
  ].join("|");
}

function pickCardMediaMetaFromDataset(dataset, mediaType) {
  const safeDataset = dataset || {};
  const rawId = safeDataset.activityId;
  return {
    mediaType,
    group: safeDataset.group || "unknown",
    cardSize: safeDataset.cardSize || "unknown",
    activityId: rawId != null && rawId !== "" ? String(rawId) : "",
    activityName: safeDataset.activityName || "",
    url: safeDataset.url || safeDataset.src || ""
  };
}


Page({
  data: {
    activityList: [],
    filteredList: [],
    groupedActivities: { joined: [], accepting: [], notStarted: [], ended: [] },
    groupSectionVisibility: { joined: false, accepting: false, notStarted: false, ended: false },
    allEndedActivities: [],
    endedHasMore: false,
    endedLoadingMore: false,
    statusBarHeight: 0,
    navBarHeight: 0,
    focusedCardIndex: { joined: 0, accepting: 0, notStarted: 0, ended: 0 },
    mainRefresherTriggered: false,
    mainRefresherHint: "下拉刷新",
    myUserId: "", // 当前用户 openid（用于判断能否删除自己的报名）
    myNickname: "", // 当前用户昵称（userId 为空时的回退，兼容旧数据）
    locationDisabled: false,
    isAdmin: false,
    isGuest: true,
    searchKeyword: "",
    selectedFilter: "我参与的",
    activityTypeStyles: DEFAULT_ACTIVITY_TYPE_STYLES,
    activityTypeOptionLabels: DEFAULT_ACTIVITY_TYPE_STYLES.map((item) => item.display_name || item.key),
    activityTypeOptionValues: DEFAULT_ACTIVITY_TYPE_STYLES.map((item) => normalizeTypeKey(item.key)).filter(Boolean),
    cardEntranceState: "idle",
    cardEntranceStaggerMs: 200,
    createFormContainerRendered: false,
    showCreateForm: false,
    createFormSubmitting: false,
    bottomSafeAreaRpx: 0
  },

  onLoad(options) {
    this._homeFirstFrameReady = false;
    this._cardEntranceNotBefore = 0;
    this._pendingColdStartGroupedActivities = null;
    this._coldStartCardEntranceStarted = false;
    this._cardEntranceTimer = null;
    this._cardEntranceFrameTimer = null;
    const aid = options && options.activityId;
    if (aid) {
      wx.redirectTo({
        url: `/pages/activity_detail/activity_detail?id=${encodeURIComponent(String(aid))}`
      });
      return;
    }
    this.syncGuestState();
    this.setData({ bottomSafeAreaRpx: getBottomSafeAreaRpx() });
    // 计算自定义导航栏高度
    try {
      const windowInfo = wx.getWindowInfo();
      const statusBarHeight = windowInfo.statusBarHeight || 20;
      this.setData({
        statusBarHeight,
        navBarHeight: statusBarHeight + 44
      });
    } catch (e) {
      this.setData({ statusBarHeight: 20, navBarHeight: 64 });
    }

  },

  onReady() {
    this._homeFirstFrameReady = true;
    this._cardEntranceNotBefore = Date.now() + COLD_START_CARD_ENTRANCE_DELAY_MS;
    this._scheduleColdStartCardEntrance();
  },

  onShow() {
    this._pageVisible = true;
    this._loadGeneration = (this._loadGeneration || 0) + 1;
    this.syncGuestState();
    /** 原生弹层也可能触发 show；一级抽屉仍存续时不得提前恢复 Tab。 */
    this._setTabBarHidden(!!(this.data.createFormContainerRendered || this.data.showCreateForm));
    const isAdmin = app.globalData.userRole === "admin";
    const myUserId = app.globalData.userId || wx.getStorageSync("userId") || "";
    const myNickname = (app.globalData.userProfile?.nickname || wx.getStorageSync("userNickname") || "").trim();
    this.setData({ isAdmin, myUserId, myNickname }, () => {
      this.loadActivityListByCachePolicy();
    });
    patchTabBarIfNeeded(this, {
      selected: 0,
      isAdmin: app.globalData.userRole === "admin",
    });
    this._scheduleColdStartCardEntrance();
  },

  loadActivityListByCachePolicy() {
    const metadataAge = Date.now() - cacheManager.getCacheMetadataCheckedAt();
    const metadataFresh = metadataAge >= 0 && metadataAge < CACHE_METADATA_TTL_MS;
    const usedCachedStyles = this.loadActivityTypeStylesFromCache();
    const usedCachedList = this.loadActivityListFromCache();
    const hasCompleteCache = usedCachedStyles && usedCachedList;
    const refreshMetadata = () => Promise.all([activityService.getClientConfig(), activityService.getActivityStyleSignature()])
      .then(([cfg, sigRes]) => {
        const serverVersion = String((cfg && cfg.cache_version) || "1");
        const serverSignature = String((sigRes && sigRes.signature) || "");
        const localVersion = cacheManager.getClientCacheVersion();
        const localSignature = cacheManager.getActivityStyleSignature();
        const shouldRefresh = !localVersion || !localSignature ||
          localVersion !== serverVersion || localSignature !== serverSignature;
        cacheManager.setCacheMetadataCheckedAt();

        if (shouldRefresh) {
          cacheManager.clearBusinessCaches();
          cacheManager.setClientCacheVersion(serverVersion);
          cacheManager.setActivityStyleSignature(serverSignature);
          if (usedCachedStyles) {
            return this.loadActivityTypeStyles({ forceNetwork: true })
              .then(() => this.loadActivityList({ forceNetwork: true }));
          }
        }
      });

    if (hasCompleteCache) {
      // 缓存先渲染，元数据校验和活动静默刷新均不阻塞首屏。
      this.loadActivityList({ forceNetwork: false, skipCardMediaDiagnostics: true });
      if (metadataFresh) return Promise.resolve();
      return refreshMetadata().catch((err) => console.error(err));
    }

    // 首次进入没有完整缓存时，样式、活动和元数据检查同时开始；页面只等样式与活动。
    const stylesPromise = usedCachedStyles
      ? Promise.resolve()
      : this.loadActivityTypeStyles({ forceNetwork: true });
    const rawActivitiesPromise = activityService.listActivities();
    const activitiesPromise = stylesPromise.then(() =>
      this.loadActivityList({ forceNetwork: true, responsePromise: rawActivitiesPromise })
    );
    const metadataPromise = metadataFresh ? Promise.resolve() : refreshMetadata().catch((err) => console.error(err));
    return Promise.all([stylesPromise, activitiesPromise, metadataPromise]);
  },

  onHide() {
    this._pageVisible = false;
    this._loadGeneration = (this._loadGeneration || 0) + 1;
    this._finishColdStartCardEntrance();
    this._clearCardMediaDiagnostics();
    calendarWarmup.cancelScheduledPrefetch();
    const self = this;
    const flush = () => self._setTabBarHidden(false);
    if (typeof wx !== "undefined" && typeof wx.nextTick === "function") wx.nextTick(flush);
    else flush();
  },

  onUnload() {
    this._pageVisible = false;
    this._loadGeneration = (this._loadGeneration || 0) + 1;
    if (this._cardEntranceTimer) clearTimeout(this._cardEntranceTimer);
    if (this._cardEntranceFrameTimer) clearTimeout(this._cardEntranceFrameTimer);
    this._cardEntranceTimer = null;
    this._cardEntranceFrameTimer = null;
    this._pendingColdStartGroupedActivities = null;
    calendarWarmup.cancelScheduledPrefetch();
    this._clearCardMediaDiagnostics();
    const self = this;
    const flush = () => self._setTabBarHidden(false);
    if (typeof wx !== "undefined" && typeof wx.nextTick === "function") wx.nextTick(flush);
    else flush();
  },

  _setTabBarHidden(hidden, { animate = false } = {}) {
    if (typeof this.getTabBar !== "function") return;
    const tabBar = this.getTabBar();
    if (!tabBar || typeof tabBar.setData !== "function") return;
    if (typeof tabBar.setHidden === "function") {
      tabBar.setHidden(!!hidden, { animate: !!animate });
      return;
    }
    tabBar.setData({ hidden: !!hidden });
  },

  _hasRenderableCards(groupedActivities) {
    const groups = groupedActivities || {};
    return ["joined", "accepting", "notStarted", "ended"]
      .some((group) => Array.isArray(groups[group]) && groups[group].length > 0);
  },

  _buildGroupSectionVisibility(groupedActivities) {
    const groups = groupedActivities || {};
    return Object.keys(groups).reduce((visibility, group) => {
      visibility[group] = Array.isArray(groups[group]) && groups[group].length > 0;
      return visibility;
    }, {});
  },

  _prepareColdStartCardPresentation(groupedActivities) {
    const groupSectionVisibility = this._buildGroupSectionVisibility(groupedActivities);
    if (!this._hasRenderableCards(groupedActivities) || this._coldStartCardEntranceStarted) {
      return {
        groupedActivities,
        cardEntranceState: this.data.cardEntranceState || "idle",
        groupSectionVisibility
      };
    }
    this._pendingColdStartGroupedActivities = groupedActivities;
    this._scheduleColdStartCardEntrance();
    return {
      groupedActivities: this.data.groupedActivities,
      cardEntranceState: "idle",
      groupSectionVisibility
    };
  },

  _scheduleColdStartCardEntrance() {
    if (
      this._coldStartCardEntranceStarted ||
      this._cardEntranceTimer ||
      !this._homeFirstFrameReady ||
      !this._pendingColdStartGroupedActivities ||
      this._pageVisible === false
    ) return;
    const waitMs = Math.max(0, (this._cardEntranceNotBefore || Date.now()) - Date.now());
    this._cardEntranceTimer = setTimeout(() => {
      this._cardEntranceTimer = null;
      this._revealColdStartCards();
    }, waitMs);
  },

  _revealColdStartCards() {
    if (
      this._coldStartCardEntranceStarted ||
      !this._pendingColdStartGroupedActivities ||
      this._pageVisible === false
    ) return;
    const groupedActivities = this._pendingColdStartGroupedActivities;
    this._pendingColdStartGroupedActivities = null;
    this._coldStartCardEntranceStarted = true;
    this.setData({ groupedActivities, cardEntranceState: "pending" }, () => {
      const enter = () => {
        if (this._pageVisible === false || this.data.cardEntranceState !== "pending") return;
        this._cardEntranceFrameTimer = setTimeout(() => {
          this._cardEntranceFrameTimer = null;
          if (this._pageVisible === false || this.data.cardEntranceState !== "pending") return;
          this.setData({ cardEntranceState: "entered" });
        }, COLD_START_CARD_ENTRANCE_FRAME_MS);
      };
      if (typeof wx !== "undefined" && typeof wx.nextTick === "function") wx.nextTick(enter);
      else enter();
    });
  },

  _finishColdStartCardEntrance() {
    if (this._cardEntranceTimer) {
      clearTimeout(this._cardEntranceTimer);
      this._cardEntranceTimer = null;
    }
    if (this._cardEntranceFrameTimer) {
      clearTimeout(this._cardEntranceFrameTimer);
      this._cardEntranceFrameTimer = null;
    }
    if (this._coldStartCardEntranceStarted && this.data.cardEntranceState === "pending") {
      this.setData({ cardEntranceState: "entered" });
    }
  },

  _clearCardMediaDiagnostics() {
    if (this._cardMediaDiagWarnTimer) {
      clearTimeout(this._cardMediaDiagWarnTimer);
      this._cardMediaDiagWarnTimer = null;
    }
    if (this._cardMediaDiagErrorTimer) {
      clearTimeout(this._cardMediaDiagErrorTimer);
      this._cardMediaDiagErrorTimer = null;
    }
    this._cardMediaDiagnostics = null;
  },

  _ensureTrackedCardMedia(meta) {
    const session = this._cardMediaDiagnostics;
    if (!session) return null;

    const key = buildCardMediaKey(meta);
    if (!session.items[key]) {
      session.items[key] = {
        ...meta,
        key,
        status: "pending",
        registeredAt: Date.now()
      };
    }
    return session.items[key];
  },

  _startCardMediaDiagnostics(list, groupedActivities, focusMap) {
    this._clearCardMediaDiagnostics();

    const fm = focusMap || this.data.focusedCardIndex || {};
    const focusedIndexFor = (group) => {
      const v = fm[group];
      return typeof v === "number" ? v : 0;
    };

    const groups = groupedActivities || { joined: [], accepting: [], notStarted: [], ended: [] };
    const traceId = createTraceId("card-media");
    const startedAt = Date.now();
    let deviceInfo = {};
    try {
      const device = typeof wx.getDeviceInfo === "function" ? wx.getDeviceInfo() : {};
      const windowInfo = typeof wx.getWindowInfo === "function" ? wx.getWindowInfo() : {};
      deviceInfo = {
        brand: device.brand || "",
        model: device.model || "",
        system: device.system || "",
        platform: device.platform || "",
        benchmarkLevel: device.benchmarkLevel,
        windowWidth: windowInfo.windowWidth,
        windowHeight: windowInfo.windowHeight,
        pixelRatio: windowInfo.pixelRatio
      };
    } catch (err) {}
    const items = {};
    const groupSummary = {};
    let imageCount = 0;
    let videoCount = 0;
    let avatarCount = 0;

    const registerItem = (meta) => {
      const key = buildCardMediaKey(meta);
      if (items[key]) return;
      items[key] = {
        ...meta,
        key,
        status: "pending",
        registeredAt: Date.now()
      };
      if (meta.mediaType === "image") {
        imageCount += 1;
      } else if (meta.mediaType === "video") {
        videoCount += 1;
      }
    };

    ["joined", "accepting", "notStarted", "ended"].forEach((group) => {
      const cards = Array.isArray(groups[group]) ? groups[group] : [];
      const cardSize = group === "joined" ? "large" : "small";
      groupSummary[group] = {
        cards: cards.length,
        images: 0,
        videos: 0,
        avatars: 0
      };

      cards.forEach((activity, index) => {
        const imageUrl = cardSize === "large"
          ? activity.largeCardBgImageUrl
          : activity.smallCardBgImageUrl;
        if (imageUrl && index === focusedIndexFor(group)) {
          registerItem({
            mediaType: "image",
            group,
            cardSize,
            activityId: String(activity._id != null ? activity._id : ""),
            activityName: activity.name || "",
            url: imageUrl
          });
          groupSummary[group].images += 1;
        }
        if (activity.bgVideoUrl && index === focusedIndexFor(group)) {
          registerItem({
            mediaType: "video",
            group,
            cardSize,
            activityId: String(activity._id != null ? activity._id : ""),
            activityName: activity.name || "",
            url: activity.bgVideoUrl
          });
          groupSummary[group].videos += 1;
        }
        const cardAvatarCount = Array.isArray(activity.cardAvatars) ? activity.cardAvatars.length : 0;
        avatarCount += cardAvatarCount;
        groupSummary[group].avatars += cardAvatarCount;
      });
    });

    this._cardMediaDiagnostics = {
      traceId,
      startedAt,
      items,
      groupSummary,
      totalCards: Array.isArray(list) ? list.length : 0,
      deviceInfo,
      resolvedLogged: false
    };

    logInfo("activity_card_media_scan", {
      traceId,
      totalActivities: Array.isArray(list) ? list.length : 0,
      trackedImages: imageCount,
      trackedVideos: videoCount,
      trackedAvatars: avatarCount,
      device: deviceInfo,
      groups: groupSummary
    });

    this._cardMediaDiagWarnTimer = setTimeout(() => {
      this._reportPendingCardMedia("warn");
    }, CARD_MEDIA_DIAG_WARN_MS);

    this._cardMediaDiagErrorTimer = setTimeout(() => {
      this._reportPendingCardMedia("error");
    }, CARD_MEDIA_DIAG_ERROR_MS);
  },

  _reportPendingCardMedia(level) {
    const session = this._cardMediaDiagnostics;
    if (!session) return;

    const items = Object.values(session.items || {});
    const pending = items.filter((item) => item.status === "pending");
    if (!pending.length) {
      logInfo("activity_card_media_settled", {
        traceId: session.traceId,
        duration: Date.now() - session.startedAt,
        tracked: items.length,
        loaded: items.filter((item) => item.status === "loaded").length,
        failed: items.filter((item) => item.status === "error").length
      });
      return;
    }

    const pendingImages = pending.filter((item) => item.mediaType === "image");
    const pendingVideos = pending.filter((item) => item.mediaType === "video");
    const payload = {
      traceId: session.traceId,
      duration: Date.now() - session.startedAt,
      pendingImages: pendingImages.length,
      pendingVideos: pendingVideos.length,
      sample: pending.slice(0, 6).map((item) => ({
        mediaType: item.mediaType,
        group: item.group,
        cardSize: item.cardSize,
        activityId: item.activityId,
        activityName: item.activityName,
        url: item.url
      }))
    };

    if (level === "error") {
      logError("activity_card_media_stalled", payload);
      return;
    }

    logInfo("activity_card_media_pending", payload);
  },

  _markCardMediaEvent(meta, status, detail) {
    const session = this._cardMediaDiagnostics;
    if (!session) return;

    const item = this._ensureTrackedCardMedia(meta);
    if (!item) return;

    const wasPending = item.status === "pending";
    item.status = status;
    item.updatedAt = Date.now();
    if (detail) {
      item.detail = detail;
    }

    if (status === "error") {
      logError("activity_card_media_error", {
        traceId: session.traceId,
        mediaType: item.mediaType,
        group: item.group,
        cardSize: item.cardSize,
        activityId: item.activityId,
        activityName: item.activityName,
        url: item.url,
        summary: summarizeError(detail || {})
      });
    } else if (wasPending) {
      logInfo("activity_card_media_loaded", {
        traceId: session.traceId,
        mediaType: item.mediaType,
        group: item.group,
        cardSize: item.cardSize,
        activityId: item.activityId,
        activityName: item.activityName
      });
    }

    const hasPending = Object.values(session.items).some((entry) => entry.status === "pending");
    if (!hasPending) {
      if (this._cardMediaDiagWarnTimer) {
        clearTimeout(this._cardMediaDiagWarnTimer);
        this._cardMediaDiagWarnTimer = null;
      }
      if (this._cardMediaDiagErrorTimer) {
        clearTimeout(this._cardMediaDiagErrorTimer);
        this._cardMediaDiagErrorTimer = null;
      }
      if (!session.resolvedLogged) {
        session.resolvedLogged = true;
        logInfo("activity_card_media_all_resolved", {
          traceId: session.traceId,
          duration: Date.now() - session.startedAt,
          loaded: Object.values(session.items).filter((entry) => entry.status === "loaded").length,
          failed: Object.values(session.items).filter((entry) => entry.status === "error").length
        });
      }
    }
  },

  _syncVideoFocus(group, oldIndex, newIndex) {
    const previousIndex = typeof oldIndex === "number" ? oldIndex : 0;
    const nextIndex = typeof newIndex === "number" ? newIndex : previousIndex;
    if (previousIndex === nextIndex) return;

    try {
      wx.createVideoContext(`vid-${group}-${previousIndex}`, this).stop();
    } catch (e) {}

    setTimeout(() => {
      try {
        wx.createVideoContext(`vid-${group}-${nextIndex}`, this).play();
      } catch (e) {}
    }, 30);
  },

  onGroupSwiperChange(e) {
    const group = e.currentTarget && e.currentTarget.dataset
      ? String(e.currentTarget.dataset.group || "")
      : "";
    if (!group || !Object.prototype.hasOwnProperty.call(this.data.focusedCardIndex, group)) return;
    const current = Math.max(0, Math.floor(Number(e.detail && e.detail.current) || 0));
    const previous = Number(this.data.focusedCardIndex[group]) || 0;
    this.setData({ [`focusedCardIndex.${group}`]: current }, () => {
      this._syncVideoFocus(group, previous, current);
      const endedCount = (this.data.groupedActivities.ended || []).length;
      if (group === "ended" && this.data.endedHasMore && current === endedCount) {
        this.loadMoreEndedActivities();
      }
    });
  },

  /** 「已结束」横向滑到末尾加载格或点击加载格 */
  onEndedHorizontalLoadMore() {
    this.loadMoreEndedActivities();
  },

  onMainScroll(e) {
    const scrollTop = (e && e.detail && typeof e.detail.scrollTop === "number") ? e.detail.scrollTop : null;

    // 节流：避免日志刷屏
    const now = Date.now();
    if (this._lastScrollLogAt && now - this._lastScrollLogAt < 350) return;
    this._lastScrollLogAt = now;

    if (this._didMeasureAtScrollTop0 == null && (scrollTop === 0 || (scrollTop != null && scrollTop < 2))) {
      this._didMeasureAtScrollTop0 = true;
    }

    // 在滚动接近 0 / 50 / 120 这些点采样一次布局，用于判断“顶部是否跟随滚动”和 Logo 层级
    const shouldMeasure =
      this._lastMeasuredBucket == null ||
      (scrollTop != null && Math.abs(scrollTop - (this._lastMeasuredScrollTop || 0)) > 60);
    if (!shouldMeasure) return;
    this._lastMeasuredScrollTop = scrollTop || 0;
    this._lastMeasuredBucket = Math.round((scrollTop || 0) / 60);

    const q = wx.createSelectorQuery();
    q.select(".custom-navbar").boundingClientRect();
    q.select(".page-watermark").boundingClientRect();
    q.select(".group-section").boundingClientRect();
    q.select(".group-section .group-header").boundingClientRect();
    q.select(".navbar-inner").boundingClientRect();
    q.select(".navbar-title").boundingClientRect();
    q.select(".large-card").boundingClientRect();
    q.select(".small-card").boundingClientRect();
    q.selectAll(".group-section").boundingClientRect();
    q.selectAll("video.card-video-bg").boundingClientRect();
    q.selectAll(".card-type-label-sm").boundingClientRect();
    q.selectAll(".glass-meta-icon-img").boundingClientRect();
    q.select(".group-section .group-header").boundingClientRect();
    q.select(".group-section .card-datetime-label").boundingClientRect();
    q.select(".large-card").boundingClientRect();
    q.select(".avatar-tl").boundingClientRect();
    q.select(".avatar-tr").boundingClientRect();
    q.select(".avatar-mid").boundingClientRect();
    q.select(".small-card").boundingClientRect();
    q.select(".avatar-tl-sm").boundingClientRect();
    q.select(".avatar-tr-sm").boundingClientRect();
    q.select(".avatar-mid-sm").boundingClientRect();
    q.exec((res) => {
      const navbarRect = res && res[0] ? res[0] : null;
      const logoRect = res && res[1] ? res[1] : null;
      const firstGroupRect = res && res[2] ? res[2] : null;
      const firstGroupHeaderRect = res && res[3] ? res[3] : null;
      const navbarInnerRect = res && res[4] ? res[4] : null;
      const navbarTitleRect = res && res[5] ? res[5] : null;
      const largeCardRect = res && res[6] ? res[6] : null;
      const smallCardRect = res && res[7] ? res[7] : null;
      const allGroupRects = res && res[8] ? res[8] : null;
      const allVideoRects = res && res[9] ? res[9] : null;
      const allSmallTypeLabelRects = res && res[10] ? res[10] : null;
      const allGlassMetaIconRects = res && res[11] ? res[11] : null;
      const firstGroupHeaderRect2 = res && res[12] ? res[12] : null;
      const firstCardDateLabelRect = res && res[13] ? res[13] : null;
      const largeCardRect2 = res && res[14] ? res[14] : null;
      const avatarTlRect = res && res[15] ? res[15] : null;
      const avatarTrRect = res && res[16] ? res[16] : null;
      const avatarMidRect = res && res[17] ? res[17] : null;
      const smallCardRect2 = res && res[18] ? res[18] : null;
      const avatarTlSmRect = res && res[19] ? res[19] : null;
      const avatarTrSmRect = res && res[20] ? res[20] : null;
      const avatarMidSmRect = res && res[21] ? res[21] : null;

      const gapNavbarToFirstGroup = (navbarRect && firstGroupRect)
        ? (firstGroupRect.top - navbarRect.bottom)
        : null;
      const gapNavbarToFirstGroupHeader = (navbarRect && firstGroupHeaderRect)
        ? (firstGroupHeaderRect.top - navbarRect.bottom)
        : null;
    });
  },

  /** 首页列表强制走网络刷新（scroll-view 内须用 refresher；游客态同样可下拉拉新） */
  runListPullRefresh() {
    this.syncGuestState();
    const myUserId = app.globalData.userId || wx.getStorageSync("userId") || "";
    const myNickname = (app.globalData.userProfile?.nickname || wx.getStorageSync("userNickname") || "").trim();
    this.setData({ isAdmin: app.globalData.userRole === "admin", myUserId, myNickname });
    return Promise.all([
      this.loadActivityTypeStyles({ forceNetwork: true }),
      this.loadActivityList({ forceNetwork: true, skipPullOverlayLoading: true })
    ]);
  },

  onMainRefresherPulling(e) {
    const dy = e.detail && typeof e.detail.dy === "number" ? e.detail.dy : 0;
    if (this.data.mainRefresherTriggered) return;
    const hint = dy >= MAIN_REFRESH_THRESHOLD_PX ? "松手刷新" : "下拉刷新";
    if (hint !== this.data.mainRefresherHint) {
      this.setData({ mainRefresherHint: hint });
    }
  },

  onMainRefresherRestore() {
    if (!this.data.mainRefresherTriggered && this.data.mainRefresherHint !== "下拉刷新") {
      this.setData({ mainRefresherHint: "下拉刷新" });
    }
  },

  onMainRefresherRefresh() {
    this.setData({ mainRefresherTriggered: true, mainRefresherHint: "刷新中…" });
    this.runListPullRefresh().finally(() => {
      this.setData({ mainRefresherTriggered: false, mainRefresherHint: "下拉刷新" });
    });
  },

  // 保留：若将来去掉外层 scroll-view 可再打开页面级下拉
  onPullDownRefresh() {
    this.runListPullRefresh().finally(() => wx.stopPullDownRefresh());
  },

  syncGuestState() {
    const hasWeChatAuth = !!wx.getStorageSync("hasWeChatAuth");
    const isAuthenticated = app.globalData.isAuthenticated;
    // 未完成登录或未获取访问权限，都视为游客
    const isGuest = !hasWeChatAuth || !isAuthenticated;
    this.setData({ isGuest });

    return isGuest;
  },

  _applyActivityTypeStyles(styles) {
    const optionValues = styles.map((item) => normalizeTypeKey(item.key)).filter(Boolean);
    const optionLabels = styles.map((item) => String(item.display_name || item.key || ""));
    this.setData({
      activityTypeStyles: styles,
      activityTypeOptionValues: optionValues,
      activityTypeOptionLabels: optionLabels
    });
  },

  loadActivityTypeStylesFromCache() {
    const cached = cacheManager.getCachedActivityTypeStyles();
    const styles = cached && Array.isArray(cached.styles) ? cached.styles : [];
    if (!styles.length) return false;
    this._applyActivityTypeStyles(styles);
    return true;
  },

  loadActivityTypeStyles(options = {}) {
    if (!options.forceNetwork && this.loadActivityTypeStylesFromCache()) {
      return Promise.resolve();
    }
    return activityService
      .listActivityTypeStyles()
      .then((res) => {
        const styles = Array.isArray(res) && res.length > 0 ? res : DEFAULT_ACTIVITY_TYPE_STYLES;
        cacheManager.setCachedActivityTypeStyles(styles);
        this._applyActivityTypeStyles(styles);
      })
      .catch(() => {
        this._applyActivityTypeStyles(DEFAULT_ACTIVITY_TYPE_STYLES);
      });
  },

  buildEndedStreamState(groupedActivities, visibleCount) {
    const grouped = groupedActivities || { joined: [], accepting: [], notStarted: [], ended: [] };
    const allEndedActivities = Array.isArray(grouped.ended) ? grouped.ended : [];
    const nextVisibleCount = Math.min(
      allEndedActivities.length,
      Math.max(ENDED_ACTIVITY_PAGE_SIZE, Number(visibleCount) || ENDED_ACTIVITY_PAGE_SIZE)
    );
    const visibleEnded = allEndedActivities.slice(0, nextVisibleCount);
    const endedHasMore = nextVisibleCount < allEndedActivities.length;
    return {
      groupedActivities: {
        ...grouped,
        ended: visibleEnded
      },
      allEndedActivities,
      endedHasMore
    };
  },

  loadMoreEndedActivities() {
    const allEndedActivities = this.data.allEndedActivities || [];
    const currentEnded = (this.data.groupedActivities && this.data.groupedActivities.ended) || [];
    if (this.data.endedLoadingMore || currentEnded.length >= allEndedActivities.length) {
      return;
    }

    const nextVisibleCount = Math.min(allEndedActivities.length, currentEnded.length + ENDED_ACTIVITY_PAGE_SIZE);
    const visibleEnded = allEndedActivities.slice(0, nextVisibleCount);
    const endedHasMore = nextVisibleCount < allEndedActivities.length;
    const groupedActivities = {
      ...this.data.groupedActivities,
      ended: visibleEnded
    };
    this.setData({
      groupedActivities,
      endedHasMore,
      endedLoadingMore: false
    });
  },

  loadActivityListFromCache() {
    const cached = cacheManager.getCachedActivityList();
    const list = cached && Array.isArray(cached.list) ? cached.list : [];
    if (!list.length) return false;
    const myUserId = this.data.myUserId || "";
    const myNickname = (this.data.myNickname || "").trim();
    const cacheUserId = String((cached && cached.userId) || "");
    // 缓存绑定了某个用户：当前未登录（myUserId 为空）或换了账号，均丢弃缓存
    if (cacheUserId && (!myUserId || cacheUserId !== String(myUserId))) {
      return false;
    }
    const listWithFlags = reapplyListParticipationFlags(list, myUserId, myNickname);
    cacheManager.setCachedActivityList(listWithFlags, myUserId);
    const { selectedFilter, searchKeyword } = this.data;
    const filtered = this.computeFilteredList(listWithFlags, selectedFilter, searchKeyword);
    const fullGroupedActivities = this.computeGroupedActivities(listWithFlags);
    const endedStream = this.buildEndedStreamState(fullGroupedActivities, ENDED_ACTIVITY_PAGE_SIZE);
    const groupedActivities = endedStream.groupedActivities;
    const focusReset = { joined: 0, accepting: 0, notStarted: 0, ended: 0 };
    const cardPresentation = this._prepareColdStartCardPresentation(groupedActivities);
    // 须在 setData 回调之前创建 session，否则缓存命中的首帧 bindload 可能早于回调，导致事件丢弃并误报 stalled（H1）
    this._startCardMediaDiagnostics(listWithFlags, groupedActivities, focusReset);
    this.setData({
      activityList: listWithFlags,
      filteredList: filtered,
      groupedActivities: cardPresentation.groupedActivities,
      allEndedActivities: endedStream.allEndedActivities,
      endedHasMore: endedStream.endedHasMore,
      endedLoadingMore: false,
      focusedCardIndex: focusReset,
      cardEntranceState: cardPresentation.cardEntranceState,
      groupSectionVisibility: cardPresentation.groupSectionVisibility
    }, () => this._scheduleColdStartCardEntrance());
    return true;
  },

  loadActivityList(options = {}) {
    const generation = options.generation == null ? (this._loadGeneration || 0) : options.generation;
    if (this._pageVisible === false || generation !== (this._loadGeneration || 0)) return Promise.resolve();
    this._clearCardMediaDiagnostics();
    if (options.forceNetwork && !options.skipPullOverlayLoading) {
      wx.showLoading({ title: "加载中..." });
    }
    return (options.responsePromise || activityService.listActivities())
      .then((res) => this.processActivityList(res || [], new Date()))
      .then(result => {
        if (this._pageVisible === false || generation !== (this._loadGeneration || 0)) return;
        if (result) {
          const { list } = result;
          const { selectedFilter, searchKeyword } = this.data;
          const filtered = this.computeFilteredList(list, selectedFilter, searchKeyword);
          const fullGroupedActivities = this.computeGroupedActivities(list);
          const endedStream = this.buildEndedStreamState(fullGroupedActivities, ENDED_ACTIVITY_PAGE_SIZE);
          const groupedActivities = endedStream.groupedActivities;
          const focusReset = { joined: 0, accepting: 0, notStarted: 0, ended: 0 };
          const cardPresentation = this._prepareColdStartCardPresentation(groupedActivities);
          if (!options.skipCardMediaDiagnostics) {
            this._startCardMediaDiagnostics(list, groupedActivities, focusReset);
          }
          this.setData({
            activityList: list,
            filteredList: filtered,
            groupedActivities: cardPresentation.groupedActivities,
            allEndedActivities: endedStream.allEndedActivities,
            endedHasMore: endedStream.endedHasMore,
            endedLoadingMore: false,
            focusedCardIndex: focusReset,
            cardEntranceState: cardPresentation.cardEntranceState,
            groupSectionVisibility: cardPresentation.groupSectionVisibility
          }, () => this._scheduleColdStartCardEntrance());
          cacheManager.setCachedActivityList(list, this.data.myUserId || "");

          wx.nextTick(() => {
            calendarWarmup.schedulePrefetchSignedUpList(app);
          });

          if (options.forceNetwork && !options.skipPullOverlayLoading) wx.hideLoading();

        }
      })
      .catch(err => {
        if (this._pageVisible === false || generation !== (this._loadGeneration || 0)) return;
        console.error(err);
        if (options.forceNetwork && !options.skipPullOverlayLoading) wx.hideLoading();
        // 测试环境切换后常见：本地缓存 token 对应的用户不在当前库中
        if (err && err.statusCode === 404 && String(err.message || "").includes("User not found")) {
          app.logout();
          this.syncGuestState();
          wx.showToast({ title: "测试环境用户不存在，请重新登录", icon: "none", duration: 2500 });
          wx.switchTab({ url: "/pages/profile/profile" });
          return;
        }
        wx.showToast({ title: "加载失败", icon: "none" });
      });
  },

  processActivityList(resData, now) {
    const myUserId = String(this.data.myUserId || "").trim();
    const myNickname = (this.data.myNickname || "").trim();
    const typeStyleMap = buildTypeStyleMap(this.data.activityTypeStyles);

    const list = (resData || []).map(rawItem => {
      const activity = adaptActivity(rawItem);

      const rawType = activity._rawActivityType;
      const normalizedType = normalizeActivityTypeByMap(rawType, typeStyleMap);
      activity.activityType = normalizedType;
      const selectedStyle = resolveStyleByTypeAndKey(activity.activityType, activity.activityStyleKey, typeStyleMap);
      activity.activityStyleKey = selectedStyle ? selectedStyle.styleKey : "";
      activity.typeBadgeLabel = selectedStyle ? selectedStyle.badgeLabel : "";
      activity.showTypeBadge = selectedStyle ? (!!selectedStyle.showBadge && !!selectedStyle.badgeLabel) : false;
      activity.showAvatarCluster = selectedStyle ? !!selectedStyle.showAvatarCluster : false;
      activity.bgVideoUrl = selectedStyle ? (selectedStyle.bgVideoUrl || "") : "";
      activity.largeCardBgImageUrl = selectedStyle ? (selectedStyle.largeCardBgImageUrl || "") : "";
      activity.largeCardGlassImageUrl = selectedStyle ? (selectedStyle.largeCardGlassImageUrl || "") : "";
      activity.smallCardBgImageUrl = selectedStyle ? (selectedStyle.smallCardBgImageUrl || "") : "";
      let signupDeadline = activity.signupDeadline;
      if (!signupDeadline && activity.startTime) {
        const base = new Date(activity.startTime.replace(" ", "T") + ":00");
        if (!isNaN(base.getTime())) {
          const dl = new Date(base.getTime() - 60 * 60 * 1000);
          signupDeadline = `${dl.getFullYear()}-${pad(dl.getMonth() + 1)}-${pad(dl.getDate())} ${pad(dl.getHours())}:${pad(dl.getMinutes())}`;
        }
      }
      activity.signupDeadline = signupDeadline;

      // 计算开始时间与报名截止时间对应的周几标签，用于前端展示
      activity.startWeekdayLabel = getWeekdayLabel(activity.startTime || activity.date);
      activity.signupDeadlineWeekdayLabel = getWeekdayLabel(signupDeadline);

      // 大卡顶部时间：MM-DD 周几 HH:mm-HH:mm
      const formatRangeLabel = () => {
        const start = activity.startTime;
        if (!start) return "";
        const s = String(start);
        const datePart = s.split(" ")[0] || "";
        const timePart = s.split(" ")[1] || "";
        const mmdd = datePart ? datePart.slice(5) : "";
        const weekday = activity.startWeekdayLabel || "";
        const startHm = timePart ? timePart.slice(0, 5) : "";
        const end = activity.endTime ? String(activity.endTime) : "";
        const endHm = end.split(" ")[1] ? end.split(" ")[1].slice(0, 5) : "";
        if (!mmdd || !startHm) return "";
        return `${mmdd} ${weekday} ${startHm}${endHm ? `-${endHm}` : ""}`;
      };
      activity.cardDateTimeLabel = formatRangeLabel();
      activity.smallCardTimeLabel = formatRangeLabel();

      let hasSignedUp = false;
      let hasCheckedIn = false;
      let checkinCount = 0;
      const rawParticipants = orderParticipantsForRecentAvatarSlice(activity.participants || []);
      const avatarList = [];

      rawParticipants.forEach(p => {
        if (typeof p === "object" && p !== null) {
          const uidStr = p.userId != null ? String(p.userId) : "";
          const name = (p.name || "").trim();
          const checkedIn = !!p.checkedInAt;
          if (checkedIn) {
            checkinCount += 1;
          }
          const avatarUrl = normalizeAvatarUrl(p.avatarUrl);
          const hasCustomAvatar = avatarUrl !== DEFAULT_AVATAR;
          avatarList.push({
            url: avatarUrl,
            isDefault: !hasCustomAvatar
          });
          if (myUserId && uidStr && uidStr === myUserId) {
            hasSignedUp = true;
            if (checkedIn) {
              hasCheckedIn = true;
            }
          } else if (myNickname && name === myNickname) {
            hasSignedUp = true;
            if (checkedIn) {
              hasCheckedIn = true;
            }
          }
        } else if (typeof p === "string") {
          avatarList.push({
            url: DEFAULT_AVATAR,
            isDefault: true
          });
          if (myNickname && p === myNickname) {
            hasSignedUp = true;
          }
        }
      });
      activity.hasSignedUp = hasSignedUp;
      activity.hasCheckedIn = hasCheckedIn;
      activity.checkinCount = checkinCount;
      activity.avatarList = avatarList;
      // 卡片头像：按 created_at 升序生成 avatarList 后取末尾 3 人 = 最近报名；与大卡 TL>TR>Mid 索引一致
      activity.cardAvatars = avatarList.slice(-3);

      // 是否已满员（仅在设置了人数上限时生效）
      const max = activity.maxParticipants;
      const currentCount = rawParticipants.length;
      activity.isFull = max != null && currentCount >= max;

      // 报名是否已截止（受报名开关与截止时间共同控制）
      let isSignupClosed = false;
      if (activity.signupEnabled === false) {
        isSignupClosed = true;
      } else if (signupDeadline) {
        const dl = new Date(signupDeadline.replace(" ", "T") + ":00");
        if (!isNaN(dl.getTime())) {
          isSignupClosed = now.getTime() >= dl.getTime();
        }
      }
      activity.isSignupClosed = isSignupClosed;

      // 基于时间自动更新状态（已取消、已删除、已流局不参与自动推算，避免删除后又显示为未开始）
      const parseDateTime = (s) => new Date(s.replace(" ", "T") + ":00");
      const start = parseDateTime(activity.startTime);
      const end = parseDateTime(activity.endTime);
      let autoStatus = activity.status || "未开始";
      if (activity.status === "已取消" || activity.status === "已删除" || activity.status === "已流局") {
        autoStatus = activity.status;
      } else if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        if (now.getTime() < start.getTime()) {
          autoStatus = "未开始";
        } else if (now.getTime() < end.getTime()) {
          autoStatus = "进行中";
        } else {
          autoStatus = "已结束";
        }
      }

      if (activity.status !== "已取消" && activity.status !== "已删除" && activity.status !== "已流局") {
        activity.status = autoStatus;
      }

      return activity;
    });

    return { list };
  },

  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value });
    this.filterActivities();
  },

  onFilterChange(e) {
    const filter = e.currentTarget.dataset.filter;
    this.setData({ selectedFilter: filter });
    this.filterActivities();
  },

  computeFilteredList(list, selectedFilter, searchKeyword) {
    // 逻辑删除的活动不在任何 Tab 展示
    let filtered = list ? list.filter(item => item.status !== "已删除") : [];

    if (selectedFilter === "我参与的") {
      // 只看当前用户参与过的活动（已通过 hasSignedUp 标记）
      filtered = filtered.filter(item => item.hasSignedUp);
    } else if (selectedFilter && selectedFilter !== "全部") {
      // 其他筛选仍按状态过滤
      filtered = filtered.filter(item => item.status === selectedFilter);
    }
    if (searchKeyword && searchKeyword.trim()) {
      const keyword = searchKeyword.trim().toLowerCase();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(keyword) ||
        (item.remark && item.remark.toLowerCase().includes(keyword))
      );
    }
    return filtered;
  },

  filterActivities() {
    const { activityList, searchKeyword, selectedFilter } = this.data;
    const filtered = this.computeFilteredList(activityList, selectedFilter, searchKeyword);
    this.setData({ filteredList: filtered });
  },

  // 四分组计算（全局去重，优先级：我参与的 > 接受报名 > 未开始 > 已结束）
  computeGroupedActivities(list) {
    const sortByStart = (a, b) =>
      new Date((a.startTime || "").replace(" ", "T") + ":00") -
      new Date((b.startTime || "").replace(" ", "T") + ":00");
    const sortByStartDesc = (a, b) =>
      new Date((b.startTime || "").replace(" ", "T") + ":00") -
      new Date((a.startTime || "").replace(" ", "T") + ":00");

    const usedIds = new Set();
    const valid = (list || []).filter(a => a.status !== "已取消" && a.status !== "已删除" && a.status !== "已流局");

    // 1. 我参与的：已报名且未结束（已结束的归入下方「已结束」区，避免历史活动占大卡位）
    const joined = valid.filter((a) => a.hasSignedUp && a.status !== "已结束").sort(sortByStart);
    joined.forEach((a) => usedIds.add(a._id));

    // 2. 接受报名：未开始 + 报名未截止 + 开关开启 + 未满员 + 未报名
    const accepting = valid
      .filter(a => !usedIds.has(a._id) &&
        a.status === "未开始" &&
        !a.isSignupClosed &&
        a.signupEnabled !== false &&
        !a.isFull &&
        !a.hasSignedUp)
      .sort(sortByStart);
    accepting.forEach(a => usedIds.add(a._id));

    // 3. 未开始：状态未开始且不在接受报名中
    const notStarted = valid
      .filter(a => !usedIds.has(a._id) && a.status === "未开始")
      .sort(sortByStart);
    notStarted.forEach(a => usedIds.add(a._id));

    // 4. 已结束：按开始时间降序
    const ended = valid
      .filter(a => !usedIds.has(a._id) && a.status === "已结束")
      .sort(sortByStartDesc);

    return { joined, accepting, notStarted, ended };
  },

  // 管理员：首页只负责创建活动，编辑入口统一放在活动详情页。
  showCreateModal() {
    if (this.data.showCreateForm || this.data.createFormSubmitting) return;
    this._setTabBarHidden(true);
    this.setData({
      createFormContainerRendered: true,
      showCreateForm: false,
      createFormSubmitting: false
    }, () => {
      wx.nextTick(() => this.setData({ showCreateForm: true }));
    });
  },

  closeCreateForm() {
    if (this.data.createFormSubmitting) return;
    this.setData({ showCreateForm: false });
  },

  onCreateFormAfterLeave() {
    if (!this.data.showCreateForm) {
      this.setData({ createFormContainerRendered: false });
      this._setTabBarHidden(false, { animate: true });
    }
  },

  submitCreateActivity(e) {
    if (this.data.createFormSubmitting) return;
    const payload = e && e.detail && e.detail.payload;
    if (!payload) {
      wx.showToast({ title: "活动信息缺失", icon: "none" });
      return;
    }
    this.setData({ createFormSubmitting: true });
    wx.showLoading({ title: "创建中...", mask: true });
    activityService.createActivity(payload)
      .then(() => {
        wx.hideLoading();
        wx.showToast({ title: "创建成功", icon: "success" });
        this.setData({
          showCreateForm: false,
          createFormSubmitting: false
        });
        return this.loadActivityList();
      })
      .catch((error) => {
        console.error(error);
        wx.hideLoading();
        this.setData({ createFormSubmitting: false });
        wx.showToast({ title: (error && error.message) || "创建失败", icon: "none" });
      });
  },

  // 管理员：逻辑删除已取消的活动（标记为已删除，列表中不再展示）
  logicalDeleteActivity(e) {
    const activity = e.currentTarget.dataset.activity;
    if (!activity || !activity._id) return;
    if (activity.status !== "已取消") return;
    wx.showModal({
      title: "确认删除",
      content: "确定要删除该活动吗？删除后将不再在列表中展示。",
      success: (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: "处理中..." });
        activityService
          .updateActivity(activity._id, { status: "已删除" })
          .then(() => {
            wx.hideLoading();
            wx.showToast({ title: "已删除", icon: "success" });
            this.loadActivityList();
          })
          .catch((err) => {
            console.error(err);
            wx.hideLoading();
            wx.showToast({ title: (err && err.message) || "操作失败", icon: "none" });
          });
      }
    });
  },

  // 管理员：从列表卡片取消活动（标记为已取消，不删除数据）
  cancelActivityFromCard(e) {
    const activity = e.currentTarget.dataset.activity;
    if (!activity || !activity._id) return;
    if (activity.status === "已取消") return;
    wx.showModal({
      title: "确认取消活动",
      content: `确定要取消活动"${activity.name}"吗？取消后活动将进入「已取消」列表，不可再报名或签到。`,
      success: (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: "处理中..." });
        activityService
          .updateActivity(activity._id, { status: "已取消" })
          .then(() => {
            wx.hideLoading();
            wx.showToast({ title: "已取消活动", icon: "success" });
            this.loadActivityList();
          })
          .catch((err) => {
            console.error(err);
            wx.hideLoading();
            wx.showToast({ title: (err && err.message) || "操作失败", icon: "none" });
          });
      }
    });
  },

  // 管理员：删除活动（从后端彻底删除，保留用于后续如需恢复）
  deleteActivity(e) {
    const activity = e.currentTarget.dataset.activity;
    wx.showModal({
      title: "确认删除",
      content: `确定要删除活动"${activity.name}"吗？`,
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: "删除中..." });
          activityService
            .deleteActivity(activity._id)
            .then(() => {
              wx.hideLoading();
              wx.showToast({ title: "删除成功", icon: "success" });
              this.loadActivityList();
            })
            .catch(err => {
              console.error(err);
              wx.hideLoading();
              wx.showToast({ title: (err && err.message) || "删除失败", icon: "none" });
            });
        }
      }
    });
  },

  showDetail(e) {
    const activity = e.currentTarget.dataset.activity;
    if (!activity || !activity._id) return;
    wx.navigateTo({
      url: `/pages/activity_detail/activity_detail?id=${activity._id}`
    });
  },

  onShareAppMessage() {
    return {
      title: "龙城预约系统",
      path: "/pages/activity_list/activity_list"
    };
  },

  stopPropagation() {},

  onAvatarError(e) {
    const { index, activityId } = e.currentTarget.dataset;
    const activityList = this.data.activityList || [];
    const activity = activityList.find((item) => item._id === activityId);
    if (activity && activity.avatarList && activity.avatarList[index]) {
      activity.avatarList[index] = { url: DEFAULT_AVATAR, isDefault: true };
      this.setData({ activityList });
    }
  },

  onCardBgLoaded(e) {
    const meta = pickCardMediaMetaFromDataset(e && e.currentTarget && e.currentTarget.dataset, "image");
    this._markCardMediaEvent(meta, "loaded");
  },

  onCardBgError(e) {
    const meta = pickCardMediaMetaFromDataset(e && e.currentTarget && e.currentTarget.dataset, "image");
    this._markCardMediaEvent(meta, "error", e && e.detail);
  },

  onCardVideoLoaded(e) {
    const meta = pickCardMediaMetaFromDataset(e && e.currentTarget && e.currentTarget.dataset, "video");
    this._markCardMediaEvent(meta, "loaded");
  },

  onCardVideoError(e) {
    const meta = pickCardMediaMetaFromDataset(e && e.currentTarget && e.currentTarget.dataset, "video");
    this._markCardMediaEvent(meta, "error", e && e.detail);
  },

  onCardVideoWaiting(e) {
    const session = this._cardMediaDiagnostics;
    const meta = pickCardMediaMetaFromDataset(e && e.currentTarget && e.currentTarget.dataset, "video");
    logInfo("activity_card_video_waiting", {
      traceId: session ? session.traceId : "",
      group: meta.group,
      cardSize: meta.cardSize,
      activityId: meta.activityId,
      activityName: meta.activityName,
      url: meta.url
    });
  }
});
