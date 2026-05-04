const app = getApp();
const activityService = require("../../services/activity");
const userService = require("../../services/user");
const myActivitiesCache = require("../../utils/myActivitiesCache");
const { patchTabBarIfNeeded } = require("../../utils/tabBarSync");

function ensureSessionParallel(appLocal) {
  return new Promise((resolve) => {
    if (
      appLocal.globalData.sessionValidated &&
      appLocal.globalData.accessToken &&
      appLocal.globalData.userId &&
      appLocal.globalData.userProfile
    ) {
      resolve({ ok: true });
      return;
    }
    const token = appLocal.globalData.accessToken || wx.getStorageSync("accessToken") || "";
    if (!token) {
      resolve({ ok: false });
      return;
    }
    userService
      .getMe()
      .then((user) => {
        appLocal.applyCurrentUser(user);
        resolve({ ok: true });
      })
      .catch((err) => {
        console.error("activity_calendar ensureSessionParallel", err);
        appLocal.logout();
        resolve({ ok: false });
      });
  });
}

function currentUserId(appLocal) {
  return String(appLocal.globalData.userId || wx.getStorageSync("userId") || "").trim();
}

const WEEKDAY_SHORT = ["日", "一", "二", "三", "四", "五", "六"];
const WEEKDAY_FULL = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
const HOUR_HEIGHT = 60;
const MIN_EVENT_HEIGHT = 60;
const TIMELINE_DEFAULT_START_HOUR = 9;
const TIMELINE_PADDING_BELOW_STICKY_PX = 14;
const TIMELINE_SCROLL_TOP_CALIBRATION_PX = 60;

/**
 * 时间格采用「长 page 列表 + current 累加」架构（不重建、不重置）：
 *   - timelineSwipePages 总长 = 2*RADIUS + 1 = 31 个 page
 *   - 中心日（anchorDate）位于 pages[CENTER_OFFSET]，初始为今天
 *   - swiper display-multiple-items=3，可见 pages[current..current+2]，锚点/周条高亮 = 左列 pages[current]
 *   - 用户翻页：current ± 1，pages 不变
 *   - 周条翻 7 天：current ± 7，由 swiper 原生 700ms 动画流畅滚动
 *   - 接近边界时（current<EDGE_GUARD 或 current>length-3-EDGE_GUARD）后台扩展
 * 该架构彻底消除了「rebuildWeek 重置 current 触发额外 transition」的根因。
 */
const TIMELINE_RADIUS = 15;
const CENTER_OFFSET = TIMELINE_RADIUS;          // 中心日在数组中的下标
/** swiper 初始 current：左列为锚点日（pages[CENTER_OFFSET]），可见 [15,16,17] */
const INITIAL_CURRENT = TIMELINE_RADIUS;
const EDGE_GUARD = 3;                           // current 距两端 ≤ 此值时触发扩展
const EDGE_EXTEND = 14;                         // 每次扩展 14 天
/** 周条翻周引发的时间格连扫动画时长（ms） */
const TIMELINE_BURST_TOTAL_MS = 700;

const EVENT_COLORS = [
  { bg: "#fff0f0", border: "#ff001f", text: "#cc0018" },
  { bg: "#f1f8e9", border: "#7cb342", text: "#558b2f" },
  { bg: "#e3f2fd", border: "#2196f3", text: "#1565c0" },
  { bg: "#fff7ed", border: "#f97316", text: "#c2410c" },
  { bg: "#f5f3ff", border: "#8b5cf6", text: "#6d28d9" }
];

function pad(n) {
  return n < 10 ? `0${n}` : `${n}`;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getMonday(date) {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(d, diff);
}

function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const safe = String(value).replace(" ", "T");
  const dateOnly = safe.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
  }
  const date = new Date(safe);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** 网络/缓存刷新 rebuild 时优先用当前时间格左列，避免首滑误改 selectedDateKey 后整表锚到错误周（见 debug 首帧大 dx 后紧跟 rebuild） */
function anchorDateFromVisibleTimelinePage(self) {
  const pages = self.data.timelineSwipePages;
  const cur = self.data.timelineSwiperCurrent;
  const row = pages && pages[cur];
  const key = row && row.key;
  const d = key ? parseDate(key) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
}

/** 预览高亮仅允许落在当前 weekStripPages 里有的日期，避免高亮到「下一周」而周条 UI 仍显示上一周导致红圈错位/整行异常 */
function weekStripPagesContainDateKey(weekStripPages, dateKey) {
  if (!dateKey || !Array.isArray(weekStripPages)) return false;
  for (let p = 0; p < weekStripPages.length; p++) {
    const days = weekStripPages[p] && weekStripPages[p].days;
    if (!Array.isArray(days)) continue;
    for (let i = 0; i < days.length; i++) {
      if (days[i] && days[i].key === dateKey) return true;
    }
  }
  return false;
}

