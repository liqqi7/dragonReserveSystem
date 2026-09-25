const app = getApp();
const activityService = require("../../services/activity");
const { buildEditForm, validateActivityForm, buildActivityPayload } = require("../../utils/activityForm");
const { adaptActivity } = require("../../utils/activityEnrich");
const { getWindowInfoCompat, getBottomSafeAreaRpx } = require("../../utils/safeArea");

function normalizeSubItems(items, quota) {
  const limit = Math.max(1, Math.min(999, Number(quota) || 12));
  return (Array.isArray(items) ? items : []).map(item => ({
    ...item,
    max_participants: Math.min(limit, Math.max(1, Number(item.max_participants) || 1))
  }));
}

function formatDateLabel(dateValue, timeValue) {
  if (!dateValue || !timeValue) return "";
  return `${String(dateValue).replace(/-/g, "/")} ${timeValue}`;
}

Page({
  data: {
    loading: true,
    saving: false,
    form: {},
    selectedCover: {},
    coverImageSrc: "",
    coverImageMounted: false,
    coverImageState: "empty",
    coverFadePhase: "a",
    coverImageFallbackTried: false,
    participantCount: 0,
    minParticipants: 1,
    locationDisabled: false,
    coverPickerVisible: false,
    pickerVisible: false,
    pickerTarget: "start",
    pickerValue: "",
    startLabel: "",
    endLabel: "",
    statusBarHeight: 20,
    footerSafeAreaRpx: 0,
    activityId: ""
  },

  onLoad(options = {}) {
    const token = app.globalData.accessToken || wx.getStorageSync("accessToken");
    if (!app.globalData.isAuthenticated || !token || !["user", "admin"].includes(app.globalData.userRole)) {
      wx.navigateBack();
      return;
    }
    const activityId = String(options.id || options.activityId || "").trim();
    if (!activityId) {
      wx.showToast({ title: "活动信息缺失", icon: "none" });
      wx.navigateBack();
      return;
    }
    const info = getWindowInfoCompat();
    this.setData({
      activityId,
      statusBarHeight: info.statusBarHeight || 20,
      footerSafeAreaRpx: Math.max(0, getBottomSafeAreaRpx() - 9.62)
    });
    const channel = this.getOpenerEventChannel && this.getOpenerEventChannel();
    if (channel && typeof channel.on === "function") {
      channel.on("initActivityEdit", ({ activity } = {}) => {
        if (this._unloaded || !activity || String(activity._id) !== activityId) return;
        this._prefilled = true;
        this.applyActivity(activity);
      });
    }
    this.loadActivity(activityId);
  },

  onUnload() {
    this._unloaded = true;
  },

  applyActivity(activity) {
    const form = buildEditForm(activity);
    const participantCount = Array.isArray(activity.participants)
      ? activity.participants.length
      : Math.max(0, Number(activity.current_participants) || 0);
    const minParticipants = Math.max(1, participantCount);
    if (form.limitEnabled) form.maxParticipants = Math.max(minParticipants, Number(form.maxParticipants) || minParticipants);
    const cover = activity.activityCover || activity.activity_cover || {};
    const selectedCover = {
      id: String(cover.id || form.activityCoverId || ""),
      imageUrl: cover.imageUrl || cover.image_url || "",
      thumbnailUrl: cover.thumbnailUrl || cover.thumbnail_url || ""
    };
    const coverImageSrc = selectedCover.imageUrl || selectedCover.thumbnailUrl || "";
    this.setData({
      form,
      selectedCover,
      coverImageSrc,
      coverImageMounted: Boolean(coverImageSrc),
      coverImageState: coverImageSrc ? "loading" : "empty",
      coverFadePhase: this.data.coverFadePhase === "a" ? "b" : "a",
      coverImageFallbackTried: false,
      participantCount,
      minParticipants,
      locationDisabled: (activity.checkinCount || 0) > 0,
      loading: false,
      startLabel: formatDateLabel(form.startDate, form.startTime),
      endLabel: formatDateLabel(form.endDate, form.endTime)
    });
  },

  loadActivity(activityId) {
    return activityService.getActivity(activityId)
      .then(rawActivity => {
        if (this._unloaded || this._prefilled) return;
        this.applyActivity(rawActivity && rawActivity._id ? rawActivity : adaptActivity(rawActivity || {}));
      })
      .catch(error => {
        if (this._unloaded || this._prefilled) return;
        console.error(error);
        wx.showToast({ title: "活动信息加载失败，请返回重试", icon: "none" });
      });
  },

  onBack() {
    if (!this.data.saving) wx.navigateBack();
  },

  onNameInput(e) {
    this.setData({ "form.name": e.detail.value });
  },

  onRemarkInput(e) {
    this.setData({ "form.remark": e.detail.value });
  },

  chooseLocation() {
    if (this.data.locationDisabled) {
      wx.showToast({ title: "已有用户完成签到，不可修改活动地点", icon: "none" });
      return;
    }
    wx.chooseLocation({
      success: location => {
        if (this._unloaded) return;
        this.setData({
          "form.locationName": location.name || location.address || "",
          "form.locationAddress": location.address || "",
          "form.locationLatitude": location.latitude,
          "form.locationLongitude": location.longitude
        });
      },
      fail: error => {
        if (!this._unloaded && !String(error.errMsg || "").includes("cancel")) wx.showToast({ title: "无法选择地点，请检查定位权限", icon: "none" });
      }
    });
  },

  openCoverPicker() {
    if (!this.data.loading) this.setData({ coverPickerVisible: true });
  },

  closeCoverPicker() {
    this.setData({ coverPickerVisible: false });
  },

  confirmCoverPicker(e) {
    const artwork = e.detail || {};
    const coverId = String(artwork.id || "");
    if (!coverId) return;
    const selectedCover = {
      id: coverId,
      imageUrl: artwork.imageUrl || artwork.image_url || "",
      thumbnailUrl: artwork.thumbnailUrl || artwork.thumbnail_url || ""
    };
    const coverImageSrc = selectedCover.imageUrl || selectedCover.thumbnailUrl || "";
    const coverImageState = coverImageSrc ? "loading" : "empty";
    this.setData({
      "form.activityCoverId": coverId,
      selectedCover,
      coverImageSrc,
      coverImageMounted: Boolean(coverImageSrc),
      coverImageState,
      coverFadePhase: this.data.coverFadePhase === "a" ? "b" : "a",
      coverImageFallbackTried: false,
      coverPickerVisible: false
    });
  },

  onCoverImageLoad(e) {
    const eventSource = e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.coverSrc;
    if (eventSource && eventSource !== this.data.coverImageSrc) return;
    if (this._unloaded || this.data.coverImageState !== "loading") return;
    this.setData({ coverImageState: "loaded" });
  },

  onCoverImageError(e) {
    const eventSource = e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.coverSrc;
    if (eventSource && eventSource !== this.data.coverImageSrc) return;
    if (this._unloaded || this.data.coverImageState !== "loading") return;
    const thumbnailUrl = this.data.selectedCover.thumbnailUrl || "";
    if (!this.data.coverImageFallbackTried && thumbnailUrl && thumbnailUrl !== this.data.coverImageSrc) {
      this.setData({
        coverImageSrc: thumbnailUrl,
        coverImageMounted: true,
        coverImageFallbackTried: true
      });
      return;
    }
    this.setData({ coverImageState: "error", coverImageMounted: false });
  },

  openPicker(e) {
    const target = e.currentTarget.dataset.target;
    this.setData({
      pickerTarget: target,
      pickerValue: `${this.data.form[`${target}Date`] || ""} ${this.data.form[`${target}Time`] || ""}`.trim(),
      pickerVisible: true
    });
  },

  closePicker() {
    this.setData({ pickerVisible: false });
  },

  confirmPicker(e) {
    const target = this.data.pickerTarget;
    const detail = e.detail || {};
    const changes = {
      [`form.${target}Date`]: detail.dateValue,
      [`form.${target}Time`]: detail.timeValue,
      [`${target}Label`]: formatDateLabel(detail.dateValue, detail.timeValue),
      pickerVisible: false
    };
    this.setData(changes);
  },

  stepQuota(e) {
    const delta = Number(e.currentTarget.dataset.delta) || 0;
    const next = Math.max(this.data.minParticipants || 1, Math.min(999, Number(this.data.form.maxParticipants) + delta));
    this.setData({
      "form.maxParticipants": next,
      "form.subItems": normalizeSubItems(this.data.form.subItems, next)
    });
  },

  toggleSignup() {
    this.setData({ "form.signupEnabled": !this.data.form.signupEnabled });
  },

  onSubItemsChange(e) {
    const maxParticipants = Number(this.data.form.maxParticipants) || 12;
    this.setData({
      "form.subItemsEnabled": Boolean(e.detail.enabled),
      "form.subItems": normalizeSubItems(e.detail.items, maxParticipants)
    });
  },

  saveActivity() {
    if (this.data.loading || this.data.saving) return;
    const result = validateActivityForm(this.data.form, { mode: "edit", participantCount: this.data.participantCount });
    if (!result.ok) {
      wx.showToast({ title: result.message, icon: "none" });
      return;
    }
    this.setData({ saving: true });
    activityService.updateActivity(this.data.activityId, buildActivityPayload(this.data.form, { mode: "edit" }))
      .then(activity => {
        if (this._unloaded) return;
        try {
          const channel = this.getOpenerEventChannel && this.getOpenerEventChannel();
          if (channel && typeof channel.emit === "function") channel.emit("activityUpdated", activity);
        } catch (error) {
          console.error("通知活动更新失败:", error);
        }
        wx.showToast({ title: "保存成功", icon: "success" });
        wx.navigateBack();
      })
      .catch(error => {
        if (this._unloaded) return;
        console.error(error);
        this.setData({ saving: false });
        wx.showToast({ title: (error && error.message) || "保存失败，请重试", icon: "none" });
      });
  },

  cancelActivity() {
    if (this.data.loading || this.data.saving) return;
    wx.showModal({
      title: "取消活动",
      content: "确定要取消这个活动吗？",
      confirmText: "确定取消",
      confirmColor: "#FF9800",
      success: result => {
        if (!result.confirm) return;
        this.setData({ saving: true });
        activityService.cancelActivity(this.data.activityId)
          .then(() => {
            if (this._unloaded) return;
            try {
              const channel = this.getOpenerEventChannel && this.getOpenerEventChannel();
              if (channel && typeof channel.emit === "function") channel.emit("activityUpdated");
            } catch (error) {
              console.error("通知活动取消失败:", error);
            }
            wx.showToast({ title: "已取消活动", icon: "success" });
            wx.navigateBack();
          })
          .catch(error => {
            if (this._unloaded) return;
            console.error(error);
            this.setData({ saving: false });
            wx.showToast({ title: (error && error.message) || "操作失败", icon: "none" });
          });
      }
    });
  }
});
