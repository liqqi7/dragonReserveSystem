const app = getApp();
const activityService = require("../../services/activity");
const { getApiBaseUrl } = require("../../services/config");

const pad = (n) => (n < 10 ? `0${n}` : `${n}`);

const WEEKDAY_LABELS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

function getWeekdayLabel(dateTimeString) {
  if (!dateTimeString) return "";
  const safe = String(dateTimeString).replace(" ", "T");
  const d = new Date(safe);
  if (Number.isNaN(d.getTime())) return "";
  return WEEKDAY_LABELS[d.getDay()];
}

function debugLog(payload) {
  try {
    wx.request({
      url: "http://127.0.0.1:7559/ingest/f5086d31-35a2-4638-bcfe-54b976d6ce94",
      method: "POST",
      header: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "7cc68d"
      },
      data: payload,
      fail: (err) => {
        try {
          // #region agent log
          console.warn("[agent-debugLog] request failed", {
            errMsg: err && err.errMsg,
            hypothesisId: payload && payload.hypothesisId,
            location: payload && payload.location,
            runId: payload && payload.runId
          });
          // #endregion
        } catch (e) {}
      }
    });
  } catch (e) {}
}

const DEFAULT_AVATAR = "/images/default-avatar.svg";
const MEDIA_BASE_URL = String(getApiBaseUrl() || "").replace(/\/api\/v\d+\/?$/, "");
const LOCAL_TEST_AVATAR_PREFIX = "/images/avatars";

function agentLog(payload) {
  // #region agent log
  try {
    const event = {
      sessionId: "fd2fb3",
      runId: "avatar-debug-1",
      timestamp: Date.now(),
      ...payload
    };
    wx.request({
      url: "http://127.0.0.1:7559/ingest/f5086d31-35a2-4638-bcfe-54b976d6ce94",
      method: "POST",
      header: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "fd2fb3"
      },
      data: event,
      fail: (err) => {
        try {
          console.warn("[agentLog-fail]", {
            errMsg: err && err.errMsg,
            sessionId: event.sessionId,
            runId: event.runId,
            hypothesisId: event.hypothesisId,
            location: event.location
          });
        } catch (e) {}
      }
    });
  } catch (e) {}
  // #endregion
}

