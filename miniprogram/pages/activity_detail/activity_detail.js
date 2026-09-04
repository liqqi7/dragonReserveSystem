const app = getApp();
const activityService = require("../../services/activity");
const authService = require("../../services/auth");
const userService = require("../../services/user");
const {
  enrichSingleActivity,
  DEFAULT_AVATAR
} = require("../../utils/activityEnrich");
const { buildActivityShareAppMessageOptions } = require("../../utils/shareActivity");
const { isDefaultNickname, isDefaultAvatar } = require("../../utils/profileUtils");
const { orderParticipantsForDrawerRecentFirst } = require("../../utils/participantSort");
const { resolveLocalMediaUrl, isLocalTestMediaUrl } = require("../../services/config");
const { chooseUploadedAvatar } = require("../../utils/avatarPicker");
const { getBottomSafeAreaRpx, getWindowInfoCompat } = require("../../utils/safeArea");
const { resolveActivityWeather } = require("../../utils/activityWeatherCache");
const {
  parseLocalDateTime,
  formatActivityDate,
  formatActivityTime,
  truncateActivityTitle,
  formatHeroMeta,
  calculateDistanceMeters,
  formatDistance,
  buildWeatherView,
  resolvePrimaryAction
} = require("../../utils/activityDetail");

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
  if (value.toLowerCase().startsWith("http://")) {
    const resolved = resolveLocalMediaUrl(value);
    return isLocalTestMediaUrl(value) ? resolved : PROFILE_EDIT_DEFAULT_AVATAR;
  }
  return value;
}

const PARTICIPANT_PREVIEW_MAX = 14;
const PARTICIPANTS_MORE_ICON = "/images/icon-participants-more.png";
const LOCATION_MAP_MARKER_ICON = "/images/icon-activity-map-marker.png";
const LOCATION_MAP_MARKER_DESIGN_SIZE_PX = 54;
const LOCATION_MAP_MARKER_ANCHOR_Y = 23 / 54;

