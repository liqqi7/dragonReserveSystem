const memory = require("../../services/memory");
const { getBottomSafeAreaRpx } = require("../../utils/safeArea");
const {prepareMemoryImageWindow, scheduleMemoryImageWindow, releaseMemoryImages} = require("../../services/memoryImages");

Page({
  data: {
    top: 0,
    bottom: 0,
    items: [],
    imageSources: {},
    status: "pending",
    statusLabel: "待审核",
    loading: false,
    error: "",
    busy: false,
    filterOpen: false,
    filterHeight: 264,
    statusCounts: null,
    tabs: memory.REVIEW_STATUSES,
  },
  onLoad() {
    this.setData({
      top: wx.getWindowInfo().statusBarHeight || 0,
      bottom: getBottomSafeAreaRpx(),
    });
    this.filterLayout();
  },
  onShow() {
    this._imagesHidden = false;
    this.load(true);
  },
  onHide() {
    this._countsGeneration = (this._countsGeneration || 0) + 1;
    this._imagesHidden = true;
    releaseMemoryImages(this);
    this._generation = (this._generation || 0) + 1;
    this.setData({ loading: false, filterOpen: false });
  },
  onUnload() {
    this._countsGeneration = (this._countsGeneration || 0) + 1;
    this._unloaded = true;
    releaseMemoryImages(this);
    this._generation = (this._generation || 0) + 1;
  },
  back() {
    if (this.data.filterOpen) return this.closeFilter();
    wx.navigateBack();
  },
  async load(reset = false) {
    if (this.data.loading || (!reset && this._ended)) return;
    if (reset) releaseMemoryImages(this);
    const generation = (this._generation = (this._generation || 0) + 1);
    const countsGeneration = (this._countsGeneration = (this._countsGeneration || 0) + 1);
    this.setData({ loading: true, error: "" });
    try {
      const result = await memory.list(
        { status: this.data.status, individual: true, cursor: reset ? undefined : this._cursor },
        true,
      );
      if (this._unloaded || generation !== this._generation) return;
      const items = reset ? [] : this.data.items.slice();
      const seen = new Set(items.map((item) => item.id));
      result.items.flatMap(memory.reviewCards).forEach((item) => {
        if (!seen.has(item.id)) {
          items.push(item);
          seen.add(item.id);
        }
      });
      this._cursor = result.cursor;
      this._ended = !result.cursor;
      this.setData({items, ...(result.status_counts && countsGeneration === this._countsGeneration
        ? {statusCounts: result.status_counts} : {})}, () => {
        this.measureCaptions(generation); prepareMemoryImageWindow(this);
      });
    } catch (error) {
      if (!this._unloaded && generation === this._generation)
        this.setData({ error: error.message || "审核内容加载失败" });
    } finally {
      if (!this._unloaded && generation === this._generation)
        this.setData({ loading: false });
    }
  },
  tab(e) {
    if (this._unloaded || this.data.loading || this.data.busy) return;
    const status = e.currentTarget.dataset.status;
    const entry = this.data.tabs.find(item => item.id === status);
    if (!entry) return;
    this._ended = false;
    this.setData({
      status,
      statusLabel: entry.name,
      filterOpen: false,
      items: [],
    });
    this.load(true);
  },
  chooseStatus() {
    if (this._unloaded || this.data.loading || this.data.busy) return;
    this.filterLayout();
    this.setData({filterOpen: !this.data.filterOpen});
    if (this.data.filterOpen) this.refreshCounts();
  },
  async refreshCounts() {
    const generation = (this._countsGeneration = (this._countsGeneration || 0) + 1);
    try {
      const result = await memory.send("/admin/memories/counts");
      if (!this._unloaded && !this._imagesHidden && generation === this._countsGeneration && result && result.status_counts)
        this.setData({statusCounts: result.status_counts});
    } catch (error) {
      if (!this._unloaded && !this._imagesHidden && generation === this._countsGeneration)
        wx.showToast({title: "数量加载失败，请重试", icon: "none"});
    }
  },
  closeFilter() {
    if (!this._unloaded) this.setData({filterOpen: false});
  },
  stopTap() {},
  filterLayout() {
    const info = wx.getWindowInfo();
    const unit = (info.windowWidth || 390) / 750;
    const available = Math.max(0, (info.windowHeight || 844) * 0.85 - (112 + this.data.bottom) * unit);
    this.setData({filterHeight: Math.min(this.data.tabs.length * 100 * unit, available)});
  },
  onResize() {
    this.filterLayout();
    this.setData({
      items: this.data.items.map((item) => ({
        ...item, captionMeasured: false, captionExpandable: false, expanded: false,
      })),
    }, () => this.measureCaptions(this._generation));
  },
  measureCaptions(generation) {
    if (!wx.createSelectorQuery || this._unloaded || generation !== this._generation) return;
    const query = wx.createSelectorQuery();
    query.selectAll(".review-caption-measure").boundingClientRect();
    query.selectAll(".review-caption-preview").boundingClientRect();
    query.exec((rects) => {
      if (this._unloaded || generation !== this._generation) return;
      const full = new Map(((rects && rects[0]) || []).map((rect) => [Number(rect.dataset.id), rect]));
      const collapsed = new Map(((rects && rects[1]) || []).map((rect) => [Number(rect.dataset.id), rect]));
      let changed = false;
      const items = this.data.items.map((item) => {
        const fullRect = full.get(item.id), collapsedRect = collapsed.get(item.id);
        if (item.captionMeasured || !fullRect || !collapsedRect || !collapsedRect.height) return item;
        changed = true;
        return {...item, captionMeasured: true,
          captionExpandable: fullRect.height > collapsedRect.height + 0.5};
      });
      if (changed) this.setData({items});
    });
  },
  toggleCaption(e) {
    const id = Number(e.currentTarget.dataset.id);
    this.setData({
      items: this.data.items.map((item) =>
        item.id === id && item.captionExpandable ? { ...item, expanded: !item.expanded } : item,
      ),
    });
  },
  reject(e) {
    return this.reviewPending(e, "reject");
  },
  approve(e) {
    return this.reviewPending(e, "publish");
  },
  async reviewPending(e, action) {
    if (this.data.busy || this.data.loading || this._unloaded) return;
    const item = this.data.items.find(
      (item) => item.id === Number(e.currentTarget.dataset.id),
    );
    if (!item || item.status !== "pending") return;
    this.setData({ busy: true, error: "" });
    try {
      await memory.send(`/admin/memories/${item.memory_id}/review`, "POST", {
        action,
        expected_revision: item.revision,
        selected_media_ids: [item.media_id],
        manually_reviewed: action === "publish",
        individual: true,
      });
      if (this._unloaded) return;
      getApp().globalData.memoryVersion = (getApp().globalData.memoryVersion || 0) + 1;
      wx.showToast({ title: "已处理", icon: "success" });
      await this.load(true);
    } catch (error) {
      if (!this._unloaded)
        this.setData({ error: error.message || "操作未完成，请重试" });
    } finally {
      if (!this._unloaded) this.setData({ busy: false });
    }
  },
  async resourceAction(e) {
    if (this.data.busy || this._unloaded) return;
    const item = this.data.items.find(item => item.id === Number(e.currentTarget.dataset.id));
    const action = e.currentTarget.dataset.action;
    if (!item || !((action === "retry" && item.status === "failed") ||
      (action === "republish" && item.status === "offline") ||
      (action === "offline" && item.status === "published") ||
      (action === "reopen" && item.status === "rejected"))) return;
    this._resourceAction = {item, action};
    if (action === "retry") return this.confirmResourceAction();
    const options = action === "offline" ? {title: "确认下架",
      message: "仅下架当前内容，停止公开展示，其他内容不受影响。文件保留，可以重新上架。",
      confirmText: "内容下架", variant: "danger"} : action === "reopen" ? {title: "确认重新审核",
      message: "当前内容将放回待审核列表，不会直接上架，其他内容不受影响。", confirmText: "重新审核"} : {title: "确认重新上架",
      message: "当前内容将重新公开展示，其他内容不受影响。", confirmText: "重新上架"};
    this.selectComponent("#memory-confirm").open({...options,
      cancelText: "取消", prototypeStyle: true, confirmBehavior: "emit"});
  },
  async confirmResourceAction() {
    if (this.data.busy || this._unloaded || !this._resourceAction) return;
    const {item, action} = this._resourceAction;
    this.setData({busy: true, error: ""});
    try {
      await memory.send(`/admin/memories/${item.memory_id}/review`, "POST", {
        action, expected_revision: item.revision, selected_media_ids: [item.media_id], individual: true,
      });
      if (this._unloaded) return;
      this._resourceAction = null;
      getApp().globalData.memoryVersion = (getApp().globalData.memoryVersion || 0) + 1;
      wx.showToast({title: {retry: "已开始重新压缩", republish: "已重新上架", offline: "已下架", reopen: "已放回待审核"}[action], icon: "none"});
      await this.load(true);
    } catch (error) {
      if (!this._unloaded) this.setData({error: error.message || "操作未完成，请重试"});
    } finally {
      if (!this._unloaded) this.setData({busy: false});
    }
  },
  confirmAction() {
    return this._resourceAction ? this.confirmResourceAction() : this.cleanup();
  },
  retry() {
    this.load(true);
  },
  more() {
    this.load(false);
  },
  scroll() {scheduleMemoryImageWindow(this);},
  open(e) {
    const item = this.data.items.find((item) => item.id === Number(e.currentTarget.dataset.id));
    if (!item) return;
    wx.navigateTo({
      url: `/pages/memory_detail/memory_detail?id=${item.memory_id}&admin=1&media_id=${item.media_id}`,
    });
  },
  async askCleanup(e) {
    if (this.data.busy) return;
    this._resourceAction = null;
    const item = this.data.items.find((item) => item.id === Number(e.currentTarget.dataset.id));
    if (!item) return;
    this.setData({ busy: true, error: "" });
    try {
      this._cleanup = await memory.send(
        `/admin/memories/${item.memory_id}/cleanup?media_id=${item.media_id}`,
      );
      if (this._unloaded) return;
      if (!this._cleanup.allowed)
        throw new Error(
          "当前内容不能删除；已上架内容请先下架",
        );
      this.selectComponent("#memory-confirm").open({
        title: "确认删除",
        message: `将从服务器永久删除当前资源的原件、压缩文件和缩略图，不可恢复，保留审核记录。释放预留容量约 ${(this._cleanup.bytes / 1024 / 1024).toFixed(1)}MB。`,
        cancelText: "取消",
        confirmText: "确认删除",
        variant: "danger",
        prototypeStyle: true,
        confirmBehavior: "emit",
      });
    } catch (error) {
      if (!this._unloaded)
        this.setData({ error: error.message || "清理清单加载失败" });
    } finally {
      if (!this._unloaded) this.setData({ busy: false });
    }
  },
  async cleanup() {
    if (this.data.busy || !this._cleanup) return;
    this.setData({ busy: true, error: "" });
    try {
      await memory.send(`/admin/memories/${this._cleanup.id}/cleanup`, "POST", {
        expected_revision: this._cleanup.revision,
        confirmed: true,
        media_id: this._cleanup.media_id,
      });
      if (this._unloaded) return;
      wx.showToast({ title: "已删除", icon: "success" });
      await this.load(true);
    } catch (error) {
      if (!this._unloaded)
        this.setData({ error: error.message || "清理未完成，请重试" });
    } finally {
      if (!this._unloaded) this.setData({ busy: false });
    }
  },
});