function normalizeAvatarUrl(url) {
  const value = (url && String(url).trim()) || "";
  if (!value) {
    agentLog({
      hypothesisId: "H2",
      location: "activity_list.js:normalizeAvatarUrl",
      message: "empty avatar url fallback",
      data: { input: value, output: DEFAULT_AVATAR }
    });
    return DEFAULT_AVATAR;
  }

  const lower = value.toLowerCase();
  // 测试造数和示例域名经常是占位地址，直接回退默认头像，避免 404
  if (lower.includes("example.com/")) {
    agentLog({
      hypothesisId: "H1",
      location: "activity_list.js:normalizeAvatarUrl",
      message: "example.com fallback",
      data: { input: value, output: DEFAULT_AVATAR }
    });
    return DEFAULT_AVATAR;
  }
  if (value.startsWith("/media/")) {
    const m = value.match(/test-avatar-(\d{2})\.svg$/i);
    const output = m ? `${LOCAL_TEST_AVATAR_PREFIX}/test-avatar-${m[1]}.svg` : DEFAULT_AVATAR;
    agentLog({
      hypothesisId: "H1",
      location: "activity_list.js:normalizeAvatarUrl",
      message: "media url mapped to local avatar",
      data: { input: value, output }
    });
    return output;
  }
  if (value.startsWith("media/")) {
    const m = value.match(/test-avatar-(\d{2})\.svg$/i);
    const output = m ? `${LOCAL_TEST_AVATAR_PREFIX}/test-avatar-${m[1]}.svg` : DEFAULT_AVATAR;
    agentLog({
      hypothesisId: "H1",
      location: "activity_list.js:normalizeAvatarUrl",
      message: "media relative url mapped to local avatar",
      data: { input: value, output }
    });
    return output;
  }
  if (lower.startsWith("http://")) {
    agentLog({
      hypothesisId: "H1",
      location: "activity_list.js:normalizeAvatarUrl",
      message: "http avatar blocked by wechat, fallback local",
      data: { input: value, output: DEFAULT_AVATAR }
    });
    return DEFAULT_AVATAR;
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
    _rawActivityType: rawType
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
    showEditModal: false,
    showDetailModal: false,
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
      // 活动类型：badminton / boardgame / other
      activityType: ""
    },
    myUserId: "", // 当前用户 openid（用于判断能否删除自己的报名）
    myNickname: "", // 当前用户昵称（userId 为空时的回退，兼容旧数据）
    detailActivity: null,
    shareActivityId: "",   // 用于分享小程序卡片时带上活动 id
    shareActivityName: "", // 分享卡片标题
    locationDisabled: false,
    isAdmin: false,
    isGuest: true,
    searchKeyword: "",
    selectedFilter: "我参与的"
  },

  onLoad(options) {
    this.syncGuestState();
    this._openActivityIdFromShare = (options && options.activityId) || "";
    this._fromShare = !!(options && options.from === "share");
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

    // #region agent log
    debugLog({sessionId:'7cc68d',runId:'post-fix',hypothesisId:'H0',location:'activity_list.js:onLoad',message:'navbar sizing',data:{statusBarHeight:this.data.statusBarHeight,navBarHeight:this.data.navBarHeight},timestamp:Date.now()});
    // #endregion
  },

  onShow() {
    const isGuest = this.syncGuestState();
    if (!isGuest) {
      const isAdmin = app.globalData.userRole === "admin";
      const myUserId = app.globalData.userId || wx.getStorageSync("userId") || "";
      const myNickname = (app.globalData.userProfile?.nickname || wx.getStorageSync("userNickname") || "").trim();
      this.setData({ isAdmin, myUserId, myNickname });
      this.loadActivityList();
      app.checkProfileCompleteness();
    }
    // 同步 isAdmin 到自定义 tabBar 组件
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ isAdmin: app.globalData.userRole === "admin" });
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
      // #region agent log
      debugLog({sessionId:'7cc68d',runId:'post-fix',hypothesisId:'H7',location:'activity_list.js:ensureGroupSnapMetrics',message:'snap metrics measured',data:{largeStep,smallStep},timestamp:Date.now()});
      // #endregion
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
    const prevLeft = typeof meta.lastLeft === "number" ? meta.lastLeft : 0;
    const delta = currentLeft - prevLeft;
    const step = meta.step || 1;
    const rawSteps = Math.abs(delta) / step;

    // 每次滑动仅切 1-2 张（delta 很小时不切）
    let moveSteps = 0;
    if (rawSteps >= 0.1) {
      moveSteps = rawSteps >= 1.5 ? 2 : 1;
    }
    const dir = delta > 0 ? 1 : (delta < 0 ? -1 : 0);
    let nextIndex = meta.index + dir * moveSteps;
    if (nextIndex < 0) nextIndex = 0;
    if (nextIndex > meta.maxIndex) nextIndex = meta.maxIndex;

    const peekLeft = nextIndex > 0 && nextIndex < meta.maxIndex ? 10 : 0;
    const nextLeft = Math.max(0, Math.round(nextIndex * step - peekLeft));

    agentLog({
      hypothesisId: "S2",
      location: "activity_list.js:applyGroupSnap",
      message: "snap calculated",
      data: {
        group,
        source,
        currentLeft,
        prevLeft,
        delta,
        step,
        rawSteps,
        moveSteps,
        dir,
        nextIndex,
        nextLeft
      }
    });

    meta.index = nextIndex;
    meta.lastLeft = nextLeft;
    this.setData({
      groupUseTransition: true,
      [`groupOffset.${group}`]: nextLeft,
      [`focusedCardIndex.${group}`]: nextIndex
    });

    // #region agent log
    debugLog({sessionId:'7cc68d',runId:'post-fix',hypothesisId:'H7',location:'activity_list.js:applyGroupSnap',message:'group snapped',data:{source,group,currentLeft,prevLeft,delta,step,rawSteps,moveSteps,dir,nextIndex,nextLeft,peekLeft},timestamp:Date.now()});
    // #endregion
  },

  onGroupScrollEnd(e) {
    // Deprecated by gesture-driven paging.
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
    meta.gestureDirection = null;
    // #region agent log
    agentLog({
      hypothesisId: "G1",
      runId: "gesture-v5",
      location: "activity_list.js:onGroupTouchStart",
      message: "touchstart",
      data: { group, startX, startY, currentIndex: meta.index, startOffset: meta.touchStartOffset }
    });
    // #endregion
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
      if (dx > 3 || dy > 3) {
        meta.gestureDirection = dy > dx * 2 ? "vertical" : "horizontal";
        if (meta.gestureDirection === "horizontal") {
          this.setData({ groupUseTransition: false, mainScrollEnabled: false });
        }
      }
    }

    if (meta.gestureDirection !== "horizontal") return;

    const now = Date.now();
    if (now - (meta.touchMoveThrottleTs || 0) < 16) return;
    meta.touchMoveThrottleTs = now;
    const deltaX = currentX - meta.touchStartX;
    const baseOffset = meta.touchStartOffset || 0;
    const maxOffset = Math.max(0, meta.maxIndex * (meta.step || 1));
    const newOffset = Math.max(0, Math.min(maxOffset, baseOffset - deltaX));
    this.setData({ [`groupOffset.${group}`]: newOffset });
  },

  onGroupTouchEnd(e) {
    const group = e.currentTarget && e.currentTarget.dataset ? e.currentTarget.dataset.group : "";
    const meta = group && this._snapMeta ? this._snapMeta[group] : null;
    if (!meta) return;

    if (meta.gestureDirection !== "horizontal") {
      meta.gestureDirection = null;
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
    const isQuickFlick = touchDuration < 300 && Math.abs(deltaX) > 15;

    if (isQuickFlick) {
      const dir = deltaX < 0 ? 1 : -1;
      targetIndex = Math.max(0, Math.min(meta.maxIndex, (meta.index || 0) + dir));
    } else {
      targetIndex = Math.round(currentOffset / step);
      targetIndex = Math.max(0, Math.min(meta.maxIndex, targetIndex));
    }

    const peekLeft = (targetIndex > 0 && targetIndex < meta.maxIndex) ? 10 : 0;
    const targetOffset = Math.max(0, Math.round(targetIndex * step - peekLeft));

    meta.index = targetIndex;
    meta.lastLeft = targetOffset;
    this.setData({
      groupUseTransition: true,
      mainScrollEnabled: true,
      [`groupOffset.${group}`]: targetOffset,
      [`focusedCardIndex.${group}`]: targetIndex
    });

    // #region agent log
    agentLog({
      hypothesisId: "G1",
      runId: "gesture-v4",
      location: "activity_list.js:onGroupTouchEnd",
      message: "card snapped",
      data: { group, startX, endX, deltaX, touchDuration, isQuickFlick, currentOffset, targetIndex, targetOffset, step }
    });
    // #endregion
  },

  onMainScroll(e) {
    const scrollTop = (e && e.detail && typeof e.detail.scrollTop === "number") ? e.detail.scrollTop : null;

    // 节流：避免日志刷屏
    const now = Date.now();
    if (this._lastScrollLogAt && now - this._lastScrollLogAt < 350) return;
    this._lastScrollLogAt = now;

    // #region agent log
    debugLog({sessionId:'7cc68d',runId:'post-fix',hypothesisId:'H1',location:'activity_list.js:onMainScroll',message:'main scroll position',data:{scrollTop},timestamp:Date.now()});
    // #endregion

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

      // #region agent log
      const navbarTitleLeftPadding = (navbarInnerRect && navbarTitleRect) ? (navbarTitleRect.left - navbarInnerRect.left) : null;
      const groupGaps = Array.isArray(allGroupRects)
        ? allGroupRects.slice(0, 5).map((r, i, arr) => {
          if (i === 0) return null;
          const prev = arr[i - 1];
          return (prev && r) ? (r.top - prev.bottom) : null;
        })
        : null;
      const renderedVideoCount = Array.isArray(allVideoRects) ? allVideoRects.length : 0;
      const smallTypeLabelCount = Array.isArray(allSmallTypeLabelRects) ? allSmallTypeLabelRects.length : 0;
      const glassMetaIconCount = Array.isArray(allGlassMetaIconRects) ? allGlassMetaIconRects.length : 0;
      const gapTitleToCardTime = (firstGroupHeaderRect2 && firstCardDateLabelRect)
        ? (firstCardDateLabelRect.top - firstGroupHeaderRect2.bottom)
        : null;

      debugLog({sessionId:'7cc68d',runId:'post-fix',hypothesisId:'H2',location:'activity_list.js:onMainScroll:measure',message:'layout rect sampling',data:{scrollTop,navbarRect,logoRect,firstGroupRect,firstGroupHeaderRect,gapNavbarToFirstGroup,gapNavbarToFirstGroupHeader,navbarInnerRect,navbarTitleRect,navbarTitleLeftPadding,largeCardRect,smallCardRect,groupGaps,renderedVideoCount,smallTypeLabelCount,glassMetaIconCount,gapTitleToCardTime,firstGroupHeaderRect2,firstCardDateLabelRect,largeCardRect2,avatarTlRect,avatarTrRect,avatarMidRect,smallCardRect2,avatarTlSmRect,avatarTrSmRect,avatarMidSmRect},timestamp:Date.now()});
      // #endregion

      // #region agent log
      try {
        console.info("[agent-gap]", { scrollTop, gapNavbarToFirstGroup, gapNavbarToFirstGroupHeader });
      } catch (e) {}
      // #endregion
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

    const p = this.loadActivityList();
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

  loadActivityList() {
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
          this.setData({
            activityList: list,
            filteredList: filtered,
            groupedActivities,
            groupOffset: { joined: 0, accepting: 0, notStarted: 0, ended: 0 },
            focusedCardIndex: { joined: 0, accepting: 0, notStarted: 0, ended: 0 },
            groupUseTransition: false
          });
          this._groupSnapMetricsReady = false;
          this.ensureGroupSnapMetrics();

          // 若详情弹窗正打开，同步更新 detailActivity（如刚报名成功）
          if (this.data.showDetailModal && this.data.detailActivity) {
            const id = this.data.detailActivity._id;
            const updated = list.find(a => a._id === id);
            if (updated) {
              const participants = this.normalizeParticipants(updated.participants);
              const checkinCount = participants.filter(p => !!p.checkedInAt).length;
              const startTime = updated.startTime || (updated.date ? `${updated.date} 00:00` : "");
              const signupDeadline = updated.signupDeadline || startTime;
              const activityStarted = startTime ? new Date(startTime.replace(" ", "T") + ":00").getTime() <= Date.now() : false;
              const signupDeadlinePassed = signupDeadline ? new Date(signupDeadline.replace(" ", "T") + ":00").getTime() <= Date.now() : false;
              this.setData({
                detailActivity: { ...updated, participants, checkinCount, activityStarted, signupDeadline, signupDeadlinePassed }
              });
            }
          }

          // 从分享链接进入时自动打开对应活动详情
          if (this._openActivityIdFromShare && this._fromShare && list) {
            const activity = list.find(a => a._id === this._openActivityIdFromShare);
            if (activity) {
              const aid = this._openActivityIdFromShare;
              this._openActivityIdFromShare = "";
              this._fromShare = false;
              const participants = this.normalizeParticipants(activity.participants);
              const checkinCount = participants.filter(p => !!p.checkedInAt).length;
              const startTime = activity.startTime || (activity.date ? `${activity.date} 00:00` : "");
              const signupDeadline = activity.signupDeadline || startTime;
              const activityStarted = startTime ? new Date(startTime.replace(" ", "T") + ":00").getTime() <= Date.now() : false;
              const signupDeadlinePassed = signupDeadline ? new Date(signupDeadline.replace(" ", "T") + ":00").getTime() <= Date.now() : false;
              this.setData({
                showDetailModal: true,
                detailActivity: { ...activity, participants, checkinCount, activityStarted, signupDeadline, signupDeadlinePassed },
                shareActivityId: aid,
                shareActivityName: (activity.name || "活动").trim() || "活动"
              });
            }
          }

          wx.hideLoading();
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

    const list = (resData || []).map(rawItem => {
      const activity = adaptActivity(rawItem);

      const rawType = activity._rawActivityType;
      const normalizedType = (() => {
        const t = (rawType == null ? "" : String(rawType)).trim().toLowerCase();
        if (!t) return "other";
        if (t === "badminton" || t === "羽毛球") return "badminton";
        if (t === "boardgame" || t === "桌游" || t === "board game") return "boardgame";
        if (t === "other" || t === "其它" || t === "其他") return "other";
        return "other";
      })();
      activity.activityType = normalizedType;

      if (!this._seenTypeDebugIds) this._seenTypeDebugIds = {};
      if (!this._seenTypeDebugIds[activity._id]) {
        this._seenTypeDebugIds[activity._id] = true;
        // #region agent log
        debugLog({sessionId:'7cc68d',runId:'post-fix',hypothesisId:'H5',location:'activity_list.js:processActivityList:type',message:'activity type normalization',data:{id:activity._id,rawType,normalizedType},timestamp:Date.now()});
        // #endregion
      }

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

    this.setData({
      showEditModal: true,
      currentActivity: null,
      locationDisabled: false,
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
        activityType: ""
      }
    });
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

    this.setData({
      showEditModal: true,
      currentActivity: activity,
      locationDisabled: hasCheckedIn,
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
        activityType: activity.activityType || ""
      }
    });
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
    const types = ["badminton", "boardgame", "other"];
    const index = Number(e.detail.value);
    this.setData({ "editForm.activityType": types[index] || "" });
  },

  // 详情弹窗内打开编辑（仅管理员）
  detailShowEditModal() {
    const activity = this.data.detailActivity;
    if (!activity) return;
    this.closeDetailModal();
    this.showEditModal({ currentTarget: { dataset: { activity } } });
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
    this.setData({
      showEditModal: false,
      currentActivity: null,
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
        activityType: ""
      }
    });
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

  cancelSignup(e) {
    const activity = e.currentTarget.dataset.activity;
    if (!activity || !activity._id) return;

    wx.showModal({
      title: "确认取消报名",
      content: `确定要取消活动"${activity.name}"的报名吗？`,
      success: (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: "处理中..." });
        activityService
          .cancelSignup(activity._id)
          .then(() => {
            wx.hideLoading();
            wx.showToast({ title: "已取消报名", icon: "success" });
            this.loadActivityList();
          })
          .catch((err) => {
            console.error(err);
            wx.hideLoading();
            wx.showToast({ title: (err && err.message) || "取消失败", icon: "none" });
          });
      }
    });
  },

  // 用户：直接报名（不显示弹窗）
  directSignup(e) {
    const activity = e.currentTarget.dataset.activity;
    if (activity.status === "已结束" || activity.status === "已取消") {
      wx.showToast({ title: "该活动已结束或已取消", icon: "none" });
      return;
    }
    if (activity.signupEnabled === false) {
      wx.showToast({ title: "活动报名暂未开放", icon: "none" });
      return;
    }
    // 报名截止校验
    if (activity.signupDeadline) {
      const deadline = new Date(activity.signupDeadline.replace(" ", "T") + ":00");
      if (!isNaN(deadline.getTime()) && Date.now() >= deadline.getTime()) {
        wx.showToast({ title: "报名已截止", icon: "none" });
        return;
      }
    }
    // 校验是否已在「我的」页面完成公会登记并有昵称
    if (!app.globalData.userId || !app.globalData.userProfile) {
      wx.showModal({
        title: "尚未登记",
        content: "请前往\"我的\"页面完成公会登记后再报名。",
        confirmText: "去我的",
        success: (res) => {
          if (res.confirm) {
            wx.switchTab({ url: "/pages/profile/profile" });
          }
        }
      });
      return;
    }
    
    // 检查是否有昵称
    const nickname = app.globalData.userProfile?.nickname?.trim();
    if (!nickname) {
      wx.showModal({
        title: "提示",
        content: "请前往'我的'页面完善昵称后再报名活动",
        showCancel: false,
        success: () => {
          wx.switchTab({
            url: '/pages/profile/profile'
          });
        }
      });
      return;
    }

    const participants = activity.participants || [];
    const myUserId = app.globalData.userId || wx.getStorageSync("userId") || "";

    // 按 userId 校验：同一用户不能重复报名，允许不同用户重名
    if (myUserId && participants.some(p => typeof p === "object" && p.userId && p.userId === myUserId)) {
      wx.showToast({ title: "您已报名", icon: "none" });
      return;
    }

    wx.showLoading({ title: "报名中..." });

    activityService
      .signupActivity(activity._id)
      .then(() => {
        wx.hideLoading();
        wx.showToast({ title: "报名成功", icon: "success" });
        this.loadActivityList();
      })
      .catch(err => {
        console.error(err);
        wx.hideLoading();
        const msg = (err && err.message) || "";
        if (msg.includes("disabled") || msg.includes("未开放")) {
          wx.showToast({ title: "活动报名暂未开盖", icon: "none" });
        } else {
          wx.showToast({ title: msg || "报名失败", icon: "none" });
        }
      });
  },

  // 规范化参与者（兼容 string 与 {name, userId, checkedInAt}）
  normalizeParticipants(raw) {
    const arr = raw || [];
    return arr.map(p => {
      if (typeof p === "string") {
        return { id: null, name: p, userId: null, avatarUrl: DEFAULT_AVATAR, checkedInAt: null };
      }
      return {
        id: p.id || null,
        name: p.name || "",
        userId: p.userId != null ? String(p.userId) : null,
        avatarUrl: normalizeAvatarUrl(p.avatarUrl),
        checkedInAt: p.checkedInAt || null
      };
    });
  },

  // 查看详情
  showDetail(e) {
    const activity = e.currentTarget.dataset.activity;
    const participants = this.normalizeParticipants(activity.participants);
    const checkinCount = participants.filter(p => !!p.checkedInAt).length;
    const startTime = activity.startTime || (activity.date ? `${activity.date} 00:00` : "");
    const signupDeadline = activity.signupDeadline || startTime;
    const activityStarted = startTime ? new Date(startTime.replace(" ", "T") + ":00").getTime() <= Date.now() : false;
    const signupDeadlinePassed = signupDeadline ? new Date(signupDeadline.replace(" ", "T") + ":00").getTime() <= Date.now() : false;
    this.setData({
      showDetailModal: true,
      detailActivity: { ...activity, participants, checkinCount, activityStarted, signupDeadline, signupDeadlinePassed },
      shareActivityId: activity._id || "",
      shareActivityName: (activity.name || "活动").trim() || "活动"
    });
  },

  closeDetailModal() {
    this.setData({
      showDetailModal: false,
      detailActivity: null,
      shareActivityId: "",
      shareActivityName: ""
    });
  },

  // 详情弹窗内：报名（复用 directSignup 逻辑）
  detailSignup() {
    const activity = this.data.detailActivity;
    if (!activity) return;
    this.directSignup({ currentTarget: { dataset: { activity } } });
  },

  // 详情弹窗内：签到（复用 checkinActivity 逻辑，成功后刷新详情）
  detailCheckin() {
    const activity = this.data.detailActivity;
    if (!activity) return;
    this.checkinActivity({ currentTarget: { dataset: { activity } } });
  },

  detailCancelSignup() {
    const activity = this.data.detailActivity;
    if (!activity) return;
    this.cancelSignup({ currentTarget: { dataset: { activity } } });
  },

  // 小程序卡片分享：分享当前活动（在活动详情打开时由分享按钮触发）
  onShareAppMessage() {
    const id = this.data.shareActivityId;
    const title = this.data.shareActivityName || "俱乐部活动";
    const path = id
      ? `/pages/activity_list/activity_list?from=share&activityId=${id}`
      : "/pages/activity_list/activity_list";
    return { title, path };
  },

  // 删除已报名人员
  removeParticipant(e) {
    const participantId = e.currentTarget.dataset.id;
    const name = e.currentTarget.dataset.name;
    const isSelf = !!e.currentTarget.dataset.self;
    const activity = this.data.detailActivity;

    wx.showModal({
      title: isSelf ? "确认取消报名" : "确认删除",
      content: isSelf
        ? `确定要取消活动"${activity.name}"的报名吗？`
        : `确定要删除"${name}"吗？如果该成员在记账明细中，相关记录也会被删除。`,
      success: (res) => {
        if (res.confirm) {
          this.doRemoveParticipant(participantId, name, activity, isSelf);
        }
      }
    });
  },

  adminRetroCheckin(e) {
    const participantId = e.currentTarget.dataset.id;
    const name = e.currentTarget.dataset.name;
    const activity = this.data.detailActivity;
    if (!activity || !activity._id || !participantId) return;

    wx.showModal({
      title: "确认补签",
      content: `确认将「${name}」标记为已签到吗？`,
      success: (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: "处理中..." });
        activityService
          .adminCheckinParticipant(activity._id, participantId)
          .then(() => {
            wx.hideLoading();
            wx.showToast({ title: "补签成功", icon: "success" });
            this.loadActivityList();
          })
          .catch(err => {
            console.error(err);
            wx.hideLoading();
            wx.showToast({ title: (err && err.message) || "补签失败", icon: "none" });
          });
      }
    });
  },

  adminCancelCheckin(e) {
    const participantId = e.currentTarget.dataset.id;
    const name = e.currentTarget.dataset.name;
    const activity = this.data.detailActivity;
    if (!activity || !activity._id || !participantId) return;

    wx.showModal({
      title: "确认取消签到",
      content: `确认将「${name}」的签到记录撤销吗？`,
      success: (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: "处理中..." });
        activityService
          .adminCancelCheckinParticipant(activity._id, participantId)
          .then(() => {
            wx.hideLoading();
            wx.showToast({ title: "已取消签到", icon: "success" });
            this.loadActivityList();
          })
          .catch(err => {
            console.error(err);
            wx.hideLoading();
            wx.showToast({ title: (err && err.message) || "操作失败", icon: "none" });
          });
      }
    });
  },

  doRemoveParticipant(participantId, name, activity, isSelf = false) {
    wx.showLoading({ title: "处理中..." });

    activityService
      .removeParticipant(activity._id, participantId)
      .then(() => {
        wx.hideLoading();
        wx.showToast({ title: isSelf ? "已取消报名" : "删除成功", icon: "success" });
        // 刷新活动列表和详情
        this.loadActivityList();
        // 更新详情显示：重新计算 participants 和 checkinCount
        const getParticipantName = p => typeof p === "string" ? p : (p && p.name);
        const newParticipants = this.normalizeParticipants((activity.participants || []).filter(p => getParticipantName(p) !== name));
        const checkinCount = newParticipants.filter(p => !!p.checkedInAt).length;
        const updatedActivity = {
          ...activity,
          participants: newParticipants,
          checkinCount,
          hasSignedUp: isSelf ? false : activity.hasSignedUp,
          hasCheckedIn: isSelf ? false : activity.hasCheckedIn
        };
        this.setData({ detailActivity: updatedActivity });
      })
      .catch(err => {
        console.error(err);
        wx.hideLoading();
        wx.showToast({ title: (err && err.message) || (isSelf ? "取消失败" : "删除失败"), icon: "none", duration: 3000 });
      });
  },

  stopPropagation() {},

  onAvatarError(e) {
    const { index, activityId } = e.currentTarget.dataset;
    agentLog({
      hypothesisId: "H3",
      location: "activity_list.js:onAvatarError",
      message: "activity avatar image load failed",
      data: { index, activityId }
    });
    const activityList = this.data.activityList || [];
    const activity = activityList.find((item) => item._id === activityId);
    if (activity && activity.avatarList && activity.avatarList[index]) {
      activity.avatarList[index] = { url: DEFAULT_AVATAR, isDefault: true };
      this.setData({ activityList });
    }
  },

  checkinActivity(e) {
    const activity = e.currentTarget.dataset.activity;
    if (!activity) {
      wx.showToast({ title: "活动信息有误", icon: "none" });
      return;
    }

    if (activity.status !== "进行中" && activity.status !== "未开始") {
      wx.showToast({ title: "仅未开始或进行中的活动可以签到", icon: "none" });
      return;
    }

    if (!activity.locationLatitude || !activity.locationLongitude) {
      wx.showToast({ title: "活动未设置地点，无法签到", icon: "none" });
      return;
    }

    if (!activity.hasSignedUp) {
      wx.showToast({ title: "请先报名后再签到", icon: "none" });
      return;
    }

    const nickname =
      (app.globalData.userProfile && app.globalData.userProfile.nickname && app.globalData.userProfile.nickname.trim()) ||
      this.data.myNickname ||
      "";

    if (!nickname) {
      wx.showToast({ title: "请先在“我的”页面完善昵称", icon: "none" });
      return;
    }

    wx.navigateTo({
      url: "/pages/checkin_map/checkin_map",
      success: (res) => {
        if (res && res.eventChannel) {
          res.eventChannel.emit("initCheckin", {
            activity,
            nickname
          });
        }
      }
    });
  }
});
