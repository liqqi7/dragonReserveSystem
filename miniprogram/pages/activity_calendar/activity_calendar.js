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


function calendarDaysBetween(a, b) {
  const A = startOfDay(a).getTime();
  const B = startOfDay(b).getTime();
  return Math.round((B - A) / 86400000);
}

/** 一周的 7 天（周一→周日顺序），结构与 Figma 454:6450 一致 */
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

/** 三块周面板：上一周 / 当前周 / 下一周（周条手势一次翻 7 天） */
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

function buildTimelineSwipePages(centerFirstVisibleDate, byDate, todayKey) {
  const c = startOfDay(centerFirstVisibleDate);
  return [-1, 0, 1, 2, 3].map((offset) =>
    buildTimelineColumn(addDays(c, offset), byDate, todayKey)
  );
}

function resolveTimelineCenterDate(selectedDate, options = {}, data = {}) {
  const override = parseDate(options.timelineCenterDate);
  if (override) return startOfDay(override);
  const fromData = parseDate(data.timelineCenterDateKey);
  if (fromData) return startOfDay(fromData);
  return startOfDay(selectedDate);
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
    weekStripSlideAnim: {},
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
    const weekStripApproachIndex =
      options.weekStripApproachIndex === 0 || options.weekStripApproachIndex === 2
        ? options.weekStripApproachIndex
        : null;

    // 时间格提交手势后立即释放锁，保证重建期间可立即响应下一次滑动
    if (fromWeekStripSwipe && sourceRole === "timeline") {
      this._timelineSwipeBusy = false;
    }

    /** parseDate 已支持 Date；此前 Date 曾被 String(...) 转成非法字面量导致周滑动无效 */
    const selected = startOfDay(parseDate(selectedDate) || new Date());
    const byDate = new Map();
    (activities || []).forEach((activity) => {
      if (!byDate.has(activity.dateKey)) byDate.set(activity.dateKey, []);
      byDate.get(activity.dateKey).push(activity);
    });

    const todayKey = dateKey(startOfDay(new Date()));
    const timelineCenterDate = resolveTimelineCenterDate(selected, options, this.data);
    const timelineSwipePages = buildTimelineSwipePages(timelineCenterDate, byDate, todayKey);
    // timelineSwiperIndex 始终保持 1（无闪）：
    // forward 手势后 swiper 在 2，新数据 page[1]=N+1，page[2]=N+2 = 旧 page[2],[3] → 内容不变
    // backward 手势后 swiper 在 0，新数据 page[1]=N-1，page[2]=N   = 旧 page[0],[1] → 内容不变
    // 跨周视觉动画仅由周条 wx.createAnimation 提供
    const isCrossWeekFromTimeline =
      fromWeekStripSwipe && sourceRole === "timeline" && weekStripApproachIndex !== null;
    const isForwardCrossWeek = isCrossWeekFromTimeline && weekStripApproachIndex === 2;

    const centerKey = dateKey(timelineCenterDate);
    const weekStripPages = buildWeekStripSwipePages(timelineCenterDate, todayKey, byDate);

    const patch = {
      selectedDateKey: centerKey,
      timelineCenterDateKey: centerKey,
      weekNumber: `第${getWeekNumber(timelineCenterDate)}周`,
      visibleDays: timelineSwipePages.slice(1, 4),
      weekStripPages,
      timelineSwipePages,
      weekStripSwiperIndex: 1,
      timelineSwiperIndex: 1
    };

    if (fromWeekStripSwipe) {
      if (sourceRole === "week-strip") {
        patch.weekStripSwiperDuration = 300;
        patch.timelineSwiperDuration = recenterInstant ? 0 : 300;
      } else if (sourceRole === "timeline") {
        patch.timelineSwiperDuration = recenterInstant ? 0 : 300;
        if (isCrossWeekFromTimeline) {
          // swiper 程序化 current 变化无视觉动画，用 wx.createAnimation 位移包装层
          // forward→从右侧(+600px)划入，backward→从左侧(-600px)划入
          const initAnim = wx.createAnimation({ duration: 0 });
          initAnim.translateX(isForwardCrossWeek ? 600 : -600).step();
          patch.weekStripSlideAnim = initAnim.export();
        }
      }
    }

    this.setData(patch, () => {
      if (!fromWeekStripSwipe) {
        this._weekStripSwipeBusy = false;
        this._timelineSwipeBusy = false;
        return;
      }
      if (recenterInstant) {
        wx.nextTick(() => {
          if (isCrossWeekFromTimeline) {
            // 周条：translateX(±600)→0，220ms；时间格手势本身即为动画，无需额外位移
            const slideAnim = wx.createAnimation({ duration: 220, timingFunction: "ease" });
            slideAnim.translateX(0).step();
            this.setData(
              { weekStripSlideAnim: slideAnim.export() },
              () => {
                this._weekStripSwipeBusy = false;
                this._timelineSwipeBusy = false;
              }
            );
            return;
          }
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
    const idxNum = Number(d.current);

    if (this._weekStripSwipeBusy) return;
    /** 仅忽略 autoplay；部分基础库手势的 source 可能不是 touch，原先误拦会导致「能拖但不会切」*/
    if (src === "autoplay") return;

    const slideIndex = Number.isFinite(idxNum) ? idxNum : NaN;
    if (slideIndex !== 0 && slideIndex !== 2) return;

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
    const idxNum = Number(d.current);
    const currentIndex = Number.isFinite(idxNum) ? idxNum : NaN;
    const pending = this._weekStripPendingSlideIndex;
    const slideIndex = pending === 0 || pending === 2 ? pending : currentIndex;

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
    const selected = startOfDay(parseDate(this.data.selectedDateKey) || new Date());
    const timelineCenter = startOfDay(parseDate(this.data.timelineCenterDateKey) || selected);
    const newSelected = addDays(selected, deltaDays);
    const newTimelineCenter = addDays(timelineCenter, deltaDays);

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
    const idxNum = Number(d.current);
    if (this._timelineSwipeBusy) return;
    if (src === "autoplay") return;
    const slideIndex = Number.isFinite(idxNum) ? idxNum : NaN;
    if (slideIndex !== 0 && slideIndex !== 2) return;
    this.setData({ timelineSwiperIndex: slideIndex });
    // 仅 touch 手势占 busy；程序化 source="" 不占锁，避免 onChange 误加锁后无法释放
    if (src === "touch") {
      this._timelinePendingSlideIndex = slideIndex;
      this._timelineGestureRole = "timeline";
      this._timelineCommitConsumed = false;
      this._timelineSwipeBusy = true;
    }
  },

  onTimelineSwiperTransition(e) {
    const d = (e && e.detail) || {};
    // 仅处理手势驱动的过渡（程序化 source="" 跳过）
    if (d.source !== "touch") return;
    const dx = Number(d.dx) || 0;
    // dx < 0：页面左移（用户向左滑，forward），预选下一天；dx > 0 反之
    const pages = this.data.timelineSwipePages;
    const committedKey = this.data.timelineCenterDateKey;
    let candidateKey;
    if (dx < -15) candidateKey = pages[2] && pages[2].key;
    else if (dx > 15) candidateKey = pages[0] && pages[0].key;
    candidateKey = candidateKey || committedKey;
    if (!candidateKey || candidateKey === this.data.selectedDateKey) return;
    this.setData({ selectedDateKey: candidateKey });
  },

  onTimelineSwiperAnimationFinish(e) {
    const d = (e && e.detail) || {};
    const role = (e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.role) || "unknown";
    const idxNum = Number(d.current);
    const currentIndex = Number.isFinite(idxNum) ? idxNum : NaN;
    const pending = this._timelinePendingSlideIndex;
    const slideIndex = pending === 0 || pending === 2 ? pending : currentIndex;

    if (this._timelineCommitConsumed) return;
    const gestureRole = this._timelineGestureRole || "";
    if (gestureRole !== "timeline" || role !== "timeline") return;

    if (slideIndex !== 0 && slideIndex !== 2) {
      this._timelinePendingSlideIndex = null;
      this._timelineGestureRole = "";
      this._timelineCommitConsumed = false;
      this._timelineSwipeBusy = false;
      return;
    }
    this._timelineCommitConsumed = true;
    const deltaDays = slideIndex === 0 ? -1 : 1;
    // 用 timelineCenterDateKey 而非 selectedDateKey：
    // onTimelineSwiperTransition 拖动期间已实时修改 selectedDateKey 为候选日，
    // 此时用它计算会导致 weekShiftDays=0，跨周动画永远不触发
    const timelineCenter = startOfDay(parseDate(this.data.timelineCenterDateKey) || new Date());
    const newTimelineCenter = addDays(timelineCenter, deltaDays);
    const newSelected = startOfDay(newTimelineCenter);
    const weekShiftDays = calendarDaysBetween(getMonday(timelineCenter), getMonday(newSelected));
    const weekStripApproachIndex = weekShiftDays === 7 ? 2 : weekShiftDays === -7 ? 0 : null;

    this._timelinePendingSlideIndex = null;
    this._timelineGestureRole = "";
    this._timelineCommitConsumed = false;
    this.rebuildWeek(this.activitiesForRebuild(), newSelected, {
      fromWeekStripSwipe: true,
      recenterInstant: true,
      timelineCenterDate: newTimelineCenter,
      weekStripApproachIndex,
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
