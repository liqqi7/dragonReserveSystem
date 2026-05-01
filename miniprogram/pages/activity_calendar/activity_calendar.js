const app = getApp();
const activityService = require("../../services/activity");
const userService = require("../../services/user");
const myActivitiesCache = require("../../utils/myActivitiesCache");
const { patchTabBarIfNeeded } = require("../../utils/tabBarSync");

function debugAgentIngest(payload) {
  wx.request({
    url: "http://127.0.0.1:7776/ingest/f5086d31-35a2-4638-bcfe-54b976d6ce94",
    method: "POST",
    header: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "01549b"
    },
    data: Object.assign({ sessionId: "01549b" }, payload),
    fail() {}
  });
}

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

/** scroll-into-view / 占位 id（避免 "-"）*/
function stripElementId(dateKeyStr) {
  return `strip${String(dateKeyStr || "").replace(/-/g, "")}`;
}

function calendarDaysBetween(a, b) {
  const A = startOfDay(a).getTime();
  const B = startOfDay(b).getTime();
  return Math.round((B - A) / 86400000);
}

/** 一周的 7 天（周一→周日顺序），结构与 Figma 454:6450 一致 */
function buildWeekStripPage(monday, selectedKey, todayKey, byDate) {
  const m = startOfDay(monday);
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(m, i);
    const key = dateKey(d);
    const hasActivity = (byDate.get(key) || []).length > 0;
    const selected = key === selectedKey;
    return {
      key,
      stripId: stripElementId(key),
      weekday: WEEKDAY_SHORT[d.getDay()],
      day: d.getDate(),
      monthDay: monthDayText(d),
      selected,
      /** 底部事件条（与稿一致：选中 + 有日程） */
      showStripEventBar: selected || hasActivity,
      isToday: key === todayKey,
      hasActivity
    };
  });
}

/** 三块周面板：上一周 / 当前周 / 下一周（周条手势一次翻 7 天） */
function buildWeekStripSwipePages(centerSelectedDate, todayKey, byDate) {
  const c = startOfDay(centerSelectedDate);
  const prev = addDays(c, -7);
  const next = addDays(c, 7);
  const prevMonday = getMonday(prev);
  const centerMonday = getMonday(c);
  const nextMonday = getMonday(next);
  return [
    { weekKey: `${dateKey(prevMonday)}_${dateKey(prev)}`, days: buildWeekStripPage(prevMonday, dateKey(prev), todayKey, byDate) },
    { weekKey: `${dateKey(centerMonday)}_${dateKey(c)}`, days: buildWeekStripPage(centerMonday, dateKey(c), todayKey, byDate) },
    { weekKey: `${dateKey(nextMonday)}_${dateKey(next)}`, days: buildWeekStripPage(nextMonday, dateKey(next), todayKey, byDate) }
  ];
}

function buildTimelinePage(firstVisibleDate, byDate, todayKey) {
  const first = startOfDay(firstVisibleDate);
  const visibleDays = Array.from({ length: 3 }, (_, i) => {
    const day = addDays(first, i);
    const key = dateKey(day);
    return {
      key,
      weekday: WEEKDAY_SHORT[day.getDay()],
      fullWeekday: WEEKDAY_FULL[day.getDay()],
      day: day.getDate(),
      monthDay: monthDayText(day),
      isToday: key === todayKey,
      hasActivity: (byDate.get(key) || []).length > 0,
      selected: i === 0,
      title: `${monthDayText(day)} - ${WEEKDAY_FULL[day.getDay()]}`,
      activities: (byDate.get(key) || [])
        .slice()
        .sort((a, b) => {
          const ta = a.start ? new Date(a.start).getTime() : 0;
          const tb = b.start ? new Date(b.start).getTime() : 0;
          return ta - tb;
        })
    };
  });
  return {
    weekKey: `${dateKey(getMonday(first))}_${dateKey(first)}`,
    weekNumber: `第${getWeekNumber(first)}周`,
    firstVisibleKey: dateKey(first),
    visibleDays
  };
}

function buildTimelineSwipePages(centerFirstVisibleDate, byDate, todayKey) {
  const c = startOfDay(centerFirstVisibleDate);
  const prev = addDays(c, -3);
  const next = addDays(c, 3);
  return [
    buildTimelinePage(prev, byDate, todayKey),
    buildTimelinePage(c, byDate, todayKey),
    buildTimelinePage(next, byDate, todayKey)
  ];
}

