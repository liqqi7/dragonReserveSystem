const app = getApp();
const activityService = require("../../services/activity");
const authService = require("../../services/auth");
const userService = require("../../services/user");
const {
  enrichSingleActivity,
  formatDetailTimeRange,
  formatLocationLine,
  buildTypeStyleMap,
  normalizeTypeKey,
  DEFAULT_ACTIVITY_TYPE_KEY,
  DEFAULT_ACTIVITY_TYPE_STYLES,
  DEFAULT_AVATAR
} = require("../../utils/activityEnrich");
const { buildActivityShareAppMessageOptions } = require("../../utils/shareActivity");
const { isDefaultNickname, isDefaultAvatar } = require("../../utils/profileUtils");
const { orderParticipantsForDrawerRecentFirst } = require("../../utils/participantSort");

const LOCAL_TEST_AVATAR_PREFIX = "/images/avatars";
const PROFILE_EDIT_DEFAULT_AVATAR = "/images/default-avatar.svg";

function isTemporaryAvatarUrl(url) {
  if (!url) return false;
  const normalized = String(url).trim().toLowerCase();
  return (
    normalized.startsWith("http://tmp/") ||
    normalized.startsWith("https://tmp/") ||
    normalized.startsWith("wxfile://") ||
    normalized.startsWith("tmp/")
  );
}

function normalizeProfileAvatarForModal(url) {
  const value = (url && String(url).trim()) || "";
  if (!value) return "";
  if (value.toLowerCase().includes("example.com/")) return PROFILE_EDIT_DEFAULT_AVATAR;
  if (value.startsWith("/media/")) {
    const m = value.match(/test-avatar-(\d{2})\.svg$/i);
    return m ? `${LOCAL_TEST_AVATAR_PREFIX}/test-avatar-${m[1]}.svg` : PROFILE_EDIT_DEFAULT_AVATAR;
  }
  if (value.startsWith("media/")) {
    const m = value.match(/test-avatar-(\d{2})\.svg$/i);
    return m ? `${LOCAL_TEST_AVATAR_PREFIX}/test-avatar-${m[1]}.svg` : PROFILE_EDIT_DEFAULT_AVATAR;
  }
  if (value.toLowerCase().startsWith("http://")) return PROFILE_EDIT_DEFAULT_AVATAR;
  return value;
}

