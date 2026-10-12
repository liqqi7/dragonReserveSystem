const memory = require("../../services/memory");
const { getBottomSafeAreaRpx } = require("../../utils/safeArea");
const { logPageError } = require("../../services/logger");
const { createVideoPreloader } = require("../../services/memoryVideoPreload");
const { shared, runOnJS } = wx.worklet || {};

const timeLabel = memory.durationLabel;

Page({
  data: {
    top: 0,
    bottom: 0,
    memory: null,
    admin: false,
    index: 0,
    error: "",
    loading: false,
    selected: [],
    reviewed: false,
    busy: false,
    current: null,
    viewerMedia: [],
    zoomed: false,
    fullScreen: false,
    playing: false,
    muted: false,
    visible: false,
    videoSource: "",
    controlsVisible: true,
    seeking: false,
    seekGesture: false,
    seekForward: true,
    progress: 0,
    currentLabel: "0:00",
    durationLabel: "0:00",
    bubbleLeft: 50,
    selectionOpen: false,
    photoWidth: 0,
    photoHeight: 0,
    photoLeft: 0,
    photoTop: 0,
  },
  onLoad(options) {
    this._id = Number(options.id);
    this._admin = options.admin === "1";
    this._mediaId = this._admin ? Number(options.media_id) || null : null;
    const info = wx.getWindowInfo();
    this._windowWidth = info.windowWidth || 390;
    this._scale = shared(1);
    this._x = shared(0);
    this._y = shared(0);
    this._pinching = shared(false);
    this._pinchBase = shared({ scale: 1, x: 0, y: 0, focalX: 0, focalY: 0 });
    this._frame = shared({
      width: this._windowWidth,
      height: info.windowHeight || 844,
    });
    this._photo = shared({
      width: this._windowWidth,
      height: info.windowHeight || 844,
    });
    this.setData({
      admin: this._admin,
      top: wx.getWindowInfo().statusBarHeight || 0,
      bottom: getBottomSafeAreaRpx(),
    });
  },
  onShow() {
    this._visible = true;
    this._videoPreloader = createVideoPreloader();
    this.setData({visible: true});
    this.load();
  },
  onHide() {
    this._visible = false;
    this.setData({visible: false, playing: false});
    this.pause();
    if (this._videoPreloader) this._videoPreloader.dispose();
    this.clearTimers();
  },
  onUnload() {
    this._unloaded = true;
    this._generation = (this._generation || 0) + 1;
    this.pause();
    if (this._videoPreloader) this._videoPreloader.dispose();
    this.clearTimers();
  },
  clearTimers() {
    clearTimeout(this._controlsTimer);
    clearTimeout(this._tapTimer);
    this._tapTimer = null;
  },
  pause() {
    if (typeof wx.createVideoContext === "function")
      wx.createVideoContext("memory-video", this).pause();
  },
  async load() {
    if (this._unloaded) return;
    const previous = this.data.memory;
    const selection = this.data.selected.slice();
    const reviewed = this.data.reviewed;
    const generation = (this._generation = (this._generation || 0) + 1);
    this._reviewQueue = null;
    this._reviewCursor = null;
    this._queueLoading = false;
    this.pause();
    if (this._videoPreloader) this._videoPreloader.update(null, null);
    this.setData({
      loading: true,
      error: "",
      memory: null,
      current: null,
      viewerMedia: [],
      videoSource: "",
      fullScreen: false,
      selected: [],
      reviewed: false,
      selectionOpen: false,
    });
    try {
      const submission = await memory.detail(this._id, this._admin);
      if (this._mediaId) {
        const item = submission.media.find((item) => item.id === this._mediaId);
        if (!item || item.state === "cleaned" || item.state === "removed")
          throw new Error("这份内容已不可用，请返回审核列表刷新");
        submission.media = [item];
        submission.media_count = 1;
        submission.status = memory.mediaReviewStatus(item, submission.status);
      }
      let result = memory.presentation(submission);
      let viewerMedia = result.media;
      let index = Math.min(this.data.index, Math.max(0, viewerMedia.length - 1));
      if (this._mediaId && result.status === "pending") {
        const queue = [];
        let cursor;
        const seen = new Set();
        do {
          const batch = await memory.list({status: "pending", individual: true, cursor}, true);
          if (this._unloaded || generation !== this._generation) return;
          batch.items.flatMap(memory.reviewCards).forEach((card) => {
            if (!seen.has(card.id)) {queue.push(card); seen.add(card.id);}
          });
          cursor = batch.cursor;
        } while (cursor && !seen.has(this._mediaId));
        const currentCard = memory.reviewCards(submission)[0];
        index = queue.findIndex((card) => card.id === this._mediaId);
        if (index < 0) {queue.unshift(currentCard); index = 0;}
        else queue[index] = currentCard;
        this._reviewQueue = queue;
        this._reviewCursor = cursor;
        result = {...queue[index], id: queue[index].memory_id};
        viewerMedia = queue.map((card) => card.media[0]);
      }
      if (this._unloaded || generation !== this._generation) return;
      const unchanged = previous && previous.revision === result.revision;
      const selected = unchanged
        ? selection.filter((id) =>
            result.media.some((item) => item.id === id && item.selectable),
          )
        : [];
      result.media = result.media.map((item) => ({
        ...item,
        selected: selected.includes(item.id),
      }));
      if (this._reviewQueue) this._reviewQueue[index] = {...this._reviewQueue[index], media: result.media};
      this.setData(
        {
          memory: result,
          viewerMedia,
          index,
          selected,
          reviewed: !!unchanged && reviewed,
        },
        () => this.activate(),
      );
      if (!this._admin && typeof wx.showShareMenu === "function")
        wx.showShareMenu({ menus: ["shareAppMessage"] });
    } catch (error) {
      if (!this._unloaded && generation === this._generation)
        this.setData({ error: error.message || "记忆暂不可用" });
    } finally {
      if (!this._unloaded && generation === this._generation)
        this.setData({ loading: false });
    }
  },
  back() {
    if (this.data.busy) return;
    if (this.data.selectionOpen) {
      this.closeSelection();
      return;
    }
    if (this.data.fullScreen) {
      this.exitFullScreen();
      return;
    }
    if (this.data.zoomed) {
      this.restorePhoto();
      return;
    }
    wx.navigateBack({
      fail: () => wx.switchTab({ url: "/pages/memory/memory" }),
    });
  },
  change(e) {
    if (this.data.zoomed || this.data.fullScreen || this.data.seeking || this.data.selectionOpen || this.data.busy) return;
    this.pause();
    const index = e.detail.current;
    const items = this.data.viewerMedia.length ? this.data.viewerMedia : this.data.memory.media;
    const current = items[index];
    if (!current) return;
    this.setData({index, videoSource: this._videoPreloader ? this._videoPreloader.source(current) : current.url || ""}, () => this.activate());
  },
  activate() {
    if (this._unloaded || !this.data.memory) return;
    this.clearTimers();
    this.restorePhoto();
    const queueCard = this._reviewQueue && this._reviewQueue[this.data.index];
    const current = queueCard ? queueCard.media[0] : this.data.memory.media[this.data.index];
    if (!current) return;
    const changed = queueCard && current.id !== this._mediaId;
    if (queueCard) {
      this._id = queueCard.memory_id;
      this._mediaId = current.id;
    }
    this._currentTime = 0;
    this._duration = Number(current.duration) || 0;
    this.setData(
      {
        ...(queueCard ? {memory: {...queueCard, id: queueCard.memory_id}} : {}),
        ...(changed ? {selected: [], reviewed: false, selectionOpen: false, error: ""} : {}),
        current,
        playing: false,
        muted: false,
        videoSource: this._videoPreloader ? this._videoPreloader.source(current) : current.url || "",
        seeking: false,
        seekGesture: false,
        progress: 0,
        currentLabel: "0:00",
        durationLabel: timeLabel(this._duration),
        controlsVisible: true,
      },
      () => {
        if (current.kind !== "image" || this._unloaded) return;
        const frame = this._frame.value;
        const width = current.width || frame.width,
          height = current.height || frame.height;
        const fit = width > height ? Math.min : Math.max;
        const ratio = fit(frame.width / width, frame.height / height);
        this._photo.value = { width: width * ratio, height: height * ratio };
        this.setData({
          photoWidth: width * ratio,
          photoHeight: height * ratio,
          photoLeft: (frame.width - width * ratio) / 2,
          photoTop: (frame.height - height * ratio) / 2,
        });
        const scale = this._scale,
          x = this._x,
          y = this._y;
        this.applyAnimatedStyle("#memory-photo", () => {
          "worklet";
          return {
            transform: `translate(${x.value}px, ${y.value}px) scale(${scale.value})`,
          };
        });
      },
    );
    if (this._videoPreloader) {
      const items = this.data.viewerMedia.length ? this.data.viewerMedia : this.data.memory.media;
      this._videoPreloader.update(current, items[this.data.index + 1]);
    }
    if (queueCard && this.data.index >= this._reviewQueue.length - 2) this.moreReviewContent();
  },
  async moreReviewContent() {
    if (this._queueLoading || !this._reviewCursor || !this._reviewQueue) return;
    const generation = this._generation;
    this._queueLoading = true;
    try {
      const batch = await memory.list({status: "pending", individual: true, cursor: this._reviewCursor}, true);
      if (this._unloaded || generation !== this._generation) return;
      const seen = new Set(this._reviewQueue.map((card) => card.id));
      batch.items.flatMap(memory.reviewCards).forEach((card) => {
        if (!seen.has(card.id)) {this._reviewQueue.push(card); seen.add(card.id);}
      });
      this._reviewCursor = batch.cursor;
      const viewerMedia = this._reviewQueue.map((card) => card.media[0]);
      this.setData({viewerMedia});
      if (this._videoPreloader) this._videoPreloader.update(this.data.current, viewerMedia[this.data.index + 1]);
    } catch (error) {
      if (!this._unloaded && generation === this._generation)
        this.setData({error: error.message || "更多待审核内容加载失败，请刷新重试"});
    } finally {
      if (generation === this._generation) this._queueLoading = false;
    }
  },
  syncZoom(zoomed) {
    if (!this._unloaded && this.data.zoomed !== zoomed)
      this.setData({ zoomed });
  },
  restorePhoto() {
    this._scale.value = 1;
    this._x.value = this._y.value = 0;
    this._pinching.value = false;
    this.syncZoom(false);
  },
  photoScale(event) {
    "worklet";
    if (event.state === 1) {
      this._pinching.value = true;
      this._pinchBase.value = {
        scale: this._scale.value,
        x: this._x.value,
        y: this._y.value,
        focalX: event.focalX - this._frame.value.width / 2,
        focalY: event.focalY - this._frame.value.height / 2,
      };
      runOnJS(this.syncZoom.bind(this))(true);
    } else if (event.state === 2) {
      const base = this._pinchBase.value;
      const scale = Math.max(1, Math.min(4, base.scale * event.scale));
      const ratio = scale / base.scale;
      const focalX = event.focalX - this._frame.value.width / 2;
      const focalY = event.focalY - this._frame.value.height / 2;
      const maxX = Math.max(
        0,
        (this._photo.value.width * scale - this._frame.value.width) / 2,
      );
      const maxY = Math.max(
        0,
        (this._photo.value.height * scale - this._frame.value.height) / 2,
      );
      this._scale.value = scale;
      this._x.value = Math.max(
        -maxX,
        Math.min(maxX, focalX - (base.focalX - base.x) * ratio),
      );
      this._y.value = Math.max(
        -maxY,
        Math.min(maxY, focalY - (base.focalY - base.y) * ratio),
      );
    } else if (event.state === 3 || event.state === 4) {
      this._pinching.value = false;
      if (this._scale.value <= 1.02) {
        this._scale.value = 1;
        this._x.value = this._y.value = 0;
      }
      runOnJS(this.syncZoom.bind(this))(this._scale.value > 1);
    }
  },
  photoPanAllowed() {
    "worklet";
    return this._scale.value > 1 && !this._pinching.value;
  },
  photoPan(event) {
    "worklet";
    if (event.state !== 2 || this._pinching.value) return;
    const maxX = Math.max(
      0,
      (this._photo.value.width * this._scale.value - this._frame.value.width) /
        2,
    );
    const maxY = Math.max(
      0,
      (this._photo.value.height * this._scale.value -
        this._frame.value.height) /
        2,
    );
    this._x.value = Math.max(
      -maxX,
      Math.min(maxX, this._x.value + event.deltaX),
    );
    this._y.value = Math.max(
      -maxY,
      Math.min(maxY, this._y.value + event.deltaY),
    );
  },
  photoDoubleTap(event) {
    "worklet";
    if (event.state !== 3) return;
    if (this._scale.value > 1) {
      this._scale.value = 1;
      this._x.value = this._y.value = 0;
    } else {
      this._scale.value = 2;
      const maxX = Math.max(
        0,
        this._photo.value.width - this._frame.value.width / 2,
      );
      const maxY = Math.max(
        0,
        this._photo.value.height - this._frame.value.height / 2,
      );
      this._x.value = Math.max(
        -maxX,
        Math.min(maxX, this._frame.value.width / 2 - event.absoluteX),
      );
      this._y.value = Math.max(
        -maxY,
        Math.min(maxY, this._frame.value.height / 2 - event.absoluteY),
      );
    }
    runOnJS(this.syncZoom.bind(this))(this._scale.value > 1);
  },
  pagerAllowed() {
    "worklet";
    return this._scale.value === 1 && !this._pinching.value;
  },
  currentVideo(event) {
    return (
      !this._unloaded &&
      this._visible !== false &&
      this.data.current &&
      this.data.current.kind === "video" &&
      (!event ||
        Number(event.currentTarget.dataset.id) === this.data.current.id)
    );
  },
  videoPlay(event) {
    if (!this.currentVideo(event)) return;
    this.setData({ playing: true });
    this.scheduleHide();
  },
  videoPause(event) {
    if (!this.currentVideo(event)) return;
    clearTimeout(this._controlsTimer);
    this.setData({ playing: false, controlsVisible: true });
  },
  playVideo() {
    if (!this.currentVideo()) return;
    this.setData({ muted: false });
    wx.createVideoContext("memory-video", this).play();
  },
  toggleVideo() {
    if (this.data.playing) this.pause();
    else this.playVideo();
  },
  videoTap() {
    if (this._tapTimer) {
      clearTimeout(this._tapTimer);
      this._tapTimer = null;
      this.toggleVideo();
      return;
    }
    this._tapTimer = setTimeout(() => {
      this._tapTimer = null;
      if (!this._unloaded) {
        this.setData({ controlsVisible: !this.data.controlsVisible });
        this.scheduleHide();
      }
    }, 260);
  },
  scheduleHide() {
    clearTimeout(this._controlsTimer);
    if (
      !this.data.playing ||
      this.data.seeking ||
      this.data.selectionOpen ||
      !this._visible
    )
      return;
    this._controlsTimer = setTimeout(() => {
      if (
        !this._unloaded &&
        this._visible &&
        this.data.playing &&
        !this.data.seeking &&
        !this.data.selectionOpen
      )
        this.setData({ controlsVisible: false });
    }, 3000);
  },
  videoTime(event) {
    if (!this.currentVideo(event)) return;
    this._duration = Number(event.detail.duration) || this._duration;
    if (this.data.seeking) return;
    this._currentTime = Number(event.detail.currentTime) || 0;
    this.showTime(this._currentTime);
  },
  showTime(seconds) {
    const progress = this._duration
      ? Math.max(0, Math.min(100, (seconds / this._duration) * 100))
      : 0;
    this.setData({
      progress,
      currentLabel: timeLabel(seconds),
      durationLabel: timeLabel(this._duration),
      bubbleLeft: Math.max(10, Math.min(90, progress)),
    });
  },
  seekChanging(event) {
    if (!this._duration || !this.currentVideo()) return;
    if (!this.data.seeking) {
      this._seekWasPlaying = this.data.playing;
      this.pause();
    }
    this._seekTarget = Math.max(
      0,
      Math.min(
        this._duration,
        (Number(event.detail.value) / 1000) * this._duration,
      ),
    );
    this.setData({ seeking: true, controlsVisible: true });
    clearTimeout(this._controlsTimer);
    this.showTime(this._seekTarget);
  },
  seekChanged(event) {
    if (!this._duration || !this.currentVideo()) return;
    if (!this.data.seeking) this._seekWasPlaying = this.data.playing;
    this._seekTarget = Math.max(
      0,
      Math.min(
        this._duration,
        (Number(event.detail.value) / 1000) * this._duration,
      ),
    );
    this.finishSeek(false);
  },
  videoDrag(event) {
    "worklet";
    runOnJS(this.dragSeek.bind(this))(event.state, event.deltaX || 0);
  },
  dragSeek(state, deltaX) {
    if (!this.data.fullScreen || !this._duration || !this.currentVideo())
      return;
    if (state === 1) {
      this._seekStart = this._currentTime;
      this._seekTarget = this._currentTime;
      this._seekDelta = 0;
      this._seekWasPlaying = this.data.playing;
      this.pause();
      this.setData({ seeking: true, seekGesture: true, controlsVisible: true });
    } else if (state === 2 && this.data.seekGesture) {
      this._seekDelta += deltaX;
      const width = Math.max(this._frame.value.width, this._frame.value.height);
      this._seekTarget = Math.max(
        0,
        Math.min(
          this._duration,
          this._seekStart - (this._seekDelta / width) * this._duration,
        ),
      );
      this.setData({ seekForward: this._seekTarget >= this._seekStart });
      this.showTime(this._seekTarget);
    } else if ((state === 3 || state === 4) && this.data.seekGesture)
      this.finishSeek(state === 4);
  },
  finishSeek(cancelled) {
    const target = cancelled ? this._currentTime : this._seekTarget;
    if (!cancelled) {
      wx.createVideoContext("memory-video", this).seek(target);
      this._currentTime = target;
    }
    this.showTime(target);
    this.setData({ seeking: false, seekGesture: false });
    if (this._seekWasPlaying && this._visible)
      wx.createVideoContext("memory-video", this).play();
    this._seekWasPlaying = false;
    this.scheduleHide();
  },
  enterFullScreen() {
    if (this.currentVideo())
      wx.createVideoContext("memory-video", this).requestFullScreen({
        direction: 90,
      });
  },
  exitFullScreen() {
    if (this.currentVideo())
      wx.createVideoContext("memory-video", this).exitFullScreen();
  },
  fullScreenChanged(event) {
    if (!this.currentVideo(event)) return;
    if (this.data.seeking) this.finishSeek(true);
    this.setData({
      fullScreen: !!event.detail.fullScreen,
      controlsVisible: true,
    });
    this.scheduleHide();
  },
  stopTap() {},
  beginReview() {
    if (
      this.data.busy ||
      !this.data.memory ||
      this.data.memory.status !== "pending"
    )
      return;
    this.pause();
    if (this._mediaId) {
      this.setData({selected: [this._mediaId], reviewed: false,
        "memory.media": this.data.memory.media.map((item) => ({...item, selected: true}))});
    }
    this.setData({ selectionOpen: true, controlsVisible: true });
    this.scheduleHide();
  },
  closeSelection() {
    if (this.data.busy) return;
    this.setData({ selectionOpen: false });
    this.scheduleHide();
  },
  toggleSelection() {
    this.setData({
      selectionOpen: !this.data.selectionOpen,
      controlsVisible: true,
    });
    this.scheduleHide();
  },
  mediaError(event) {
    if (this._unloaded) return;
    const id = Number(event && event.currentTarget && event.currentTarget.dataset.id);
    if (id && this.data.current && id !== this.data.current.id) return;
    const detail = (event && event.detail) || {};
    logPageError("memory_media_playback", {errMsg: detail.errMsg || "媒体加载失败", errno: detail.errCode},
      {mediaId: this.data.current && this.data.current.id, kind: this.data.current && this.data.current.kind});
    this.setData({error: "媒体加载失败，请刷新重试", playing: false, controlsVisible: true});
  },
  selectMedia(e) {
    const id = Number(e.currentTarget.dataset.id);
    const item = this.data.memory.media.find((value) => value.id === id);
    if (!item || !item.selectable || this.data.busy) return;
    const selected = this.data.selected.includes(id)
      ? this.data.selected.filter((value) => value !== id)
      : this.data.selected.concat(id);
    const media = this.data.memory.media.map((value) => ({
      ...value,
      selected: selected.includes(value.id),
    }));
    this.setData({ selected, reviewed: false, "memory.media": media });
  },
  reviewed(e) {
    this.setData({ reviewed: e.detail.value.includes("reviewed") });
  },
  askReview(e) {
    if (this.data.busy || !this.data.memory) return;
    const action = e.currentTarget.dataset.action;
    if (
      action === "publish" &&
      (!this.data.selected.length || !this.data.reviewed)
    )
      return;
    this._action = action;
    const options = {
      publish: {
        title: "确认发布",
        message: this._mediaId ? "仅发布当前这份内容，其他内容不受影响。" : `发布选中的 ${this.data.selected.length} 项内容，其余素材不会公开。`,
        confirmText: "确认发布",
      },
      reject: {
        title: "确认不通过",
        message: this._mediaId ? "这份内容不会公开，其他内容不受影响。素材保留，由管理员手动决定是否清理。" : "投稿不会公开，素材保留，由管理员手动决定是否清理。",
        confirmText: "不通过",
        variant: "danger",
      },
      offline: {
        title: "确认下线",
        message: "下线后将停止公开展示，素材不会自动删除。",
        confirmText: "确认下线",
        variant: "danger",
      },
    };
    this.selectComponent("#memory-confirm").open({
      ...options[action],
      cancelText: "取消",
      prototypeStyle: true,
      confirmBehavior: "emit",
    });
  },
  async confirmReview() {
    if (this.data.busy) return;
    this.setData({ busy: true, error: "" });
    try {
      await memory.send(`/admin/memories/${this._id}/review`, "POST", {
        action: this._action,
        expected_revision: this.data.memory.revision,
        selected_media_ids: this._mediaId ? [this._mediaId] : this.data.selected,
        manually_reviewed: this.data.reviewed,
        individual: !!this._mediaId,
      });
      if (this._unloaded) return;
      getApp().globalData.memoryVersion =
        (getApp().globalData.memoryVersion || 0) + 1;
      wx.showToast({ title: "已处理", icon: "success" });
      wx.navigateBack();
    } catch (error) {
      if (!this._unloaded)
        this.setData({ error: error.message || "操作未完成，请刷新后重试" });
    } finally {
      if (!this._unloaded) this.setData({ busy: false });
    }
  },
  onShareAppMessage() {
    if (this._admin || !this.data.memory)
      return { title: "记忆", path: "/pages/memory/memory" };
    return {
      title: this.data.memory.caption || "活动记忆",
      path: `/pages/memory_detail/memory_detail?id=${this._id}`,
    };
  },
});
