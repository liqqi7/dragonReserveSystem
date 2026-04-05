const app = getApp();
const activityService = require("../../services/activity");
const { createTraceId, logInfo, logError, summarizeError } = require("../../services/logger");
const { enrichSingleActivity } = require("../../utils/activityEnrich");

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
        show_avatar_cluster: true,
        large_card_bg_image_url: "https://dragon.liqqihome.top/media/images/card-bg-boardgame-lg.png",
        small_card_bg_image_url: "https://dragon.liqqihome.top/media/images/card-bg-boardgame-sm.jpg",
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
        large_card_bg_image_url: "https://dragon.liqqihome.top/media/images/card-bg-badminton-lg.png",
        small_card_bg_image_url: "https://dragon.liqqihome.top/media/images/card-bg-badminton-sm.png",
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
        style_name: "默认视频",
        badge_label: "",
        show_badge: false,
        show_avatar_cluster: false,
        large_card_bg_image_url: "",
        small_card_bg_image_url: "",
        bg_video_url: "https://dragon.liqqihome.top/media/videos/card-bg-other.mp4"
      }
    ]
  },
  {
    key: "eating",
    display_name: "吃饭",
    default_style_key: "image-clean",
    styles: [
      {
        style_key: "eating-default",
        style_name: "默认暖色",
        badge_label: "Eating",
        show_badge: true,
        show_avatar_cluster: true,
        large_card_bg_image_url: "https://dragon.liqqihome.top/media/images/card-bg-boardgame-lg.png",
        small_card_bg_image_url: "https://dragon.liqqihome.top/media/images/card-bg-boardgame-sm.jpg",
        bg_video_url: null
      },
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
        style_key: "movie-default",
        style_name: "默认深色",
        badge_label: "Movie",
        show_badge: true,
        show_avatar_cluster: true,
        large_card_bg_image_url: "https://dragon.liqqihome.top/media/images/card-bg-badminton-lg.png",
        small_card_bg_image_url: "https://dragon.liqqihome.top/media/images/card-bg-badminton-sm.png",
        bg_video_url: null
      },
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

// Gesture tuning presets for card swipe vs page vertical scroll.
const GESTURE_PRESETS = {
  // Prefer page vertical scroll; horizontal swipe requires clearer intent.
  verticalFirst: {
    directionStartPx: 6,
    verticalDominanceRatio: 1.35,
    quickFlickDurationMs: 260,
    quickFlickDistancePx: 18
  },
  // Balanced default between horizontal card swipe and vertical page scroll.
  balanced: {
    directionStartPx: 4,
    verticalDominanceRatio: 1.6,
    quickFlickDurationMs: 280,
    quickFlickDistancePx: 16
  },
  // Prefer horizontal card swipe; easier to trigger card movement.
  horizontalFirst: {
    directionStartPx: 3,
    verticalDominanceRatio: 2.0,
    quickFlickDurationMs: 300,
    quickFlickDistancePx: 15
  }
};
const ACTIVE_GESTURE_PRESET = "balanced";
const GESTURE_TUNING = {
  ...GESTURE_PRESETS[ACTIVE_GESTURE_PRESET],
  directionStartPx: 4,
  verticalDominanceRatio: 1.15,
  quickFlickDurationMs: 320,
  quickFlickDistancePx: 14
};
// Keep a checkpoint of prior smoothness settings for quick rollback.
const SWIPE_MOVE_SMOOTHING = {
  // checkpoint-1: { updateIntervalMs: 16, minStepPx: 1, maxStepPxPerFrame: Infinity }
  // checkpoint-2: { updateIntervalMs: 8, minStepPx: 2, maxStepPxPerFrame: Infinity }
  updateIntervalMs: 0,
  minStepPx: 0,
  maxStepPxPerFrame: Infinity
};

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
  if (lower.startsWith("http://")) return DEFAULT_AVATAR;

  return value;
}