function timeText(date) {
  if (!date) return "";
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function monthDayText(date) {
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function getWeekNumber(date) {
  const firstDay = new Date(date.getFullYear(), 0, 1);
  const pastDays = Math.floor((startOfDay(date) - firstDay) / 86400000);
  return Math.ceil((pastDays + firstDay.getDay() + 1) / 7);
}

function calendarDaysBetween(a, b) {
  const A = startOfDay(a).getTime();
  const B = startOfDay(b).getTime();
  return Math.round((B - A) / 86400000);
}

/** 一周的 7 天（周一→周日顺序） */
function buildWeekStripPage(monday, todayKey, byDate) {
  const m = startOfDay(monday);
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(m, i);
    const key = dateKey(d);
    const hasActivity = (byDate.get(key) || []).length > 0;
    return {
      key,
      weekday: WEEKDAY_SHORT[d.getDay()],
      day: d.getDate(),
      isToday: key === todayKey,
      showStripEventBar: hasActivity,
      hasActivity
    };
  });
}

/** 三块周面板：上一周 / 当前周 / 下一周 */
function buildWeekStripSwipePages(centerDate, todayKey, byDate) {
  const prevMonday = getMonday(addDays(startOfDay(centerDate), -7));
  const centerMonday = getMonday(startOfDay(centerDate));
  const nextMonday = getMonday(addDays(startOfDay(centerDate), 7));
  const weekKey = (mon) => `${dateKey(mon)}_${dateKey(addDays(mon, 6))}`;
  return [
    { weekKey: weekKey(prevMonday),   days: buildWeekStripPage(prevMonday,   todayKey, byDate) },
    { weekKey: weekKey(centerMonday), days: buildWeekStripPage(centerMonday, todayKey, byDate) },
    { weekKey: weekKey(nextMonday),   days: buildWeekStripPage(nextMonday,   todayKey, byDate) }
  ];
}

function buildTimelineColumn(dayDate, byDate, todayKey) {
  const day = startOfDay(dayDate);
  const key = dateKey(day);
  return {
    key,
    isToday: key === todayKey,
    title: `${monthDayText(day)} - ${WEEKDAY_FULL[day.getDay()]}`,
    activities: (byDate.get(key) || [])
      .slice()
      .sort((a, b) => {
        const ta = a.start ? new Date(a.start).getTime() : 0;
        const tb = b.start ? new Date(b.start).getTime() : 0;
        return ta - tb;
      })
  };
}

/**
 * 构建以 anchorDate 为中心的长 page 列表（共 2*RADIUS+1 = 31 个）。
 * pages[CENTER_OFFSET] === anchorDate
 */
function buildTimelineLongList(anchorDate, byDate, todayKey, radius) {
  const r = typeof radius === "number" ? radius : TIMELINE_RADIUS;
  const c = startOfDay(anchorDate);
  return Array.from({ length: 2 * r + 1 }, (_, i) =>
    buildTimelineColumn(addDays(c, i - r), byDate, todayKey)
  );
}