function resolveTimelineCenterDate(selectedDate, options = {}, data = {}) {
  const override = parseDate(options.timelineCenterDate);
  if (override) return startOfDay(override);
  const fromData = parseDate(data.timelineCenterDateKey);
  if (fromData) return startOfDay(fromData);
  return startOfDay(selectedDate);
}

function toDateStartByKey(key, fallbackDate) {
  const parsed = parseDate(key);
  return parsed ? startOfDay(parsed) : startOfDay(fallbackDate);
}

function summarizeWeekKeys(pages) {
  return (pages || []).map((p) => p.weekKey);
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
    /** 与主页一致：导航内容区固定 44px（非 rpx），避免切换 Tab 时顶栏高度漂移 */
    navBarHeight: 44,
    /** 与微信原生胶囊左缘对齐，避免标题与其重叠 */
    navbarPaddingRightPx: 12,
    timelineTopPx: 200,
    loading: true,
    loadError: "",
    isGuest: false,
    empty: false,
    selectedDateKey: "",
    weekNumber: "",
    /** 三段式周横条（swiper 仅整周切换）：上周 / 本周 / 下周 */
    weekStripPages: [],
    timelineSwipePages: [],
    timelineCenterDateKey: "",
    weekStripSwiperIndex: 1,
    weekStripSwiperDuration: 300,
    timelineSwiperIndex: 1,
    timelineSwiperDuration: 300,
    visibleDays: [],
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
    const timelineTopPx =
      statusBarPx +
      navContentPx +
      gapNavToWeekPx +
      weekStripPx +
      gapWeekToTimelinePx;
    this.setData({
      statusBarHeight: statusBarPx,
      navbarPaddingRightPx,
      timelineTopPx,
      selectedDateKey: dateKey(today),
      hours: Array.from({ length: 24 }, (_, i) => `${pad(i)}:00`),
    });
    this.rebuildWeek([], today);
  },

  onShow() {
    patchTabBarIfNeeded(this, {
      selected: 1,
      isAdmin: app.globalData.userRole === "admin",
    });
    this.loadCalendar();
  },

  syncGuestState() {
    const hasWeChatAuth = !!wx.getStorageSync("hasWeChatAuth");
    const hasToken = !!(app.globalData.accessToken || wx.getStorageSync("accessToken"));
    const isGuest = !hasWeChatAuth || !hasToken || !app.globalData.isAuthenticated;
    this.setData({ isGuest });
    return isGuest;
  },

  /** 避免 setData 后 Date 序列化失真，周切换始终以这份列表分组 */
  activitiesForRebuild() {
    if (Array.isArray(this._calendarActivitiesCanon)) return this._calendarActivitiesCanon;
    return this.data.activities || [];
  },

  /** @param {boolean} [forceRefresh] 跳过本地缓存.paint，强制走网络并与会话校验并行 */
  loadCalendar(forceRefresh) {
    const isGuest = this.syncGuestState();
    if (isGuest) {
      this._calendarActivitiesCanon = [];
      this.setData({ loading: false, loadError: "", empty: true, activities: [] }, () => {
        this.rebuildWeek([], parseDate(this.data.selectedDateKey) || new Date());
      });
      return;
    }

    if (typeof this._calendarLoadSeq !== "number") this._calendarLoadSeq = 0;
    this._calendarLoadSeq += 1;
    const seq = this._calendarLoadSeq;

    if (forceRefresh) {
      this.setData({ loadError: "" });
    }

    const readUid = currentUserId(app);
    let hadCachePaint = false;
    if (!forceRefresh && readUid) {
      const cached = myActivitiesCache.readRawList(readUid);
      if (cached != null && Array.isArray(cached)) {
        const activities = cached.map(adaptActivity);
        this._calendarActivitiesCanon = activities;
        this.setData(
          {
            loading: false,
            loadError: "",
            empty: activities.length === 0,
            activities,
          },
          () => {
            this.rebuildWeek(
              this.activitiesForRebuild(),
              parseDate(this.data.selectedDateKey) || new Date()
            );
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
        this.rebuildWeek([], parseDate(this.data.selectedDateKey) || new Date());
      });
      return;
    }

    if (!hadCachePaint) {
      this.setData({ loading: true, loadError: "" });
    }

    Promise.all([
      activityService.listMyActivities().catch((e) => ({ __error: e })),
      ensureSessionParallel(app),
    ]).then(([listRes, ens]) => {
      if (seq !== this._calendarLoadSeq) return;

      if (!ens.ok || this.syncGuestState()) {
        this._calendarActivitiesCanon = [];
        this.setData({ loading: false, loadError: "", empty: true, activities: [] }, () => {
          this.rebuildWeek([], parseDate(this.data.selectedDateKey) || new Date());
        });
        return;
      }

      const uidForCache = currentUserId(app);

      if (listRes && listRes.__error) {
        const errMsg =
          listRes.__error.message || listRes.__error.errMsg || "日程加载失败";
        if (!hadCachePaint) {
          this.setData({
            loading: false,
            loadError: String(errMsg) || "日程加载失败",
            empty: false,
          });
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
        {
          loading: false,
          loadError: "",
          empty: activities.length === 0,
          activities,
        },
        () => {
          this.rebuildWeek(
            this.activitiesForRebuild(),
            parseDate(this.data.selectedDateKey) || new Date()
          );
        }
      );
    });
  },

  rebuildWeek(activities, selectedDate, options = {}) {
    const fromWeekStripSwipe = !!options.fromWeekStripSwipe;
    const recenterInstant = !!options.recenterInstant;
    const sourceRole = options.sourceRole || "";

    /** parseDate 已支持 Date；此前 Date 曾被 String(...) 转成非法字面量导致周滑动无效 */
    const selected = startOfDay(parseDate(selectedDate) || new Date());

    const selectedKey = dateKey(selected);

    const monday = getMonday(selected);

    const byDate = new Map();
    (activities || []).forEach((activity) => {
      if (!byDate.has(activity.dateKey)) byDate.set(activity.dateKey, []);
      byDate.get(activity.dateKey).push(activity);
    });

    const todayKey = dateKey(startOfDay(new Date()));
    const timelineCenterDate = resolveTimelineCenterDate(selected, options, this.data);
    const weekStripPages = buildWeekStripSwipePages(selected, todayKey, byDate);
    const timelineSwipePages = buildTimelineSwipePages(timelineCenterDate, byDate, todayKey);
    const centerTimeline = timelineSwipePages[1] || { weekNumber: "", visibleDays: [] };
    const firstVisibleDate = toDateStartByKey(
      centerTimeline.firstVisibleKey,
      timelineCenterDate
    );
    const firstVisibleKey = dateKey(firstVisibleDate);
    const alignedWeekStripPages = buildWeekStripSwipePages(firstVisibleDate, todayKey, byDate);

    const patch = {
      selectedDateKey: firstVisibleKey,
      timelineCenterDateKey: dateKey(timelineCenterDate),
      weekNumber: `第${getWeekNumber(firstVisibleDate)}周`,
      visibleDays: centerTimeline.visibleDays,
      weekStripPages: alignedWeekStripPages,
      timelineSwipePages,
      weekStripSwiperIndex: 1,
      timelineSwiperIndex: 1
    };
    if (fromWeekStripSwipe) {
      if (sourceRole === "week-strip") {
        patch.weekStripSwiperDuration = recenterInstant ? 0 : 300;
        patch.timelineSwiperDuration = recenterInstant ? 0 : 300;
      } else if (sourceRole === "timeline") {
        patch.timelineSwiperDuration = recenterInstant ? 0 : 300;
      }
    }
    // #region agent log
    debugAgentIngest({
      runId: "calendar-weekstrip-pre-fix-1",
      hypothesisId: "H1_H3",
      location: "activity_calendar.js:rebuildWeek:patch",
      message: "patch before setData",
      data: {
        fromWeekStripSwipe,
        duration: patch.weekStripSwiperDuration,
        swiperIndex: patch.weekStripSwiperIndex,
        selectedKey,
        firstVisibleKey,
        timelineCenterKey: patch.timelineCenterDateKey
      },
      timestamp: Date.now()
    });
    // #endregion

    this.setData(patch, () => {
      // #region agent log
      debugAgentIngest({
        runId: "calendar-weekstrip-pre-fix-1",
        hypothesisId: "H2_H4",
        location: "activity_calendar.js:rebuildWeek:setDataCb",
        message: "setData callback after patch",
        data: {
          fromWeekStripSwipe,
          dataIndex: this.data.weekStripSwiperIndex,
          dataDuration: this.data.weekStripSwiperDuration,
          dataSelected: this.data.selectedDateKey
        },
        timestamp: Date.now()
      });
      // #endregion
      if (!fromWeekStripSwipe) {
        this._weekStripSwipeBusy = false;
        this._timelineSwipeBusy = false;
        return;
      }
      if (recenterInstant) {
        wx.nextTick(() => {
          this.setData({ weekStripSwiperDuration: 300, timelineSwiperDuration: 300 }, () => {
            this._weekStripSwipeBusy = false;
            this._timelineSwipeBusy = false;
          });
        });
        return;
      }
      this._weekStripSwipeBusy = false;
      this._timelineSwipeBusy = false;
    });
  },

  onWeekStripSwiperChange(e) {
    const d = e.detail || {};
    const src = d.source;
    const idxRaw = d.current;
    const idxNum = Number(idxRaw);
    const busy = !!this._weekStripSwipeBusy;
    const role = (e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.role) || "unknown";
    // #region agent log
    debugAgentIngest({
      runId: "calendar-weekstrip-gesture-source-1",
      hypothesisId: "H10_H11_H12",
      location: "activity_calendar.js:onWeekStripSwiperChange:entry",
      message: "swiper change entry",
      data: {
        role,
        source: src,
        currentRaw: idxRaw,
        idxNum,
        busy,
        dataIndex: this.data.weekStripSwiperIndex,
        dataDuration: this.data.weekStripSwiperDuration,
        selectedKey: this.data.selectedDateKey,
        weekKeys: summarizeWeekKeys(this.data.weekStripPages),
        timelineLen: (this.data.timelineSwipePages || []).length
      },
      timestamp: Date.now()
    });
    // #endregion

    if (busy) {
      return;
    }

    /** 仅忽略 autoplay；部分基础库手势的 source 可能不是 touch，原先误拦会导致「能拖但不会切」*/
    if (src === "autoplay") {
      return;
    }

    const slideIndex = Number.isFinite(idxNum) ? idxNum : NaN;
    if (slideIndex !== 0 && slideIndex !== 2) {
      return;
    }
    // #region agent log
    debugAgentIngest({
      runId: "calendar-weekstrip-gesture-source-1",
      hypothesisId: "H10_H11",
      location: "activity_calendar.js:onWeekStripSwiperChange:intent",
      message: "record swipe intent and wait animationfinish",
      data: {
        role,
        slideIndex,
        preWeekKeys: summarizeWeekKeys(this.data.weekStripPages),
        preDataIndex: this.data.weekStripSwiperIndex
      },
      timestamp: Date.now()
    });
    // #endregion

    this._weekStripPendingSlideIndex = slideIndex;
    this._weekStripGestureRole = "week-strip";
    this._weekStripCommitConsumed = false;
    this.setData({ weekStripSwiperIndex: slideIndex });
    this._weekStripSwipeBusy = true;
    this._timelineSwipeBusy = true;
  },

  onWeekStripSwiperAnimationFinish(e) {
    const d = (e && e.detail) || {};
    const role = (e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.role) || "unknown";
    // #region agent log
    debugAgentIngest({
      runId: "calendar-weekstrip-gesture-source-1",
      hypothesisId: "H10_H11_H12",
      location: "activity_calendar.js:onWeekStripSwiperAnimationFinish",
      message: "animation finish",
      data: {
        role,
        current: d.current,
        source: d.source,
        dataIndex: this.data.weekStripSwiperIndex,
        dataDuration: this.data.weekStripSwiperDuration,
        selectedKey: this.data.selectedDateKey,
        weekKeys: summarizeWeekKeys(this.data.weekStripPages),
        timelineLen: (this.data.timelineSwipePages || []).length
      },
      timestamp: Date.now()
    });
    // #endregion

    const idxNum = Number(d.current);
    const currentIndex = Number.isFinite(idxNum) ? idxNum : NaN;
    const pending = this._weekStripPendingSlideIndex;
    const slideIndex = pending === 0 || pending === 2 ? pending : currentIndex;
    if (this._weekStripCommitConsumed) {
      // #region agent log
      debugAgentIngest({
        runId: "calendar-weekstrip-gesture-source-1",
        hypothesisId: "H14",
        location: "activity_calendar.js:onWeekStripSwiperAnimationFinish:skip-consumed",
        message: "skip duplicate commit for same swipe gesture",
        data: {
          role,
          source: d.source,
          current: d.current,
          pending
        },
        timestamp: Date.now()
      });
      // #endregion
      return;
    }
    const gestureRole = this._weekStripGestureRole || "";
    if (gestureRole !== "week-strip" || role !== "week-strip") {
      // #region agent log
      debugAgentIngest({
        runId: "calendar-weekstrip-gesture-source-1",
        hypothesisId: "H13",
        location: "activity_calendar.js:onWeekStripSwiperAnimationFinish:skip-foreign-role",
        message: "skip duplicate finish from non-gesture swiper",
        data: {
          role,
          gestureRole,
          source: d.source,
          current: d.current,
          pending
        },
        timestamp: Date.now()
      });
      // #endregion
      return;
    }
    if (slideIndex !== 0 && slideIndex !== 2) {
      this._weekStripPendingSlideIndex = null;
      this._weekStripGestureRole = "";
      this._weekStripCommitConsumed = false;
      this._weekStripSwipeBusy = false;
      return;
    }
    this._weekStripCommitConsumed = true;

    const weekDeltaDays = slideIndex === 0 ? -7 : 7;
    const timelineDeltaDays = slideIndex === 0 ? -7 : 7;
    const selected = startOfDay(parseDate(this.data.selectedDateKey) || new Date());
    const timelineCenter = startOfDay(
      parseDate(this.data.timelineCenterDateKey) || selected
    );
    const newSelected = addDays(selected, weekDeltaDays);
    const newTimelineCenter = addDays(timelineCenter, timelineDeltaDays);
    const beforeKey = dateKey(selected);
    const afterKey = dateKey(newSelected);
    // #region agent log
    debugAgentIngest({
      runId: "calendar-weekstrip-gesture-source-1",
      hypothesisId: "H10_H11_H12",
      location: "activity_calendar.js:onWeekStripSwiperAnimationFinish:commit",
      message: "commit swipe on animationfinish",
      data: {
        role,
        slideIndex,
        weekDeltaDays,
        timelineDeltaDays,
        beforeKey,
        afterKey,
        timelineBeforeKey: dateKey(timelineCenter),
        timelineAfterKey: dateKey(newTimelineCenter),
        selectedWeekday: WEEKDAY_FULL[selected.getDay()],
        targetWeekday: WEEKDAY_FULL[newSelected.getDay()],
        timelineTargetWeekday: WEEKDAY_FULL[newTimelineCenter.getDay()]
      },
      timestamp: Date.now()
    });
    // #endregion

    this._weekStripPendingSlideIndex = null;
    this._weekStripGestureRole = "";
    this._weekStripCommitConsumed = false;
    this.rebuildWeek(this.activitiesForRebuild(), newSelected, {
      fromWeekStripSwipe: true,
      recenterInstant: true,
      timelineCenterDate: newTimelineCenter,
      sourceRole: "week-strip"
    });
  },

  onTimelineSwiperChange(e) {
    const d = e.detail || {};
    const src = d.source;
    const idxRaw = d.current;
    const idxNum = Number(idxRaw);
    const busy = !!this._timelineSwipeBusy;
    const role = (e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.role) || "unknown";
    // #region agent log
    debugAgentIngest({
      runId: "calendar-decoupled-swipe-1",
      hypothesisId: "H15_H16_H17",
      location: "activity_calendar.js:onTimelineSwiperChange:entry",
      message: "timeline swiper change entry",
      data: {
        role,
        source: src,
        currentRaw: idxRaw,
        idxNum,
        busy,
        dataTimelineIndex: this.data.timelineSwiperIndex,
        dataWeekIndex: this.data.weekStripSwiperIndex,
        selectedKey: this.data.selectedDateKey,
        timelineCenterKey: this.data.timelineCenterDateKey
      },
      timestamp: Date.now()
    });
    // #endregion
    if (busy) return;
    if (src === "autoplay") return;
    const slideIndex = Number.isFinite(idxNum) ? idxNum : NaN;
    if (slideIndex !== 0 && slideIndex !== 2) return;
    this._timelinePendingSlideIndex = slideIndex;
    this._timelineGestureRole = "timeline";
    this._timelineCommitConsumed = false;
    this._timelineSwipeBusy = true;
  },

  onTimelineSwiperAnimationFinish(e) {
    const d = (e && e.detail) || {};
    const role = (e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.role) || "unknown";
    // #region agent log
    debugAgentIngest({
      runId: "calendar-decoupled-swipe-1",
      hypothesisId: "H15_H16_H17",
      location: "activity_calendar.js:onTimelineSwiperAnimationFinish",
      message: "timeline animation finish",
      data: {
        role,
        current: d.current,
        source: d.source,
        dataTimelineIndex: this.data.timelineSwiperIndex,
        dataWeekIndex: this.data.weekStripSwiperIndex,
        selectedKey: this.data.selectedDateKey,
        timelineCenterKey: this.data.timelineCenterDateKey
      },
      timestamp: Date.now()
    });
    // #endregion
    const idxNum = Number(d.current);
    const currentIndex = Number.isFinite(idxNum) ? idxNum : NaN;
    const pending = this._timelinePendingSlideIndex;
    const slideIndex = pending === 0 || pending === 2 ? pending : currentIndex;
    if (this._timelineCommitConsumed) return;
    const gestureRole = this._timelineGestureRole || "";
    if (gestureRole !== "timeline" || role !== "timeline") {
      // #region agent log
      debugAgentIngest({
        runId: "calendar-decoupled-swipe-1",
        hypothesisId: "H18",
        location: "activity_calendar.js:onTimelineSwiperAnimationFinish:skip-foreign-role",
        message: "skip timeline finish without timeline gesture ownership",
        data: {
          role,
          gestureRole,
          source: d.source,
          current: d.current,
          pending
        },
        timestamp: Date.now()
      });
      // #endregion
      return;
    }
    if (slideIndex !== 0 && slideIndex !== 2) {
      this._timelinePendingSlideIndex = null;
      this._timelineGestureRole = "";
      this._timelineCommitConsumed = false;
      this._timelineSwipeBusy = false;
      return;
    }
    this._timelineCommitConsumed = true;
    const deltaDays = slideIndex === 0 ? -3 : 3;
    const selected = startOfDay(parseDate(this.data.selectedDateKey) || new Date());
    const timelineCenter = startOfDay(parseDate(this.data.timelineCenterDateKey) || selected);
    const newTimelineCenter = addDays(timelineCenter, deltaDays);
    const newSelected = startOfDay(newTimelineCenter);
    // #region agent log
    debugAgentIngest({
      runId: "calendar-decoupled-swipe-1",
      hypothesisId: "H15_H16_H17",
      location: "activity_calendar.js:onTimelineSwiperAnimationFinish:commit",
      message: "commit timeline swipe only",
      data: {
        slideIndex,
        deltaDays,
        beforeKey: dateKey(selected),
        afterKey: dateKey(newSelected),
        timelineBeforeKey: dateKey(timelineCenter),
        timelineAfterKey: dateKey(newTimelineCenter),
        firstVisibleAfterKey: dateKey(newSelected)
      },
      timestamp: Date.now()
    });
    // #endregion
    this._timelinePendingSlideIndex = null;
    this._timelineGestureRole = "";
    this._timelineCommitConsumed = false;
    this.rebuildWeek(this.activitiesForRebuild(), newSelected, {
      fromWeekStripSwipe: true,
      recenterInstant: true,
      timelineCenterDate: newTimelineCenter,
      sourceRole: "timeline"
    });
  },

  onDateTap(e) {
    const key = e.currentTarget.dataset.key;
    const selected = parseDate(key);
    if (!selected) return;
    this.rebuildWeek(this.activitiesForRebuild(), selected, {
      timelineCenterDate: selected
    });
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
  }
});
