const memory = require("../../services/memory");
const { MemoryPreupload } = require("../../services/memoryPreupload");
const activityService = require("../../services/activity");
const {
  createVideoThumbnail,
  discardThumbnail,
} = require("../../services/videoThumbnail");
const { logPageError } = require("../../services/logger");
const { getBottomSafeAreaRpx, getBottomContentInsetRpx } = require("../../utils/safeArea");
const { uploadProgressImage } = require("../../utils/memoryUploadProgress");

function totalUploadProgress(files) {
  const total = files.reduce((sum, file) => sum + file.size, 0);
  const sent = files.reduce((sum, file) => sum + file.size * (file.uploadProgress || 0) / 100, 0);
  return total ? Math.min(99, Math.floor(sent / total * 100)) : 0;
}

Page({
  data: {
    top: 0,
    bottom: 0,
    footerSafeAreaRpx: 0,
    files: [],
    mediaScrollTarget: "",
    caption: "",
    captionCount: 0,
    locationName: "",
    activityId: null,
    activityName: "",
    activityTime: "",
    busy: false,
    locked: false,
    progress: 0,
    uploadError: "",
    error: "",
    activities: [],
    showActivities: false,
    selecting: false,
    ready: false,
  },
  onLoad() {
    this._submissionId = `memory-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    this._mediaBatch = 0;
    this.onResize();
    this.validateAccess();
  },
  onResize() {
    this.setData({
      top: wx.getWindowInfo().statusBarHeight || 0,
      bottom: getBottomSafeAreaRpx(),
      footerSafeAreaRpx: getBottomContentInsetRpx(),
    });
  },
  async validateAccess() {
    const app = getApp();
    const valid = await app.validateStoredSession({ promptOnExpired: true });
    if (this._unloaded) return;
    if (!valid) {
      this.setData({ error: "请先在当前环境登录，再进行投稿" });
      app.showSessionExpiredPrompt();
      return;
    }
    if (!["user", "admin"].includes(app.globalData.userRole)) {
      wx.showToast({ title: "成员和管理员才可投稿", icon: "none" });
      wx.navigateBack();
      return;
    }
    this.setData({ ready: true, error: "" });
  },
  onShow() {
    if (!this.data.ready) this.validateAccess();
  },
  configureMediaScroller() {
    if (this._unloaded || this.renderer === "webview") return;
    this.createSelectorQuery().select("#mediaScroller").node().exec((result) => {
      if (this._unloaded) return;
      const scroller = result && result[0] && result[0].node;
      if (scroller) scroller.showScrollbar = false;
    });
  },
  uploader() {
    if (!this._uploader) this._uploader = new MemoryPreupload(this._submissionId, {
      onState: (id, uploadState, uploadProgress) => {
        if (this._unloaded) return;
        this.updateThumbnail(id, { uploadState, uploadProgress });
      },
      onError: (error) => {
        if (!this._unloaded) this.setData({ uploadError: error.message || "上传失败，请重试" });
      },
    });
    return this._uploader;
  },
  onUnload() {
    this._unloaded = true;
    if (this._thumbnailTask) this._thumbnailTask.cancel();
    this.data.files.forEach((file) => discardThumbnail(file.thumbnail));
    if (this._uploader) this._uploader.close();
  },
  back() {
    if (this.data.busy) return;
    wx.navigateBack();
  },
  choose() {
    if (
      this.data.locked ||
      !this.data.ready ||
      this.data.selecting ||
      this.data.files.length >= memory.MAX_FILES
    )
      return;
    this.setData({ selecting: true, uploadError: "", mediaScrollTarget: "" });
    wx.chooseMedia({
      count: Math.min(9, memory.MAX_FILES - this.data.files.length),
      mediaType: ["mix"],
      sourceType: ["album", "camera"],
      sizeType: ["original"],
      maxDuration: 30,
      success: async (result) => {
        try {
          const originals = await Promise.all(
            result.tempFiles.map(async (file, index) => {
              try {
                return await memory.readOriginal(file);
              } catch (error) {
                throw new Error(
                  `第 ${index + 1} 项：${error.message || "无法读取原文件"}`,
                );
              }
            }),
          );
          const batch = ++this._mediaBatch;
          const files = originals.map((file, index) => ({
            ...file,
            id: `${batch}-${index}`,
            durationLabel: memory.durationLabel(file.duration),
          }));
          if (!this._unloaded && files.length) {
            const selectedFiles = this.data.files.concat(files);
            this.setData({ files: selectedFiles }, () => {
              if (this._unloaded) return;
              this.setData({
                mediaScrollTarget:
                  selectedFiles.length < memory.MAX_FILES
                    ? "upload-add"
                    : `upload-file-${selectedFiles[selectedFiles.length - 1].id}`,
              }, () => this.configureMediaScroller());
              this.prepareThumbnails();
              this.uploader().setFiles(selectedFiles);
            });
          }
        } catch (error) {
          if (!this._unloaded)
            this.setData({ uploadError: error.message || "无法读取原文件" });
        } finally {
          if (!this._unloaded) this.setData({ selecting: false });
        }
      },
      fail: (error) => {
        if (!this._unloaded && !String(error.errMsg).includes("cancel"))
          this.setData({ uploadError: "选择内容失败，请重试" });
        if (!this._unloaded) this.setData({ selecting: false });
      },
    });
  },
  remove(e) {
    if (
      this._unloaded ||
      this.data.locked ||
      this.data.busy ||
      this.data.selecting
    )
      return;
    const id = e.currentTarget.dataset.id;
    if (id === undefined || id === null) return;
    const removed = this.data.files.find(
      (file) => String(file.id) === String(id),
    );
    if (removed) discardThumbnail(removed.thumbnail);
    if (this._thumbnailTask && String(this._thumbnailTask.id) === String(id))
      this._thumbnailTask.cancel();
    this.setData({
      files: this.data.files.filter((file) => String(file.id) !== String(id)),
      mediaScrollTarget: "",
    });
    if (this._uploader) this._uploader.setFiles(this.data.files);
  },
  prepareThumbnails() {
    if (this._unloaded || this._thumbnailTask) return;
    const file = this.data.files.find(
      (item) =>
        item.kind === "video" && !item.thumbnail && !item.thumbnailState,
    );
    if (!file) return;
    this.updateThumbnail(file.id, { thumbnailState: "working" });
    const task = createVideoThumbnail(file.path);
    task.id = file.id;
    this._thumbnailTask = task;
    task.promise
      .then((thumbnail) => {
        if (
          this._unloaded ||
          !this.data.files.some((item) => item.id === file.id)
        ) {
          discardThumbnail(thumbnail);
          return;
        }
        this.updateThumbnail(file.id, { thumbnail, thumbnailState: "ready" });
      })
      .catch((error) => {
        if (
          this._unloaded ||
          error.cancelled ||
          !this.data.files.some((item) => item.id === file.id)
        )
          return;
        this.updateThumbnail(file.id, { thumbnailState: "failed" });
        logPageError("memory_video_thumbnail", new Error("无法生成视频首帧"), {
          stage: error.stage || "unknown",
        });
      })
      .finally(() => {
        if (this._thumbnailTask === task) this._thumbnailTask = null;
        this.prepareThumbnails();
      });
  },
  updateThumbnail(id, patch) {
    if (this._unloaded) return;
    const index = this.data.files.findIndex(file => file.id === id);
    if (index < 0) return;
    const file = this.data.files[index];
    if (patch.uploadState === "uploading") {
      patch = { ...patch, progressImage: uploadProgressImage(patch.uploadProgress) };
    }
    const update = {};
    for (const [key, value] of Object.entries(patch)) {
      if (file[key] !== value) update[`files[${index}].${key}`] = value;
    }
    if (patch.uploadState) {
      const files = this.data.files.map((item, i) => i === index ? { ...item, ...patch } : item);
      const progress = totalUploadProgress(files);
      if (this.data.progress !== progress) update.progress = progress;
    }
    if (Object.keys(update).length) this.setData(update);
  },
  thumbnailError(e) {
    if (this._unloaded) return;
    const file = this.data.files.find(
      (item) => item.id === e.currentTarget.dataset.id,
    );
    if (
      !file || file.kind !== "video" || !file.thumbnail ||
      e.currentTarget.dataset.src !== file.thumbnail
    ) return;
    discardThumbnail(file.thumbnail);
    // Retry a broken picker cover once, but never loop on a generated cover.
    this.updateThumbnail(file.id, {
      thumbnail: "",
      thumbnailState: file.thumbnailState === "ready" ? "failed" : "",
    });
    this.prepareThumbnails();
  },
  preview(e) {
    if (this.data.busy || !this.data.files.length) return;
    wx.previewMedia({
      current: Number(e.currentTarget.dataset.index),
      sources: this.data.files.map((file) => ({
        url: file.path,
        type: file.kind,
        ...(file.kind === "video" && file.thumbnail
          ? { poster: file.thumbnail }
          : {}),
      })),
      fail: () => {
        if (!this._unloaded) this.setData({ error: "预览失败，请重试" });
      },
    });
  },
  caption(e) {
    if (this.data.locked) return this.data.caption;
    const characters = Array.from(e.detail.value).slice(0, 50);
    const caption = characters.join("");
    this.setData({ caption, captionCount: characters.length });
    return caption;
  },
  chooseLocation() {
    if (this.data.locked) return;
    if (this.data.locationName) {
      wx.showActionSheet({
        itemList: ["重新选择位置", "清除位置"],
        success: ({ tapIndex }) => {
          if (this._unloaded || this.data.locked) return;
          if (tapIndex === 1) this.clearLocation();
          else this.pickLocation();
        },
      });
      return;
    }
    this.pickLocation();
  },
  pickLocation() {
    wx.chooseLocation({
      success: (location) => {
        if (!this._unloaded)
          this.setData({ locationName: location.name || "" });
      },
      fail: (error) => {
        if (!String(error.errMsg).includes("cancel"))
          wx.showToast({ title: "未能选择位置", icon: "none" });
      },
    });
  },
  clearLocation() {
    if (!this.data.locked) this.setData({ locationName: "" });
  },
  async chooseActivity() {
    if (this.data.locked) return;
    try {
      const result = await activityService.listActivities();
      if (!this._unloaded)
        this.setData({
          activities: Array.isArray(result) ? result : result.items || [],
          showActivities: true,
        });
    } catch (error) {
      if (!this._unloaded)
        this.setData({ error: error.message || "活动加载失败" });
    }
  },
  selectActivity(e) {
    const activity = this.data.activities.find(
      (item) => item.id === Number(e.currentTarget.dataset.id),
    );
    this.setData({
      activityId: activity ? activity.id : null,
      activityName: activity ? activity.name : "",
      activityTime: activity ? memory.activityTime(activity.start_time) : "",
      showActivities: false,
    });
  },
  closeActivities() {
    this.setData({ showActivities: false });
  },
  stopTap() {},
  retryFile(e) {
    if (this.data.locked || !this.data.ready) return;
    const file = this.data.files.find(item => item.id === e.currentTarget.dataset.id);
    if (!file || file.uploadState !== "failed") return;
    this.setData({ uploadError: "" });
    this.uploader().retry(e.currentTarget.dataset.id);
  },
  confirmUpload() {
    if (!this.data.ready || this.data.busy || this.data.selecting || !this.data.files.length)
      return;
    if (this._uploader && this._uploader.submitAttempted) {
      this.upload();
      return;
    }
    this.selectComponent("#memory-confirm").open({
      title: "投稿说明",
      message:
        "您上传的图片与视频将投稿至管理员，不会直接展示在小程序中。\n若内容合适，管理员将代为发布。",
      messageAlign: "left",
      cancelText: "取消",
      confirmText: "确认投稿",
      prototypeStyle: true,
      confirmBehavior: "emit",
    });
  },
  async upload() {
    if (!this.data.ready || this.data.busy || this._unloaded) return;
    try {
      this.data.files.forEach(memory.validateFile);
    } catch (error) {
      this.setData({ uploadError: error.message || "内容不符合上传要求" });
      return;
    }
    this.setData({ busy: true, locked: true, error: "", uploadError: "", progress: totalUploadProgress(this.data.files) });
    try {
      const uploader = this.uploader();
      uploader.setFiles(this.data.files);
      await uploader.submit({ caption: this.data.caption, location_name: this.data.locationName,
        activity_id: this.data.activityId });
      if (this._unloaded) return;
      this.setData({ progress: 100 });
      wx.showToast({ title: "投稿已收到", icon: "success" });
      wx.navigateBack();
    } catch (error) {
      if (!this._unloaded)
        this.setData({
          error: this.data.files.some(file => file.uploadState === "failed") ? "" :
            error.message || "投稿未完成，请重试",
          locked: !!(this._uploader && this._uploader.submitAttempted),
        });
    } finally {
      if (!this._unloaded) this.setData({ busy: false });
    }
  },
});