const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
const PARTICIPANT_PREVIEW_MAX = 14;
const PARTICIPANTS_MORE_ICON = "/images/icon-participants-more.png";

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 64,
    safeBottom: 0,
    bottomBarHeight: 120,
    activityId: "",
    activity: null,
    loading: true,
    loadError: "",
    isAdmin: false,
    myUserId: "",
    myNickname: "",
    showParticipantsDrawer: false,
    participantPreview: [],
    heroCardAvatars: [],
    participantDrawerList: [],
    participantCountText: "",
    isCheckinWindowOpen: false,
    timeRangeText: "",
    locationText: "",
    countdownVisible: false,
    cdDays: 0,
    cdHours: 0,
    cdMinutes: 0,
    cdSeconds: 0,
    cdHoursPad: "00",
    cdMinutesPad: "00",
    cdSecondsPad: "00",
    pigeonList: [],
    pigeonPreviewList: [],
    showPigeonDrawer: false,
    sharePreviewImageUrl: "",
    sharePreviewLoading: false,
    showEditModal: false,
    currentActivity: null,
    locationDisabled: false,
    activityTypeStyles: DEFAULT_ACTIVITY_TYPE_STYLES,
    activityTypeOptionLabels: DEFAULT_ACTIVITY_TYPE_STYLES.map((item) => item.display_name || item.key),
    activityTypeOptionValues: DEFAULT_ACTIVITY_TYPE_STYLES.map((item) => normalizeTypeKey(item.key)).filter(Boolean),
    editActivityTypeIndex: 0,
    activityStyleOptionLabels: [],
    activityStyleOptionValues: [],
    editActivityStyleIndex: 0,
    showSignupProfileModal: false,
    signupProfileNickname: "",
    signupProfileAvatarUrl: "",
    signupProfileHint: "请修改昵称和头像后再进行报名",
    signupProfileCanSubmit: false,
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
      signupEnabled: true,
      limitEnabled: false,
      maxParticipants: null,
      activityType: DEFAULT_ACTIVITY_TYPE_KEY,
      activityStyleKey: ""
    }
  },

  _countdownTimer: null,
  _activityTypeStyles: [],
  _hasShownOnce: false,
  _sharePreviewGen: 0,

  onLoad(options) {
    const id = (options && options.id) || "";
    try {
      const win = wx.getWindowInfo();
      const statusBarHeight = win.statusBarHeight || 20;
      const safeBottom = (win.safeAreaInsets && win.safeAreaInsets.bottom) || 0;
      const bottomBarPx = Math.round(72 + safeBottom);
      this.setData({
        statusBarHeight,
        navBarHeight: statusBarHeight + 44,
        safeBottom,
        bottomBarHeight: bottomBarPx,
        activityId: id
      });
    } catch (e) {
      this.setData({ activityId: id, bottomBarHeight: 120, safeBottom: 0 });
    }

    if (!id) {
      this.setData({
        loading: false,
        loadError: "缺少活动 id",
        sharePreviewImageUrl: "",
        sharePreviewLoading: false
      });
      return;
    }

    this.syncUser();
    this.bootstrap();
  },

  onShow() {
    this.syncUser();
    if (!this.data.activityId) return;
    if (!this._hasShownOnce) {
      this._hasShownOnce = true;
      return;
    }
    this.refreshDetail({ silent: true });
  },

  onHide() {
    this.stopCountdownTimer();
  },

  onUnload() {
    this.stopCountdownTimer();
  },

  syncUser() {
    const isAdmin = app.globalData.userRole === "admin";
    const myUserId = app.globalData.userId || wx.getStorageSync("userId") || "";
    const myNickname = (app.globalData.userProfile?.nickname || wx.getStorageSync("userNickname") || "").trim();
    this.setData({ isAdmin, myUserId, myNickname });
    return { isAdmin, myUserId, myNickname };
  },

  openSignupProfileModal() {
    const profile = app.globalData.userProfile || {};
    const nick = profile.nickname || "";
    const avatarRaw = profile.avatarUrl || "";
    this.setData(
      {
        showSignupProfileModal: true,
        signupProfileNickname: nick,
        signupProfileAvatarUrl: normalizeProfileAvatarForModal(avatarRaw),
        signupProfileHint: "请修改昵称和头像后再进行报名"
      },
      () => this.updateSignupProfileValidation()
    );
  },

  closeSignupProfileModal() {
    this.setData({
      showSignupProfileModal: false,
      signupProfileCanSubmit: false
    });
  },

  onSignupProfileNicknameInput(e) {
    this.setData({ signupProfileNickname: e.detail.value || "" }, () =>
      this.updateSignupProfileValidation()
    );
  },

  onSignupProfileChooseAvatar(e) {
    const avatarUrl = e.detail && e.detail.avatarUrl;
    if (!avatarUrl) {
      wx.showToast({ title: "未选择头像", icon: "none" });
      return;
    }
    this.setData({ signupProfileAvatarUrl: avatarUrl }, () =>
      this.updateSignupProfileValidation()
    );
    wx.showToast({ title: "已选择微信头像", icon: "success" });
  },

  updateSignupProfileValidation() {
    const nickname = (this.data.signupProfileNickname || "").trim();
    const avatarUrl = (this.data.signupProfileAvatarUrl || "").trim();
    const canSubmit = !isDefaultNickname(nickname) && !isDefaultAvatar(avatarUrl);
    this.setData({ signupProfileCanSubmit: canSubmit });
  },

  saveSignupProfile() {
    const nickname = (this.data.signupProfileNickname || "").trim();
    const avatarUrl = (this.data.signupProfileAvatarUrl || "").trim();
    const currentAvatarUrl = (
      (app.globalData.userProfile && app.globalData.userProfile.avatarUrl) ||
      ""
    ).trim();

    if (!nickname) {
      wx.showToast({ title: "请输入昵称", icon: "none" });
      return;
    }
    if (!this.data.signupProfileCanSubmit) {
      wx.showToast({ title: "请修改昵称和头像后再进行报名", icon: "none" });
      return;
    }
    const userId = app.globalData.userId || wx.getStorageSync("userId") || "";
    if (!userId) {
      wx.showToast({ title: "用户信息异常", icon: "none" });
      return;
    }

    wx.showLoading({ title: "保存中...", mask: true });

    const avatarTask =
      avatarUrl && isTemporaryAvatarUrl(avatarUrl)
        ? userService.uploadAvatar(avatarUrl).then((res) => res.avatar_url)
        : Promise.resolve(avatarUrl || currentAvatarUrl);

    avatarTask
      .then((resolvedAvatarUrl) =>
        userService.updateMe({
          nickname,
          avatar_url: resolvedAvatarUrl || ""
        })
      )
      .then((user) => {
        app.applyCurrentUser(user);
        this.syncUser();
        this.setData({
          showSignupProfileModal: false,
          signupProfileAvatarUrl: user.avatar_url || ""
        });
        wx.hideLoading();
        wx.showToast({ title: "保存成功", icon: "success" });
        const act = this.data.activity;
        if (act) this.directSignup(act);
      })
      .catch((err) => {
        console.error(err);
        wx.hideLoading();
        wx.showToast({ title: (err && err.message) || "保存失败", icon: "none" });
      });
  },

  bootstrap() {
    this.setData({ loading: true, loadError: "" });
    this.refreshSharePreview(this.data.activityId);
    activityService
      .listActivityTypeStyles()
      .catch(() => [])
      .then((res) => {
        this._activityTypeStyles = Array.isArray(res) && res.length > 0 ? res : [];
        return activityService.getActivity(this.data.activityId);
      })
      .then((raw) => {
        const myUserId = app.globalData.userId || wx.getStorageSync("userId") || "";
        const myNickname = (app.globalData.userProfile?.nickname || wx.getStorageSync("userNickname") || "").trim();
        const activity = enrichSingleActivity(
          raw,
          this._activityTypeStyles,
          myUserId,
          myNickname
        );
        this.applyActivity(activity);
        this.setData({ loading: false, loadError: "" });
      })
      .catch((err) => {
        console.error(err);
        this.setData({
          loading: false,
          loadError: (err && err.message) || "加载失败",
          sharePreviewImageUrl: "",
          sharePreviewLoading: false
        });
      });
  },

  refreshDetail(options = {}) {
    const { silent } = options;
    if (!this.data.activityId) return Promise.resolve();
    if (!silent) {
      wx.showLoading({ title: "刷新中..." });
    }
    return Promise.all([
      activityService.listActivityTypeStyles().catch(() => []),
      activityService.getActivity(this.data.activityId)
    ])
      .then(([styles, raw]) => {
        if (Array.isArray(styles) && styles.length > 0) {
          this._activityTypeStyles = styles;
        }
        const myUserId = app.globalData.userId || wx.getStorageSync("userId") || "";
        const myNickname = (app.globalData.userProfile?.nickname || wx.getStorageSync("userNickname") || "").trim();
        const activity = enrichSingleActivity(
          raw,
          this._activityTypeStyles,
          myUserId,
          myNickname
        );
        this.applyActivity(activity);
      })
      .catch((err) => {
        console.error(err);
        if (!silent) {
          wx.showToast({ title: (err && err.message) || "刷新失败", icon: "none" });
        }
      })
      .finally(() => {
        if (!silent) wx.hideLoading();
      });
  },

  applyActivity(activity) {
    const rawAvatars = (activity.avatarList || []).slice().reverse().map((a, i) => ({
      url: (a && a.url) || DEFAULT_AVATAR,
      pKey: `av-${i}`
    }));
    let list;
    if (rawAvatars.length <= PARTICIPANT_PREVIEW_MAX) {
      list = rawAvatars;
    } else {
      list = rawAvatars.slice(0, PARTICIPANT_PREVIEW_MAX - 1).map((item, i) => ({
        ...item,
        pKey: `av-${i}`
      }));
      list.push({ url: PARTICIPANTS_MORE_ICON, pKey: "more" });
    }
    const max = activity.maxParticipants;
    const n = (activity.participants || []).length;
    const participantCountText =
      max != null ? `${n}/${max}` : n > 0 ? `${n}` : "0";
    let isCheckinWindowOpen = false;
    if (activity && activity.startTime) {
      const startAt = new Date(String(activity.startTime).replace(" ", "T") + ":00");
      if (!isNaN(startAt.getTime())) {
        isCheckinWindowOpen = Date.now() >= startAt.getTime() - 60 * 60 * 1000;
      }
    }

    const rawParts = orderParticipantsForDrawerRecentFirst(activity.participants || []);
    const participantDrawerList = rawParts.map((p, i) => {
      if (typeof p === "string") {
        return {
          rowKey: `p-str-${i}`,
          id: "",
          name: p,
          userId: null,
          avatarUrl: DEFAULT_AVATAR,
          checkedInAt: ""
        };
      }
      const o = p && typeof p === "object" ? p : {};
      return {
        rowKey: o.id != null && o.id !== "" ? `p-id-${o.id}` : `p-idx-${i}`,
        id: o.id != null ? o.id : "",
        name: o.name || "未命名",
        userId: o.userId != null ? o.userId : null,
        avatarUrl: o.avatarUrl || DEFAULT_AVATAR,
        checkedInAt: o.checkedInAt || ""
      };
    });

    let pigeonList = [];
    if (activity.status === "已结束") {
      const parts = activity.participants || [];
      parts.forEach((p, i) => {
        if (typeof p === "string") {
          pigeonList.push({
            name: p,
            avatarUrl: DEFAULT_AVATAR,
            pigeonKey: `pigeon-str-${i}`
          });
        } else if (p && typeof p === "object" && !p.checkedInAt) {
          pigeonList.push({
            name: p.name || "未命名",
            avatarUrl: p.avatarUrl || DEFAULT_AVATAR,
            pigeonKey: p._id ? `pigeon-${p._id}` : `pigeon-obj-${i}`
          });
        }
      });
    }

    const pigeonPreviewList =
      pigeonList.length > 0 ? pigeonList.slice(0, 24) : [];
    const heroCardAvatars = Array.isArray(activity.cardAvatars)
      ? activity.cardAvatars.slice(-3)
      : [];

    this.setData({
      activity,
      heroCardAvatars,
      participantPreview: list,
      participantDrawerList,
      participantCountText,
      isCheckinWindowOpen,
      timeRangeText: formatDetailTimeRange(activity) || "—",
      locationText: formatLocationLine(activity),
      pigeonList,
      pigeonPreviewList
    });
    this.updateCountdown();
    this.startCountdownTimer();
    this.refreshSharePreview(activity && activity._id);
  },

  refreshSharePreview(activityId) {
    if (!activityId) {
      this.setData({ sharePreviewImageUrl: "", sharePreviewLoading: false });
      return;
    }
    const gen = (this._sharePreviewGen = (this._sharePreviewGen || 0) + 1);
    this.setData({ sharePreviewLoading: true });
    activityService
      .getActivitySharePreview(activityId)
      .then((res) => {
        if (gen !== this._sharePreviewGen) return;
        const url = res && (res.image_url || res.imageUrl);
        const ok =
          res &&
          res.status === "ready" &&
          url &&
          /^https:\/\//i.test(String(url).trim());
        this.setData({
          sharePreviewImageUrl: ok ? String(url).trim() : "",
          sharePreviewLoading: false
        });
      })
      .catch(() => {
        if (gen !== this._sharePreviewGen) return;
        this.setData({
          sharePreviewImageUrl: "",
          sharePreviewLoading: false
        });
      });
  },

  updateCountdown() {
    const activity = this.data.activity;
    if (!activity || !activity.signupDeadline) {
      this.setData({ countdownVisible: false });
      return;
    }
    const end = new Date(activity.signupDeadline.replace(" ", "T") + ":00").getTime();
    if (isNaN(end) || Date.now() >= end) {
      this.setData({ countdownVisible: false });
      this.stopCountdownTimer();
      return;
    }
    const diff = end - Date.now();
    const cdDays = Math.floor(diff / 86400000);
    const cdHours = Math.floor((diff % 86400000) / 3600000);
    const cdMinutes = Math.floor((diff % 3600000) / 60000);
    const cdSeconds = Math.floor((diff % 60000) / 1000);
    this.setData({
      countdownVisible: true,
      cdDays,
      cdHours,
      cdMinutes,
      cdSeconds,
      cdHoursPad: pad(cdHours),
      cdMinutesPad: pad(cdMinutes),
      cdSecondsPad: pad(cdSeconds)
    });
  },

  startCountdownTimer() {
    this.stopCountdownTimer();
    if (!this.data.countdownVisible) return;
    this._countdownTimer = setInterval(() => {
      this.updateCountdown();
    }, 1000);
  },

  stopCountdownTimer() {
    if (this._countdownTimer) {
      clearInterval(this._countdownTimer);
      this._countdownTimer = null;
    }
  },

  onTapBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack();
    } else {
      wx.switchTab({ url: "/pages/activity_list/activity_list" });
    }
  },

  openParticipantsDrawer() {
    this.setData({ showParticipantsDrawer: true });
  },

  closeParticipantsDrawer() {
    this.setData({ showParticipantsDrawer: false });
  },

  openAdminEdit() {
    const activity = this.data.activity;
    if (!activity || !activity._id) return;
    wx.showLoading({ title: "加载中...", mask: true });
    this.loadActivityTypeStyles()
      .then(() => {
        wx.hideLoading();
        this.showEditModal({ currentTarget: { dataset: { activity } } });
      })
      .catch((err) => {
        console.error(err);
        wx.hideLoading();
        wx.showToast({ title: (err && err.message) || "加载失败", icon: "none" });
      });
  },

  stopPropagation() {},

  openPigeonDrawer() {
    if (!this.data.pigeonList || !this.data.pigeonList.length) return;
    this.setData({ showPigeonDrawer: true });
  },

  closePigeonDrawer() {
    this.setData({ showPigeonDrawer: false });
  },

  loadActivityTypeStyles() {
    return activityService
      .listActivityTypeStyles()
      .then((res) => {
        const styles = Array.isArray(res) && res.length > 0 ? res : DEFAULT_ACTIVITY_TYPE_STYLES;
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
        this._activityTypeStyles = styles;
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
        const styles = DEFAULT_ACTIVITY_TYPE_STYLES;
        const optionValues = styles.map((item) => normalizeTypeKey(item.key)).filter(Boolean);
        const optionLabels = styles.map((item) => String(item.display_name || item.key || ""));
        let editIndex = optionValues.indexOf(DEFAULT_ACTIVITY_TYPE_KEY);
        if (editIndex < 0) editIndex = 0;
        const typeStyleMap = buildTypeStyleMap(styles);
        const selectedType = optionValues[editIndex] || DEFAULT_ACTIVITY_TYPE_KEY;
        const styleOptions = this._buildStyleOptionsForType(selectedType, typeStyleMap);
        this._activityTypeStyles = styles;
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

  showEditModal(e) {
    const activity = e.currentTarget.dataset.activity;
    if (!activity) return;

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
        startDate,
        startTime,
        endDate,
        endTime,
        signupDeadlineDate,
        signupDeadlineTime,
        locationName: activity.locationName || "",
        locationAddress: activity.locationAddress || "",
        locationLatitude: activity.locationLatitude ?? null,
        locationLongitude: activity.locationLongitude ?? null,
        signupEnabled: activity.signupEnabled !== false,
        limitEnabled: maxParticipants != null,
        maxParticipants,
        activityType: normalizedType,
        activityStyleKey: styleOptions.values[styleIndex] || ""
      }
    });
  },

  onEditFormChange(e) {
    const field = e.currentTarget.dataset.field;
    let value = e.detail.value;
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
    this.setData({ [`editForm.${field}`]: value });
  },

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

  onStartDateChange(e) {
    this.setData({ "editForm.startDate": e.detail.value });
  },

  onStartTimeChange(e) {
    this.setData({ "editForm.startTime": e.detail.value });
  },

  onEndDateChange(e) {
    this.setData({ "editForm.endDate": e.detail.value });
  },

  onEndTimeChange(e) {
    this.setData({ "editForm.endTime": e.detail.value });
  },

  onSignupDeadlineDateChange(e) {
    this.setData({ "editForm.signupDeadlineDate": e.detail.value });
  },

  onSignupDeadlineTimeChange(e) {
    this.setData({ "editForm.signupDeadlineTime": e.detail.value });
  },

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
    wx.nextTick(() => this._saveActivityRun());
  },

  _saveActivityRun() {
    const form = this.data.editForm;
    if (!form.name.trim()) {
      wx.showToast({ title: "请输入活动名称", icon: "none" });
      return;
    }
    if (!form.startDate || !form.startTime || !form.endDate || !form.endTime) {
      wx.showToast({ title: "请完善活动时间", icon: "none" });
      return;
    }
    if (!form.signupDeadlineDate || !form.signupDeadlineTime) {
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

    const current = this.data.currentActivity;
    if (!current || !current._id) {
      wx.showToast({ title: "活动信息缺失", icon: "none" });
      return;
    }

    wx.showLoading({ title: "保存中..." });
    const maxParticipants =
      form.limitEnabled && form.maxParticipants ? Number(form.maxParticipants) : null;
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
      signup_enabled: form.signupEnabled
    };

    activityService
      .updateActivity(current._id, payload)
      .then(() => {
        wx.hideLoading();
        wx.showToast({ title: "更新成功", icon: "success" });
        this.closeEditModal();
        return this.refreshDetail({ silent: true });
      })
      .catch((err) => {
        console.error(err);
        wx.hideLoading();
        wx.showToast({ title: (err && err.message) || "更新失败", icon: "none" });
      });
  },

  closeEditModal() {
    const optionValues = this.data.activityTypeOptionValues || [];
    let editTypeIndex = optionValues.indexOf(DEFAULT_ACTIVITY_TYPE_KEY);
    if (editTypeIndex < 0) editTypeIndex = 0;
    this.setData({
      showEditModal: false,
      currentActivity: null,
      locationDisabled: false,
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
        signupEnabled: true,
        limitEnabled: false,
        maxParticipants: null,
        activityType: DEFAULT_ACTIVITY_TYPE_KEY,
        activityStyleKey: ""
      }
    });
  },

  cancelActivity() {
    const activity = this.data.currentActivity;
    if (!activity || !activity._id) return;
    wx.showModal({
      title: "确认取消活动",
      content: `确定要取消活动「${activity.name}」吗？`,
      success: (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: "处理中..." });
        activityService
          .updateActivity(activity._id, { status: "已取消" })
          .then(() => {
            wx.hideLoading();
            wx.showToast({ title: "已取消活动", icon: "success" });
            this.closeEditModal();
            return this.refreshDetail({ silent: true });
          })
          .catch((err) => {
            console.error(err);
            wx.hideLoading();
            wx.showToast({ title: (err && err.message) || "操作失败", icon: "none" });
          });
      }
    });
  },

  onTapSignup() {
    const activity = this.data.activity;
    if (!activity) return;
    this.directSignup(activity);
  },

  onTapCheckin() {
    const activity = this.data.activity;
    if (!activity) return;
    this.checkinActivity(activity);
  },

  onTapCancelSignup() {
    const activity = this.data.activity;
    if (!activity || !activity.hasSignedUp || activity.hasCheckedIn) return;
    const myUserId = this.data.myUserId || wx.getStorageSync("userId") || "";
    const myNickname = (this.data.myNickname || "").trim();
    const rows = this.data.participantDrawerList || [];
    const mine = rows.find((row) => {
      if (!row) return false;
      if (myUserId && row.userId && String(row.userId) === String(myUserId)) return true;
      return !myUserId && myNickname && row.name === myNickname;
    });
    if (!mine || !mine.id) {
      wx.showToast({ title: "未找到你的报名记录", icon: "none" });
      return;
    }
    wx.showModal({
      title: "确认取消报名",
      content: `确定要取消活动「${activity.name}」的报名吗？`,
      success: (res) => {
        if (!res.confirm) return;
        this.doRemoveParticipant(mine.id, mine.name || "我", activity, true);
      }
    });
  },

  directSignup(activity) {
    if (activity.status === "已结束" || activity.status === "已取消") {
      wx.showToast({ title: "该活动已结束或已取消", icon: "none" });
      return;
    }
    if (activity.signupEnabled === false) {
      wx.showToast({ title: "活动报名暂未开放", icon: "none" });
      return;
    }
    if (activity.signupDeadline) {
      const deadline = new Date(activity.signupDeadline.replace(" ", "T") + ":00");
      if (!isNaN(deadline.getTime()) && Date.now() >= deadline.getTime()) {
        wx.showToast({ title: "报名已截止", icon: "none" });
        return;
      }
    }
    const accessToken = app.globalData.accessToken || wx.getStorageSync("accessToken") || "";
    const userId = app.globalData.userId || wx.getStorageSync("userId") || "";
    const profile = app.globalData.userProfile || null;
    if (!accessToken || !userId || !profile) {
      wx.showModal({
        title: "提示",
        content: "当前尚未登录，请登录后重试",
        cancelText: "取消",
        confirmText: "去登录",
        success: (res) => {
          if (!res.confirm) return;
          wx.showLoading({ title: "登录中...", mask: true });
          authService
            .loginWithWechat(app)
            .then(() => {
              wx.hideLoading();
              const userInfo = this.syncUser();
              // 登录成功后先刷新当前详情，再在当前触发点继续执行报名逻辑
              this.refreshDetail({ silent: true }).finally(() => {
                this.directSignup(this.data.activity || activity);
              });
            })
            .catch((err) => {
              wx.hideLoading();
              wx.showToast({
                title: (err && err.message) || "微信登录失败",
                icon: "none",
                duration: 3000
              });
            });
        }
      });
      return;
    }
    const nickname = app.globalData.userProfile?.nickname?.trim();
    const avatarUrl = (app.globalData.userProfile && app.globalData.userProfile.avatarUrl) || "";
    if (isDefaultNickname(nickname) || isDefaultAvatar(avatarUrl)) {
      wx.showModal({
        title: "提示",
        content: "请修改昵称和头像后再进行报名",
        showCancel: false,
        confirmText: "去修改",
        success: () => {
          this.openSignupProfileModal();
        }
      });
      return;
    }
    const participants = activity.participants || [];
    const myUserId = app.globalData.userId || wx.getStorageSync("userId") || "";
    if (
      myUserId &&
      participants.some(
        (p) => typeof p === "object" && p.userId != null && String(p.userId) === String(myUserId)
      )
    ) {
      wx.showToast({ title: "您已报名", icon: "none" });
      this.refreshDetail({ silent: true });
      return;
    }
    wx.showLoading({ title: "报名中..." });
    activityService
      .signupActivity(activity._id)
      .then(() => {
        wx.hideLoading();
        wx.showToast({ title: "报名成功", icon: "success" });
        return this.refreshDetail({ silent: true });
      })
      .catch((err) => {
        console.error(err);
        wx.hideLoading();
        const msg = (err && err.message) || "";
        if (msg.includes("disabled") || msg.includes("未开放")) {
          wx.showToast({ title: "活动报名暂未开放", icon: "none" });
        } else if (msg.includes("已报名") || msg.toLowerCase().includes("already")) {
          wx.showToast({ title: "您已报名", icon: "none" });
          this.refreshDetail({ silent: true });
        } else {
          wx.showToast({ title: msg || "报名失败", icon: "none" });
        }
      });
  },

  checkinActivity(activity) {
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
      wx.showToast({ title: "请先在「我的」页面完善昵称", icon: "none" });
      return;
    }
    wx.navigateTo({
      url: "/pages/checkin_map/checkin_map",
      success: (res) => {
        if (res && res.eventChannel) {
          res.eventChannel.emit("initCheckin", { activity, nickname });
        }
      }
    });
  },

  removeParticipant(e) {
    const participantId = e.currentTarget.dataset.id;
    const name = e.currentTarget.dataset.name;
    const isSelf = !!e.currentTarget.dataset.self;
    const activity = this.data.activity;
    if (!activity) return;

    wx.showModal({
      title: isSelf ? "确认取消报名" : "确认删除",
      content: isSelf
        ? `确定要取消活动「${activity.name}」的报名吗？`
        : `确定要删除「${name}」吗？如果该成员在记账明细中，相关记录也会被删除。`,
      success: (res) => {
        if (res.confirm) this.doRemoveParticipant(participantId, name, activity, isSelf);
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
        return this.refreshDetail({ silent: true });
      })
      .catch((err) => {
        console.error(err);
        wx.hideLoading();
        wx.showToast({
          title: (err && err.message) || (isSelf ? "取消失败" : "删除失败"),
          icon: "none",
          duration: 3000
        });
      });
  },

  adminRetroCheckin(e) {
    const participantId = e.currentTarget.dataset.id;
    const name = e.currentTarget.dataset.name;
    const activity = this.data.activity;
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
            return this.refreshDetail({ silent: true });
          })
          .catch((err) => {
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
    const activity = this.data.activity;
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
            return this.refreshDetail({ silent: true });
          })
          .catch((err) => {
            console.error(err);
            wx.hideLoading();
            wx.showToast({ title: (err && err.message) || "操作失败", icon: "none" });
          });
      }
    });
  },

  onShareAppMessage() {
    return buildActivityShareAppMessageOptions(
      this.data.activity,
      this.data.sharePreviewImageUrl
    );
  }
});