function buildLocationMapMarkers(latitude, longitude, windowWidthPx) {
  const viewportWidth = Number(windowWidthPx) > 0 ? Number(windowWidthPx) : 390;
  const markerSizePx = Math.max(1, Math.round(LOCATION_MAP_MARKER_DESIGN_SIZE_PX * viewportWidth / 390));
  return [{
    id: 1,
    latitude,
    longitude,
    iconPath: LOCATION_MAP_MARKER_ICON,
    width: markerSizePx,
    height: markerSizePx,
    anchor: { x: 0.5, y: LOCATION_MAP_MARKER_ANCHOR_Y }
  }];
}

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 64,
    safeBottomRpx: 0,
    bottomBarHeightRpx: 107.69,
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
    participantCurrentText: "0",
    participantMaxText: "",
    participantHasLimit: false,
    isCheckinWindowOpen: false,
    activityDateText: "—",
    activityTimeText: "—",
    heroMetaText: "",
    activityTitleText: "",
    detailStatusClass: "status-pill-signup",
    locationDistanceText: "",
    locationMapAvailable: false,
    locationMapLatitude: 0,
    locationMapLongitude: 0,
    locationMapMarkers: [],
    weather: {
      loading: true,
      available: false,
      message: "天气加载中…",
      attribution: "天气服务驱动 by QWeather"
    },
    remarkExpanded: false,
    remarkExpandable: false,
    primaryActionLabel: "已停止报名",
    primaryActionDisabled: true,
    primaryActionType: "none",
    sharePreviewImageUrl: "",
    sharePreviewLoading: false,
    showActivityForm: false,
    activityFormSubmitting: false,
    locationDisabled: false,
    activityParticipantCount: 0,
    showSignupProfileModal: false,
    signupProfileNickname: "",
    signupProfileAvatarUrl: "",
    signupProfileHint: "请修改昵称和头像后再进行报名",
    signupProfileCanSubmit: false
  },

  _activityTypeStyles: [],
  _locationRequestId: 0,
  _hasShownOnce: false,
  _sharePreviewGen: 0,
  _windowWidthPx: 390,

  onLoad(options) {
    const id = (options && options.id) || "";
    try {
      const win = getWindowInfoCompat();
      const statusBarHeight = win.statusBarHeight || 20;
      this._windowWidthPx = Number(win.windowWidth) > 0 ? Number(win.windowWidth) : 390;
      const safeBottomRpx = getBottomSafeAreaRpx();
      this.setData({
        statusBarHeight,
        navBarHeight: statusBarHeight + 44,
        safeBottomRpx,
        bottomBarHeightRpx: Math.round((107.69 + safeBottomRpx) * 100) / 100,
        activityId: id
      });
    } catch (e) {
      this._windowWidthPx = 390;
      this.setData({ activityId: id, bottomBarHeightRpx: 107.69, safeBottomRpx: 0 });
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

  onUnload() {
    this._locationRequestId += 1;
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

  onSignupProfileChooseAvatar() {
    chooseUploadedAvatar()
      .then((avatarUrl) => {
        this.setData({ signupProfileAvatarUrl: avatarUrl }, () =>
          this.updateSignupProfileValidation()
        );
      })
      .catch((error) => {
        const message = (error && error.message) || "选择头像失败";
        if (!message.includes("cancel")) {
          wx.showToast({ title: message, icon: "none" });
        }
      });
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
    Promise.all([
      activityService.listActivityTypeStyles().catch(() => []),
      activityService.getActivity(this.data.activityId)
    ])
      .then(([styles, raw]) => {
        this._activityTypeStyles = Array.isArray(styles) && styles.length > 0 ? styles : [];
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
    const participantCurrentText = `${n}`;
    const participantMaxText = max != null ? `${max}` : "";
    const participantHasLimit = max != null;
    let isCheckinWindowOpen = false;
    const startAt = parseLocalDateTime(activity.startTime);
    if (startAt) {
      isCheckinWindowOpen = Date.now() >= startAt.getTime() - 60 * 60 * 1000;
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
          checkedInAt: "",
          checkedInAtRaw: "",
          checkinLocationName: "",
          checkinAddress: ""
        };
      }
      const o = p && typeof p === "object" ? p : {};
      return {
        rowKey: o.id != null && o.id !== "" ? `p-id-${o.id}` : `p-idx-${i}`,
        id: o.id != null ? o.id : "",
        name: o.name || "未命名",
        userId: o.userId != null ? o.userId : null,
        avatarUrl: o.avatarUrl || DEFAULT_AVATAR,
        checkedInAt: o.checkedInAt || "",
        checkedInAtRaw: o.checkedInAtRaw || "",
        checkinLocationName: o.checkinLocationName || "",
        checkinAddress: o.checkinAddress || ""
      };
    });

    const heroCardAvatars = Array.isArray(activity.cardAvatars)
      ? activity.cardAvatars.slice(-3)
      : [];
    const primaryAction = resolvePrimaryAction(activity, isCheckinWindowOpen);
    const remark = String(activity.remark || "").trim();
    const detailStatusClass = activity.detailStatusTag === "进行中"
      ? "status-pill-ongoing"
      : (["已结束", "已取消", "已删除"].includes(activity.detailStatusTag)
        ? "status-pill-ended"
        : "status-pill-signup");
    const rawLocationMapLatitude = activity.locationLatitude;
    const rawLocationMapLongitude = activity.locationLongitude;
    const locationMapLatitude = Number(rawLocationMapLatitude);
    const locationMapLongitude = Number(rawLocationMapLongitude);
    const locationMapAvailable =
      rawLocationMapLatitude !== null &&
      rawLocationMapLatitude !== undefined &&
      rawLocationMapLatitude !== "" &&
      rawLocationMapLongitude !== null &&
      rawLocationMapLongitude !== undefined &&
      rawLocationMapLongitude !== "" &&
      Number.isFinite(locationMapLatitude) &&
      Number.isFinite(locationMapLongitude) &&
      locationMapLatitude >= -90 &&
      locationMapLatitude <= 90 &&
      locationMapLongitude >= -180 &&
      locationMapLongitude <= 180;

    this.setData({
      activity,
      heroCardAvatars,
      participantPreview: list,
      participantDrawerList,
      participantCurrentText,
      participantMaxText,
      participantHasLimit,
      activityParticipantCount: n,
      locationDisabled: (activity.checkinCount || 0) > 0,
      isCheckinWindowOpen,
      activityDateText: formatActivityDate(activity.startTime),
      activityTimeText: formatActivityTime(activity.startTime, activity.endTime),
      heroMetaText: formatHeroMeta(activity),
      activityTitleText: truncateActivityTitle(activity.name),
      detailStatusClass,
      locationMapAvailable,
      locationMapLatitude: locationMapAvailable ? locationMapLatitude : 0,
      locationMapLongitude: locationMapAvailable ? locationMapLongitude : 0,
      locationMapMarkers: locationMapAvailable
        ? buildLocationMapMarkers(locationMapLatitude, locationMapLongitude, this._windowWidthPx)
        : [],
      remarkExpanded: false,
      remarkExpandable: false,
      primaryActionLabel: primaryAction.label,
      primaryActionDisabled: primaryAction.disabled,
      primaryActionType: primaryAction.action,
      locationDistanceText: "",
      weather: buildWeatherView(resolveActivityWeather(activity))
    }, () => {
      this.updateRemarkOverflow();
    });
    this.refreshSharePreview(activity && activity._id);
    this.loadLocationDistance(activity);
  },

  updateRemarkOverflow() {
    const remark = String(this.data.activity && this.data.activity.remark || "").trim();
    if (!remark || !wx.createSelectorQuery) {
      if (this.data.remarkExpandable) this.setData({ remarkExpandable: false, remarkExpanded: false });
      return;
    }
    const measure = () => {
      const query = wx.createSelectorQuery();
      query.select(".hero-remark-row").boundingClientRect();
      query.select(".hero-remark-measure").boundingClientRect();
      query.select(".remark-toggle-measure").boundingClientRect();
      query.exec((rects) => {
        const rowRect = rects && rects[0];
        const textRect = rects && rects[1];
        const toggleRect = rects && rects[2];
        if (!rowRect || !textRect || !toggleRect) return;
        const toggleWidth = Math.max(0, Number(toggleRect.width) || 0);
        const availableTextWidth = Math.max(0, rowRect.width - toggleWidth - 7.69);
        const remarkExpandable = textRect.width > availableTextWidth + 0.5;
        if (remarkExpandable !== this.data.remarkExpandable) {
          this.setData({ remarkExpandable, remarkExpanded: false });
        }
      });
    };
    if (wx.nextTick) wx.nextTick(measure);
    else setTimeout(measure, 0);
  },

  loadLocationDistance(activity) {
    const latitude = Number(activity && activity.locationLatitude);
    const longitude = Number(activity && activity.locationLongitude);
    const requestId = ++this._locationRequestId;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !wx.getLocation) {
      this.setData({ locationDistanceText: "" });
      return;
    }
    wx.getLocation({
      type: "gcj02",
      success: (result) => {
        if (requestId !== this._locationRequestId) return;
        const distance = calculateDistanceMeters(
          result.latitude,
          result.longitude,
          latitude,
          longitude
        );
        this.setData({ locationDistanceText: formatDistance(distance) });
      },
      fail: () => {
        if (requestId === this._locationRequestId) {
          this.setData({ locationDistanceText: "" });
        }
      }
    });
  },

  toggleRemark() {
    if (!this.data.remarkExpandable) return;
    this.setData({ remarkExpanded: !this.data.remarkExpanded });
  },

  openLocation() {
    const activity = this.data.activity;
    const latitude = Number(activity && activity.locationLatitude);
    const longitude = Number(activity && activity.locationLongitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      wx.showToast({ title: "该活动暂无可导航地点", icon: "none" });
      return;
    }
    wx.openLocation({
      latitude,
      longitude,
      name: activity.locationName || "活动地点",
      address: activity.locationAddress || "",
      scale: 16
    });
  },

  onTapPrimaryAction() {
    if (this.data.primaryActionDisabled) return;
    if (this.data.primaryActionType === "signup") return this.onTapSignup();
    if (this.data.primaryActionType === "cancel") return this.onTapCancelSignup();
    if (this.data.primaryActionType === "checkin") return this.onTapCheckin();
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
    if (!activity || !activity._id || this.data.activityFormSubmitting) return;
    this.setData({
      showActivityForm: true,
      activityFormSubmitting: false,
      locationDisabled: (activity.checkinCount || 0) > 0
    });
  },

  closeActivityForm() {
    if (this.data.activityFormSubmitting) return;
    this.setData({ showActivityForm: false });
  },

  submitActivityForm(e) {
    if (this.data.activityFormSubmitting) return;
    const current = this.data.activity;
    const payload = e && e.detail && e.detail.payload;
    if (!current || !current._id || !payload) {
      wx.showToast({ title: "活动信息缺失", icon: "none" });
      return;
    }
    this.setData({ activityFormSubmitting: true });
    wx.showLoading({ title: "保存中...", mask: true });
    activityService
      .updateActivity(current._id, payload)
      .then(() => {
        wx.hideLoading();
        wx.showToast({ title: "更新成功", icon: "success" });
        this.setData({ showActivityForm: false, activityFormSubmitting: false });
        return this.refreshDetail({ silent: true });
      })
      .catch((err) => {
        console.error(err);
        wx.hideLoading();
        this.setData({ activityFormSubmitting: false });
        wx.showToast({ title: (err && err.message) || "更新失败", icon: "none" });
      });
  },

  cancelActivityFromForm() {
    const activity = this.data.activity;
    if (!activity || !activity._id || this.data.activityFormSubmitting) return;
    wx.showModal({
      title: "确认取消活动",
      content: `确定要取消活动「${activity.name}」吗？`,
      success: (res) => {
        if (!res.confirm) return;
        this.setData({ activityFormSubmitting: true });
        wx.showLoading({ title: "处理中...", mask: true });
        activityService
          .updateActivity(activity._id, { status: "已取消" })
          .then(() => {
            wx.hideLoading();
            wx.showToast({ title: "已取消活动", icon: "success" });
            this.setData({ showActivityForm: false, activityFormSubmitting: false });
            return this.refreshDetail({ silent: true });
          })
          .catch((err) => {
            console.error(err);
            wx.hideLoading();
            this.setData({ activityFormSubmitting: false });
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

  showSignupPermissionDenied() {
    wx.showModal({
      title: "暂无报名权限",
      content: "当前账号没有报名权限，请前往「我的」页面查看",
      cancelText: "取消",
      confirmText: "去我的",
      success: (res) => {
        if (res.confirm) {
          wx.switchTab({ url: "/pages/profile/profile" });
        }
      }
    });
  },

  directSignup(activity) {
    if (activity.status === "已结束" || activity.status === "已取消" || activity.status === "已流局") {
      wx.showToast({ title: "该活动已结束或已取消", icon: "none" });
      return;
    }
    if (activity.isSignupClosed) {
      wx.showToast({ title: "活动已停止报名", icon: "none" });
      return;
    }
    if (activity.isFull) {
      wx.showToast({ title: "报名失败，活动参与人数已达上限", icon: "none" });
      return;
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
    const userRole = app.globalData.userRole || wx.getStorageSync("userRole") || "guest";
    if (userRole !== "admin") {
      this.showSignupPermissionDenied();
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
        if (
          msg.includes("disabled") ||
          msg.includes("未开放") ||
          msg.includes("deadline") ||
          msg.includes("passed") ||
          msg.includes("截止")
        ) {
          wx.showToast({ title: "活动已停止报名", icon: "none" });
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
    const payload = e && e.detail ? e.detail : ((e && e.currentTarget && e.currentTarget.dataset) || {});
    const participantId = payload.id;
    const name = payload.name;
    const isSelf = !!payload.self;
    const activity = this.data.activity;
    if (!activity) return;

    wx.showModal({
      title: isSelf ? "确认取消报名" : "确认删除",
      content: isSelf
        ? `确定要取消活动「${activity.name}」的报名吗？`
        : `确定要删除「${name}」吗？该成员的报名记录将被删除。`,
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
    const payload = e && e.detail ? e.detail : ((e && e.currentTarget && e.currentTarget.dataset) || {});
    const participantId = payload.id;
    const name = payload.name;
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
    const payload = e && e.detail ? e.detail : ((e && e.currentTarget && e.currentTarget.dataset) || {});
    const participantId = payload.id;
    const name = payload.name;
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
