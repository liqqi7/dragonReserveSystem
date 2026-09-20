const app = getApp();
const activityService = require("../../services/activity");
const { buildCreateForm, validateActivityForm, buildActivityPayload } = require("../../utils/activityForm");
const { getWindowInfoCompat, getBottomSafeAreaRpx } = require("../../utils/safeArea");
const CATEGORIES = ["全部", "派对", "运动", "外出", "桌游", "电影", "杂项"];

function normalizeSubItems(items, quota) {
  const limit = Math.max(1, Math.min(999, Number(quota) || 12));
  return (Array.isArray(items) ? items : []).map(item => ({
    ...item,
    max_participants: Math.min(limit, Math.max(1, Number(item.max_participants) || 1))
  }));
}
const STEP_TRANSITION_DURATION = 320;
const SUBITEMS_LAYOUT_ANIMATION_MS = 360;
Page({
  data: {
    step: 1, form: {}, covers: [], columns: [], galleryPages: [], galleryCurrent: 0, categories: CATEGORIES, category: "全部",
    loadingCovers: true, coverError: "", coverImageStates: {}, coverSkeletonShimmerRunning: false, submitting: false, pickerVisible: false,
    pickerTarget: "start", pickerValue: "", statusBarHeight: 20, footerSafeAreaRpx: 7.69, startDateDisplay: "", endDateDisplay: "",
    leavingStep: 0, stepTransitioning: false, stepTransitionDirection: "forward", remarkComposing: false, subItemsClosing: false,
    titles: ["选择活动封面", "活动基本信息", "活动细节安排"],
    subtitles: ["都是成年人了，请减少二次元图片的使用", "取个正经名字吧，求求你了", "工作日出去玩的话别让我知道"]
  },
  onLoad() {
    const token = app.globalData.accessToken || wx.getStorageSync("accessToken");
    if (!app.globalData.isAuthenticated || !token || !["user", "admin"].includes(app.globalData.userRole)) {
      wx.navigateBack(); return;
    }
    const info = getWindowInfoCompat();
    const initialForm = { ...buildCreateForm(), startDate: "", startTime: "", endDate: "", endTime: "", maxParticipants: 16 };
    const footerSafeAreaRpx = Math.round((getBottomSafeAreaRpx() + 7.69) * 100) / 100;
    this.setData({ form: initialForm, startDateDisplay: String(initialForm.startDate || "").replace(/-/g, "/"), endDateDisplay: String(initialForm.endDate || "").replace(/-/g, "/"), statusBarHeight: info.statusBarHeight || 20, footerSafeAreaRpx });
    this.loadCovers();
  },
  onReady() {
    this.configureCategoryScroller();
  },
  configureCategoryScroller() {
    this.createSelectorQuery().select("#categoryScroller").node().exec(result => {
      const scroller = result && result[0] && result[0].node;
      if (!scroller) return;
      scroller.showScrollbar = false;
      scroller.bounces = false;
      scroller.fastDeceleration = true;
      this.categoryScroller = scroller;
    });
  },
  loadCovers() {
    this.setData({ loadingCovers: true, coverError: "" }, () => this.startCoverSkeletonShimmer());
    return activityService.listActivityCovers().then(artists => {
      const covers = (artists || []).flatMap(artist => (artist.artworks || []).map(item => ({
        id: item.id, thumbnailUrl: item.thumbnail_url, imageUrl: item.image_url,
        // Untagged formal artwork remains in All; do not invent usage categories.
        categories: Array.isArray(item.categories) ? item.categories : []
      })));
      const coverImageStates = covers.reduce((states, item) => {
        states[item.id] = this.data.coverImageStates[item.id] || "loading";
        return states;
      }, {});
      this.setData({ covers, coverImageStates, loadingCovers: false });
      this.filterCovers();
    }).catch(() => this.setData({ loadingCovers: false, coverError: "封面加载失败，点击重试" }));
  },
  categoryTap(e) { this.setData({ category: e.currentTarget.dataset.category }); this.filterCovers(); },
  filterCovers() {
    const covers = this.data.covers.filter(item => this.data.category === "全部" || item.categories.includes(this.data.category));
    const columns = [];
    for (let i = 0; i < covers.length; i += 2) {
      columns.push({ id: covers[i].id, items: covers.slice(i, i + 2) });
    }
    // One native swiper item owns two vertical columns: exactly four covers per swipe.
    // Keep an explicit stable id: an array used as wx:key is not stable in Glass Esel and
    // can cause adjacent swiper items to be reused or overlapped.
    const galleryPages = [];
    for (let i = 0; i < columns.length; i += 2) {
      const pageColumns = columns.slice(i, i + 2);
      galleryPages.push({
        id: pageColumns.map(column => column.id).join("-"),
        columns: pageColumns
      });
    }
    this.setData({
      columns,
      galleryPages,
      galleryCurrent: 0
    }, () => this.startCoverSkeletonShimmer());
  },
  startCoverSkeletonShimmer() {
    if (this._coverSkeletonShimmerTimer) return;
    const tick = () => {
      const imageStates = this.data.coverImageStates || {};
      const hasPendingCover = this.data.loadingCovers || (this.data.galleryPages || []).some(page =>
        page.columns.some(column => column.items.some(item => imageStates[item.id] === "loading"))
      );
      if (!hasPendingCover) {
        this._coverSkeletonShimmerTimer = null;
        if (this.data.coverSkeletonShimmerRunning) this.setData({ coverSkeletonShimmerRunning: false });
        return;
      }
      this.setData({ coverSkeletonShimmerRunning: !this.data.coverSkeletonShimmerRunning });
      this._coverSkeletonShimmerTimer = setTimeout(tick, this.data.coverSkeletonShimmerRunning ? 1500 : 100);
    };
    tick();
  },
  onCoverImageLoad(e) {
    this.updateCoverImageState(e.currentTarget.dataset.id, "loaded");
  },
  onCoverImageError(e) {
    this.updateCoverImageState(e.currentTarget.dataset.id, "error");
  },
  updateCoverImageState(id, state) {
    if (id === undefined || id === null || this.data.coverImageStates[id] === state) return;
    this.setData({
      coverImageStates: { ...this.data.coverImageStates, [id]: state }
    }, () => this.startCoverSkeletonShimmer());
  },
  onUnload() {
    clearTimeout(this._coverSkeletonShimmerTimer);
    clearTimeout(this._stepTransitionTimer);
    clearTimeout(this._subItemsLayoutTimer);
    this._coverSkeletonShimmerTimer = null;
    this._stepTransitionTimer = null;
  },
  onGalleryChange(e) {
    const current = Number((e.detail || {}).current);
    if (Number.isInteger(current) && current !== this.data.galleryCurrent) this.setData({ galleryCurrent: current });
  },
  chooseCover(e) { this.setData({ "form.activityCoverId": e.currentTarget.dataset.id }); },
  input(e) {
    const field = e.currentTarget.dataset.field;
    if (!["name", "remark"].includes(field)) return;
    this.setData({ [`form.${field}`]: e.detail.value });
  },
  onRemarkCompositionStart() {
    this.setData({ remarkComposing: true });
  },
  onRemarkCompositionUpdate() {
    if (!this.data.remarkComposing) this.setData({ remarkComposing: true });
  },
  onRemarkCompositionEnd() {
    this.setData({ remarkComposing: false });
  },
  onRemarkBlur(e) {
    const value = String((e.detail || {}).value || "");
    this.setData({ remarkComposing: false, "form.remark": value });
  },
  chooseLocation() {
    wx.chooseLocation({ success: location => this.setData({
      "form.locationName": location.name || location.address || "",
      "form.locationAddress": location.address || "",
      "form.locationLatitude": location.latitude, "form.locationLongitude": location.longitude
    }), fail: err => { if (!String(err.errMsg || "").includes("cancel")) wx.showToast({ title: "无法选择地点，请检查定位权限", icon: "none" }); } });
  },
  stepCapacity(e) {
    const nextMax = Math.max(1, Math.min(999, Number(this.data.form.maxParticipants) + Number(e.currentTarget.dataset.delta)));
    this.setData({
      "form.maxParticipants": nextMax,
      "form.subItems": normalizeSubItems(this.data.form.subItems, nextMax)
    });
  },
  onSubItemsChange(e) {
    const maxParticipants = Number(this.data.form.maxParticipants) || 12;
    const enabled = Boolean(e.detail.enabled);
    const closing = !enabled && Boolean(this.data.form.subItemsEnabled);
    clearTimeout(this._subItemsLayoutTimer);
    this._subItemsLayoutTimer = null;
    this.setData({
      "form.subItemsEnabled": enabled,
      "form.subItems": normalizeSubItems(e.detail.items, maxParticipants),
      subItemsClosing: closing
    });
    if (closing) {
      this._subItemsLayoutTimer = setTimeout(() => {
        this._subItemsLayoutTimer = null;
        this.setData({ subItemsClosing: false });
      }, SUBITEMS_LAYOUT_ANIMATION_MS);
    }
  },
  openPicker(e) {
    const target = e.currentTarget.dataset.target;
    this.setData({ pickerTarget: target, pickerValue: `${this.data.form[target + "Date"]} ${this.data.form[target + "Time"]}`, pickerVisible: true });
  },
  closePicker() { this.setData({ pickerVisible: false }); },
  confirmPicker(e) {
    const target = this.data.pickerTarget;
    this.setData({ [`form.${target}Date`]: e.detail.dateValue, [`form.${target}Time`]: e.detail.timeValue, [`${target}DateDisplay`]: String(e.detail.dateValue || "").replace(/-/g, "/"), pickerVisible: false });
  },
  backHome() {
    if (this.data.submitting) return;
    wx.switchTab({ url: "/pages/activity_list/activity_list" });
  },
  goToStep(nextStep) {
    const targetStep = Number(nextStep);
    const currentStep = this.data.step;
    if (this.data.stepTransitioning || ![1, 2, 3].includes(targetStep) || targetStep === currentStep) return;
    const stepTransitionDirection = targetStep > currentStep ? "forward" : "backward";
    clearTimeout(this._stepTransitionTimer);
    this.setData({ step: targetStep, leavingStep: currentStep, stepTransitioning: true, stepTransitionDirection }, () => {
      if (targetStep === 1) this.configureCategoryScroller();
      this._stepTransitionTimer = setTimeout(() => {
        this._stepTransitionTimer = null;
        this.setData({ leavingStep: 0, stepTransitioning: false });
      }, STEP_TRANSITION_DURATION);
    });
  },
  previousStep() {
    if (this.data.submitting || this.data.stepTransitioning) return;
    if (this.data.step > 1) this.goToStep(this.data.step - 1);
    else this.backHome();
  },
  next() {
    if (this.data.submitting || this.data.stepTransitioning) return;
    const form = this.data.form;
    if (this.data.step === 1) {
      if (!form.activityCoverId) return;
      this.goToStep(2); return;
    }
    if (this.data.step === 2) {
      if (!String(form.name || "").trim() || !String(form.remark || "").trim()) {
        wx.showToast({ title: "请填写活动名称和备注", icon: "none" }); return;
      }
      this.goToStep(3); return;
    }
    const result = validateActivityForm(form);
    if (!result.ok) { wx.showToast({ title: result.message, icon: "none" }); return; }
    this.setData({ submitting: true });
    activityService.createActivity(buildActivityPayload(form)).then(activity => {
      this.getOpenerEventChannel().emit("activityCreated", activity);
      wx.showToast({ title: "发布成功", icon: "success" });
      wx.navigateBack();
    }).catch(error => {
      this.setData({ submitting: false });
      wx.showToast({ title: error.message || "发布失败，请重试", icon: "none" });
    });
  }
});




