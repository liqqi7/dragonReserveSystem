const memory = require("../../services/memory");
const { getBottomSafeAreaRpx } = require("../../utils/safeArea");
const { logPageError } = require("../../services/logger");
const { createVideoPreloader } = require("../../services/memoryVideoPreload");
const {createMediaSession} = require("../../services/memoryMediaSession");
const {prepareMemoryImages, releaseMemoryImages} = require("../../services/memoryImages");
const { shared, runOnJS } = wx.worklet || {};

const timeLabel = memory.durationLabel;

function slideInfo(submission) {
  const {author, caption = "", activity_name = "", activityTime = "", location_name = "", status = "", statusLabel = ""} = submission;
  return {author, caption, activity_name, activityTime, location_name, status, statusLabel};
}

function doubleTapPhoto(scale, photo, frame, x, y) {
  "worklet";
  if (scale > 1) return {scale: 1, x: 0, y: 0};
  const maxX = Math.max(0, photo.width - frame.width / 2);
  const maxY = Math.max(0, photo.height - frame.height / 2);
  return {scale: 2,
    x: Math.max(-maxX, Math.min(maxX, frame.width / 2 - x)),
    y: Math.max(-maxY, Math.min(maxY, frame.height / 2 - y))};
}

Page({
  data: {
    top: 0,
    bottom: 0,
    memory: null,
    admin: false,
    index: 0,
    error: "",
    loading: false,
    reviewComplete: false,
    selected: [],
    reviewed: false,
    busy: false,
    current: null,
    viewerMedia: [],
    viewerInfo: [],
    imageSources: {},
    imageLoading: false,
    zoomed: false,
    fullScreen: false,
    playing: false,
    muted: false,
    visible: false,
    videoSource: "",
    videoPoster: "",
    videoMounted: false,
    videoLoading: false,
    videoInitialTime: 0,
    videoGeneration: 0,
    pausedByUser: false,
    controlsVisible: true,
    seeking: false,
    seekGesture: false,
    seekForward: true,
    progress: 0,
    progressVisible: false,
    seekCurrentLabel: "00:00",
    seekDurationLabel: "00:00",
    currentLabel: "0:00",
    durationLabel: "0:00",
    bubbleLeft: 50,
    selectionOpen: false,
    photoWidth: 0,
    photoHeight: 0,
    photoLeft: 0,
    photoTop: 0,
    photoTransformStyle: "",
  },
  onLoad(options) {
    this._id = Number(options.id);
    this._admin = options.admin === "1";
    this._mediaId = this._admin ? Number(options.media_id) || null : null;
    this._initialMediaId = !this._admin ? Number(options.media_id) || null : null;
    const info = wx.getWindowInfo();
    this._windowWidth = info.windowWidth || 390;
    this._scale = shared(1);
    this._x = shared(0);
    this._y = shared(0);
    this._pinching = shared(false);
    this._portraitDragging = shared(false);
    this._portraitGestureGeneration = shared(0);
    this._seekBounds = shared({top: 0, bottom: 0});
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
    this._imagesHidden = false;
    this._visible = true;
    this._mediaSession = createMediaSession();
    this._videoPreloader = createVideoPreloader(this._mediaSession);
    this.setData({visible: true});
    this.onResize();
    this.load();
  },
  onResize() {
    if (this._unloaded || this.data.fullScreen) return;
    if (this.data.seeking) this.finishSeek(true);
    clearTimeout(this._progressTimer);
    this._portraitDragging.value = false;
    const info = wx.getWindowInfo();
    this._windowWidth = info.windowWidth || 390;
    this._frame.value = {width: this._windowWidth, height: info.windowHeight || 844};
    this.setData({top: info.statusBarHeight || 0, bottom: getBottomSafeAreaRpx(), progressVisible: false}, () => {
      this.updateSeekBounds();
      if (this.data.current && this.data.current.kind === "image") {
        this.restorePhoto();
        this.fitPhoto(this.data.current);
      }
    });
  },
  onHide() {
    if (this.data.current?.kind === "video") this._resumeState = {
      mediaId: this.data.current.id, time: this._currentTime || 0,
      pausedByUser: this.data.pausedByUser || this.data.selectionOpen,
    };
    this._generation = (this._generation || 0) + 1;
    this._imagesHidden = true;
    releaseMemoryImages(this);
    this._visible = false;
    this._portraitTouch = null;
    this._photoTap = null;
    this._videoGeneration = (this._videoGeneration || 0) + 1;
    this.pause();
    const preloader = this._videoPreloader;
    const session = this._mediaSession;
    this._portraitDragging.value = false;
    this.setData({visible: false, playing: false, videoMounted: false, videoLoading: false,
      seeking: false, seekGesture: false, progressVisible: false},
      () => {if (preloader) preloader.dispose(); if (session) session.dispose();});
    this.clearTimers();
  },
  onUnload() {
    this._unloaded = true;
    this._portraitTouch = null;
    this._photoTap = null;
    releaseMemoryImages(this);
    this._generation = (this._generation || 0) + 1;
    this._videoGeneration = (this._videoGeneration || 0) + 1;
    this.pause();
    if (this._videoPreloader) this._videoPreloader.dispose();
    if (this._mediaSession) this._mediaSession.dispose();
    this.clearTimers();
  },
  clearTimers() {
    clearTimeout(this._controlsTimer);
    clearTimeout(this._progressTimer);
  },
  pause() {
    this._playRequested = false;
    if (typeof wx.createVideoContext === "function")
      wx.createVideoContext("memory-video", this).pause();
  },
  async load() {
    if (this._unloaded) return;
    if (this._reviewAfterAction) return this.nextReview();
    releaseMemoryImages(this);
    const previous = this.data.memory;
    const selection = this.data.selected.slice();
    const reviewed = this.data.reviewed;
    const generation = (this._generation = (this._generation || 0) + 1);
    this._reviewQueue = null;
    this._reviewCursor = null;
    this._queueLoading = false;
    this.pause();
    this._videoGeneration = (this._videoGeneration || 0) + 1;
    this.setData({
      loading: true,
      reviewComplete: false,
      error: "",
      memory: null,
      current: null,
      viewerMedia: [],
      viewerInfo: [],
      videoSource: "",
      videoMounted: false,
      videoLoading: false,
      fullScreen: false,
      selected: [],
      reviewed: false,
      selectionOpen: false,
    }, () => {if (this._videoPreloader) this._videoPreloader.update(null, null);});
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
      if (this._initialMediaId) {
        index = viewerMedia.findIndex(item => item.id === this._initialMediaId);
        if (index < 0) throw new Error("这份内容已不可用或已下架");
      }
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
      if (this._resumeState) {
        const resumed = viewerMedia.findIndex(item => item.id === this._resumeState.mediaId);
        if (resumed < 0) throw new Error("这份内容已不可用或已下架");
        index = resumed;
      }
      this._initialMediaId = null;
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
          viewerInfo: this._reviewQueue ? this._reviewQueue.map(slideInfo) : viewerMedia.map(() => slideInfo(result)),
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
    this._videoGeneration = (this._videoGeneration || 0) + 1;
    this.setData({index, videoMounted: false, videoSource: ""}, () => this.activate());
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
    const resume = this._resumeState?.mediaId === current.id ? this._resumeState : null;
    this._resumeState = null;
    this._currentTime = resume ? Math.max(0, Math.min(Number(resume.time) || 0,
      Number(current.duration) > 0 ? Number(current.duration) - 0.05 : Infinity)) : 0;
    this._duration = Number(current.duration) || 0;
    this._seekWasPlaying = false;
    this._seekPortrait = false;
    this._portraitTouch = null;
    this._portraitDragging.value = false;
    this.updateSeekBounds();
    const videoGeneration = this._videoGeneration = (this._videoGeneration || 0) + 1;
    this._restoreVideoPosition = {generation: videoGeneration, time: this._currentTime};
    this._videoBuffering = current.kind === "video";
    if (this._mediaSession) this._mediaSession.setSpeculation(current.kind !== "video");
    this._videoRetries = 0;
    this.setData(
      {
        ...(queueCard ? {memory: {...queueCard, id: queueCard.memory_id}} : {}),
        ...(changed ? {selected: [], reviewed: false, selectionOpen: false, error: ""} : {}),
        current,
        playing: false,
        muted: false,
        error: "",
        videoSource: "",
        videoPoster: /^https:\/\//i.test(current.thumbnail_url || "") ? current.thumbnail_url : "",
        videoMounted: false,
        videoLoading: current.kind === "video" && !!current.url,
        videoGeneration,
        videoInitialTime: this._currentTime,
        pausedByUser: !!resume?.pausedByUser,
        seeking: false,
        seekGesture: false,
        progress: this._duration ? this._currentTime / this._duration * 100 : 0,
        progressVisible: false,
        seekCurrentLabel: "00:00",
        seekDurationLabel: timeLabel(this._duration).padStart(5, "0"),
        currentLabel: timeLabel(this._currentTime),
        durationLabel: timeLabel(this._duration),
        controlsVisible: true,
      },
      () => {
        if (!this.videoAttemptActive(videoGeneration, current.id)) return;
        if (current.kind === "video" && current.url) {
          this.loadVideo(current, videoGeneration);
        } else this.updateVideoPreload();
        if (current.kind === "image") this.fitPhoto(current);
      },
    );
    this.preparePreviewImages();
    if (queueCard && this.data.index >= this._reviewQueue.length - 2) this.moreReviewContent();
  },
  updateSeekBounds() {
    const unit = this._windowWidth / 390;
    const safe = this.data.bottom * this._windowWidth / 750;
    this._seekBounds.value = {
      top: this._frame.value.height - safe - (this._admin ? 176 : 148) * unit,
      bottom: this._frame.value.height - safe - (this._admin ? 74 : 2) * unit,
    };
  },
  preparePreviewImages() {
    const items = this.data.viewerMedia.length ? this.data.viewerMedia : this.data.memory && this.data.memory.media || [];
    const adjacent = [items[this.data.index], items[this.data.index + 1], items[this.data.index - 1]];
    const preload = adjacent.filter(item => item && item.kind === "image").map(item => item.url).filter(Boolean);
    prepareMemoryImages(this, [...preload, ...adjacent.filter(Boolean).map(item => item.thumbnail_url)], {preload, neighbours: adjacent});
  },
  fitPhoto(current) {
    if (this._unloaded) return;
    const frame = this._frame.value;
    const width = current.width || frame.width, height = current.height || frame.height;
    const ratio = Math.min(frame.width / width, frame.height / height);
    this._photo.value = {width: width * ratio, height: height * ratio};
    this.setData({photoWidth: width * ratio, photoHeight: height * ratio,
      photoLeft: (frame.width - width * ratio) / 2, photoTop: (frame.height - height * ratio) / 2});
    const scale = this._scale, x = this._x, y = this._y;
    if (this.renderer === "webview") return;
    this.applyAnimatedStyle("#memory-photo", () => {
      "worklet";
      return {transform: `translate(${x.value}px, ${y.value}px) scale(${scale.value})`};
    });
  },
  videoAttemptActive(generation, id) {
    return !this._unloaded && this._visible !== false && generation === this._videoGeneration &&
      this.data.current && this.data.current.id === id;
  },
  updateVideoPreload(allowPrefetch = !this._videoBuffering && (!this.data.current || this.data.current.kind !== "video" || this.data.playing)) {
    if (!this._videoPreloader || !this.data.memory) return;
    const items = this.data.viewerMedia.length ? this.data.viewerMedia : this.data.memory.media;
    this._videoPreloader.update(this.data.current, items[this.data.index + 1], items[this.data.index - 1], allowPrefetch);
  },
  async loadVideo(current, generation) {
    try {
      let source = this._videoPreloader ? this._videoPreloader.source(current) : current.url;
      // Network playback is progressive. A full transfer is only an error-recovery fallback.
      if (this._videoPreloader && this._videoRetries) source = await this._videoPreloader.ensure(current);
      if (!this.videoAttemptActive(generation, current.id)) return;
      this.updateVideoPreload(false);
      this.setData({videoSource: source, videoMounted: true, videoLoading: false}, () => {
        if (this.videoAttemptActive(generation, current.id)) this.startVideo();
      });
    } catch (error) {
      if (!this.videoAttemptActive(generation, current.id) || error.cancelled) return;
      this.mediaError({currentTarget: {dataset: {id: current.id, generation}}, detail: {errMsg: error.message}});
    }
  },
  startVideo(event) {
    if (!this.currentVideo(event) || !this.data.videoMounted || this.data.pausedByUser ||
        this.data.selectionOpen || this.data.seeking || this.data.error) return;
    this._playRequested = true;
    wx.createVideoContext("memory-video", this).play();
  },
  videoMetadata(event) {
    if (!this.currentVideo(event)) return;
    const restore = this._restoreVideoPosition;
    if (restore?.generation === this._videoGeneration) {
      this._restoreVideoPosition = null;
      if (restore.time > 0) wx.createVideoContext("memory-video", this).seek(restore.time);
    }
    this.startVideo(event);
  },
  videoWaiting(event) {
    if (!this.currentVideo(event)) return;
    this._videoBuffering = true;
    this.updateVideoPreload(false);
  },
  async retryVideo(current) {
    const generation = this._videoGeneration = (this._videoGeneration || 0) + 1;
    this._videoRetries++;
    this._restoreVideoPosition = {generation, time: this._currentTime || 0};
    this._videoBuffering = true;
    this.setData({videoMounted: false, videoLoading: true, playing: false, fullScreen: false,
      seeking: false, seekGesture: false, error: "", videoGeneration: generation,
      videoInitialTime: this._currentTime || 0}, async () => {
      if (!this.videoAttemptActive(generation, current.id)) return;
      if (this._videoPreloader) this._videoPreloader.invalidate(current);
      try {
        const fresh = await memory.detail(this._id, this._admin);
        if (!this.videoAttemptActive(generation, current.id)) return;
        const item = fresh.media.find(item => item.id === current.id);
        if (!item || !item.url) throw new Error("视频暂不可用");
        const renewed = {...current, url: item.url, thumbnail_url: item.thumbnail_url};
        const viewerMedia = this.data.viewerMedia.map(item => item.id === current.id ? renewed : item);
        const media = this.data.memory.media.map(item => item.id === current.id ? renewed : item);
        if (this._reviewQueue) {
          const card = this._reviewQueue[this.data.index];
          this._reviewQueue[this.data.index] = {...card, media};
        }
        this.setData({current: renewed, viewerMedia, "memory.media": media,
          videoPoster: /^https:\/\//i.test(renewed.thumbnail_url || "") ? renewed.thumbnail_url : ""});
        await this.loadVideo(renewed, generation);
      } catch (error) {
        if (this.videoAttemptActive(generation, current.id))
          this.setData({error: "媒体加载失败，请刷新重试", playing: false, videoLoading: false, controlsVisible: true});
      }
    });
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
      this.setData({viewerMedia, viewerInfo: this._reviewQueue.map(slideInfo)});
      this.preparePreviewImages();
      this.updateVideoPreload();
    } catch (error) {
      if (!this._unloaded && generation === this._generation)
        this.setData({error: error.message || "更多待审核内容加载失败，请刷新重试"});
    } finally {
      if (generation === this._generation) this._queueLoading = false;
    }
  },
  syncZoom(zoomed) {
    if (this._unloaded) return;
    const patch = {};
    if (this.data.zoomed !== zoomed) patch.zoomed = zoomed;
    if (this.renderer === "webview") {
      const style = zoomed ? `transform:translate(${this._x.value}px, ${this._y.value}px) scale(${this._scale.value});` : "";
      if (this.data.photoTransformStyle !== style) patch.photoTransformStyle = style;
    }
    if (Object.keys(patch).length) this.setData(patch);
  },
  restorePhoto() {
    this._photoTap = null;
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
    const next = doubleTapPhoto(this._scale.value, this._photo.value, this._frame.value, event.absoluteX, event.absoluteY);
    this._scale.value = next.scale;
    this._x.value = next.x;
    this._y.value = next.y;
    runOnJS(this.syncZoom.bind(this))(this._scale.value > 1);
  },
  photoTap(event) {
    const current = this.data.current;
    if (this.renderer === "skyline" || this._unloaded || this._visible === false ||
        !current || current.kind !== "image" || this.data.fullScreen || this.data.busy ||
        this.data.selectionOpen || this.data.loading || this.data.imageLoading || this.data.error) return;
    const id = event.currentTarget && event.currentTarget.dataset && event.currentTarget.dataset.id;
    if (id != null && Number(id) !== current.id) return;
    const touch = event.changedTouches && event.changedTouches[0];
    const detail = event.detail || {};
    const x = touch && Number.isFinite(touch.clientX) ? touch.clientX : Number.isFinite(detail.x) ? detail.x : this._frame.value.width / 2;
    const y = touch && Number.isFinite(touch.clientY) ? touch.clientY : Number.isFinite(detail.y) ? detail.y : this._frame.value.height / 2;
    const time = Number.isFinite(event.timeStamp) ? event.timeStamp : Date.now();
    const previous = this._photoTap;
    this._photoTap = {id: current.id, x, y, time};
    if (!previous || previous.id !== current.id || time < previous.time || time - previous.time > 300 ||
        Math.abs(x - previous.x) > 24 || Math.abs(y - previous.y) > 24) return;
    this._photoTap = null;
    const next = doubleTapPhoto(this._scale.value, this._photo.value, this._frame.value, x, y);
    this._scale.value = next.scale;
    this._x.value = next.x;
    this._y.value = next.y;
    this.syncZoom(next.scale > 1);
  },
  pagerAllowed() {
    "worklet";
    return this._scale.value === 1 && !this._pinching.value && !this._portraitDragging.value;
  },
  portraitSeekAllowed(event) {
    "worklet";
    return this.data.current && this.data.current.kind === "video" && this.data.visible &&
      !this.data.fullScreen && !this.data.videoLoading && !this.data.error &&
      !this.data.selectionOpen && !this.data.busy &&
      event.absoluteY >= this._seekBounds.value.top && event.absoluteY <= this._seekBounds.value.bottom;
  },
  portraitVideoDrag(event) {
    "worklet";
    if (event.state === 1) {
      this._portraitDragging.value = true;
      this._portraitGestureGeneration.value = this.data.videoGeneration;
    }
    else if (event.state === 3 || event.state === 4) this._portraitDragging.value = false;
    runOnJS(this.dragSeek.bind(this))(event.state, event.deltaX || 0, true, this._portraitGestureGeneration.value);
  },
  portraitTouchStart(event) {
    const mediaId = event.currentTarget && event.currentTarget.dataset && event.currentTarget.dataset.mediaId;
    if (mediaId != null && (!this.data.current || Number(mediaId) !== this.data.current.id)) return;
    if (this.renderer === "skyline" || !this.currentVideo() || !this._visible || this.data.fullScreen ||
        this.data.busy || this.data.selectionOpen || this.data.videoLoading || this.data.error) return;
    const touch = event.touches && event.touches.length === 1 && event.touches[0];
    if (!touch) return this.portraitTouchCancel();
    this._portraitTouch = {x: touch.clientX, y: touch.clientY, lastX: touch.clientX,
      identifier: touch.identifier, generation: this._videoGeneration, horizontal: null};
  },
  portraitTouchMove(event) {
    const gesture = this._portraitTouch;
    const points = event.touches && event.touches.length ? event.touches : event.changedTouches;
    if (!gesture || !points || !points.length) return;
    if (points.length > 1) return this.portraitTouchCancel();
    const touch = points[0];
    if (touch.identifier !== gesture.identifier || gesture.generation !== this._videoGeneration) return;
    const dx = touch.clientX - gesture.x, dy = touch.clientY - gesture.y;
    if (gesture.horizontal === null && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
      gesture.horizontal = Math.abs(dx) > Math.abs(dy);
      if (gesture.horizontal) {
        this._portraitDragging.value = true;
        this.dragSeek(1, 0, true, gesture.generation);
      }
    }
    if (!gesture.horizontal) return;
    this.dragSeek(2, touch.clientX - gesture.lastX, true, gesture.generation);
    gesture.lastX = touch.clientX;
  },
  portraitTouchEnd(event) {
    if (event) this.portraitTouchMove(event);
    const gesture = this._portraitTouch;
    if (!gesture) return;
    this._portraitTouch = null;
    this._portraitDragging.value = false;
    if (gesture && gesture.horizontal) this.dragSeek(3, 0, true, gesture.generation);
  },
  portraitTouchCancel() {
    const gesture = this._portraitTouch;
    if (!gesture) return;
    this._portraitTouch = null;
    this._portraitDragging.value = false;
    if (gesture && gesture.horizontal) this.dragSeek(4, 0, true, gesture.generation);
  },
  currentVideo(event) {
    return (
      !this._unloaded &&
      this._visible !== false &&
      this.data.current &&
      this.data.current.kind === "video" &&
      (!event ||
        (Number(event.currentTarget.dataset.id) === this.data.current.id &&
          (event.currentTarget.dataset.generation === undefined ||
            Number(event.currentTarget.dataset.generation) === this._videoGeneration)))
    );
  },
  videoPlay(event) {
    if (!this.currentVideo(event)) return;
    if (this.data.pausedByUser || this.data.selectionOpen || this.data.seeking) {this.pause(); return;}
    this.setData({ playing: true });
    this.updateVideoPreload();
    this.scheduleHide();
  },
  videoPause(event) {
    if (!this.currentVideo(event)) return;
    this._playRequested = false;
    clearTimeout(this._controlsTimer);
    this.setData({ playing: false, controlsVisible: true });
  },
  playVideo() {
    if (!this.currentVideo()) return;
    this.setData({ muted: false, pausedByUser: false }, () => {
      if (this.currentVideo() && !this.data.videoLoading && !this.data.selectionOpen) {
        this._playRequested = true;
        wx.createVideoContext("memory-video", this).play();
      }
    });
  },
  toggleVideo() {
    if (!this.currentVideo() || this.data.selectionOpen || this.data.seeking) return;
    if (this.data.playing || this._playRequested || (this.data.videoLoading && !this.data.pausedByUser)) {
      clearTimeout(this._controlsTimer);
      this.setData({pausedByUser: true, playing: false, controlsVisible: true});
      this.pause();
    }
    else this.playVideo();
  },
  videoTap() {
    this.toggleVideo();
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
    const time = Number(event.detail.currentTime) || 0;
    if (this._videoBuffering && this.data.playing && time !== this._currentTime) {
      this._videoBuffering = false; this.updateVideoPreload(true);
    }
    this._currentTime = time;
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
      seekCurrentLabel: timeLabel(seconds).padStart(5, "0"),
      seekDurationLabel: timeLabel(this._duration).padStart(5, "0"),
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
  dragSeek(state, deltaX, portrait = false, generation) {
    if ((generation !== undefined && generation !== this._videoGeneration) ||
        (portrait ? this.data.fullScreen : !this.data.fullScreen) || !this._duration ||
        !this.currentVideo() || this.data.busy || this.data.selectionOpen || this.data.videoLoading || this.data.error)
      return;
    if (state === 1) {
      clearTimeout(this._progressTimer);
      clearTimeout(this._controlsTimer);
      this._seekStart = this._currentTime;
      this._seekTarget = this._currentTime;
      this._seekDelta = 0;
      this._seekWasPlaying = this.data.playing && !this.data.pausedByUser;
      this._seekPortrait = portrait;
      this.pause();
      this.setData({ seeking: true, seekGesture: true, controlsVisible: true, progressVisible: false });
    } else if (state === 2 && this.data.seekGesture) {
      this._seekDelta += deltaX;
      const width = portrait ? this._frame.value.width * 358 / 390 : Math.max(this._frame.value.width, this._frame.value.height);
      this._seekTarget = Math.max(
        0,
        Math.min(
          this._duration,
          this._seekStart + (portrait ? 1 : -1) * (this._seekDelta / width) * this._duration,
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
    if (this._seekPortrait) this.showPortraitProgress();
    this._seekPortrait = false;
    if (this._seekWasPlaying && this._visible)
      wx.createVideoContext("memory-video", this).play();
    this._seekWasPlaying = false;
    this.scheduleHide();
  },
  showPortraitProgress() {
    clearTimeout(this._progressTimer);
    this.setData({progressVisible: true});
    const generation = this._videoGeneration;
    const cycle = this._progressCycle = (this._progressCycle || 0) + 1;
    this._progressTimer = setTimeout(() => {
      if (!this._unloaded && this._visible && generation === this._videoGeneration &&
          cycle === this._progressCycle && !this.data.fullScreen && !this.data.seeking)
        this.setData({progressVisible: false});
    }, 3000);
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
    clearTimeout(this._progressTimer);
    this._portraitDragging.value = false;
    this.setData({
      fullScreen: !!event.detail.fullScreen,
      controlsVisible: true,
      progressVisible: false,
    });
    this.scheduleHide();
  },
  stopTap() {},
  approve() {
    if (this.data.busy || this._unloaded || !this._admin || !this.data.memory ||
        this.data.memory.status !== "pending") return;
    if (!this._mediaId) return this.beginReview();
    if (!this.data.current || this.data.current.id !== this._mediaId || !this.data.current.selectable) return;
    this.pause();
    this._action = "publish";
    this.setData({selected: [this._mediaId], reviewed: true});
    return this.confirmReview();
  },
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
    if (this.data.current && this.data.current.kind === "video" && !this.currentVideo(event)) return;
    if (this.data.current && this.data.current.kind === "image" &&
        this.data.current.url && !this.data.imageSources[this.data.current.url]) return;
    const detail = (event && event.detail) || {};
    logPageError("memory_media_playback", {errMsg: detail.errMsg || "媒体加载失败", errno: detail.errCode},
      {mediaId: this.data.current && this.data.current.id, kind: this.data.current && this.data.current.kind});
    if (this.data.current && this.data.current.kind === "video" && this.data.current.url && !this._videoRetries)
      return this.retryVideo(this.data.current);
    this.setData({error: "媒体加载失败，请刷新重试", playing: false, videoLoading: false, controlsVisible: true});
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
    if (action === "reject" || action === "retry") return this.confirmReview();
    const options = {
      publish: {
        title: "确认上架",
        message: this._mediaId ? "仅发布当前这份内容，其他内容不受影响。" : `发布选中的 ${this.data.selected.length} 项内容，其余素材不会公开。`,
        confirmText: "确认上架",
      },
      offline: {
        title: "确认下架",
        message: "下架后将停止公开展示，素材保留，可以重新上架。",
        confirmText: "确认下架",
        variant: "danger",
      },
      republish: {
        title: "确认重新上架",
        message: "当前内容将重新公开展示，其他内容不受影响。",
        confirmText: "重新上架",
      },
      reopen: {
        title: "确认重新审核",
        message: "当前内容将放回待审核列表，不会直接上架，其他内容不受影响。",
        confirmText: "重新审核",
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
    if (this.data.busy || this._unloaded || !this.data.memory) return;
    const action = this._action;
    const restoring = action === "retry" || action === "republish" || action === "reopen";
    this.setData({ busy: true, error: "" });
    try {
      const result = await memory.send(`/admin/memories/${this._id}/review`, "POST", {
        action,
        expected_revision: this.data.memory.revision,
        selected_media_ids: this._mediaId ? [this._mediaId] : restoring && this.data.current ? [this.data.current.id] : this.data.selected,
        manually_reviewed: this.data.reviewed,
        individual: !!this._mediaId || restoring,
      });
      if (this._unloaded) return;
      getApp().globalData.memoryVersion =
        (getApp().globalData.memoryVersion || 0) + 1;
      wx.showToast({ title: "已处理", icon: "success" });
      if (action === "publish" || action === "reject") {
        this._generation = (this._generation || 0) + 1;
        this._queueLoading = false;
        this._reviewNextIndex = this.data.index;
        this._reviewNeedsFirstPage = !this._reviewQueue;
        this._reviewQueue = (this._reviewQueue || []).filter((card) => card.id !== this._mediaId)
          .map((card) => card.memory_id === this._id && result && result.revision
            ? {...card, revision: result.revision} : card);
        this._reviewAfterAction = true;
        await this.nextReview();
      } else wx.navigateBack();
    } catch (error) {
      if (!this._unloaded)
        this.setData({ error: error.message || "操作未完成，请刷新后重试" });
    } finally {
      if (!this._unloaded) this.setData({ busy: false });
    }
  },
  async nextReview() {
    if (this._unloaded || this.data.loading) return;
    const generation = this._generation;
    this.pause();
    this._videoGeneration = (this._videoGeneration || 0) + 1;
    this.clearTimers();
    this.restorePhoto();
    this.setData({loading: true, error: "", reviewComplete: false, memory: null, current: null,
      viewerMedia: [], viewerInfo: [], videoSource: "", videoMounted: false, videoLoading: false, playing: false, fullScreen: false,
      selected: [], reviewed: false, selectionOpen: false});
    try {
      if (this._reviewNeedsFirstPage) {
        const batch = await memory.list({status: "pending", individual: true}, true);
        if (this._unloaded || generation !== this._generation) return;
        this._reviewQueue = batch.items.flatMap(memory.reviewCards);
        this._reviewCursor = batch.cursor;
        this._reviewNeedsFirstPage = false;
        this._reviewNextIndex = 0;
      }
      while (this._reviewQueue.length <= this._reviewNextIndex && this._reviewCursor) {
        const cursor = this._reviewCursor;
        await this.moreReviewContent();
        if (this._unloaded || generation !== this._generation || this.data.error) return;
        if (this._reviewCursor === cursor) throw new Error("更多待审核内容加载失败，请刷新重试");
      }
      if (this._unloaded || generation !== this._generation) return;
      const index = Math.min(this._reviewNextIndex, this._reviewQueue.length - 1);
      const card = this._reviewQueue[index];
      if (!card) {
        if (this._videoPreloader) this._videoPreloader.update(null, null);
        releaseMemoryImages(this);
        this.setData({reviewComplete: true});
        return;
      }
      this._reviewAfterAction = false;
      this.setData({index, memory: {...card, id: card.memory_id},
        viewerMedia: this._reviewQueue.map((item) => item.media[0]),
        viewerInfo: this._reviewQueue.map(slideInfo)}, () => this.activate());
    } catch (error) {
      if (!this._unloaded && generation === this._generation)
        this.setData({error: error.message || "下一份内容加载失败，请刷新重试"});
    } finally {
      if (!this._unloaded && generation === this._generation) this.setData({loading: false});
    }
  },
  onShareAppMessage() {
    if (this._admin || !this.data.memory)
      return { title: "记忆", path: "/pages/memory/memory" };
    return {
      title: this.data.memory.caption || "活动记忆",
      path: `/pages/memory_detail/memory_detail?id=${this._id}${this.data.current ? '&media_id=' + this.data.current.id : ''}`,
    };
  },
});
