const app = getApp();
const activityService = require("../../services/activity");
const authService = require("../../services/auth");
const userService = require("../../services/user");
const {
  enrichSingleActivity,
  formatDetailTimeRange,
  formatLocationLine,
  DEFAULT_AVATAR
} = require("../../utils/activityEnrich");
const { buildActivityShareAppMessageOptions } = require("../../utils/shareActivity");
const { isDefaultNickname, isDefaultAvatar } = require("../../utils/profileUtils");
const { orderParticipantsForDrawerRecentFirst } = require("../../utils/participantSort");
const { resolveLocalMediaUrl, isLocalTestMediaUrl } = require("../../services/config");
const { chooseUploadedAvatar } = require("../../utils/avatarPicker");

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
      activityParticipantCount: n,
      locationDisabled: (activity.checkinCount || 0) > 0,
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