function adaptActivity(item, index) {
  const start = parseDate(item.start_time);
  const end = parseDate(item.end_time);
  const startMinutes = start ? start.getHours() * 60 + start.getMinutes() : 0;
  const durationMinutes = start && end ? Math.max(30, Math.round((end - start) / 60000)) : 60;
  const color = EVENT_COLORS[index % EVENT_COLORS.length];
  const status = item.status || "";
  const isCancelled = status === "已取消";
  const top = Math.round((startMinutes / 60) * HOUR_HEIGHT);
  const height = Math.max(MIN_EVENT_HEIGHT, Math.round((durationMinutes / 60) * HOUR_HEIGHT));
  const locationName = String(item.location_name || item.location_address || "").trim();

  return {
    _id: String(item.id),
    name: item.name || "未命名活动",
    status,
    locationName,
    start,
    end,
    dateKey: start ? dateKey(start) : "",
    timeRange: `${timeText(start)} - ${timeText(end)}`,
    style: [
      `top:${top}px`,
      `height:${height}px`,
      `background:${isCancelled ? "#f3f4f6" : color.bg}`,
      `border-left-color:${isCancelled ? "#9ca3af" : color.border}`,
      `color:${isCancelled ? "#6b7280" : color.text}`
    ].join(";")
  };
}

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    navbarPaddingRightPx: 12,
    timelineTopPx: 200,
    timelineBodyGapPx: 12,
    loading: true,
    loadError: "",
    isGuest: false,
    empty: false,
    selectedDateKey: "",
    /** 周条高亮（拖动中由 WXS 预览更新，松手后与 selectedDateKey 对齐） */
    weekStripHighlightKey: "",
    weekNumber: "",
    weekStripPages: [],
    weekStripSwiperIndex: 1,
    weekStripSwiperDuration: 300,
    weekStripSlideAnim: {},
    /** 长 page 列表：永不重建（只在加载/点击日期/边界扩展时重建） */
    timelineSwipePages: [],
    /** swiper current（累加，不重置）。可见 pages[current..current+2]，高亮/业务锚点 = 左列 pages[current] */
    timelineSwiperCurrent: INITIAL_CURRENT,
    timelineSwiperDuration: 0,
    timelineScrollTop: 0,
    /** WXS 同步 header 用：cellWidthPx + base = -current * cellWidthPx */
    headerCellWidthPx: 0,
    headerStripBaseOffsetPx: 0,
    /** 边界扩展瞬间冻结 WXS（避免 setData 触发的中间帧错位） */
    timelineFrozen: false,
    /** 周条触发的 7 格连扫期间为 true：WXS 仍平移吸顶条，但不 callMethod 周条高亮预览 */
    timelineSuppressDragPreview: false,
    /** rebuildAll 自增，wx:for 宿主重挂载 swiper，强制 native 从 page 0 初始化到 current=15，避免内部状态停留在 0 */
    timelineSwiperRemountTick: 0,
    hours: [],
    gridHeight: HOUR_HEIGHT * 24,
    activities: [],
  },

  onLoad() {
    const info = wx.getSystemInfoSync();
    let navbarPaddingRightPx = 12;
    try {
      const menu = wx.getMenuButtonBoundingClientRect();
      if (menu && menu.left && info.windowWidth) {
        navbarPaddingRightPx = Math.max(12, Math.ceil(info.windowWidth - menu.left) + 8);
      }
    } catch (e) {}
    const today = startOfDay(new Date());
    const winW = info.windowWidth || 375;
    const weekStripPx = Math.round((137 / 750) * winW);
    const statusBarPx = info.statusBarHeight || 20;
    const navContentPx = 44;
    const gapNavToWeekPx = 12;
    const gapWeekToTimelinePx = 12;
    const timelineTopPx = statusBarPx + navContentPx + gapNavToWeekPx + weekStripPx;
    const timeAxisWidthPx = (100 / 750) * winW;
    const headerCellWidthPx = (winW - timeAxisWidthPx) / 3;

    this.setData({
      statusBarHeight: statusBarPx,
      navbarPaddingRightPx,
      timelineTopPx,
      timelineBodyGapPx: gapWeekToTimelinePx,
      selectedDateKey: dateKey(today),
      weekStripHighlightKey: dateKey(today),
      hours: Array.from({ length: 24 }, (_, i) => `${pad(i)}:00`),
      headerCellWidthPx,
      headerStripBaseOffsetPx: -INITIAL_CURRENT * headerCellWidthPx,
      timelineSwiperCurrent: INITIAL_CURRENT,
    });
    this.rebuildAll([], today);
  },

  onShow() {
    patchTabBarIfNeeded(this, {
      selected: 1,
      isAdmin: app.globalData.userRole === "admin",
    });
    // #region agent log - 重置采集计数
    this._logChangeCount = 0; this._logExtendCount = 0; this._logRebuildCount = 0; this._logAnimFinishCount = 0;
    // #endregion
    this.loadCalendar();
  },

  syncGuestState() {
    const hasWeChatAuth = !!wx.getStorageSync("hasWeChatAuth");
    const hasToken = !!(app.globalData.accessToken || wx.getStorageSync("accessToken"));
    const isGuest = !hasWeChatAuth || !hasToken || !app.globalData.isAuthenticated;
    this.setData({ isGuest });
    return isGuest;
  },

  /** 默认纵向滚动到 09:00 附近 */
  _applyDefaultTimelineScroll() {
    const target = Math.max(
      0,
      Math.round(
        TIMELINE_DEFAULT_START_HOUR * HOUR_HEIGHT -
          TIMELINE_PADDING_BELOW_STICKY_PX -
          TIMELINE_SCROLL_TOP_CALIBRATION_PX
      )
    );
    if (typeof this._timelineScrollSeq !== "number") this._timelineScrollSeq = 0;
    this._timelineScrollSeq += 1;
    const seq = this._timelineScrollSeq;
    this.setData({ timelineScrollTop: 0 }, () => {
      wx.nextTick(() => {
        if (seq !== this._timelineScrollSeq) return;
        this.setData({ timelineScrollTop: target }, () => {
          this._timelineScrollTopPreserve = target;
          this._timelineInitialScrollDone = true;
        });
      });
    });
  },

  _restoreTimelineScroll(desiredTop) {
    let top =
      typeof desiredTop === "number" && !Number.isNaN(desiredTop)
        ? Math.max(0, Math.round(desiredTop))
        : typeof this.data.timelineScrollTop === "number"
          ? Math.max(0, Math.round(this.data.timelineScrollTop))
          : 0;
    if (typeof this._timelineScrollSeq !== "number") this._timelineScrollSeq = 0;
    this._timelineScrollSeq += 1;
    const seq = this._timelineScrollSeq;
    this.setData({ timelineScrollTop: 0 }, () => {
      wx.nextTick(() => {
        if (seq !== this._timelineScrollSeq) return;
        this.setData({ timelineScrollTop: top }, () => {
          this._timelineScrollTopPreserve = top;
        });
      });
    });
  },

  onTimelineScroll(e) {
    const d = (e && e.detail) || {};
    if (typeof d.scrollTop === "number") this._timelineScrollTopPreserve = d.scrollTop;
  },

  /** 避免 setData 后 Date 序列化失真，周切换始终以这份列表分组 */
  activitiesForRebuild() {
    if (Array.isArray(this._calendarActivitiesCanon)) return this._calendarActivitiesCanon;
    return this.data.activities || [];
  },

  /**
   * 完整重建（仅在数据加载、点击日期、跨周翻周时使用）。
   * 围绕 anchorDate 构建 31 page 长列表，current 重置为 INITIAL_CURRENT，
   * weekStripPages 围绕 anchorDate 构建。
   */
  rebuildAll(activities, anchorDate) {
    const anchor = startOfDay(parseDate(anchorDate) || new Date());
    const byDate = new Map();
    (activities || []).forEach((activity) => {
      if (!byDate.has(activity.dateKey)) byDate.set(activity.dateKey, []);
      byDate.get(activity.dateKey).push(activity);
    });
    const todayKey = dateKey(startOfDay(new Date()));
    const timelineSwipePages = buildTimelineLongList(anchor, byDate, todayKey);
    const weekStripPages = buildWeekStripSwipePages(anchor, todayKey, byDate);

    this._anchorDateKey = dateKey(anchor);
    this._byDateMap = byDate;
    // 首次手势前 swiper 易吐出异常 dx；待用户 touch 成功翻过一页后再放宽预览（见 onTimelineDragPreview）
    this._timelineDragPreviewLoose = false;

    const nextRemount = (this.data.timelineSwiperRemountTick || 0) + 1;
    // #region agent log H7 - rebuild
    if (!this._logRebuildCount) this._logRebuildCount = 0;
    this._logRebuildCount++;
    if (this._logRebuildCount <= 5) {
      wx.request({ url: 'http://127.0.0.1:7776/ingest/f5086d31-35a2-4638-bcfe-54b976d6ce94', method: 'POST', header: { 'content-type': 'application/json', 'X-Debug-Session-Id': '01549b' }, data: { sessionId: '01549b', hypothesisId: 'H7', location: 'activity_calendar.js:rebuildAll', message: 'rebuild', data: { anchor: this._anchorDateKey, pagesLen: timelineSwipePages.length, current: INITIAL_CURRENT, remountTick: nextRemount, n: this._logRebuildCount }, timestamp: Date.now() } });
    }
    // #endregion
    this.setData({
      selectedDateKey: this._anchorDateKey,
      weekStripHighlightKey: this._anchorDateKey,
      weekNumber: `第${getWeekNumber(anchor)}周`,
      weekStripPages,
      weekStripSwiperIndex: 1,
      timelineSwipePages,
      timelineSwiperCurrent: INITIAL_CURRENT,
      timelineSwiperDuration: 0,
      timelineFrozen: true,
      timelineSwiperRemountTick: nextRemount,
      headerStripBaseOffsetPx: -INITIAL_CURRENT * this.data.headerCellWidthPx,
      weekStripSlideAnim: {},
    }, () => {
      if (!this._timelineInitialScrollDone) {
        this._applyDefaultTimelineScroll();
      } else {
        const top = typeof this._timelineScrollTopPreserve === "number"
          ? this._timelineScrollTopPreserve
          : this.data.timelineScrollTop;
        this._restoreTimelineScroll(top);
      }
      // 给 swiper 两帧时间就位后再解冻，避免 bindtransition 在首帧读到过期位移。
      // 同时恢复 timelineSwiperDuration 为非零值，防止后续周条/点击动画因旧值=0 而瞬间完成。
      wx.nextTick(() => {
        wx.nextTick(() => {
          this.setData({ timelineFrozen: false, timelineSwiperDuration: 300 });
        });
      });
    });
  },

  loadCalendar(forceRefresh) {
    const isGuest = this.syncGuestState();
    if (isGuest) {
      this._calendarActivitiesCanon = [];
      this.setData({ loading: false, loadError: "", empty: true, activities: [] }, () => {
        this.rebuildAll([], parseDate(this.data.selectedDateKey) || new Date());
      });
      return;
    }

    if (typeof this._calendarLoadSeq !== "number") this._calendarLoadSeq = 0;
    this._calendarLoadSeq += 1;
    const seq = this._calendarLoadSeq;

    if (forceRefresh) this.setData({ loadError: "" });

    const readUid = currentUserId(app);
    let hadCachePaint = false;
    if (!forceRefresh && readUid) {
      const cached = myActivitiesCache.readRawList(readUid);
      if (cached != null && Array.isArray(cached)) {
        const activities = cached.map(adaptActivity);
        this._calendarActivitiesCanon = activities;
        this.setData(
          { loading: false, loadError: "", empty: activities.length === 0, activities },
          () => {
            const anchor = anchorDateFromVisibleTimelinePage(this) || parseDate(this.data.selectedDateKey) || new Date();
            this.rebuildAll(this.activitiesForRebuild(), anchor);
          }
        );
        hadCachePaint = true;
      }
    }

    const token = app.globalData.accessToken || wx.getStorageSync("accessToken") || "";
    if (!token) {
      this.syncGuestState();
      this._calendarActivitiesCanon = [];
      this.setData({ loading: false, loadError: "", empty: true, activities: [] }, () => {
        this.rebuildAll([], parseDate(this.data.selectedDateKey) || new Date());
      });
      return;
    }

    if (!hadCachePaint) this.setData({ loading: true, loadError: "" });

    Promise.all([
      activityService.listMyActivities().catch((e) => ({ __error: e })),
      ensureSessionParallel(app),
    ]).then(([listRes, ens]) => {
      if (seq !== this._calendarLoadSeq) return;

      if (!ens.ok || this.syncGuestState()) {
        this._calendarActivitiesCanon = [];
        this.setData({ loading: false, loadError: "", empty: true, activities: [] }, () => {
          this.rebuildAll([], parseDate(this.data.selectedDateKey) || new Date());
        });
        return;
      }

      const uidForCache = currentUserId(app);

      if (listRes && listRes.__error) {
        const errMsg = listRes.__error.message || listRes.__error.errMsg || "日程加载失败";
        if (!hadCachePaint) {
          this.setData({ loading: false, loadError: String(errMsg) || "日程加载失败", empty: false });
        } else {
          this.setData({ loading: false });
        }
        return;
      }

      const rawList = Array.isArray(listRes) ? listRes : [];
      if (uidForCache) myActivitiesCache.writeRawList(uidForCache, rawList);

      const activities = rawList.map(adaptActivity);
      this._calendarActivitiesCanon = activities;
      this.setData(
        { loading: false, loadError: "", empty: activities.length === 0, activities },
        () => {
          const anchor = anchorDateFromVisibleTimelinePage(this) || parseDate(this.data.selectedDateKey) || new Date();
          this.rebuildAll(this.activitiesForRebuild(), anchor);
        }
      );
    });
  },

  /** 周条手势：仅记录翻周方向（±7），动画在 animationFinish 中执行 */
  onWeekStripSwiperChange(e) {
    const d = e.detail || {};
    const src = d.source;
    const idxNum = Number(d.current);
    if (this._weekStripSwipeBusy) return;
    if (src === "autoplay") return;
    const slideIndex = Number.isFinite(idxNum) ? idxNum : NaN;
    if (slideIndex !== 0 && slideIndex !== 2) return;

    this._weekStripPendingSlideIndex = slideIndex;
    this._weekStripGestureRole = "week-strip";
    this._weekStripCommitConsumed = false;
    this.setData({ weekStripSwiperIndex: slideIndex });
    this._weekStripSwipeBusy = true;
  },

  /**
   * 周条翻周完成：直接 setData(timelineSwiperCurrent ± 7)，由 swiper 用 700ms
   * 动画原生流畅滚动 7 page。无需 burst pages、无需重建数据。
   * 必要时先在前/后扩展 14 天保证 current ± 7 不越界。
   */
  onWeekStripSwiperAnimationFinish(e) {
    const d = (e && e.detail) || {};
    const role = (e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.role) || "unknown";
    const idxNum = Number(d.current);
    const currentIndex = Number.isFinite(idxNum) ? idxNum : NaN;
    const pending = this._weekStripPendingSlideIndex;
    const slideIndex = pending === 0 || pending === 2 ? pending : currentIndex;

    // #region agent log H12
    if (!this._logWeekStripCount) this._logWeekStripCount = 0;
    this._logWeekStripCount++;
    wx.request({ url: 'http://127.0.0.1:7776/ingest/f5086d31-35a2-4638-bcfe-54b976d6ce94', method: 'POST', header: { 'content-type': 'application/json', 'X-Debug-Session-Id': '01549b' }, data: { sessionId: '01549b', hypothesisId: 'H12', location: 'activity_calendar.js:onWeekStripSwiperAnimationFinish', message: 'weekstrip-animfinish', data: { role, currentIndex, slideIndex, pending, consumed: this._weekStripCommitConsumed, gestureRole: this._weekStripGestureRole, timelineCurrent: this.data.timelineSwiperCurrent, n: this._logWeekStripCount }, timestamp: Date.now() } });
    // #endregion

    if (this._weekStripCommitConsumed) return;
    const gestureRole = this._weekStripGestureRole || "";
    if (gestureRole !== "week-strip" || role !== "week-strip") return;

    if (slideIndex !== 0 && slideIndex !== 2) {
      this._weekStripPendingSlideIndex = null;
      this._weekStripGestureRole = "";
      this._weekStripCommitConsumed = false;
      this._weekStripSwipeBusy = false;
      return;
    }
    this._weekStripCommitConsumed = true;

    const deltaDays = slideIndex === 0 ? -7 : 7;
    this._weekStripPendingSlideIndex = null;
    this._weekStripGestureRole = "";
    this._weekStripCommitConsumed = false;

    const curCurrent = this.data.timelineSwiperCurrent;
    const targetCurrent = curCurrent + deltaDays;

    // 确保 targetCurrent 在 [0, pages.length - 3] 之内，否则先扩展
    this._ensurePagesCoverCurrent(targetCurrent, () => {
      // 扩展可能改变了 current 的相对位置；重新读取 current 后计算偏移目标
      const adjustedTarget = this.data.timelineSwiperCurrent + deltaDays;
      const newCenterPage = this.data.timelineSwipePages[adjustedTarget];

      // #region agent log H12
      wx.request({ url: 'http://127.0.0.1:7776/ingest/f5086d31-35a2-4638-bcfe-54b976d6ce94', method: 'POST', header: { 'content-type': 'application/json', 'X-Debug-Session-Id': '01549b' }, data: { sessionId: '01549b', hypothesisId: 'H12', location: 'activity_calendar.js:onWeekStripSwiperAnimationFinish:callback', message: 'weekstrip-setdata', data: { curCurrent, deltaDays, adjustedTarget, newPageKey: newCenterPage && newCenterPage.key, timelineCurrentNow: this.data.timelineSwiperCurrent, n: this._logWeekStripCount }, timestamp: Date.now() } });
      // #endregion

      if (!newCenterPage) {
        this._weekStripSwipeBusy = false;
        return;
      }
      const newSelectedDate = parseDate(newCenterPage.key);

      const newWeekStripPages = buildWeekStripSwipePages(
        newSelectedDate, dateKey(startOfDay(new Date())), this._byDateMap
      );

      // 注意：此处不更新 headerStripBaseOffsetPx。
      // 保持当前（起点）值，让 WXS 以起点为 baseOffset 自然跟随 7 天动画。
      // 动画完成后由 onTimelineSwiperAnimFinish 更新为终点值。
      //
      // 微信 swiper 在同一 setData 中同时修改 duration 和 current 时，
      // 会使用「旧 duration」执行本次动画。若旧值为 0（rebuildAll 遗留），
      // 则动画瞬间完成（无动画效果）。
      // 修复：先 setData 更新 duration 和周条数据，在 callback 里再改 current，
      // 确保 swiper 看到的旧 duration 已经是目标值（700ms）。
      this.setData({
        weekStripPages: newWeekStripPages,
        weekStripSwiperIndex: 1,
        weekStripSwiperDuration: 0,
        timelineSwiperDuration: TIMELINE_BURST_TOTAL_MS,
        timelineSuppressDragPreview: true,
        selectedDateKey: newCenterPage.key,
        weekStripHighlightKey: newCenterPage.key,
        weekNumber: `第${getWeekNumber(newSelectedDate)}周`,
      }, () => {
        // 此时 timelineSwiperDuration 已更新为 700ms；
        // 再改 current，swiper 将以「旧值=700ms」执行动画。
        this.setData({ timelineSwiperCurrent: adjustedTarget }, () => {
          wx.nextTick(() => {
            this.setData({ weekStripSwiperDuration: 300 });
          });
          this._weekStripSwipeBusy = false;
        });
      });
    });
  },

  /**
   * 时间格 swiper 翻页：用户拖动一格触发。current 累加，pages 不变。
   * 同步更新 selectedDateKey、weekNumber、weekStripPages（如跨周）、headerStripBaseOffsetPx。
   */
  onTimelineSwiperChange(e) {
    const d = e.detail || {};
    const src = d.source;
    const newCurrent = Number(d.current);
    const oldCurrent = this.data.timelineSwiperCurrent;

    // #region agent log H8
    if (!this._logChangeCount) this._logChangeCount = 0;
    this._logChangeCount++;
    if (this._logChangeCount <= 30) {
      wx.request({ url: 'http://127.0.0.1:7776/ingest/f5086d31-35a2-4638-bcfe-54b976d6ce94', method: 'POST', header: { 'content-type': 'application/json', 'X-Debug-Session-Id': '01549b' }, data: { sessionId: '01549b', hypothesisId: 'H8', location: 'activity_calendar.js:onTimelineSwiperChange', message: 'change', data: { newCurrent, oldCurrent, src, n: this._logChangeCount }, timestamp: Date.now() } });
    }
    // #endregion

    if (!Number.isFinite(newCurrent)) return;
    if (src === "autoplay") return;
    if (newCurrent === oldCurrent) return;
    if (src === "touch") {
      this._timelineDragPreviewLoose = true;
    }

    const pages = this.data.timelineSwipePages;
    const newCenterPage = pages[newCurrent];
    if (!newCenterPage) return;

    const newCenterDate = parseDate(newCenterPage.key);
    const oldSelectedDate = parseDate(this.data.selectedDateKey) || newCenterDate;
    const crossWeek = getMonday(newCenterDate).getTime() !== getMonday(oldSelectedDate).getTime();

    const patch = {
      timelineSwiperCurrent: newCurrent,
      selectedDateKey: newCenterPage.key,
      weekStripHighlightKey: newCenterPage.key,
      weekNumber: `第${getWeekNumber(newCenterDate)}周`,
      headerStripBaseOffsetPx: -newCurrent * this.data.headerCellWidthPx,
    };
    patch.timelineSuppressDragPreview = true;
    if (crossWeek) {
      const oldMon = getMonday(oldSelectedDate);
      const newMon = getMonday(newCenterDate);
      const forward = newMon.getTime() > oldMon.getTime();
      const initAnim = wx.createAnimation({ duration: 0 });
      initAnim.translateX(forward ? 600 : -600).step();
      patch.weekStripPages = buildWeekStripSwipePages(
        newCenterDate, dateKey(startOfDay(new Date())), this._byDateMap || new Map()
      );
      patch.weekStripSwiperIndex = 1;
      patch.weekStripSwiperDuration = 0;
      patch.weekStripSlideAnim = initAnim.export();
    }
    this.setData(patch, () => {
      if (crossWeek) {
        wx.nextTick(() => {
          const slideAnim = wx.createAnimation({ duration: 220, timingFunction: "ease" });
          slideAnim.translateX(0).step();
          this.setData({
            weekStripSlideAnim: slideAnim.export(),
            weekStripSwiperDuration: 300,
          });
        });
      }
    });

    // 接近边界时后台扩展 pages
    if (newCurrent <= EDGE_GUARD || newCurrent >= pages.length - 3 - EDGE_GUARD) {
      this._ensurePagesCoverCurrent(newCurrent, () => {});
    }
  },

  /**
   * 边界扩展：若 targetCurrent 不在 [0, pages.length-3] 之内，或距两端 ≤ EDGE_GUARD，
   * 在前/后补 EDGE_EXTEND 天。前补会改变所有 cell 的 idx，需同步调整 current。
   * 扩展期间打开 timelineFrozen 让 WXS 跳过本帧 transition，避免 setData 中间帧错位。
   */
  _ensurePagesCoverCurrent(targetCurrent, done) {
    const pages = this.data.timelineSwipePages;
    const len = pages.length;
    const todayKey = dateKey(startOfDay(new Date()));
    const byDate = this._byDateMap || new Map();

    let prependCount = 0;
    let appendCount = 0;
    if (targetCurrent <= EDGE_GUARD) prependCount = EDGE_EXTEND;
    if (targetCurrent >= len - 3 - EDGE_GUARD) appendCount = EDGE_EXTEND;
    if (prependCount === 0 && appendCount === 0) {
      done && done();
      return;
    }

    let newPages = pages;
    if (prependCount > 0) {
      const firstDate = parseDate(pages[0].key);
      const prepend = Array.from({ length: prependCount }, (_, i) =>
        buildTimelineColumn(addDays(firstDate, -prependCount + i), byDate, todayKey)
      );
      newPages = prepend.concat(newPages);
    }
    if (appendCount > 0) {
      const lastDate = parseDate(pages[len - 1].key);
      const append = Array.from({ length: appendCount }, (_, i) =>
        buildTimelineColumn(addDays(lastDate, i + 1), byDate, todayKey)
      );
      newPages = newPages.concat(append);
    }

    const newCurrent = this.data.timelineSwiperCurrent + prependCount;

    // #region agent log H9 - extend
    if (!this._logExtendCount) this._logExtendCount = 0;
    this._logExtendCount++;
    wx.request({ url: 'http://127.0.0.1:7776/ingest/f5086d31-35a2-4638-bcfe-54b976d6ce94', method: 'POST', header: { 'content-type': 'application/json', 'X-Debug-Session-Id': '01549b' }, data: { sessionId: '01549b', hypothesisId: 'H9', location: 'activity_calendar.js:_ensurePagesCoverCurrent', message: 'extend', data: { prependCount, appendCount, oldCurrent: this.data.timelineSwiperCurrent, newCurrent, oldLen: len, newLen: newPages.length, n: this._logExtendCount }, timestamp: Date.now() } });
    // #endregion

    this.setData({
      timelineFrozen: true,
      timelineSwipePages: newPages,
      timelineSwiperCurrent: newCurrent,
      timelineSwiperDuration: 0,
      headerStripBaseOffsetPx: -newCurrent * this.data.headerCellWidthPx,
    }, () => {
      wx.nextTick(() => {
        this.setData({ timelineFrozen: false });
        done && done();
      });
    });
  },

  /** 周条上点击某日：跳转到该日 */
  onDateTap(e) {
    const key = e.currentTarget.dataset.key;
    const selected = parseDate(key);
    if (!selected) return;
    const pages = this.data.timelineSwipePages;
    // 在现有 pages 中查找 idx
    const idx = pages.findIndex((p) => p.key === key);
    if (idx >= 0) {
      // 左列为选中日：pages[current].key === key ⇒ current === idx
      const targetCurrent = idx;
      // 越界（display=3 要求 current ∈ [0, len-3]）则按 rebuild 处理
      if (targetCurrent >= 0 && targetCurrent <= pages.length - 3) {
        const newCenterPage = pages[targetCurrent];
        const newCenterDate = parseDate(newCenterPage.key);
        // 同周条切换一样的拆分策略：先 setData 更新 duration，再在 callback 改 current，
        // 确保 swiper 以正确的 300ms duration 执行动画（而非读到 rebuildAll 遗留的旧值 0）。
        this.setData({
          timelineSwiperDuration: 300,
          timelineSuppressDragPreview: true,
          selectedDateKey: newCenterPage.key,
          weekStripHighlightKey: newCenterPage.key,
          weekNumber: `第${getWeekNumber(newCenterDate)}周`,
        }, () => {
          this.setData({ timelineSwiperCurrent: targetCurrent });
        });
        return;
      }
    }
    // 不在范围内：完全重建围绕该日
    this.rebuildAll(this.activitiesForRebuild(), selected);
  },

  /**
   * WXS 在 bindtransition 中 callMethod：根据 dx 与列宽比例预览左列对应日期，驱动周条高亮。
   * （仅用 C±1 三态会在 current 未变时最多预览相邻一天，长拖时高亮卡住。）
   */
  onTimelineDragPreview(args) {
    const raw = args || {};
    const dx = Number(raw.dx);
    if (Number.isNaN(dx)) return;
    const pages = this.data.timelineSwipePages;
    if (!pages || pages.length === 0) return;
    const cellW = this.data.headerCellWidthPx || 112;
    if (!(cellW > 0)) return;
    // rebuild 后首次 touch 翻页前：原生 swiper 仍可能吐出极大 dx；首滑通过后再放宽（用户反馈仅第一次会跳两周）
    const maxReasonableDx = (this._timelineDragPreviewLoose ? 6 : 2) * cellW;
    if (Math.abs(dx) > maxReasonableDx) return;
    // 必须用 JS 层 current：WXS dataset 的 swiperCurrent 常比 bindtransition 晚一帧，与 dx 组合会把 idx 算到错误日（见 debug H10 中 change 已 13 仍 C=12）
    const C = this.data.timelineSwiperCurrent;
    if (!Number.isFinite(C) || C < 0 || C >= pages.length) return;
    const Cwxs = Number(raw.swiperCurrent);
    // bindchange 已把 JS current 更新后，仍可能收到「上一轮位移」的 dx，而 WXS dataset 的 swiperCurrent 晚一帧；
    // 此时 dx 与 C 不属于同一坐标系，会算出错误 idx（如 L22：C=14 而 Cwxs=15、dx=-113 → idx=13 即 5/1）
    if (Number.isFinite(Cwxs) && Cwxs !== C) return;
    // 与原先三态预览一致：dx 为正时 idx 向 C+1 走（与 event.detail.dx 在微信 swiper 中的符号约定一致）
    const delta = Math.round(dx / cellW);
    let idx = C + delta;
    idx = Math.max(0, Math.min(pages.length - 1, idx));
    const row = pages[idx];
    const key = row && row.key;
    if (!key || key === this.data.weekStripHighlightKey) return;
    if (!weekStripPagesContainDateKey(this.data.weekStripPages, key)) return;
    // #region agent log H10
    wx.request({ url: 'http://127.0.0.1:7776/ingest/f5086d31-35a2-4638-bcfe-54b976d6ce94', method: 'POST', header: { 'content-type': 'application/json', 'X-Debug-Session-Id': '01549b' }, data: { sessionId: '01549b', hypothesisId: 'H10', location: 'activity_calendar.js:onTimelineDragPreview', message: 'preview highlight', data: { dx, C, Cwxs, delta, idx, key }, timestamp: Date.now() } });
    // #endregion
    this.setData({ weekStripHighlightKey: key });
  },

  /** 时间格动画结束：周条高亮与左列 pages[current] 对齐（避免 selectedDateKey 偶发滞后于 swiper 导致与吸顶/时间格错位） */
  onTimelineSwiperAnimFinish(e) {
    const d = (e && e.detail) || {};
    const pages = this.data.timelineSwipePages;
    const cur = this.data.timelineSwiperCurrent;
    const anchorKey = pages[cur] && pages[cur].key;
    const kSel = this.data.selectedDateKey;
    const k = anchorKey || kSel;
    const before = this.data.weekStripHighlightKey;
    const didSync = this.data.weekStripHighlightKey !== k;
    const suppressWas = this.data.timelineSuppressDragPreview;
    const patch = {};
    if (didSync) patch.weekStripHighlightKey = k;
    if (suppressWas) patch.timelineSuppressDragPreview = false;
    // 动画结束后将 header 起点锁定到准确终点（周条翻周动画未在 setData 中设置此值）
    const expectedHeaderOffset = -cur * this.data.headerCellWidthPx;
    if (this.data.headerStripBaseOffsetPx !== expectedHeaderOffset) {
      patch.headerStripBaseOffsetPx = expectedHeaderOffset;
    }
    if (Object.keys(patch).length) {
      this.setData(patch);
    }
    // #region agent log H11
    if (!this._logAnimFinishCount) this._logAnimFinishCount = 0;
    this._logAnimFinishCount++;
    if (this._logAnimFinishCount <= 40) {
      wx.request({ url: 'http://127.0.0.1:7776/ingest/f5086d31-35a2-4638-bcfe-54b976d6ce94', method: 'POST', header: { 'content-type': 'application/json', 'X-Debug-Session-Id': '01549b' }, data: { sessionId: '01549b', hypothesisId: 'H11', location: 'activity_calendar.js:onTimelineSwiperAnimFinish', message: 'animfinish', data: { detail: d, before, anchorKey, selected: kSel, syncTo: k, didSync, suppressWas, clearedSuppress: suppressWas && Object.prototype.hasOwnProperty.call(patch, 'timelineSuppressDragPreview'), n: this._logAnimFinishCount }, timestamp: Date.now() } });
    }
    // #endregion
  },

  onActivityTap(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: `/pages/activity_detail/activity_detail?id=${id}` });
  },

  onRetry() {
    this.loadCalendar(true);
  },

  goProfile() {
    wx.switchTab({ url: "/pages/profile/profile" });
  },

  // #region agent log - WXS 回调
  /** WXS 通过 callMethod 上报实时 dx，用于验证物理同步 */
  onWxsTransitionLog(args) {
    wx.request({ url: 'http://127.0.0.1:7776/ingest/f5086d31-35a2-4638-bcfe-54b976d6ce94', method: 'POST', header: { 'content-type': 'application/json', 'X-Debug-Session-Id': '01549b' }, data: { sessionId: '01549b', hypothesisId: 'H5', location: 'WXS:onTransition', message: 'wxs dx', data: args, timestamp: Date.now() } });
  }
  // #endregion
});