function formatDateTime(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function adaptParticipant(participant) {
  return {
    id: participant.id,
    name: participant.nickname_snapshot || "",
    userId: participant.user_id != null ? String(participant.user_id) : null,
    avatarUrl: normalizeAvatarUrl(participant.avatar_url_snapshot),
    checkedInAt: formatDateTime(participant.checked_in_at),
    checkinLat: participant.checkin_lat,
    checkinLng: participant.checkin_lng
  };
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
  return [
    meta.mediaType || "unknown",
    meta.group || "unknown",
    meta.cardSize || "unknown",
    meta.activityId || "unknown",
    meta.url || ""
  ].join("|");
}

function pickCardMediaMetaFromDataset(dataset, mediaType) {
  const safeDataset = dataset || {};
  return {
    mediaType,
    group: safeDataset.group || "unknown",
    cardSize: safeDataset.cardSize || "unknown",
    activityId: safeDataset.activityId || "",
    activityName: safeDataset.activityName || "",
    url: safeDataset.url || safeDataset.src || ""
  };
}


Page({
  data: {
    activityList: [],
    filteredList: [],
    groupedActivities: { joined: [], accepting: [], notStarted: [], ended: [] },
    statusBarHeight: 0,
    navBarHeight: 0,
    groupOffset: { joined: 0, accepting: 0, notStarted: 0, ended: 0 },
    focusedCardIndex: { joined: 0, accepting: 0, notStarted: 0, ended: 0 },
    groupUseTransition: false,
    mainScrollEnabled: true,
    isGroupSwiping: false,
    showEditModal: false,
    currentActivity: null,
    editForm: {
      // 活动名称
      name: "",
      // 活动状态
      status: "进行中",
      // 活动备注
      remark: "",
      // 活动开始时间（日期和时间分开存储）
      startDate: "",
      startTime: "",
      // 活动结束时间（日期和时间分开存储）
      endDate: "",
      endTime: "",
      // 报名截止时间（日期和时间分开存储）
      signupDeadlineDate: "",
      signupDeadlineTime: "",
      // 活动位置
      locationName: "",
      locationAddress: "",
      locationLatitude: null,
      locationLongitude: null,
      signupEnabled: true,
      // 报名人数上限
      limitEnabled: false,
      maxParticipants: null,
      // 活动类型：backend-driven key
      activityType: DEFAULT_ACTIVITY_TYPE_KEY,
      activityStyleKey: ""
    },
    myUserId: "", // 当前用户 openid（用于判断能否删除自己的报名）
    myNickname: "", // 当前用户昵称（userId 为空时的回退，兼容旧数据）
    locationDisabled: false,
    isAdmin: false,
    isGuest: true,
    searchKeyword: "",
    selectedFilter: "我参与的",
    activityTypeStyles: DEFAULT_ACTIVITY_TYPE_STYLES,
    activityTypeOptionLabels: DEFAULT_ACTIVITY_TYPE_STYLES.map((item) => item.display_name || item.key),
    activityTypeOptionValues: DEFAULT_ACTIVITY_TYPE_STYLES.map((item) => item.key),
    editActivityTypeIndex: 0,
    activityStyleOptionLabels: [],
    activityStyleOptionValues: [],
    editActivityStyleIndex: 0
  },

  onLoad(options) {
    const aid = options && options.activityId;
    if (aid) {
      wx.redirectTo({
        url: `/pages/activity_detail/activity_detail?id=${encodeURIComponent(String(aid))}`
      });
      return;
    }
    this.syncGuestState();
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

  onShow() {
    const isGuest = this.syncGuestState();
    if (!isGuest) {
      let pendingEdit = "";
      try {
        pendingEdit = wx.getStorageSync("pendingEditActivityId") || "";
        if (pendingEdit) wx.removeStorageSync("pendingEditActivityId");
      } catch (e) {
        console.error(e);
      }
      if (pendingEdit) this._pendingEditActivityId = String(pendingEdit);
      const isAdmin = app.globalData.userRole === "admin";
      const myUserId = app.globalData.userId || wx.getStorageSync("userId") || "";
      const myNickname = (app.globalData.userProfile?.nickname || wx.getStorageSync("userNickname") || "").trim();
      this.setData({ isAdmin, myUserId, myNickname });
      this.loadActivityTypeStyles().finally(() => {
        this.loadActivityList();
      });
      app.checkProfileCompleteness();
    }
    // 同步 isAdmin 到自定义 tabBar 组件
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ isAdmin: app.globalData.userRole === "admin" });
    }
    this._syncTabBarVisibility();
  },

  onHide() {
    this._clearCardMediaDiagnostics();
    this._setTabBarHidden(false);
  },

  onUnload() {
    this._clearCardMediaDiagnostics();
    this._setTabBarHidden(false);
  },

  _setTabBarHidden(hidden) {
    if (typeof this.getTabBar !== "function") return;
    const tabBar = this.getTabBar();
    if (!tabBar || typeof tabBar.setData !== "function") return;
    tabBar.setData({ hidden: !!hidden });
  },

  _syncTabBarVisibility() {
    this._setTabBarHidden(!!this.data.showEditModal);
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

  _shouldTrackVideoForGroup(group, index) {
    const focusedMap = this.data.focusedCardIndex || {};
    const focusedIndex = typeof focusedMap[group] === "number" ? focusedMap[group] : 0;
    return index === focusedIndex;
  },

  _startCardMediaDiagnostics(list, groupedActivities) {
    this._clearCardMediaDiagnostics();

    const groups = groupedActivities || { joined: [], accepting: [], notStarted: [], ended: [] };
    const traceId = createTraceId("card-media");
    const startedAt = Date.now();
    let deviceInfo = {};
    try {
      const systemInfo = wx.getSystemInfoSync();
      deviceInfo = {
        brand: systemInfo.brand || "",
        model: systemInfo.model || "",
        system: systemInfo.system || "",
        platform: systemInfo.platform || "",
        benchmarkLevel: systemInfo.benchmarkLevel,
        windowWidth: systemInfo.windowWidth,
        windowHeight: systemInfo.windowHeight,
        pixelRatio: systemInfo.pixelRatio
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
        if (imageUrl) {
          registerItem({
            mediaType: "image",
            group,
            cardSize,
            activityId: activity._id,
            activityName: activity.name || "",
            url: imageUrl
          });
          groupSummary[group].images += 1;
        }
        if (activity.bgVideoUrl && this._shouldTrackVideoForGroup(group, index)) {
          registerItem({
            mediaType: "video",
            group,
            cardSize,
            activityId: activity._id,
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

  ensureGroupSnapMetrics() {
    if (this._groupSnapMetricsReady) return;
    const q = wx.createSelectorQuery();
    q.selectAll(".large-cards-row .large-card-wrap").boundingClientRect();
    q.selectAll(".small-cards-row .small-card-wrap").boundingClientRect();
    q.exec((res) => {
      const large = (res && res[0]) || [];
      const small = (res && res[1]) || [];

      const calcStep = (rects, fallback) => {
        if (!Array.isArray(rects) || rects.length < 2) return fallback;
        const lefts = rects
          .map((r) => (r && typeof r.left === "number" ? Math.round(r.left * 100) / 100 : null))
          .filter((v) => v != null);
        const unique = Array.from(new Set(lefts)).sort((a, b) => a - b);
        if (unique.length < 2) return fallback;
        let minPositive = null;
        for (let i = 1; i < unique.length; i += 1) {
          const d = unique[i] - unique[i - 1];
          if (d > 1 && (minPositive == null || d < minPositive)) {
            minPositive = d;
          }
        }
        return minPositive != null ? minPositive : fallback;
      };

      const largeStep = calcStep(large, 287);
      const smallStep = calcStep(small, 190);

      this._snapMeta = {
        joined: { step: largeStep, index: 0, lastLeft: 0, maxIndex: Math.max(0, (this.data.groupedActivities.joined || []).length - 1) },
        accepting: { step: smallStep, index: 0, lastLeft: 0, maxIndex: Math.max(0, (this.data.groupedActivities.accepting || []).length - 1) },
        notStarted: { step: smallStep, index: 0, lastLeft: 0, maxIndex: Math.max(0, (this.data.groupedActivities.notStarted || []).length - 1) },
        ended: { step: smallStep, index: 0, lastLeft: 0, maxIndex: Math.max(0, (this.data.groupedActivities.ended || []).length - 1) }
      };
      this._groupSnapMetricsReady = true;
    });
  },

  onGroupScroll(e) {
    // Kept for compatibility; gesture-driven paging no longer relies on scroll events.
  },

  applyGroupSnap(group, source, fallbackLeft) {
    if (!group) return;
    if (!this._snapMeta || !this._snapMeta[group]) this.ensureGroupSnapMetrics();
    const meta = this._snapMeta && this._snapMeta[group];
    if (!meta) return;

    const currentLeft =
      (typeof fallbackLeft === "number")
        ? fallbackLeft
        : (typeof meta.liveLeft === "number" ? meta.liveLeft : 0);
    const step = meta.step || 1;
    let nextIndex = Math.round(currentLeft / step);
    nextIndex = Math.max(0, Math.min(meta.maxIndex, nextIndex));

    const peekLeft = nextIndex > 0 && nextIndex < meta.maxIndex ? 10 : 0;
    const nextLeft = Math.max(0, Math.round(nextIndex * step - peekLeft));

    meta.index = nextIndex;
    meta.lastLeft = nextLeft;
    this.setData({
      groupUseTransition: true,
      [`groupOffset.${group}`]: nextLeft,
      [`focusedCardIndex.${group}`]: nextIndex
    });

  },

  onGroupScrollEnd(e) {
    // Deprecated by gesture-driven paging.
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

  onGroupTouchStart(e) {
    const group = e.currentTarget && e.currentTarget.dataset ? e.currentTarget.dataset.group : "";
    if (!group) return;
    if (!this._snapMeta || !this._snapMeta[group]) {
      this.ensureGroupSnapMetrics();
      return;
    }
    const t = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]);
    const startX = t && typeof t.clientX === "number" ? t.clientX : null;
    const startY = t && typeof t.clientY === "number" ? t.clientY : null;
    const meta = this._snapMeta[group];
    meta.touchStartX = startX;
    meta.touchStartY = startY;
    meta.touchLastX = startX;
    meta.touchStartTime = Date.now();
    meta.touchStartOffset = this.data.groupOffset[group] || 0;
    meta.touchMoveThrottleTs = 0;
    meta.renderedOffset = Math.round(meta.touchStartOffset);
    meta.gestureDirection = null;
    if (this.data.isGroupSwiping) {
      this.setData({ isGroupSwiping: false });
    }
  },

  onGroupTouchMove(e) {
    const group = e.currentTarget && e.currentTarget.dataset ? e.currentTarget.dataset.group : "";
    const meta = group && this._snapMeta ? this._snapMeta[group] : null;
    if (!meta || meta.touchStartX == null) return;
    const t = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]);
    const currentX = t && typeof t.clientX === "number" ? t.clientX : null;
    const currentY = t && typeof t.clientY === "number" ? t.clientY : null;
    if (currentX == null) return;
    meta.touchLastX = currentX;

    if (meta.gestureDirection == null) {
      const dx = Math.abs(currentX - meta.touchStartX);
      const dy = currentY != null && meta.touchStartY != null ? Math.abs(currentY - meta.touchStartY) : 0;
      if (dx > GESTURE_TUNING.directionStartPx || dy > GESTURE_TUNING.directionStartPx) {
        meta.gestureDirection = dy > dx * GESTURE_TUNING.verticalDominanceRatio ? "vertical" : "horizontal";
        if (meta.gestureDirection === "horizontal") {
          // Rebase at lock point to avoid a first-frame jump.
          meta.touchStartX = currentX;
          meta.touchStartOffset = this.data.groupOffset[group] || 0;
          meta.renderedOffset = Math.round(meta.touchStartOffset);
          this.setData({ groupUseTransition: false, mainScrollEnabled: false, isGroupSwiping: true });
        }
      }
    }

    if (meta.gestureDirection !== "horizontal") return;

    const deltaX = currentX - meta.touchStartX;
    const baseOffset = meta.touchStartOffset || 0;
    const maxOffset = Math.max(0, meta.maxIndex * (meta.step || 1));
    const newOffset = Math.max(0, Math.min(maxOffset, baseOffset - deltaX));
    const roundedOffset = Math.round(newOffset);
    if (meta.renderedOffset == null) {
      meta.renderedOffset = roundedOffset;
    }
    let nextOffset = roundedOffset;
    const frameDiff = nextOffset - meta.renderedOffset;
    if (Math.abs(frameDiff) > SWIPE_MOVE_SMOOTHING.maxStepPxPerFrame) {
      nextOffset = meta.renderedOffset + (frameDiff > 0 ? SWIPE_MOVE_SMOOTHING.maxStepPxPerFrame : -SWIPE_MOVE_SMOOTHING.maxStepPxPerFrame);
    }
    if (Math.abs(nextOffset - meta.renderedOffset) < SWIPE_MOVE_SMOOTHING.minStepPx) {
      return;
    }
    meta.renderedOffset = nextOffset;
    this.setData({ [`groupOffset.${group}`]: nextOffset });

  },

  onGroupTouchEnd(e) {
    const group = e.currentTarget && e.currentTarget.dataset ? e.currentTarget.dataset.group : "";
    const meta = group && this._snapMeta ? this._snapMeta[group] : null;
    if (!meta) return;

    if (meta.gestureDirection !== "horizontal") {
      meta.gestureDirection = null;
      if (this.data.isGroupSwiping) {
        this.setData({ isGroupSwiping: false });
      }
      if (!this.data.mainScrollEnabled) {
        this.setData({ mainScrollEnabled: true });
      }
      return;
    }
    meta.gestureDirection = null;

    const t = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0]);
    const endX = t && typeof t.clientX === "number" ? t.clientX : (meta.touchLastX != null ? meta.touchLastX : null);
    const startX = meta.touchStartX;
    const touchDuration = Date.now() - (meta.touchStartTime || Date.now());
    const deltaX = startX != null && endX != null ? endX - startX : 0;
    const currentOffset = this.data.groupOffset[group] || 0;
    const step = meta.step || 1;

    let targetIndex;
    const isQuickFlick =
      touchDuration < GESTURE_TUNING.quickFlickDurationMs &&
      Math.abs(deltaX) > GESTURE_TUNING.quickFlickDistancePx;

    if (isQuickFlick) {
      const dir = deltaX < 0 ? 1 : -1;
      targetIndex = Math.max(0, Math.min(meta.maxIndex, (meta.index || 0) + dir));
    } else {
      targetIndex = Math.round(currentOffset / step);
      targetIndex = Math.max(0, Math.min(meta.maxIndex, targetIndex));
    }

    const peekLeft = (targetIndex > 0 && targetIndex < meta.maxIndex) ? 10 : 0;
    const targetOffset = Math.max(0, Math.round(targetIndex * step - peekLeft));

    const prevVideoIndex = this.data.focusedCardIndex[group];
    meta.index = targetIndex;
    meta.lastLeft = targetOffset;
    this.setData({
      groupUseTransition: true,
      mainScrollEnabled: true,
      isGroupSwiping: false,
      [`groupOffset.${group}`]: targetOffset,
      [`focusedCardIndex.${group}`]: targetIndex
    }, () => {
      this._syncVideoFocus(group, prevVideoIndex, targetIndex);
    });

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

  // 下拉刷新：仅已获得权限的用户触发，刷新活动列表
  onPullDownRefresh() {
    const isGuest = this.syncGuestState();
    if (isGuest) {
      wx.stopPullDownRefresh();
      return;
    }
    const myUserId = app.globalData.userId || wx.getStorageSync("userId") || "";
    const myNickname = (app.globalData.userProfile?.nickname || wx.getStorageSync("userNickname") || "").trim();
    this.setData({ isAdmin: app.globalData.userRole === "admin", myUserId, myNickname });

    const p = Promise.all([this.loadActivityTypeStyles(), this.loadActivityList()]);
    if (p && typeof p.finally === "function") {
      p.finally(() => {
        wx.stopPullDownRefresh();
      });
    } else {
      wx.stopPullDownRefresh();
    }
  },

  syncGuestState() {
    const hasWeChatAuth = !!wx.getStorageSync("hasWeChatAuth");
    const isAuthenticated = app.globalData.isAuthenticated;
    // 未完成微信头像昵称授权 或 未获取访问权限，都视为游客
    const isGuest = !hasWeChatAuth || !isAuthenticated;
    this.setData({ isGuest });

    return isGuest;
  },

  loadActivityTypeStyles() {
    return activityService
      .listActivityTypeStyles()
      .then((res) => {
        const styles = Array.isArray(res) && res.length > 0 ? res : DEFAULT_ACTIVITY_TYPE_STYLES;
        const badmintonType = styles.find((t) => normalizeTypeKey(t && t.key) === "badminton");
        const badmintonDefault = ((badmintonType && badmintonType.styles) || [])
          .find((s) => String((s && s.style_key) || "").trim() === "badminton-default");
        const optionValues = styles.map((item) => normalizeTypeKey(item.key)).filter(Boolean);
        const optionLabels = styles.map((item) => String(item.display_name || item.key || ""));
        const currentType = this.data.editForm && this.data.editForm.activityType
          ? normalizeTypeKey(this.data.editForm.activityType)
          : DEFAULT_ACTIVITY_TYPE_KEY;
        let editIndex = optionValues.indexOf(currentType);
        if (editIndex < 0) editIndex = optionValues.indexOf(DEFAULT_ACTIVITY_TYPE_KEY);
        if (editIndex < 0) editIndex = 0;
        const typeStyleMap = buildTypeStyleMap(styles);
        const selectedType = optionValues[editIndex] || DEFAULT_ACTIVITY_TYPE_KEY;
        const styleOptions = this._buildStyleOptionsForType(selectedType, typeStyleMap);
        const desiredStyleKey = this.data.editForm && this.data.editForm.activityStyleKey
          ? String(this.data.editForm.activityStyleKey)
          : "";
        let styleIndex = styleOptions.values.indexOf(desiredStyleKey);
        if (styleIndex < 0) styleIndex = 0;
        this.setData({
          activityTypeStyles: styles,
          activityTypeOptionValues: optionValues,
          activityTypeOptionLabels: optionLabels,
          editActivityTypeIndex: editIndex,
          activityStyleOptionValues: styleOptions.values,
          activityStyleOptionLabels: styleOptions.labels,
          editActivityStyleIndex: styleIndex,
          "editForm.activityStyleKey": styleOptions.values[styleIndex] || ""
        });
      })
      .catch(() => {
        // Silent fallback to built-in defaults for compatibility.
        const styles = DEFAULT_ACTIVITY_TYPE_STYLES;
        const badmintonType = styles.find((t) => normalizeTypeKey(t && t.key) === "badminton");
        const badmintonDefault = ((badmintonType && badmintonType.styles) || [])
          .find((s) => String((s && s.style_key) || "").trim() === "badminton-default");
        const optionValues = styles.map((item) => normalizeTypeKey(item.key)).filter(Boolean);
        const optionLabels = styles.map((item) => String(item.display_name || item.key || ""));
        let editIndex = optionValues.indexOf(DEFAULT_ACTIVITY_TYPE_KEY);
        if (editIndex < 0) editIndex = 0;
        const typeStyleMap = buildTypeStyleMap(styles);
        const selectedType = optionValues[editIndex] || DEFAULT_ACTIVITY_TYPE_KEY;
        const styleOptions = this._buildStyleOptionsForType(selectedType, typeStyleMap);
        this.setData({
          activityTypeStyles: styles,
          activityTypeOptionValues: optionValues,
          activityTypeOptionLabels: optionLabels,
          editActivityTypeIndex: editIndex,
          activityStyleOptionValues: styleOptions.values,
          activityStyleOptionLabels: styleOptions.labels,
          editActivityStyleIndex: 0,
          "editForm.activityStyleKey": styleOptions.values[0] || ""
        });
      });
  },

  _buildStyleOptionsForType(typeKey, typeStyleMapInput) {
    const typeStyleMap = typeStyleMapInput || buildTypeStyleMap(this.data.activityTypeStyles);
    const normalizedType = normalizeTypeKey(typeKey) || DEFAULT_ACTIVITY_TYPE_KEY;
    const typeEntry = typeStyleMap[normalizedType] || typeStyleMap[DEFAULT_ACTIVITY_TYPE_KEY];
    const styleMap = (typeEntry && typeEntry.styleMap) || {};
    const values = Object.keys(styleMap);
    const labels = values.map((k) => styleMap[k].styleName || k);
    return { values, labels };
  },

  loadActivityList() {
    this._clearCardMediaDiagnostics();
    wx.showLoading({ title: "加载中..." });
    return activityService
      .listActivities()
      .then((res) => this.processActivityList(res || [], new Date()))
      .then(result => {
        if (result) {
          const { list } = result;
          const { selectedFilter, searchKeyword } = this.data;
          const filtered = this.computeFilteredList(list, selectedFilter, searchKeyword);
          const groupedActivities = this.computeGroupedActivities(list);
          this._groupSnapMetricsReady = false;
          this.setData({
            activityList: list,
            filteredList: filtered,
            groupedActivities,
            groupOffset: { joined: 0, accepting: 0, notStarted: 0, ended: 0 },
            focusedCardIndex: { joined: 0, accepting: 0, notStarted: 0, ended: 0 },
            groupUseTransition: false
          }, () => {
            this._startCardMediaDiagnostics(list, groupedActivities);
            this.ensureGroupSnapMetrics();
          });

          wx.hideLoading();

          const peid = this._pendingEditActivityId;
          if (peid) {
            this._pendingEditActivityId = "";
            this._openEditForActivityId(peid);
          }
        }
      })
      .catch(err => {
        console.error(err);
        wx.hideLoading();
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
    const myUserId = this.data.myUserId;
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
      const rawParticipants = activity.participants || [];
      const avatarList = [];

      rawParticipants.forEach(p => {
        if (typeof p === "object" && p !== null) {
          const uid = p.userId;
          const name = p.name;
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
          if (myUserId && uid && uid === myUserId) {
            hasSignedUp = true;
            if (checkedIn) {
              hasCheckedIn = true;
            }
          } else if (!myUserId && myNickname && name === myNickname) {
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
      // 卡片头像：取最近报名的 3 人（avatarList 末尾），从下往上递减排列
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

      // 基于时间自动更新状态（已取消、已删除不参与自动推算，避免删除后又显示为未开始）
      const parseDateTime = (s) => new Date(s.replace(" ", "T") + ":00");
      const start = parseDateTime(activity.startTime);
      const end = parseDateTime(activity.endTime);
      let autoStatus = activity.status || "未开始";
      if (activity.status === "已取消" || activity.status === "已删除") {
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

      if (activity.status !== "已取消" && activity.status !== "已删除") {
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
    const valid = (list || []).filter(a => a.status !== "已取消" && a.status !== "已删除");

    // 1. 我参与的：已报名 + 未结束
    const joined = valid
      .filter(a => a.hasSignedUp && a.status !== "已结束")
      .sort(sortByStart);
    joined.forEach(a => usedIds.add(a._id));

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

  // 管理员：创建活动
  showCreateModal() {
    const now = new Date();
    // 开始时间默认：当前时间 + 2 小时
    const startDateTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const date = `${startDateTime.getFullYear()}-${pad(startDateTime.getMonth() + 1)}-${pad(startDateTime.getDate())}`;
    const startTime = `${pad(startDateTime.getHours())}:${pad(startDateTime.getMinutes())}`;
    // 结束时间默认：开始时间后 1 小时
    const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);
    const endTime = `${pad(endDateTime.getHours())}:${pad(endDateTime.getMinutes())}`;
    const endDate = `${endDateTime.getFullYear()}-${pad(endDateTime.getMonth() + 1)}-${pad(endDateTime.getDate())}`;
    // 报名截止时间默认：开始时间前 1 小时
    const deadlineDateTime = new Date(startDateTime.getTime() - 60 * 60 * 1000);
    const deadlineDate = `${deadlineDateTime.getFullYear()}-${pad(deadlineDateTime.getMonth() + 1)}-${pad(deadlineDateTime.getDate())}`;
    const deadlineTime = `${pad(deadlineDateTime.getHours())}:${pad(deadlineDateTime.getMinutes())}`;

    const defaultType = DEFAULT_ACTIVITY_TYPE_KEY;
    const optionValues = this.data.activityTypeOptionValues || [];
    let editTypeIndex = optionValues.indexOf(defaultType);
    if (editTypeIndex < 0) editTypeIndex = 0;
    const styleOptions = this._buildStyleOptionsForType(defaultType);
    const styleIndex = 0;
    this.setData({
      showEditModal: true,
      currentActivity: null,
      locationDisabled: false,
      editActivityTypeIndex: editTypeIndex,
      activityStyleOptionValues: styleOptions.values,
      activityStyleOptionLabels: styleOptions.labels,
      editActivityStyleIndex: styleIndex,
      editForm: {
        name: "",
        status: "未开始",
        remark: "",
        startDate: date,
        startTime: startTime,
        endDate: endDate,
        endTime: endTime,
        signupDeadlineDate: deadlineDate,
        signupDeadlineTime: deadlineTime,
        locationName: "",
        locationAddress: "",
        locationLatitude: null,
        locationLongitude: null,
        signupEnabled: true,
        limitEnabled: false,
        maxParticipants: null,
        activityType: defaultType,
        activityStyleKey: styleOptions.values[styleIndex] || ""
      }
    });
    this._setTabBarHidden(true);
  },

  // 管理员：编辑活动
  showEditModal(e) {
    const activity = e.currentTarget.dataset.activity;
    // 解析开始时间和结束时间
    let startDate = "";
    let startTime = "";
    let endDate = "";
    let endTime = "";
    let signupDeadlineDate = "";
    let signupDeadlineTime = "";

    if (activity.startTime) {
      const startParts = activity.startTime.split(" ");
      startDate = startParts[0] || activity.date || "";
      startTime = startParts[1] || "00:00";
    } else if (activity.date) {
      startDate = activity.date;
      startTime = "00:00";
    }
    
    if (activity.endTime) {
      const endParts = activity.endTime.split(" ");
      endDate = endParts[0] || activity.date || "";
      endTime = endParts[1] || "01:00";
    } else if (activity.date) {
      endDate = activity.date;
      endTime = "01:00";
    }

    // 报名截止时间：优先使用已有 signupDeadline，否则用开始时间前 1 小时
    if (activity.signupDeadline) {
      const parts = activity.signupDeadline.split(" ");
      signupDeadlineDate = parts[0] || startDate;
      signupDeadlineTime = parts[1] || startTime;
    } else if (activity.startTime) {
      const base = new Date(activity.startTime.replace(" ", "T") + ":00");
      if (!isNaN(base.getTime())) {
        const dl = new Date(base.getTime() - 60 * 60 * 1000);
        signupDeadlineDate = `${dl.getFullYear()}-${pad(dl.getMonth() + 1)}-${pad(dl.getDate())}`;
        signupDeadlineTime = `${pad(dl.getHours())}:${pad(dl.getMinutes())}`;
      }
    } else {
      signupDeadlineDate = startDate;
      signupDeadlineTime = startTime;
    }

    const hasCheckedIn = (activity.checkinCount || 0) > 0;

    const maxParticipants = activity.maxParticipants == null ? null : activity.maxParticipants;

    const optionValues = this.data.activityTypeOptionValues || [];
    const normalizedType = normalizeTypeKey(activity.activityType || DEFAULT_ACTIVITY_TYPE_KEY) || DEFAULT_ACTIVITY_TYPE_KEY;
    let editTypeIndex = optionValues.indexOf(normalizedType);
    if (editTypeIndex < 0) editTypeIndex = optionValues.indexOf(DEFAULT_ACTIVITY_TYPE_KEY);
    if (editTypeIndex < 0) editTypeIndex = 0;
    const styleOptions = this._buildStyleOptionsForType(normalizedType);
    let styleIndex = styleOptions.values.indexOf(String(activity.activityStyleKey || ""));
    if (styleIndex < 0) styleIndex = 0;

    this.setData({
      showEditModal: true,
      currentActivity: activity,
      locationDisabled: hasCheckedIn,
      editActivityTypeIndex: editTypeIndex,
      activityStyleOptionValues: styleOptions.values,
      activityStyleOptionLabels: styleOptions.labels,
      editActivityStyleIndex: styleIndex,
      editForm: {
        name: activity.name,
        status: activity.status,
        remark: activity.remark || "",
        startDate: startDate,
        startTime: startTime,
        endDate: endDate,
        endTime: endTime,
        signupDeadlineDate: signupDeadlineDate,
        signupDeadlineTime: signupDeadlineTime,
        locationName: activity.locationName || "",
        locationAddress: activity.locationAddress || "",
        locationLatitude: activity.locationLatitude ?? null,
        locationLongitude: activity.locationLongitude ?? null,
        signupEnabled: activity.signupEnabled !== false,
        limitEnabled: maxParticipants != null,
        maxParticipants: maxParticipants,
        activityType: normalizedType,
        activityStyleKey: styleOptions.values[styleIndex] || ""
      }
    });
    this._setTabBarHidden(true);
  },

  onEditFormChange(e) {
    const field = e.currentTarget.dataset.field;
    let value = e.detail.value;
    
    // 如果是状态选择器，需要从数组中取值
    if (field === "status") {
      const statusList = ["未开始", "进行中", "已取消", "已结束"];
      value = statusList[Number(value)] || "未开始";
    } else if (field === "signupEnabled") {
      value = !!e.detail.value;
    } else if (field === "limitEnabled") {
      value = !!e.detail.value;
    } else if (field === "maxParticipants") {
      const num = Number(value);
      if (!value) {
        value = "";
      } else if (Number.isNaN(num) || !Number.isFinite(num)) {
        wx.showToast({ title: "人数上限需为数字", icon: "none" });
        return;
      } else {
        value = String(Math.floor(num));
      }
    }
    
    this.setData({
      [`editForm.${field}`]: value
    });
  },

  // 活动类型选择
  onActivityTypeChange(e) {
    const index = Number(e.detail.value);
    const values = this.data.activityTypeOptionValues || [];
    const nextType = values[index] || DEFAULT_ACTIVITY_TYPE_KEY;
    const styleOptions = this._buildStyleOptionsForType(nextType);
    this.setData({
      editActivityTypeIndex: index,
      activityStyleOptionValues: styleOptions.values,
      activityStyleOptionLabels: styleOptions.labels,
      editActivityStyleIndex: 0,
      "editForm.activityType": nextType,
      "editForm.activityStyleKey": styleOptions.values[0] || ""
    });
  },

  onActivityStyleChange(e) {
    const index = Number(e.detail.value);
    const values = this.data.activityStyleOptionValues || [];
    this.setData({
      editActivityStyleIndex: index,
      "editForm.activityStyleKey": values[index] || ""
    });
  },

  _openEditForActivityId(activityId) {
    if (!activityId) return;
    const styles = this.data.activityTypeStyles || [];
    const myUserId = this.data.myUserId || "";
    const myNickname = (this.data.myNickname || "").trim();
    activityService
      .getActivity(activityId)
      .then((raw) => {
        const activity = enrichSingleActivity(raw, styles, myUserId, myNickname);
        this.showEditModal({ currentTarget: { dataset: { activity } } });
      })
      .catch((err) => {
        console.error(err);
        wx.showToast({ title: (err && err.message) || "加载活动失败", icon: "none" });
      });
  },

  // 已由 custom-tab-bar 组件统一处理导航，这两个方法保留兼容性
  goToHistory() {
    wx.switchTab({ url: "/pages/history/history" });
  },

  goToProfile() {
    wx.switchTab({ url: "/pages/profile/profile" });
  },

  // 开始日期变更
  onStartDateChange(e) {
    this.setData({
      "editForm.startDate": e.detail.value
    });
  },

  // 开始时间变更
  onStartTimeChange(e) {
    this.setData({
      "editForm.startTime": e.detail.value
    });
  },

  // 结束日期变更
  onEndDateChange(e) {
    this.setData({
      "editForm.endDate": e.detail.value
    });
  },

  // 结束时间变更
  onEndTimeChange(e) {
    this.setData({
      "editForm.endTime": e.detail.value
    });
  },

  // 报名截止日期变更
  onSignupDeadlineDateChange(e) {
    this.setData({
      "editForm.signupDeadlineDate": e.detail.value
    });
  },

  // 报名截止时间变更
  onSignupDeadlineTimeChange(e) {
    this.setData({
      "editForm.signupDeadlineTime": e.detail.value
    });
  },

  // 选择活动位置：直接打开地图选点（跳过中间页）；若已有人签到则不可修改
  onChooseLocation() {
    if (this.data.locationDisabled) {
      wx.showToast({ title: "已有用户完成签到，不可修改活动地点", icon: "none" });
      return;
    }
    wx.chooseLocation({
      success: (res) => {
        this.setData({
          "editForm.locationName": res.name || res.address || "",
          "editForm.locationAddress": res.address || "",
          "editForm.locationLatitude": res.latitude,
          "editForm.locationLongitude": res.longitude
        });
      }
    });
  },

  saveActivity() {
    const form = this.data.editForm;
    if (!form.name.trim()) {
      wx.showToast({ title: "请输入活动名称", icon: "none" });
      return;
    }
    if (!form.startDate) {
      wx.showToast({ title: "请选择开始日期", icon: "none" });
      return;
    }
    if (!form.startTime) {
      wx.showToast({ title: "请选择开始时间", icon: "none" });
      return;
    }
    if (!form.endDate) {
      wx.showToast({ title: "请选择结束日期", icon: "none" });
      return;
    }
    if (!form.endTime) {
      wx.showToast({ title: "请选择结束时间", icon: "none" });
      return;
    }
    if (!form.signupDeadlineDate) {
      wx.showToast({ title: "请选择报名截止日期", icon: "none" });
      return;
    }
    if (!form.signupDeadlineTime) {
      wx.showToast({ title: "请选择报名截止时间", icon: "none" });
      return;
    }

    if (form.limitEnabled) {
      const raw = form.maxParticipants;
      const num = Number(raw);
      if (!raw) {
        wx.showToast({ title: "请输入人数上限", icon: "none" });
        return;
      }
      if (Number.isNaN(num) || !Number.isFinite(num) || num <= 0) {
        wx.showToast({ title: "人数上限需为正整数", icon: "none" });
        return;
      }
      if (num > 999) {
        wx.showToast({ title: "人数上限不能超过 999", icon: "none" });
        return;
      }
    }

    // 组合开始/结束时间，进行时间合法性校验
    const startDateTime = new Date(`${form.startDate}T${form.startTime}:00`);
    const endDateTime = new Date(`${form.endDate}T${form.endTime}:00`);
    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      wx.showToast({ title: "时间格式错误，请重新选择", icon: "none" });
      return;
    }

    const signupDeadlineDateTime = new Date(`${form.signupDeadlineDate}T${form.signupDeadlineTime}:00`);
    if (isNaN(signupDeadlineDateTime.getTime())) {
      wx.showToast({ title: "报名截止时间格式错误，请重新选择", icon: "none" });
      return;
    }

    const now = new Date();
    const isEdit = !!this.data.currentActivity;
    // 新建活动时，开始时间不能早于当前时间
    if (!isEdit && startDateTime.getTime() < now.getTime()) {
      wx.showToast({ title: "开始时间不能早于当前时间", icon: "none" });
      return;
    }

    if (endDateTime.getTime() <= startDateTime.getTime()) {
      wx.showToast({ title: "结束时间必须晚于开始时间", icon: "none" });
      return;
    }
    if (signupDeadlineDateTime.getTime() > startDateTime.getTime()) {
      wx.showToast({ title: "报名截止时间必须早于或等于开始时间", icon: "none" });
      return;
    }
    if (signupDeadlineDateTime.getTime() >= endDateTime.getTime()) {
      wx.showToast({ title: "报名截止时间必须早于结束时间", icon: "none" });
      return;
    }

    wx.showLoading({ title: "保存中..." });
    const maxParticipants =
      form.limitEnabled && form.maxParticipants
        ? Number(form.maxParticipants)
        : null;
    const payload = {
      name: form.name.trim(),
      status: form.status,
      remark: form.remark.trim(),
      start_time: `${form.startDate}T${form.startTime}:00`,
      end_time: `${form.endDate}T${form.endTime}:00`,
      signup_deadline: `${form.signupDeadlineDate}T${form.signupDeadlineTime}:00`,
      location_name: form.locationName || "",
      location_address: form.locationAddress || "",
      location_latitude: form.locationLatitude,
      location_longitude: form.locationLongitude,
      max_participants: maxParticipants,
      signup_enabled: form.signupEnabled,
      activity_type: form.activityType || null
      ,
      activity_style_key: form.activityStyleKey || null
    };

    if (isEdit) {
      activityService
        .updateActivity(this.data.currentActivity._id, payload)
        .then(() => {
          wx.hideLoading();
          wx.showToast({ title: "更新成功", icon: "success" });
          this.closeEditModal();
          this.loadActivityList();
        })
        .catch((err) => {
          console.error(err);
          wx.hideLoading();
          wx.showToast({ title: (err && err.message) || "更新失败", icon: "none" });
        });
    } else {
      activityService
        .createActivity(payload)
        .then(() => {
          wx.hideLoading();
          wx.showToast({ title: "创建成功", icon: "success" });
          this.closeEditModal();
          this.loadActivityList();
        })
        .catch((err) => {
          console.error(err);
          wx.hideLoading();
          wx.showToast({ title: (err && err.message) || "创建失败", icon: "none" });
        });
    }
  },

  closeEditModal() {
    const optionValues = this.data.activityTypeOptionValues || [];
    let editTypeIndex = optionValues.indexOf(DEFAULT_ACTIVITY_TYPE_KEY);
    if (editTypeIndex < 0) editTypeIndex = 0;
    this.setData({
      showEditModal: false,
      currentActivity: null,
      editActivityTypeIndex: editTypeIndex,
      activityStyleOptionValues: [],
      activityStyleOptionLabels: [],
      editActivityStyleIndex: 0,
      editForm: {
        name: "",
        status: "进行中",
        remark: "",
        startDate: "",
        startTime: "",
        endDate: "",
        endTime: "",
        signupDeadlineDate: "",
        signupDeadlineTime: "",
        locationName: "",
        locationAddress: "",
        locationLatitude: null,
        locationLongitude: null,
        activityType: DEFAULT_ACTIVITY_TYPE_KEY,
        activityStyleKey: ""
      }
    });
    this._syncTabBarVisibility();
  },

  // 管理员：取消活动（将状态设为已取消）
  cancelActivity() {
    const activity = this.data.currentActivity;
    if (!activity || !activity._id) return;
    wx.showModal({
      title: "确认取消活动",
      content: `确定要取消活动"${activity.name}"吗？`,
      success: (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: "处理中..." });
        activityService
          .updateActivity(activity._id, { status: "已取消" })
          .then(() => {
            wx.hideLoading();
            wx.showToast({ title: "已取消活动", icon: "success" });
            this.closeEditModal();
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
