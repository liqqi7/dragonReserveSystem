const memory = require("../../services/memory");
const { getBottomSafeAreaRpx } = require("../../utils/safeArea");

Page({
  data: {
    top: 0,
    bottom: 0,
    items: [],
    status: "pending",
    statusLabel: "待审核",
    loading: false,
    error: "",
    busy: false,
    tabs: [
      { id: "pending", name: "待审核" },
      { id: "processing", name: "处理中" },
      { id: "published", name: "已发布" },
      { id: "rejected", name: "未通过" },
      { id: "offline", name: "已下线" },
      { id: "failed", name: "失败" },
      { id: "draft", name: "草稿" },
    ],
  },
  onLoad() {
    this.setData({
      top: wx.getWindowInfo().statusBarHeight || 0,
      bottom: getBottomSafeAreaRpx(),
    });
  },
  onShow() {
    this.load(true);
  },
  onHide() {
    this._generation = (this._generation || 0) + 1;
    this.setData({ loading: false });
  },
  onUnload() {
    this._unloaded = true;
    this._generation = (this._generation || 0) + 1;
  },
  back() {
    wx.navigateBack();
  },
  async load(reset = false) {
    if (this.data.loading || (!reset && this._ended)) return;
    const generation = (this._generation = (this._generation || 0) + 1);
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
      this.setData({ items }, () => this.measureCaptions(generation));
    } catch (error) {
      if (!this._unloaded && generation === this._generation)
        this.setData({ error: error.message || "审核内容加载失败" });
    } finally {
      if (!this._unloaded && generation === this._generation)
        this.setData({ loading: false });
    }
  },
  tab(e) {
    if (this.data.loading || this.data.busy) return;
    this._ended = false;
    const status = e.currentTarget.dataset.status;
    this.setData({
      status,
      statusLabel: this.data.tabs.find((item) => item.id === status).name,
      items: [],
    });
    this.load(true);
  },
  chooseStatus() {
    if (this.data.loading || this.data.busy) return;
    wx.showActionSheet({
      itemList: this.data.tabs.map((item) => item.name),
      success: ({ tapIndex }) => {
        if (!this._unloaded && this.data.tabs[tapIndex])
          this.tab({
            currentTarget: { dataset: { status: this.data.tabs[tapIndex].id } },
          });
      },
    });
  },
  onResize() {
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
  askReject(e) {
    if (this.data.busy) return;
    this._reject = this.data.items.find(
      (item) => item.id === Number(e.currentTarget.dataset.id),
    );
    if (!this._reject) return;
    this._action = "reject";
    this.selectComponent("#memory-confirm").open({
      title: "确认不通过",
      message: "这份内容不会公开，其他内容不受影响。素材保留，由管理员手动决定是否清理。",
      cancelText: "取消",
      confirmText: "不通过",
      variant: "danger",
      prototypeStyle: true,
      confirmBehavior: "emit",
    });
  },
  async confirmAction() {
    if (this._action !== "reject") return this.cleanup();
    if (this.data.busy || !this._reject) return;
    this.setData({ busy: true, error: "" });
    try {
      await memory.send(`/admin/memories/${this._reject.memory_id}/review`, "POST", {
        action: "reject",
        expected_revision: this._reject.revision,
        selected_media_ids: [this._reject.media_id],
        manually_reviewed: false,
        individual: true,
      });
      if (this._unloaded) return;
      wx.showToast({ title: "已处理", icon: "success" });
      await this.load(true);
    } catch (error) {
      if (!this._unloaded)
        this.setData({ error: error.message || "操作未完成，请重试" });
    } finally {
      if (!this._unloaded) this.setData({ busy: false });
    }
  },
  retry() {
    this.load(true);
  },
  more() {
    this.load(false);
  },
  open(e) {
    const item = this.data.items.find((item) => item.id === Number(e.currentTarget.dataset.id));
    if (!item) return;
    wx.navigateTo({
      url: `/pages/memory_detail/memory_detail?id=${item.memory_id}&admin=1&media_id=${item.media_id}`,
    });
  },
  async askCleanup(e) {
    if (this.data.busy) return;
    const item = this.data.items.find((item) => item.id === Number(e.currentTarget.dataset.id));
    if (!item) return;
    this._action = "cleanup";
    this.setData({ busy: true, error: "" });
    try {
      this._cleanup = await memory.send(
        `/admin/memories/${item.memory_id}/cleanup?media_id=${item.media_id}`,
      );
      if (this._unloaded) return;
      if (!this._cleanup.allowed)
        throw new Error(
          "当前内容不能清理；已发布内容请先下线，未过期草稿暂不清理",
        );
      this.selectComponent("#memory-confirm").open({
        title: "确认清理素材",
        message: `将永久删除这条投稿的媒体文件，保留审核记录。预留容量约 ${(this._cleanup.bytes / 1024 / 1024).toFixed(1)}MB。`,
        cancelText: "取消",
        confirmText: "确认清理",
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
      wx.showToast({ title: "已清理", icon: "success" });
      await this.load(true);
    } catch (error) {
      if (!this._unloaded)
        this.setData({ error: error.message || "清理未完成，请重试" });
    } finally {
      if (!this._unloaded) this.setData({ busy: false });
    }
  },
});
