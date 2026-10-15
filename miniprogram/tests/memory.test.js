const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");
const { readWxss } = require("./helpers/wxss");
const {loadMediaModules} = require("./helpers/memoryMedia");

const source = (file) =>
  fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const tick = () => new Promise((resolve) => setImmediate(resolve));

test("review cards represent one image or video with independent metadata", () => {
  const cards = service().reviewCards({id: 7, status: "pending", caption: "同一次投稿", revision: 3,
    author: {nickname: "投稿人"}, total_original_bytes: 99999999, total_duration: 45,
    media: [{id: 20, kind: "image", state: "ready", publication_status: "unreviewed",
      original_bytes: 1024 ** 2, thumbnail_url: "/photo.jpg"},
    {id: 21, kind: "video", state: "ready", publication_status: "unreviewed", duration: 8,
      original_bytes: 2 * 1024 ** 2, thumbnail_url: "/video.jpg"}]});
  assert.deepEqual(Array.from(cards, item => item.id), [20, 21]);
  assert.ok(cards.every(item => item.memory_id === 7 && item.media_count === 1 && item.caption === "同一次投稿"));
  assert.equal(cards[0].cover, "https://test.invalid/photo.jpg");
  assert.equal(cards[0].videoCover, false);
  assert.equal(cards[0].sizeLabel, "1.0 MB");
  assert.equal(cards[0].mediaLabel, "图片");
  assert.equal(cards[1].videoCover, true);
  assert.equal(cards[1].sizeLabel, "2.0 MB");
  assert.equal(cards[1].mediaLabel, "0:08");
  assert.doesNotMatch(source("pages/memory_review/memory_review.wxml"), /review-count|1\/\{\{item.media_count/);
});

test("review list flattens batches, deduplicates media IDs and opens the selected file", async () => {
  const api = service();
  let query, url;
  api.list = async values => {
    query = values;
    return {items: [{id: 7, status: "pending", revision: 3, media: [
      {id: 20, kind: "image", state: "ready", publication_status: "unreviewed"},
      {id: 21, kind: "video", state: "ready", publication_status: "unreviewed"}]}], cursor: "next"};
  };
  const {instance} = page("memory_review", api, {navigateTo(options) {url = options.url;}});
  await instance.load(true);
  await instance.load(false);
  assert.equal(query.individual, true);
  assert.deepEqual(Array.from(instance.data.items, item => item.id), [20, 21]);
  instance.open({currentTarget: {dataset: {id: 21}}});
  assert.equal(url, "/pages/memory_detail/memory_detail?id=7&admin=1&media_id=21");
});

test("individual detail scopes preview and review to one file in a partially published submission", async () => {
  const api = service();
  let sent;
  api.detail = async () => ({id: 7, status: "published", revision: 4, media: [
    {id: 20, kind: "image", state: "ready", publication_status: "published"},
    {id: 21, kind: "video", state: "ready", publication_status: "unreviewed", duration: 8}]});
  api.list = async () => ({items: [{id: 7, status: "published", revision: 4, media: [
    {id: 21, kind: "video", state: "ready", publication_status: "unreviewed", duration: 8}]}], cursor: null});
  api.send = async (url, method, body) => {sent = {url, body};};
  const {instance} = page("memory_detail", api);
  instance.onLoad({id: "7", admin: "1", media_id: "21"});
  await instance.load();
  assert.equal(instance.data.memory.status, "pending");
  assert.equal(instance.data.memory.media.length, 1);
  assert.equal(instance.data.current.id, 21);
  instance.beginReview();
  assert.deepEqual(Array.from(instance.data.selected), [21]);
  instance.reviewed({detail: {value: ["reviewed"]}});
  instance._action = "publish";
  await instance.confirmReview();
  assert.equal(sent.url, "/admin/memories/7/review");
  assert.equal(sent.body.individual, true);
  assert.deepEqual(Array.from(sent.body.selected_media_ids), [21]);
  assert.equal(sent.body.manually_reviewed, true);
});

test("pending viewer pages across submissions but reviews only the visible file", async () => {
  const api = service();
  const first = {id: 7, status: "pending", caption: "first", revision: 3, author: {nickname: "A"},
    media: [{id: 20, kind: "image", state: "ready", publication_status: "unreviewed"}]};
  const second = {id: 8, status: "pending", caption: "second", revision: 6, author: {nickname: "B"},
    media: [{id: 21, kind: "video", state: "ready", publication_status: "unreviewed", duration: 8}]};
  const third = {id: 9, status: "pending", revision: 2,
    media: [{id: 22, kind: "image", state: "ready", publication_status: "unreviewed"}]};
  const calls = [];
  let next;
  api.detail = async () => structuredClone(second);
  api.list = async values => {
    calls.push(values);
    return values.cursor ? new Promise(resolve => {next = resolve;}) : {items: [first, second], cursor: "next"};
  };
  let sent;
  api.send = async (url, method, body) => {sent = {url, body};};
  const {instance} = page("memory_detail", api);
  instance.onLoad({id: "8", admin: "1", media_id: "21"});
  await instance.load();
  assert.equal(instance.data.index, 1);
  assert.deepEqual(Array.from(instance.data.viewerMedia, item => item.id), [20, 21]);
  assert.deepEqual(Array.from(instance.data.viewerInfo, item => item.author.nickname), ["A", "B"]);
  assert.deepEqual(Array.from(instance.data.viewerInfo, item => item.caption), ["first", "second"]);
  instance.moreReviewContent();
  assert.equal(calls.length, 2, "only one prefetch at a time");
  next({items: [second, third], cursor: null});
  await tick();
  assert.deepEqual(Array.from(instance.data.viewerMedia, item => item.id), [20, 21, 22]);
  assert.equal(instance.data.viewerInfo.length, 3);
  assert.equal(instance.data.viewerInfo[2].caption, "");
  instance.setData({selected: [21], reviewed: true, error: "old error", playing: true});
  instance.change({detail: {current: 0}});
  assert.equal(instance.data.memory.id, 7);
  assert.equal(instance.data.memory.author.nickname, "A");
  assert.equal(instance.data.memory.caption, "first");
  assert.equal(instance.data.viewerInfo[1].caption, "second", "neighbour metadata does not change with the active page");
  assert.equal(instance.data.current.id, 20);
  assert.equal(instance.data.playing, false);
  assert.equal(instance.data.reviewed, false);
  assert.equal(instance.data.selected.length, 0);
  assert.equal(instance.data.error, "");
  instance.beginReview();
  instance.change({detail: {current: 1}});
  assert.equal(instance.data.index, 0, "review sheet locks paging");
  instance.reviewed({detail: {value: ["reviewed"]}});
  instance._action = "publish";
  await instance.confirmReview();
  assert.equal(sent.url, "/admin/memories/7/review");
  assert.equal(sent.body.expected_revision, 3);
  assert.deepEqual(Array.from(sent.body.selected_media_ids), [20]);
  assert.equal(sent.body.individual, true);
});

test("pending queue fetches earlier pages to locate an entry and discards late prefetch after unloading", async () => {
  const api = service();
  const submission = {id: 8, status: "pending", revision: 3,
    media: [{id: 21, kind: "image", state: "ready", publication_status: "unreviewed"}]};
  api.detail = async () => structuredClone(submission);
  let calls = 0, finish;
  api.list = async () => {
    calls++;
    if (calls === 1) return {items: [], cursor: "p2"};
    if (calls === 2) return {items: [submission], cursor: "p3"};
    return new Promise(resolve => {finish = resolve;});
  };
  const {instance} = page("memory_detail", api);
  instance.onLoad({id: "8", admin: "1", media_id: "21"});
  await instance.load();
  assert.equal(calls, 3);
  assert.equal(instance.data.current.id, 21);
  instance.onUnload();
  finish({items: [{...submission, id: 9, media: [{...submission.media[0], id: 22}]}], cursor: null});
  await tick();
  assert.equal(instance.data.viewerMedia.length, 1);
});

test("stale video errors do not overwrite the newly visible file", () => {
  const {instance} = viewer("video");
  instance.mediaError({currentTarget: {dataset: {id: 99}}, detail: {errMsg: "old failure"}});
  assert.equal(instance.data.error, "");
  instance.mediaError({currentTarget: {dataset: {id: instance.data.current.id}}, detail: {errMsg: "decode failed", errCode: 3}});
  assert.equal(instance.data.error, "媒体加载失败，请刷新重试");
  assert.equal(instance.data.playing, false);
});

test("viewer preloads a video arriving on the next queue page and cleans it on hide", async () => {
  const api = service();
  const first = {id: 7, status: "pending", revision: 3,
    media: [{id: 20, kind: "image", state: "ready", publication_status: "unreviewed", url: "/photo.jpg"}]};
  const second = {id: 8, status: "pending", revision: 1,
    media: [{id: 21, kind: "video", state: "ready", publication_status: "unreviewed", url: "/clip.mp4"}]};
  let next, download;
  const removed=[];
  api.detail = async () => structuredClone(first);
  api.list = async values => values.cursor ? new Promise(resolve => {next = resolve;}) : {items: [first], cursor: "p2"};
  const {instance} = page("memory_detail", api, {
    downloadFile(options) {download = options; return {abort() {}};},
    createVideoContext:()=>({play(){},pause(){}}),
    getFileSystemManager: () => ({unlink: ({filePath,success}) => {removed.push(filePath); success();},
      getFileInfo: options => options.success({size: 1024})}),
  });
  instance.onLoad({id: "7", admin: "1", media_id: "20"});
  instance.onShow();
  await tick();
  assert.match(download.url, /photo\.jpg$/);
  download.success({statusCode:200,tempFilePath:"cached-photo"});
  next({items: [second], cursor: null});
  await tick();
  assert.match(download.url, /clip\.mp4$/);
  download.success({statusCode: 200, tempFilePath: "cached-video"});
  instance.change({detail: {current: 1}});
  await tick();
  assert.equal(instance.data.videoSource, "cached-video");
  assert.equal(instance.data.muted, false);
  assert.equal(instance.data.error, "");
  assert.equal(removed.includes("cached-video"),false,"the active player must keep its temporary file until unmounted");
  instance.setData({playing: true});
  instance.onHide();
  assert.equal(instance.data.visible, false);
  assert.equal(instance.data.playing, false);
  assert.deepEqual(new Set(removed),new Set(["cached-photo","cached-video"]));
  instance.videoPlay({currentTarget: {dataset: {id: 21}}});
  assert.equal(instance.data.playing, false);
});

test("submission upload label matches the prototype without a swipe hint", () => {
  const markup = source("pages/memory_create/memory_create.wxml");
  assert.match(markup, /<view class="label memory-label"><text>上传内容<\/text><\/view>/);
  assert.doesNotMatch(markup, /左右滑动|upload-hint/);
  assert.doesNotMatch(source("pages/memory_create/memory_create.wxss"), /\.upload-hint\b/);
  assert.match(markup, /class="upload-scroll" type="list" scroll-x enable-flex/);
});

test("memory icons preserve the exact Pencil-exported paths and source nodes", () => {
  const shapes = {
    "review-timer": [
      "z7jGk",
      "3fe5a1eee98db63c09099be3f6a27605325ab284477c63d5ec815050e742bb7f",
    ],
    "review-size": [
      "R4kDK",
      "33c9ec91f66553bf24e183f5a280c6070188d30c4ad209affe0838f4f8e8e286",
    ],
    "review-activity": [
      "J50kI9",
      "4304e32dd8853361edcc38a54b2cee1bcacf11b13691743e0b080af14dce2c0b",
    ],
    "review-image": [
      "x1Dbuw",
      "f76321bde5b4f223326ecf483f7b8bf7307c736bb8c8775166ad8e26fa6f2907",
    ],
    "review-empty": [
      "u36BS",
      "ff8fa8f2cab0b9773d860eff2bf18e3299adbc754f856fac5567acef2300d818",
    ],
    add: [
      "MG20F",
      "cbe8053b61586cbfbd6393de43cb4b9cabb5d0643369557b22bc1e918eccdeed",
    ],
    "back-dark": [
      "QJrbo",
      "1a21780209050a1beeded91faea968138f9075c2aa81855b035ba2e08c77eb36",
    ],
    "back-light": [
      "wdlHP",
      "1a21780209050a1beeded91faea968138f9075c2aa81855b035ba2e08c77eb36",
    ],
    chevron: [
      "sJS7t",
      "392ec546fd14836c01db2d56eaf29f064518e39d5b29abbc10c8d30db96e283c",
    ],
    close: [
      "e92MIb",
      "9a9f6553571da7bfaa85507d5e6d5d0e91dd0fecac27ba5ddfe47a5be30c12c6",
    ],
    "exit-fullscreen": [
      "gdD4E",
      "51311eaed291e054be6814f07096c3c25b8946eab8bc6ff4d42b761d0ef85fe0",
    ],
    "fast-forward": [
      "g42w7",
      "1c44494516ec2375fc04d5e32e9aa5e25c969a149d8ded00b08f1666c6adb097",
    ],
    flag: [
      "ZO85Z",
      "4304e32dd8853361edcc38a54b2cee1bcacf11b13691743e0b080af14dce2c0b",
    ],
    fullscreen: [
      "oUYuN",
      "22ba777b9e914dfcfd7156b54339786821e9a5e925b344702c4f3bcffa30377c",
    ],
    "fullscreen-back": [
      "jikiT",
      "1a21780209050a1beeded91faea968138f9075c2aa81855b035ba2e08c77eb36",
    ],
    images: [
      "Z50zWz",
      "63a94d256984860a265917b36300e6e1290ff29519ce0631f9cce748bdda108c",
    ],
    "images-active": [
      "Z50zWz",
      "63a94d256984860a265917b36300e6e1290ff29519ce0631f9cce748bdda108c",
    ],
    location: [
      "X6BLn",
      "79c3183562eaa534cb49581a55528599dc2ec5c5b3a4fe4df77fea8a891448ed",
    ],
    play: [
      "nD9ML",
      "372257863835aab4a6cbbcaf21cf2a6591ed153ae950d5c6e8738ae4df22ed72",
    ],
    "play-large": [
      "FqNgW",
      "372257863835aab4a6cbbcaf21cf2a6591ed153ae950d5c6e8738ae4df22ed72",
    ],
    restore: [
      "b9ym8V",
      "51311eaed291e054be6814f07096c3c25b8946eab8bc6ff4d42b761d0ef85fe0",
    ],
    rewind: [
      "yKJO5",
      "4b97428adcf3c02d1dd8587ee573341947ac4e0d0330de348cd19793702f3e45",
    ],
    share: [
      "GmDYb",
      "17b54ba0d1138eb77f8412842a230ed4aab4416e910792494a11901cf0186eb6",
    ],
    shield: [
      "pspZn",
      "a8ab8c548a135e98d827ddbe9e11f19aab30a30e7caf65fdc7347e519caec417",
    ],
  };
  for (const [name, [id, hash]] of Object.entries(shapes)) {
    const svg = source(`images/memory-${name}.svg`);
    assert.ok(svg.includes(`data-pencil-id="${id}"`), name);
    const geometry = Array.from(
      svg.matchAll(/<path[^>]*\sd="([^"]*)"/g),
      (match) => match[1],
    ).join("|");
    assert.equal(
      crypto.createHash("sha256").update(geometry).digest("hex"),
      hash,
      name,
    );
    assert.doesNotMatch(
      svg,
      /stroke-width|<script|<image|https?:\/\/(?!www\.w3\.org)/,
      name,
    );
  }
  assert.equal(
    source("images/memory-images.svg").replaceAll("#111827", "#F59E0B"),
    source("images/memory-images-active.svg"),
  );
});

test("memory controls use exported icons without a CSS stroke substitute", () => {
  const upload = source("pages/memory_create/memory_create.wxml");
  assert.match(upload, /src="\/images\/memory-upload-remove.svg"/);
  assert.doesNotMatch(
    upload,
    /src="\/images\/(?:memory-close|icon-close)\.svg"/,
  );
  const styles = source("pages/memory_detail/memory_detail.wxss");
  assert.match(styles, /\.viewer-share\s*\{[^}]*background:\s*transparent;/s);
  assert.match(styles, /\.viewer-share image\s*\{[^}]*width:\s*42\.30769rpx;/s);
  assert.match(styles, /\.memory-viewer button\s*\{\s*min-width:\s*0;/);
});

test("translucent prototype SVGs use portable SVG opacity without changing their geometry", () => {
  for (const name of ['flag', 'location', 'upload-spinner']) {
    const svg = source(`images/memory-${name}.svg`);
    assert.doesNotMatch(svg, /fill="#[0-9a-f]{8}"/i);
    assert.match(svg, /fill="#FFFFFF" fill-opacity="/);
  }
});

test("custom viewer buttons opt out of native default widths and keep selected styling", () => {
  const markup = source("pages/memory_detail/memory_detail.wxml") + source("pages/memory_detail/memory-controls.wxml");
  for (const name of ['viewer-share', 'viewer-enter-fullscreen', 'viewer-restore', 'viewer-play-button', 'review-thumb', 'primary']) {
    assert.match(markup, new RegExp(`<button size="mini"[^>]*class="${name}(?: |")`), name);
  }
  const styles = source("pages/memory_detail/memory_detail.wxss");
  assert.match(styles, /\.memory-viewer \.review-thumb--selected\s*\{[^}]*border-color:\s*#ff9800;/);
});

test("upload delete and spinner assets preserve the exported Pencil geometry", () => {
  const remove = source("images/memory-upload-remove.svg");
  assert.match(remove, /data-pencil-id="S8hSf"/);
  assert.match(remove, /fill="#FFFFFF"/);
  const paths = (value) =>
    Array.from(value.matchAll(/<path[^>]*\sd="([^"]*)"/g), (match) => match[1]);
  assert.deepEqual(paths(remove), paths(source("images/memory-close.svg")));
  const spinner = source("images/memory-upload-spinner.svg");
  assert.match(spinner, /data-pencil-id="z4q7w"/);
  assert.match(spinner, /data-pencil-id="xkSru"/);
  assert.match(spinner, /data-pencil-id="aeh1s"/);
  assert.equal(paths(spinner).length, 2);
  const progressMask = source("images/memory-upload-progress-mask.svg");
  assert.match(progressMask, /data-pencil-id="xkSru"/);
  assert.deepEqual(paths(progressMask), [paths(spinner)[0]]);
});

test("upload progress follows the percentage instead of rotating a fixed arc", () => {
  const markup = source("pages/memory_create/memory_create.wxml");
  const styles = source("pages/memory_create/memory_create.wxss");
  assert.match(markup, /wx:if="{{item.uploadState === 'uploading'}}" class="upload-progress-ring"/);
  assert.match(markup, /class="upload-progress-ring" src="{{item.progressImage}}"/);
  assert.doesNotMatch(markup + styles, /conic-gradient|mask-image/);
});

test("Skyline viewer bottom overlay anchors to the viewport without blocking media gestures", () => {
  const styles = source("pages/memory_detail/memory_detail.wxss");
  const overlay = styles.match(/\.viewer-bottom\s*\{([^}]*)\}/)[1];
  assert.match(overlay, /position:\s*absolute;/);
  assert.match(overlay, /bottom:\s*0;/);
  assert.match(overlay, /height:\s*100%;/);
  assert.match(overlay, /pointer-events:\s*none;/);
  assert.match(styles, /\.viewer-info,\s*\.viewer-footer\s*\{\s*pointer-events:\s*auto;/);
});

test("video originals never use the MP4 file as an image cover", async () => {
  const memory = service({
    getFileSystemManager: () => ({
      getFileInfo: (options) => options.success({ size: 100 }),
    }),
    getVideoInfo: (options) => options.success({ duration: 8 }),
  });
  const original = { tempFilePath: "wxfile://video.mp4", fileType: "video" };
  assert.equal((await memory.readOriginal(original)).thumbnail, "");
  assert.equal(
    (
      await memory.readOriginal({
        ...original,
        thumbTempFilePath: "wxfile://cover.jpg",
      })
    ).thumbnail,
    "wxfile://cover.jpg",
  );
});

function thumbnailPage() {
  const jobs = [],
    discarded = [];
  const result = page(
    "memory_create",
    {},
    {},
    {
      createVideoThumbnail(path) {
        let resolve, reject;
        const promise = new Promise((done, fail) => {
          resolve = done;
          reject = fail;
        });
        const job = {
          path,
          resolve,
          reject,
          promise,
          cancel() {
            this.cancelled = true;
            reject({ cancelled: true });
          },
        };
        jobs.push(job);
        return job;
      },
      discardThumbnail: (path) => discarded.push(path),
    },
  );
  result.instance.onLoad();
  result.instance.setData({
    files: ["first", "second"].map((id) => ({
      id,
      kind: "video",
      path: id,
      thumbnail: "",
      size: 100,
      duration: 8,
    })),
  });
  return { ...result, jobs, discarded };
}

test("missing thumbnails decode serially and preserve concurrent upload progress", async () => {
  const { instance, jobs } = thumbnailPage();
  instance.prepareThumbnails();
  instance.prepareThumbnails();
  assert.equal(jobs.length, 1);
  instance.updateThumbnail("first", { uploadState: "uploading", uploadProgress: 60 });
  jobs[0].resolve("first.jpg");
  await tick();
  assert.equal(instance.data.files[0].thumbnail, "first.jpg");
  assert.equal(instance.data.files[0].uploadProgress, 60);
  assert.equal(jobs.length, 2);
  jobs[1].resolve("second.jpg");
  await tick();
  assert.equal(instance.data.files[1].thumbnail, "second.jpg");
  assert.equal(instance._thumbnailTask, null);
});

test("removing a decoding video cancels only its job and continues with the next", async () => {
  const { instance, jobs } = thumbnailPage();
  instance.prepareThumbnails();
  instance.remove({ currentTarget: { dataset: { id: "first" } } });
  await tick();
  assert.equal(jobs[0].cancelled, true);
  assert.equal(jobs.length, 2);
  jobs[1].resolve("second.jpg");
  await tick();
  assert.equal(instance.data.files.length, 1);
  assert.equal(instance.data.files[0].thumbnail, "second.jpg");
});

test("leaving the page cancels decoding, discards thumbnails and cannot start another job", async () => {
  const { instance, jobs, discarded } = thumbnailPage();
  instance.prepareThumbnails();
  jobs[0].resolve("first.jpg");
  await tick();
  instance.onUnload();
  await tick();
  assert.equal(jobs[1].cancelled, true);
  assert.equal(jobs.length, 2);
  assert.ok(discarded.includes("first.jpg"));
});

test("broken picker covers fall back once, generated-cover errors cannot loop", async () => {
  const { instance, jobs, discarded } = thumbnailPage();
  instance.setData({
    files: [{ ...instance.data.files[0], thumbnail: "picker.jpg" }],
  });
  instance.prepareThumbnails();
  assert.equal(jobs.length, 0);
  const event = { currentTarget: { dataset: { id: "first", src: "picker.jpg" } } };
  instance.thumbnailError(event);
  instance.thumbnailError(event);
  assert.equal(jobs.length, 1);
  jobs[0].resolve("generated.jpg");
  await tick();
  instance.thumbnailError(event);
  assert.equal(instance.data.files[0].thumbnail, "generated.jpg");
  event.currentTarget.dataset.src = "generated.jpg";
  instance.thumbnailError(event);
  await tick();
  assert.equal(jobs.length, 1);
  assert.equal(instance.data.files[0].thumbnailState, "failed");
  assert.ok(discarded.includes("generated.jpg"));
});

test("thumbnail failure does not block valid selection or pass a video path as poster", async () => {
  const { instance, jobs, wx } = thumbnailPage();
  let preview;
  wx.previewMedia = (options) => {
    preview = options;
  };
  instance.prepareThumbnails();
  jobs[0].reject({ stage: "decode" });
  await tick();
  jobs[1].resolve("second.jpg");
  await tick();
  assert.equal(instance.data.error, "");
  assert.equal(instance.data.files.length, 2);
  assert.equal(instance.data.locked, false);
  instance.preview({ currentTarget: { dataset: { index: 0 } } });
  assert.equal("poster" in preview.sources[0], false);
  assert.equal(preview.sources[1].poster, "second.jpg");
  const markup = source("pages/memory_create/memory_create.wxml");
  assert.match(markup, /wx:if="{{item.thumbnail}}" class="upload-cover"/);
  assert.match(markup, /binderror="thumbnailError"/);
});

function service(wx = {}, request = () => Promise.resolve({}), logger = {}) {
  const module = { exports: {} };
  vm.runInNewContext(source("services/memory.js"), {
    wx,
    module,
    Date,
    Promise,
    require(name) {
      if (name.startsWith("../utils/")) return require(name);
      if (name === "./request")
        return {
          request,
          resolveApiBaseUrl: () => "https://test.invalid/api/v1",
          toUserMessage: (message) => message || "请求失败",
        };
      return {
        createTraceId: () => "test-trace",
        logRequestFailure() {},
        logPageError() {},
        ...logger,
      };
    },
  });
  return module.exports;
}

function page(name, memory, wx = {}, thumbnails = {}) {
  let definition;
  const app = {
    validateStoredSession: async () => true,
    showSessionExpiredPrompt() {},
    globalData: {
      userRole: "user",
      accessToken: "token",
      isAuthenticated: true,
    },
  };
  const api = {
    getWindowInfo: () => ({ statusBarHeight: 20, windowWidth: 390 }),
    getStorageSync: () => "token",
    arrayBufferToBase64: (value) => Buffer.from(value).toString("base64"),
    showToast() {},
    navigateBack() {},
    request: options => {options.success({statusCode:200,header:{'Content-Length':'1024'}}); return {abort(){}};},
    getFileSystemManager: () => ({getFileInfo: options => options.success({size:1024}),
      unlink: options => {if (options.success) options.success();}}),
    worklet: {
      shared: (value) => ({ value }),
      runOnJS: (callback) => callback,
    },
    ...wx,
  };
  const originalFileSystem = api.getFileSystemManager;
  api.getFileSystemManager = () => ({getFileInfo: options => options.success({size:1024}), ...originalFileSystem()});
  const mediaModules = loadMediaModules(api);
  const timers = new Map();
  let timerId = 0;
  vm.runInNewContext(source(`pages/${name}/${name}.js`), {
    wx: api,
    getApp: () => app,
    Page: (value) => {
      definition = value;
    },
    Date,
    Promise,
    setTimeout(callback) {
      timers.set(++timerId, callback);
      return timerId;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
    require(name) {
      if (name.endsWith("/memoryVideoPreload")) {
        return mediaModules.videos;
      }
      if (name.endsWith("/memoryMediaSession")) return mediaModules.session;
      if (name.endsWith("/memoryImages")) {
        return mediaModules.images;
      }
      if (name.endsWith("/memoryUploadProgress")) {
        const module = { exports: {} };
        vm.runInNewContext(source("utils/memoryUploadProgress.js"), { module, wx: api });
        return module.exports;
      }
      if (name.endsWith("/videoThumbnail"))
        return {
          createVideoThumbnail: () => ({
            promise: new Promise(() => {}),
            cancel() {},
          }),
          discardThumbnail() {},
          ...thumbnails,
        };
      if (name.endsWith("/logger")) return { logPageError() {} };
      if (name.endsWith("/memory")) {
        for (const [key, value] of Object.entries(service()))
          if (!(key in memory)) memory[key] = value;
        return memory;
      }
      if (name.endsWith("/memoryPreupload")) {
        const module = { exports: {} };
        vm.runInNewContext(source("services/memoryPreupload.js"), {
          module, wx: api, require: () => memory,
        });
        return module.exports;
      }
      if (name.endsWith("/safeArea")) return { getBottomSafeAreaRpx: () => 0 };
      if (name.endsWith("/tabBarSync")) return { patchTabBarIfNeeded() {} };
      return { listActivities: async () => [] };
    },
  });
  const instance = {
    ...definition,
    data: structuredClone(definition.data),
    applyAnimatedStyle(selector, updater) {
      this._animatedStyle = { selector, updater };
    },
    setData(patch, callback) {
      for (const [key, value] of Object.entries(patch)) {
        const keys = key.split(".");
        let object = this.data;
        for (const part of keys.slice(0, -1)) object = object[part];
        object[keys.at(-1)] = value;
      }
      if (callback) callback();
    },
    selectComponent: () => ({ open() {} }),
    createSelectorQuery() {
      return { select() { return this; }, node() { return this; }, exec(callback) { callback([]); } };
    },
  };
  if (name === "memory_create") instance.data.ready = true;
  return { instance, app, wx: api, timers };
}

test("memory validates original sizes and duration, without a separate video quota", () => {
  const memory = service();
  assert.equal(memory.MAX_FILES, 10);
  assert.doesNotThrow(() =>
    memory.validateFile({ kind: "image", size: 20 * 1024 ** 2 }),
  );
  assert.doesNotThrow(() =>
    memory.validateFile({ kind: "video", size: 20 * 1024 ** 2, duration: 30 }),
  );
  for (const file of [
    { kind: "image", size: 20 * 1024 ** 2 + 1 },
    { kind: "video", size: 20 * 1024 ** 2 + 1, duration: 10 },
    { kind: "video", size: 100, duration: 30.01 },
    { kind: "video", size: 100, duration: NaN },
    { kind: "image", size: 0 },
  ]) {
    assert.throws(() => memory.validateFile(file));
  }
  for (let index = 0; index < 10; index++)
    memory.validateFile({ kind: "video", size: 100, duration: 10 });
});

test("memory public calls are anonymous; administration explicitly uses v1 authentication", async () => {
  const calls = [];
  const memory = service({}, async (options) => {
    calls.push(options);
    return {};
  });
  await memory.list({ cursor: "a+b/=" });
  await memory.detail(1);
  await memory.list({ status: "pending" }, true);
  assert.equal(calls[0].url, "/memories?cursor=a%2Bb%2F%3D");
  assert.equal(calls[0].auth, false);
  assert.equal(calls[1].auth, false);
  assert.equal(calls[2].auth, true);
  assert.ok(calls.every((call) => call.apiVersion === 1));
});

test("selected metadata cannot disguise oversized originals or long album videos", async () => {
  let size = 20 * 1024 ** 2 + 1;
  const memory = service({
    getFileSystemManager: () => ({
      getFileInfo: (options) => options.success({ size }),
    }),
    getVideoInfo: (options) => options.success({ duration: 31 }),
  });
  await assert.rejects(
    memory.readOriginal({ fileType: "image", size: 1, tempFilePath: "photo" }),
    /20MB/,
  );
  size = 6 * 1024 ** 2;
  const accepted = await memory.readOriginal({
    fileType: "image",
    size: 1,
    tempFilePath: "photo",
  });
  assert.equal(accepted.size, size);
  size = 100;
  await assert.rejects(
    memory.readOriginal({
      fileType: "video",
      duration: 1,
      tempFilePath: "video",
    }),
    /30/,
  );
});

test("native file read failures retain the failing stage but never private file paths", async () => {
  const records = [];
  const memory = service(
    {
      getFileSystemManager: () => ({
        getFileInfo: ({ fail }) =>
          fail({
            errMsg:
              'getFileInfo:fail ENOENT "C:\\Users\\Private\\photo.jpg" wxfile://tmp/private-photo.jpg',
            errno: 100,
          }),
      }),
    },
    undefined,
    { logPageError: (...args) => records.push(args) },
  );
  await assert.rejects(
    memory.readOriginal({ fileType: "image", tempFilePath: "photo" }),
    /无法访问原文件.*ENOENT/,
  );
  assert.equal(records[0][0], "memory_read_original");
  assert.equal(records[0][2].stage, "file_info");
  assert.equal(records[0][2].errNo, 100);
  assert.doesNotMatch(
    records[0][1].message,
    /Private|private-photo|photo\.jpg/,
  );
});

test("missing FFmpeg is diagnosed without trusting selected video duration or calling the server", async () => {
  const records = [];
  let requests = 0;
  const memory = service(
    {
      getFileSystemManager: () => ({
        getFileInfo: ({ success }) => success({ size: 100 }),
      }),
      getVideoInfo: ({ fail }) =>
        fail({ errMsg: "getVideoInfo:fail 音视频处理需要使用 ffmpeg" }),
    },
    () => {
      requests++;
    },
    { logPageError: (...args) => records.push(args) },
  );
  await assert.rejects(
    memory.readOriginal({
      fileType: "video",
      tempFilePath: "video",
      duration: 10,
    }),
    /开发者工具缺少 FFmpeg/,
  );
  assert.equal(requests, 0);
  assert.equal(records[0][2].stage, "video_info");
  assert.match(records[0][1].message, /getVideoInfo:fail/);
});

test("synchronous video API errors reject instead of leaving selection pending", async () => {
  const memory = service({
    getFileSystemManager: () => ({
      getFileInfo: ({ success }) => success({ size: 100 }),
    }),
    getVideoInfo() {
      throw new Error("video API unavailable");
    },
  });
  await assert.rejects(
    memory.readOriginal({ fileType: "video", tempFilePath: "video" }),
    /无法读取视频信息.*video API unavailable/,
  );
});

test("selection failures identify the selected item and release the selection lock", async () => {
  let options;
  const { instance } = page(
    "memory_create",
    {
      readOriginal: async (file) => {
        if (file.bad) throw new Error("开发者工具缺少 FFmpeg");
        return file;
      },
    },
    {
      chooseMedia: (value) => {
        options = value;
      },
    },
  );
  instance.onLoad();
  instance.choose();
  await options.success({
    tempFiles: [{ kind: "image", size: 100 }, { bad: true }],
  });
  assert.equal(instance.data.error, "第 2 项：开发者工具缺少 FFmpeg");
  assert.equal(instance.data.selecting, false);
  assert.equal(instance.data.files.length, 0);
});

test("selection stays locked while original metadata is being read", async () => {
  let options,
    finish,
    choices = 0;
  const memory = {
    MAX_FILES: 10,
    readOriginal: () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  };
  const { instance } = page("memory_create", memory, {
    chooseMedia: (value) => {
      options = value;
      choices++;
    },
  });
  instance.onLoad();
  instance.choose();
  assert.equal(options.count, 9);
  assert.equal(options.sizeType[0], "original");
  const pending = options.success({ tempFiles: [{}] });
  instance.choose();
  assert.equal(choices, 1);
  finish({ path: "image", kind: "image", size: 100 });
  await pending;
  assert.equal(instance.data.selecting, false);
  assert.equal(instance.data.files.length, 1);
  assert.ok(instance.data.files[0].id);
  assert.equal(instance.data.mediaScrollTarget, "upload-add");
});

test("each media selection reveals the trailing add tile, or the final file when full", async () => {
  let options;
  const { instance } = page(
    "memory_create",
    { readOriginal: async (file) => file },
    {
      chooseMedia: (value) => {
        options = value;
      },
    },
  );
  instance.onLoad();
  const file = { kind: "image", path: "photo", size: 100 };
  instance.choose();
  await options.success({ tempFiles: Array.from({ length: 8 }, () => file) });
  assert.equal(instance.data.files.length, 8);
  assert.equal(instance.data.mediaScrollTarget, "upload-add");
  instance.choose();
  assert.equal(instance.data.mediaScrollTarget, "");
  assert.equal(options.count, 2);
  await options.success({ tempFiles: [file] });
  assert.equal(instance.data.mediaScrollTarget, "upload-add");
  instance.choose();
  assert.equal(options.count, 1);
  await options.success({ tempFiles: [file] });
  assert.equal(instance.data.files.length, 10);
  assert.equal(new Set(instance.data.files.map((item) => item.id)).size, 10);
  assert.equal(
    instance.data.mediaScrollTarget,
    `upload-file-${instance.data.files[9].id}`,
  );
  instance.remove({
    currentTarget: { dataset: { id: instance.data.files[0].id } },
  });
  assert.equal(instance.data.files.length, 9);
  assert.equal(instance.data.mediaScrollTarget, "");
});

test("cancelled and empty media selections do not reposition the existing strip", async () => {
  let options;
  const { instance } = page(
    "memory_create",
    { readOriginal: async (file) => file },
    {
      chooseMedia: (value) => {
        options = value;
      },
    },
  );
  instance.onLoad();
  instance.setData({
    files: [{ id: "existing", kind: "image", size: 100 }],
    mediaScrollTarget: "upload-add",
  });
  instance.choose();
  options.fail({ errMsg: "chooseMedia:fail cancel" });
  assert.equal(instance.data.mediaScrollTarget, "");
  assert.equal(instance.data.files.length, 1);
  instance.choose();
  await options.success({ tempFiles: [] });
  assert.equal(instance.data.mediaScrollTarget, "");
  assert.equal(instance.data.selecting, false);
  assert.equal(instance.data.files.length, 1);
});

test("media scrollbar uses the Skyline context after mounting and ignores late callbacks", async () => {
  let options, callback, queries = 0;
  const { instance } = page("memory_create", { readOriginal: async (file) => file }, {
    chooseMedia: (value) => { options = value; },
  });
  instance.createSelectorQuery = () => ({
    select(selector) {
      assert.equal(selector, "#mediaScroller");
      assert.ok(instance.data.files.length, "configure only after the list mounts");
      queries++;
      return this;
    },
    node() { return this; },
    exec(done) { callback = done; },
  });
  instance.choose();
  await options.success({ tempFiles: [{ kind: "image", size: 100 }] });
  assert.equal(queries, 1);
  const scroller = { showScrollbar: true, scrollEnabled: true };
  callback([{ node: scroller }]);
  assert.equal(scroller.showScrollbar, false);
  assert.equal(scroller.scrollEnabled, true);
  callback([]);
  scroller.showScrollbar = true;
  instance.onUnload();
  callback([{ node: scroller }]);
  instance.configureMediaScroller();
  assert.equal(scroller.showScrollbar, true);
  assert.equal(queries, 1);
  const markup = source("pages/memory_create/memory_create.wxml");
  assert.match(markup, /id="mediaScroller" enhanced="{{true}}"/);
  assert.doesNotMatch(source("pages/memory_create/memory_create.wxss"), /scrollbar-mask|::-webkit-scrollbar/);
});

test("a media strip render acknowledgement cannot scroll an unloaded page", async () => {
  let options, rendered;
  const { instance } = page(
    "memory_create",
    { readOriginal: async (file) => file },
    {
      chooseMedia: (value) => {
        options = value;
      },
    },
  );
  instance.onLoad();
  const setData = instance.setData.bind(instance);
  instance.setData = (patch, callback) => {
    setData(patch);
    if (callback) rendered = callback;
  };
  instance.choose();
  await options.success({ tempFiles: [{ kind: "image", size: 100 }] });
  assert.equal(instance.data.mediaScrollTarget, "");
  instance.onUnload();
  rendered();
  assert.equal(instance.data.mediaScrollTarget, "");
});

test("upload retries only missing slots and preserves the same submission key", async () => {
  const original = service();
  const completed = new Set(),
    uploads = [],
    keys = [];
  let fail = true,
    submissions = 0;
  const memory = {
    ...original,
    async send(url, method, payload) {
      if (url === "/memory-drafts") {
        keys.push(payload.client_submission_id);
        return { id: 1, status: "draft" };
      }
      if (url.endsWith("/submit")) {
        submissions++;
        return { status: "received" };
      }
      return {
        media: [0, 1, 2].map((slot) => ({
          slot,
          state: completed.has(slot) ? "uploaded" : "empty",
        })),
      };
    },
    upload(id, slot) {
      uploads.push(slot);
      return {
        abort() {},
        promise: Promise.resolve().then(() => {
          if (slot === 0 && fail) {
            fail = false;
            throw new Error("network interrupted");
          }
          completed.add(slot);
        }),
      };
    },
  };
  const { instance } = page("memory_create", memory);
  instance.onLoad();
  instance.setData({
    files: [0, 1, 2].map((id) => ({
      id,
      kind: "image",
      size: 100,
      path: `photo-${id}`,
    })),
  });
  await instance.upload();
  assert.equal(instance.data.locked, false);
  assert.equal(submissions, 0);
  await instance.upload();
  assert.equal(submissions, 1);
  assert.equal(keys.length, 1);
  assert.equal(uploads.filter((slot) => slot === 0).length, 2);
  assert.equal(uploads.filter((slot) => slot === 1).length, 1);
  assert.equal(uploads.filter((slot) => slot === 2).length, 1);
});

test("a lost submission acknowledgement retries idempotent submit without re-uploading", async () => {
  let received = false,
    uploads = 0,
    submits = 0;
  const memory = {
    ...service(),
    async send(url) {
      if (url === "/memory-drafts")
        return { id: 1, status: received ? "processing" : "draft" };
      if (url.endsWith("/submit")) {
        submits++;
        if (received) return { status: "received" };
        received = true;
        throw new Error("acknowledgement lost");
      }
      return { media: [] };
    },
    upload() {
      uploads++;
      return { promise: Promise.resolve(), abort() {} };
    },
  };
  const { instance } = page("memory_create", memory);
  instance.onLoad();
  instance.setData({ files: [{ kind: "image", size: 100, path: "photo" }] });
  await instance.upload();
  assert.equal(instance._uploader.submitted, undefined);
  await instance.upload();
  assert.equal(instance._uploader.submitted, true);
  assert.equal(uploads, 1);
  assert.equal(submits, 2);
});

test("an abandoned page cancels a draft whose creation response arrived late", async () => {
  let finish;
  const calls = [];
  const memory = {
    ...service(),
    send(url, method) {
      calls.push({ url, method });
      return method === "POST"
        ? new Promise((resolve) => {
            finish = resolve;
          })
        : Promise.resolve({});
    },
  };
  const { instance } = page("memory_create", memory);
  instance.onLoad();
  instance.setData({ files: [{ kind: "image", size: 100, path: "photo" }] });
  const pending = instance.upload();
  instance.onUnload();
  finish({ id: 99, status: "draft" });
  await pending;
  assert.ok(
    calls.some(
      (call) => call.url === "/memory-drafts/99" && call.method === "DELETE",
    ),
  );
});

test("refreshing admin preview preserves selection only for an unchanged revision", async () => {
  let revision = 1;
  const memory = {
    ...service(),
    detail: async () => ({
      id: 1,
      revision,
      status: "pending",
      author: { nickname: "A" },
      media: [
        {
          id: 10,
          kind: "image",
          state: "ready",
          url: "/api/v1/memory-media/10",
        },
      ],
    }),
  };
  const { instance } = page("memory_detail", memory);
  instance.onLoad({ id: 1, admin: "1" });
  await instance.load();
  instance.selectMedia({ currentTarget: { dataset: { id: 10 } } });
  instance.setData({ reviewed: true });
  await instance.load();
  assert.equal(instance.data.selected[0], 10);
  assert.equal(instance.data.reviewed, true);
  revision++;
  await instance.load();
  assert.equal(instance.data.selected.length, 0);
  assert.equal(instance.data.reviewed, false);
  assert.equal(instance.onShareAppMessage().path, "/pages/memory/memory");
});

test("manual review confirmation is required and resets when selection changes", async () => {
  const memory = {
    ...service(),
    detail: async () => ({
      id: 1,
      revision: 1,
      status: "pending",
      author: {},
      media: [
        { id: 10, kind: "image", state: "ready" },
        { id: 11, kind: "video", state: "working" },
      ],
    }),
  };
  const { instance } = page("memory_detail", memory);
  instance.onLoad({ id: 1, admin: "1" });
  await instance.load();
  let opened = 0;
  instance.selectComponent = () => ({
    open() {
      opened++;
    },
  });
  instance.selectMedia({ currentTarget: { dataset: { id: 11 } } });
  assert.equal(instance.data.selected.length, 0);
  instance.selectMedia({ currentTarget: { dataset: { id: 10 } } });
  instance.askReview({ currentTarget: { dataset: { action: "publish" } } });
  assert.equal(opened, 0);
  instance.reviewed({ detail: { value: ["reviewed"] } });
  instance.askReview({ currentTarget: { dataset: { action: "publish" } } });
  assert.equal(opened, 1);
  instance.selectMedia({ currentTarget: { dataset: { id: 10 } } });
  assert.equal(instance.data.reviewed, false);
});

test("memory feed deduplicates cursor results and ignores late results after unloading", async () => {
  const responses = [
    { items: [{ id: 10, media: [{id: 1, kind: "image"}] }], cursor: "next" },
    {
      items: [
        { id: 10, media: [{id: 1, kind: "image"}] },
        { id: 20, media: [{id: 2, kind: "video"}] },
      ],
      cursor: null,
    },
  ];
  const memory = { ...service(), list: async () => responses.shift() };
  const { instance } = page("memory", memory);
  instance.onLoad();
  instance.onShow();
  await tick();
  instance.more();
  await tick();
  assert.deepEqual(
    Array.from(instance.data.items, (item) => item.id),
    [1, 2],
  );
  let finish;
  memory.list = () =>
    new Promise((resolve) => {
      finish = resolve;
    });
  instance.refresh();
  instance.onUnload();
  finish({ items: [{ id: 3, media: [] }], cursor: null });
  await tick();
  assert.deepEqual(
    Array.from(instance.data.items, (item) => item.id),
    [1, 2],
  );
});

test("public feed displays every published file as its own card and opens the corresponding file", async () => {
  let query, target;
  const api = {...service(), list: async values => {
    query = values;
    return {items: [{id: 70, media: [1,2,3,4,5].map(id => ({id, kind: id === 3 ? "video" : "image",
      thumbnail_url: `/cover-${id}.jpg`, width: 200, height: 300}))},
    {id: 80, media: [6,7].map(id => ({id, kind: "image", thumbnail_url: `/cover-${id}.jpg`}))}], cursor: null};
  }};
  const {instance} = page("memory", api, {navigateTo: options => {target = options.url;}});
  instance.onLoad(); instance.onShow(); await tick();
  assert.equal(query.individual, true);
  assert.equal(instance.data.items.length, 7);
  assert.deepEqual(Array.from(instance.data.items, item => item.id), [1,2,3,4,5,6,7]);
  assert.equal(instance.data.items[2].videoCover, true);
  assert.equal(instance.data.items[2].cover, "https://test.invalid/cover-3.jpg");
  instance.open({currentTarget: {dataset: {id: 3}}});
  assert.equal(target, "/pages/memory_detail/memory_detail?id=70&media_id=3");
  instance.open({currentTarget: {dataset: {id: 7}}});
  assert.equal(target, "/pages/memory_detail/memory_detail?id=80&media_id=7");
});

test("public detail and sharing start with the selected published file and reject unavailable targets", async () => {
  const api = {...service(), detail: async () => ({id: 70, media: [
    {id: 1, kind: "image"}, {id: 2, kind: "image"}, {id: 3, kind: "image"},
  ]})};
  const {instance} = page("memory_detail", api);
  instance.onLoad({id: "70", media_id: "3"});
  await instance.load();
  assert.equal(instance.data.index, 2);
  assert.equal(instance.data.current.id, 3);
  assert.equal(instance.data.viewerMedia.length, 3);
  assert.equal(instance.data.admin, false);
  assert.equal(instance.onShareAppMessage().path, "/pages/memory_detail/memory_detail?id=70&media_id=3");
  instance.change({detail: {current: 1}});
  await instance.load();
  assert.equal(instance.data.current.id, 2, "refresh must not jump back to the initial file");
  const missing = page("memory_detail", api).instance;
  missing.onLoad({id: "70", media_id: "99"}); await missing.load();
  assert.match(missing.data.error, /已下架/);
  assert.equal(missing.data.current, null);
});

test("only the memory tab routes plus to submission; guests see submission-specific copy", () => {
  let definition,
    route = "pages/memory/memory",
    target,
    dialog;
  const app = {
    globalData: {
      userRole: "user",
      isAuthenticated: true,
      accessToken: "token",
    },
  };
  vm.runInNewContext(source("custom-tab-bar/index.js"), {
    Component: (value) => {
      definition = value;
    },
    getApp: () => app,
    getCurrentPages: () => [
      {
        route,
        selectComponent: () => ({
          open: (value) => {
            dialog = value;
          },
        }),
      },
    ],
    wx: {
      navigateTo: ({ url }) => {
        target = url;
      },
      switchTab: ({ url }) => {
        target = url;
      },
    },
    require: () => ({}),
  });
  definition.methods.onCreateActivityTap();
  assert.equal(target, "/pages/memory_create/memory_create");
  app.globalData.userRole = "guest";
  definition.methods.onCreateActivityTap();
  assert.match(dialog.message, /投稿记忆/);
  route = "pages/profile/profile";
  app.globalData.userRole = "user";
  definition.methods.onCreateActivityTap();
  assert.equal(target, "/pages/activity_list/activity_list");
  assert.equal(app.globalData.pendingOpenCreateActivity, true);
});

function viewer(kind = "image") {
  const calls = [];
  const context = Object.fromEntries(
    ["play", "pause", "seek", "requestFullScreen", "exitFullScreen"].map(
      (name) => [name, (value) => calls.push({ name, value })],
    ),
  );
  const result = page("memory_detail", service(), {
    createVideoContext: () => context,
  });
  result.instance.onLoad({ id: 1 });
  result.instance._visible = true;
  result.instance.setData({
    memory: {
      media: [{ id: 10, kind, width: 390, height: 844, duration: 30 }],
    },
  });
  result.instance.activate();
  return { ...result, calls };
}

test("caption counts Unicode code points and original mixed selections can be previewed", () => {
  let preview;
  const { instance } = page("memory_create", service(), {
    previewMedia: (options) => {
      preview = options;
    },
  });
  instance.onLoad();
  assert.equal(
    instance.caption({ detail: { value: "\u{1f600}".repeat(51) } }),
    "\u{1f600}".repeat(50),
  );
  assert.equal(instance.data.captionCount, 50);
  instance.setData({
    files: [
      { kind: "image", path: "photo" },
      { kind: "video", path: "clip", thumbnail: "cover" },
    ],
  });
  instance.preview({ currentTarget: { dataset: { index: 1 } } });
  assert.equal(preview.current, 1);
  assert.equal(preview.sources[1].url, "clip");
  assert.equal(preview.sources[1].type, "video");
  assert.equal(preview.sources[1].poster, "cover");
});

test("photo pinch is anchored, bounded and locks paging until restored", () => {
  const { instance } = viewer();
  assert.equal(instance.pagerAllowed(), true);
  instance.photoScale({ state: 1, focalX: 195, focalY: 422 });
  assert.equal(instance.pagerAllowed(), false);
  instance.photoScale({ state: 2, focalX: 195, focalY: 422, scale: 8 });
  instance.photoScale({ state: 3 });
  assert.equal(instance._scale.value, 4);
  assert.equal(instance.data.zoomed, true);
  instance.photoPan({ state: 2, deltaX: 9999, deltaY: -9999 });
  assert.equal(instance._x.value, 585);
  assert.equal(instance._y.value, -1266);
  instance.change({ detail: { current: 1 } });
  assert.equal(instance.data.index, 0);
  instance.restorePhoto();
  assert.equal(instance._scale.value, 1);
  assert.equal(instance._x.value, 0);
  assert.equal(instance._y.value, 0);
  assert.equal(instance.data.zoomed, false);
  assert.equal(instance.pagerAllowed(), true);
  assert.match(instance._animatedStyle.updater().transform, /scale\(1\)/);
});

test("double tap toggles 200 percent zoom; near-fit cancelled pinch releases paging", () => {
  const { instance } = viewer();
  instance.photoDoubleTap({ state: 3, absoluteX: 195, absoluteY: 422 });
  assert.equal(instance._scale.value, 2);
  instance.photoDoubleTap({state: 3, absoluteX: 100, absoluteY: 300});
  assert.equal(instance._scale.value, 1);
  assert.equal(instance._x.value, 0);
  assert.equal(instance._y.value, 0);
  assert.equal(instance.data.zoomed, false);
  instance.photoDoubleTap({state: 3, absoluteX: 195, absoluteY: 422});
  instance.back();
  assert.equal(instance.data.zoomed, false);
  instance.photoScale({ state: 1, focalX: 195, focalY: 422 });
  instance.photoScale({ state: 2, focalX: 195, focalY: 422, scale: 1.01 });
  instance.photoScale({ state: 4 });
  assert.equal(instance._scale.value, 1);
  assert.equal(instance.pagerAllowed(), true);
});

test("PC photo double clicks enlarge and restore with an actual inline image transform", () => {
  const {instance} = viewer();
  instance.renderer = "webview";
  const tap = (time, x = 195, y = 422) => instance.photoTap({timeStamp: time,
    currentTarget: {dataset: {id: 10}}, detail: {x, y}});
  tap(100);
  assert.equal(instance.data.zoomed, false, "single clicks do not zoom");
  tap(200);
  assert.equal(instance.data.zoomed, true);
  assert.equal(instance._scale.value, 2);
  assert.equal(instance.data.photoTransformStyle, "transform:translate(0px, 0px) scale(2);");
  assert.equal(instance.pagerAllowed(), false);
  tap(500); tap(600);
  assert.equal(instance.data.zoomed, false);
  assert.equal(instance.data.photoTransformStyle, "");
  assert.equal(instance._scale.value, 1);
  assert.equal(instance.pagerAllowed(), true);
  tap(1000, 50, 300); tap(1100, 50, 300);
  assert.ok(instance._x.value > 0);
  instance.restorePhoto();
  assert.equal(instance.data.photoTransformStyle, "");
  assert.equal(instance._photoTap, null);
  instance.onUnload();
});

test("photo taps cannot pair across time, distant positions, pages or a hidden viewer", () => {
  const {instance} = viewer();
  instance.renderer = "webview";
  const tap = (time, x = 195, id = 10) => instance.photoTap({timeStamp: time,
    currentTarget: {dataset: {id}}, changedTouches: [{clientX: x, clientY: 422}]});
  tap(100); tap(500);
  assert.equal(instance.data.zoomed, false);
  tap(600, 300);
  assert.equal(instance.data.zoomed, false);
  tap(700, 300, 99);
  assert.equal(instance.data.zoomed, false);
  instance.data.memory.media.push({id: 11, kind: "image", width: 500, height: 3000});
  instance.change({detail: {current: 1}});
  tap(750, 300, 11);
  assert.equal(instance.data.zoomed, false);
  instance.onHide();
  tap(800, 300, 11);
  assert.equal(instance.data.zoomed, false);
  assert.equal(instance._photoTap, null);
  instance.onUnload();
});

test("ordinary photo taps do not double-handle Skyline gestures or toggle videos", () => {
  for (const kind of ["image", "video"]) {
    const {instance} = viewer(kind);
    instance.renderer = kind === "image" ? "skyline" : "webview";
    instance.photoTap({timeStamp: 100, detail: {x: 195, y: 422}});
    instance.photoTap({timeStamp: 200, detail: {x: 195, y: 422}});
    assert.equal(instance.data.zoomed, false);
    assert.equal(instance.data.photoTransformStyle, "");
    instance.onUnload();
  }
  const markup = source("pages/memory_detail/memory_detail.wxml");
  assert.match(markup, /class="viewer-photo-stage" data-id="\{\{item.id\}\}" bindtap="photoTap"/);
  assert.match(markup, /\{\{photoTransformStyle\}\}/);
  assert.match(markup, /bindtap="restorePhoto" aria-label="还原适宽"[^>]*><image[^>]*memory-restore\.svg[^>]*\/><text>还原适宽<\/text>/);
});

test("review title matches the 20px Pencil text and safe area scrolls with the list instead of forming a fixed bar", () => {
  const markup = source("pages/memory_review/memory_review.wxml");
  const styles = source("pages/memory_review/memory_review.wxss");
  assert.match(markup, /<view class="memory-nav-title review-filter"[^>]*aria-role="button"/);
  assert.doesNotMatch(markup, /<button class="memory-nav-title/);
  assert.match(styles, /\.review-filter text\s*\{[^}]*font-size:\s*20px;[^}]*line-height:\s*1\.4;[^}]*font-weight:\s*700;/);
  assert.match(markup, /class="memory-body review-stage">/);
  assert.match(markup, /class="review-list" style="padding-bottom:\{\{bottom \+ 30\.76923\}\}rpx;"/);
  assert.doesNotMatch(markup, /margin-bottom:\{\{bottom\}\}/);
  assert.match(markup, /<view class="review-title-copy"><text>/);
  assert.match(styles, /\.review-filter image\s*\{[^}]*position:\s*absolute;[^}]*left:\s*100%;/);
});

test("preview preloads full images on both sides and never shows a loading label while paging", () => {
  const {instance}=viewer();
  const prepared=[];
  instance._memoryImages={prepare(urls,preload){prepared.push({urls,preload});},dispose(){}};
  instance.data.memory.media=[0,1,2,3,4].map(id=>({id,kind:"image",url:`https://test.invalid/${id}.jpg`,thumbnail_url:`https://test.invalid/${id}-thumb.jpg`}));
  instance.data.index=2;
  instance.preparePreviewImages();
  assert.deepEqual(Array.from(prepared[0].preload),["https://test.invalid/2.jpg","https://test.invalid/3.jpg","https://test.invalid/1.jpg"]);
  instance.data.index=0;
  instance.preparePreviewImages();
  assert.equal(prepared[1].preload.length,2);
  instance.data.memory=null; instance.data.viewerMedia=[];
  assert.doesNotThrow(()=>instance.preparePreviewImages());
  const markup=source("pages/memory_detail/memory_detail.wxml");
  assert.match(markup,/cache-extent="1"/);
  assert.match(markup,/wx:if="\{\{loading && !memory\}\}" class="memory-state"/);
  assert.doesNotMatch(markup,/loading \|\| imageLoading \|\| videoLoading/);
  assert.match(markup,/imageSources\[item.url\] \|\| imageSources\[item.thumbnail_url\]/);
  instance.onUnload();
});

test("short landscape photos cannot pan into blank space vertically", () => {
  const { instance } = viewer();
  instance.data.memory.media[0].width = 1920;
  instance.data.memory.media[0].height = 1080;
  instance.activate();
  instance.photoDoubleTap({ state: 3, absoluteX: 195, absoluteY: 422 });
  instance.photoPan({ state: 2, deltaX: 1000, deltaY: 1000 });
  assert.equal(instance._y.value, 0);
  assert.equal(instance._x.value, 195);
});

test("active video autoplays with sound only while its page is visible", () => {
  const { instance, calls } = viewer("video");
  assert.equal(instance.data.playing, false);
  assert.equal(instance.data.muted, false);
  const markup = source("pages/memory_detail/memory_detail.wxml");
  assert.match(markup, /autoplay="\{\{visible && !pausedByUser && !selectionOpen\}\}"/);
  assert.match(markup, /loop="\{\{true\}\}"/);
  assert.doesNotMatch(markup, /bindended=/);
  assert.match(markup, /mediaIndex === index/);
  assert.equal(calls.length, 0);
  instance.playVideo();
  assert.equal(instance.data.muted, false);
  assert.equal(calls.at(-1).name, "play");
  instance.videoTime({
    currentTarget: { dataset: { id: 99 } },
    detail: { currentTime: 25, duration: 30 },
  });
  assert.equal(instance._currentTime, 0);
  instance.videoTime({
    currentTarget: { dataset: { id: 10 } },
    detail: { currentTime: 15, duration: 30 },
  });
  assert.equal(instance.data.progress, 50);
  assert.equal(instance.data.currentLabel, "0:15");
  instance.onHide();
  assert.equal(calls.at(-1).name, "pause");
  instance.videoPlay({currentTarget: {dataset: {id: 10}}});
  assert.equal(instance.data.playing, false);
});

test("slider seeking pauses then resumes only a video that was playing", () => {
  const { instance, calls } = viewer("video");
  instance.setData({ playing: true });
  instance.seekChanging({ detail: { value: 750 } });
  instance.videoPause({ currentTarget: { dataset: { id: 10 } } });
  assert.equal(instance.data.seeking, true);
  assert.equal(instance.data.currentLabel, "0:22");
  instance.seekChanged({ detail: { value: 1000 } });
  assert.equal(calls.find((call) => call.name === "seek").value, 30);
  assert.equal(calls.at(-1).name, "play");
  instance.setData({ playing: false });
  calls.length = 0;
  instance.seekChanged({ detail: { value: 0 } });
  assert.equal(calls.at(-1).name, "seek");
  assert.equal(instance.data.progress, 0);
});

test("portrait progress is hidden until a bottom-region drag, then hides three seconds after release", () => {
  const {instance, calls, timers} = viewer("video");
  assert.equal(instance.data.progressVisible, false);
  instance.setData({visible: true, playing: true});
  assert.equal(instance.portraitSeekAllowed({absoluteY: 750}), true);
  assert.equal(instance.portraitSeekAllowed({absoluteY: 200}), false);
  instance._currentTime = 10;
  instance.portraitVideoDrag({state: 1});
  assert.equal(instance.data.seeking, true);
  assert.equal(instance.pagerAllowed(), false);
  assert.equal(calls.at(-1).name, "pause");
  instance.portraitVideoDrag({state: 2, deltaX: 179});
  assert.equal(instance.data.seekCurrentLabel, "00:25");
  assert.equal(instance.data.seekDurationLabel, "00:30");
  instance.portraitVideoDrag({state: 3});
  assert.equal(calls.find(call => call.name === "seek").value, 25);
  assert.equal(calls.at(-1).name, "play");
  assert.equal(instance.data.progressVisible, true);
  assert.equal(instance.data.seeking, false);
  assert.equal(instance.pagerAllowed(), true);
  const hide = timers.get(instance._progressTimer);
  assert.equal(typeof hide, "function");
  hide();
  assert.equal(instance.data.progressVisible, false);
  instance.onUnload();
});

test("ordinary pointer events seek PC review video through the same state machine", () => {
  const {instance, calls} = viewer("video");
  instance.renderer = "webview";
  instance._admin = true;
  instance.setData({visible: true, playing: true, admin: true});
  instance._currentTime = 10;
  const point = (x,y) => ({identifier: 0, clientX: x, clientY: y});
  instance.portraitTouchStart({touches: [point(100, 680)]});
  instance.portraitTouchMove({touches: [point(102, 680)]});
  assert.equal(instance.data.seeking, false, "click jitter is not seeking");
  instance.portraitTouchMove({touches: [point(279, 680)]});
  assert.equal(instance.data.seeking, true);
  assert.equal(instance.data.seekCurrentLabel, "00:25");
  instance.portraitTouchEnd({changedTouches: [point(300, 680)]});
  assert.equal(instance.data.seeking, false);
  assert.equal(instance.data.progressVisible, true);
  assert.equal(calls.filter(call => call.name === "seek").length, 1);
  assert.equal(calls.at(-1).name, "play");
  assert.equal(instance._portraitTouch, null);
  const markup = source("pages/memory_detail/memory_detail.wxml");
  assert.match(markup, /class="memory-viewer" bindtouchmove="portraitTouchMove" bindtouchend="portraitTouchEnd" bindtouchcancel="portraitTouchCancel"/);
  const controls = source("pages/memory_detail/memory-controls.wxml");
  assert.equal((controls.match(/bindtouchstart="portraitTouchStart"/g) || []).length, 2);
  instance.onUnload();
});

test("pointer seeking does not steal vertical scrolling, replay paused video or duplicate Skyline gestures", () => {
  const {instance, calls} = viewer("video");
  instance.renderer = "webview";
  instance._currentTime = 10;
  instance.setData({visible: true, pausedByUser: true});
  const point = (x,y) => ({identifier: 0, clientX: x, clientY: y});
  instance.portraitTouchStart({touches: [point(100, 680)]});
  instance.portraitTouchMove({touches: [point(101, 710)]});
  instance.portraitTouchEnd({changedTouches: [point(130, 711)]});
  assert.equal(instance.data.seeking, false);
  assert.equal(calls.length, 0);
  instance.portraitTouchStart({touches: [point(100, 680)]});
  instance.portraitTouchMove({touches: [point(179, 680)]});
  instance.portraitTouchCancel();
  assert.equal(instance.data.currentLabel, "0:10");
  assert.equal(calls.some(call => call.name === "seek" || call.name === "play"), false);
  instance.renderer = "skyline";
  calls.length = 0;
  instance.portraitTouchStart({touches: [point(100, 680)]});
  instance._portraitDragging.value = true;
  instance.portraitTouchEnd({changedTouches: [point(200, 680)]});
  assert.equal(calls.length, 0);
  assert.equal(instance._portraitDragging.value, true, "raw events cannot clear a Skyline-owned gesture");
  instance.onUnload();
});

test("portrait dragging clamps both ends, supports backward seek and preserves a user-paused video", () => {
  const {instance, calls, timers} = viewer("video");
  instance.setData({pausedByUser: true});
  instance._currentTime = 15;
  instance.dragSeek(1, 0, true);
  instance.dragSeek(2, -9999, true);
  assert.equal(instance.data.progress, 0);
  instance.dragSeek(3, 0, true);
  assert.equal(calls.at(-1).name, "seek");
  assert.equal(calls.at(-1).value, 0);
  assert.equal(instance.data.pausedByUser, true);
  assert.equal(instance.data.progressVisible, true);
  timers.get(instance._progressTimer)();
  assert.equal(instance.data.progressVisible, false, "paused videos also hide the progress bar after three seconds");
  instance.dragSeek(1, 0, true);
  instance.dragSeek(2, 9999, true);
  assert.equal(instance.data.progress, 100);
  instance.dragSeek(3, 0, true);
  assert.equal(calls.at(-1).value, 30);
  instance.onUnload();
});

test("cancelled portrait gestures restore playback position, and a new drag cancels the old hide timer", () => {
  const {instance, calls, timers} = viewer("video");
  instance._currentTime = 12;
  instance.setData({playing: true});
  instance.dragSeek(1, 0, true);
  instance.dragSeek(2, 100, true);
  instance.dragSeek(4, 0, true);
  assert.equal(calls.some(call => call.name === "seek"), false);
  assert.equal(instance.data.currentLabel, "0:12");
  const oldTimer = instance._progressTimer;
  const oldHide = timers.get(oldTimer);
  instance.dragSeek(1, 0, true);
  assert.equal(timers.has(oldTimer), false);
  assert.equal(instance.data.progressVisible, false);
  instance.dragSeek(3, 0, true);
  oldHide();
  assert.equal(instance.data.progressVisible, true, "a late prior timer cannot shorten the new three-second window");
  instance.onHide();
  assert.equal(instance.data.seeking, false);
  assert.equal(instance.data.progressVisible, false);
  assert.equal(timers.size, 0);
});

test("portrait gestures exclude review buttons, hidden pages, images and loading video", () => {
  const {instance} = viewer("video");
  instance._admin = true;
  instance.setData({visible: true});
  instance.activate();
  assert.equal(instance.portraitSeekAllowed({absoluteY: 680}), true);
  assert.equal(instance.portraitSeekAllowed({absoluteY: 800}), false, "review footer cannot seek");
  for (const values of [{selectionOpen: true}, {busy: true}, {videoLoading: true}, {error: "failed"}, {fullScreen: true}, {visible: false}]) {
    const previous = {...instance.data};
    instance.setData(values);
    assert.equal(instance.portraitSeekAllowed({absoluteY: 680}), false);
    instance.setData(previous);
  }
  instance.data.current.kind = "image";
  assert.equal(instance.portraitSeekAllowed({absoluteY: 680}), false);
});

test("late portrait gesture events and progress timers cannot seek or hide the next video", () => {
  const {instance, calls, timers} = viewer("video");
  instance.dragSeek(1, 0, true, instance.data.videoGeneration);
  instance.dragSeek(3, 0, true, instance.data.videoGeneration);
  const hide = timers.get(instance._progressTimer);
  const generation = instance.data.videoGeneration;
  instance.activate();
  calls.length = 0;
  instance.dragSeek(1, 0, true, generation);
  assert.equal(instance.data.seeking, false);
  assert.equal(calls.length, 0);
  instance.setData({progressVisible: true});
  hide();
  assert.equal(instance.data.progressVisible, true);
  instance.onUnload();
});

test("resizing updates the portrait gesture region without restarting video and refits images without cropping", () => {
  const video = viewer("video");
  video.instance.setData({playing: true, visible: true});
  video.instance._currentTime = 12;
  const generation = video.instance.data.videoGeneration;
  video.wx.getWindowInfo = () => ({windowWidth: 320, windowHeight: 568, statusBarHeight: 20});
  video.instance.onResize();
  assert.equal(video.instance.data.videoGeneration, generation);
  assert.equal(video.instance._currentTime, 12);
  assert.equal(video.instance.data.playing, true);
  assert.equal(video.calls.length, 0);
  assert.equal(video.instance.portraitSeekAllowed({absoluteY: 510}), true);
  assert.equal(video.instance.portraitSeekAllowed({absoluteY: 750}), false);
  const photo = viewer();
  photo.instance.photoDoubleTap({state: 3, absoluteX: 195, absoluteY: 422});
  photo.wx.getWindowInfo = video.wx.getWindowInfo;
  photo.instance.onResize();
  assert.equal(photo.instance.data.zoomed, false);
  assert.ok(photo.instance.data.photoWidth <= 320);
  assert.ok(photo.instance.data.photoHeight <= 568);
  assert.ok(photo.instance.data.photoLeft >= 0 && photo.instance.data.photoTop >= 0);
});

test("preview bottom information and controls are children of each media slide, not a fixed page overlay", () => {
  const markup = source("pages/memory_detail/memory_detail.wxml");
  const controls = source("pages/memory_detail/memory-controls.wxml");
  const slide = markup.slice(markup.indexOf('<swiper-item'), markup.indexOf('</swiper-item>'));
  assert.match(slide, /is="memory-portrait-bottom"/);
  assert.match(slide, /memory:viewerInfo\[mediaIndex\],current:item/);
  assert.match(slide, /active:mediaIndex === index/);
  assert.match(slide, /seeking:mediaIndex === index && seeking/);
  assert.match(slide, /progressVisible:mediaIndex === index && progressVisible/);
  assert.doesNotMatch(markup.slice(markup.indexOf('</swiper>')), /is="memory-portrait-bottom"|class="viewer-bottom"/);
  const bottom = controls.slice(controls.indexOf('<template name="memory-portrait-bottom">'), controls.indexOf('<template name="memory-fullscreen">'));
  assert.match(bottom, /class="viewer-info /);
  assert.match(bottom, /class="viewer-footer"/);
  assert.match(bottom, /class="viewer-portrait-timeline"/);
  assert.match(bottom, /disabled="\{\{busy \|\| !active\}\}"/);
});

test("offscreen portrait metadata cannot start seeking the active PC video", () => {
  const {instance} = viewer("video");
  instance.renderer = "webview";
  instance.setData({visible: true});
  instance.portraitTouchStart({currentTarget: {dataset: {mediaId: 99}},
    touches: [{identifier: 0, clientX: 100, clientY: 680}]});
  assert.equal(instance._portraitTouch, null);
  instance.onUnload();
});

test("public preview keeps submission metadata attached to every media page", async () => {
  const api = service();
  api.detail = async () => ({id: 7, caption: "今晚的桌游局", author: {nickname: "小雨"},
    activity_name: "周末桌游夜", location_name: "龙城桌游馆", media: [
      {id: 20, kind: "image", state: "ready", publication_status: "published"},
      {id: 21, kind: "video", state: "ready", publication_status: "published", duration: 8}]});
  const {instance} = page("memory_detail", api);
  instance.onLoad({id: "7"});
  await instance.load();
  assert.equal(instance.data.viewerInfo.length, 2);
  assert.deepEqual(Array.from(instance.data.viewerInfo, item => item.caption), ["今晚的桌游局", "今晚的桌游局"]);
  instance.change({detail: {current: 1}});
  assert.equal(instance.data.current.id, 21);
  assert.equal(instance.data.viewerInfo[0].author.nickname, "小雨");
  assert.equal(instance.data.viewerInfo[1].activity_name, "周末桌游夜");
  instance.onUnload();
});

test("portrait controls match the Pencil component geometry without moving metadata or changing fullscreen controls", () => {
  const markup = source("pages/memory_detail/memory_detail.wxml");
  const controls = source("pages/memory_detail/memory-controls.wxml");
  const styles = source("pages/memory_detail/memory_detail.wxss");
  assert.match(controls, /worklet:should-accept-gesture="portraitSeekAllowed" worklet:ongesture="portraitVideoDrag"/);
  assert.match(markup, /wx:if="\{\{!zoomed && !fullScreen\}\}" is="memory-portrait-bottom"/);
  assert.match(controls, /class="viewer-activity-name" max-lines="1"/);
  assert.match(controls, /class="viewer-activity-divider">丨<\/text>/);
  assert.match(controls, /class="viewer-activity-time"/);
  assert.doesNotMatch(markup, /viewer-image-progress-space|viewer-info--admin/);
  assert.match(controls, /template name="memory-portrait-seek"/);
  assert.match(controls, /progressVisible && !seeking/);
  assert.match(styles, /\.portrait-seek\s*\{[^}]*gap:\s*69\.23077rpx/);
  assert.match(styles, /\.portrait-seek-time\s*\{[^}]*height:\s*61\.53846rpx/);
  assert.match(styles, /\.portrait-seek-track\s*\{[^}]*height:\s*19\.23077rpx/);
  assert.match(styles, /\.portrait-seek-thumb\s*\{[^}]*width:\s*13\.46154rpx;[^}]*height:\s*26\.92308rpx/);
  assert.match(styles, /transition:\s*opacity 200ms ease-out/);
  assert.match(controls, /template name="memory-fullscreen"/);
  assert.match(controls, /worklet:ongesture="videoDrag"/);
});

test("a single video tap pauses immediately and the next single tap resumes without a timer", () => {
  const {instance, calls, timers} = viewer("video");
  instance.videoPlay({currentTarget: {dataset: {id: 10}}});
  instance.videoTap();
  assert.equal(calls.at(-1).name, "pause");
  assert.equal(instance.data.playing, false);
  assert.equal(instance.data.pausedByUser, true);
  assert.equal(instance.data.controlsVisible, true);
  assert.equal(timers.size, 0);
  instance.videoTap();
  assert.equal(calls.at(-1).name, "play");
  assert.equal(instance.data.pausedByUser, false);
  assert.equal(timers.size, 0);
  instance.setData({fullScreen: true, playing: true});
  instance.videoTap();
  assert.equal(calls.at(-1).name, "pause");
});

async function downloadingViewer(emitPlay = true) {
  const api = service(), downloads = [], calls = [], removed = [];
  const submission = {id: 7, status: "published", revision: 3, media: [61, 62].map(id => ({
    id, kind: "video", state: "ready", publication_status: "published", duration: 8,
    url: `https://test.invalid/${id}.mp4`, thumbnail_url: `https://test.invalid/${id}.jpg`,
  }))};
  api.detail = async () => structuredClone(submission);
  const result = page("memory_detail", api, {
    createVideoContext: () => ({play() {calls.push("play");}, pause() {calls.push("pause");}, seek(time) {calls.push({seek: time});}}),
    downloadFile(options) {
      if (/\.jpg(?:\?|$)/.test(options.url)) {
        options.success({statusCode:200,tempFilePath:'thumb-'+options.url}); return {abort(){}};
      }
      const job = {options, aborted: false}; downloads.push(job);
      return {abort() {job.aborted = true;}};
    },
    getFileSystemManager: () => ({unlink: ({filePath,success}) => {removed.push(filePath); if (success) success();},
      getFileInfo: options => options.success({size: 1024})}),
  });
  const instance = result.instance;
  instance.onLoad({id: "7"}); instance.onShow(); await tick();
  if (emitPlay) {
    instance.videoPlay({currentTarget: {dataset: {id: 61, generation: instance.data.videoGeneration}}});
    instance.videoTime({currentTarget: {dataset: {id: 61, generation: instance.data.videoGeneration}},detail:{currentTime:0.1,duration:8}});
  }
  const finish = index => {
    downloads[index].options.success({statusCode: 200, tempFilePath: `video-cache-${index}`});
  };
  return {...result, api, submission, calls, downloads, removed, finish};
}

test("network video mounts and autoplays with sound before any download completes; only next is preloaded", async () => {
  const {instance, calls, downloads, finish} = await downloadingViewer();
  assert.equal(instance.data.videoLoading, false);
  assert.equal(instance.data.videoMounted, true);
  assert.equal(downloads.length, 1);
  assert.equal(instance.data.videoSource, "https://test.invalid/61.mp4");
  assert.equal(downloads[0].options.url, "https://test.invalid/62.mp4");
  assert.equal(calls.includes("play"), true);
  finish(0); await tick();
  assert.equal(instance.data.videoSource, "https://test.invalid/61.mp4", "a background completion cannot remount the current player");
  assert.equal(instance.data.videoMounted, true);
  assert.equal(instance.data.videoLoading, false);
  assert.equal(instance.data.muted, false);
  assert.equal(instance.data.videoPoster, "https://test.invalid/61.jpg");
  assert.equal(calls.at(-1), "play");
  assert.equal(downloads.length, 1);
  instance.onUnload();
});

test("loading completion and late native play cannot override a single-tap pause", async () => {
  const {instance, calls, finish} = await downloadingViewer();
  instance.videoTap();
  assert.equal(instance.data.pausedByUser, true);
  calls.length = 0;
  finish(0); await tick();
  assert.equal(instance.data.videoMounted, true);
  assert.equal(calls.includes("play"), false);
  instance.startVideo({currentTarget: {dataset: {id: 61, generation: instance.data.videoGeneration}}});
  instance.videoPlay({currentTarget: {dataset: {id: 61, generation: instance.data.videoGeneration}}});
  assert.equal(instance.data.playing, false);
  assert.equal(calls.at(-1), "pause");
  instance.videoTap(); assert.equal(calls.at(-1), "play");
  instance.onUnload();
});

test("single tap can pause between the play request and its native event; preloads cannot race initial buffering", async () => {
  const {instance, downloads, calls} = await downloadingViewer(false);
  assert.equal(instance.data.videoMounted,true);
  assert.equal(instance.data.videoSource,"https://test.invalid/61.mp4");
  assert.equal(downloads.length,0);
  instance.videoTap();
  assert.equal(instance.data.pausedByUser,true);
  instance.videoPlay({currentTarget: {dataset: {id:61,generation:instance.data.videoGeneration}}});
  assert.equal(calls.at(-1),"pause");
  assert.equal(downloads.length,0);
  instance.videoTap();
  instance.videoPlay({currentTarget: {dataset: {id:61,generation:instance.data.videoGeneration}}});
  instance.videoTime({currentTarget: {dataset: {id:61,generation:instance.data.videoGeneration}},detail:{currentTime:0.1,duration:8}});
  assert.equal(downloads.length,1);
  instance.onUnload();
});

test("a failed background preload cannot interrupt the current network video", async () => {
  const {instance, downloads, calls} = await downloadingViewer();
  downloads[0].options.fail({errno: 5});
  assert.equal(instance.data.videoSource,"https://test.invalid/61.mp4");
  assert.equal(instance.data.videoMounted,true);
  assert.equal(instance.data.error,"");
  assert.equal(instance._videoRetries,0);
  assert.equal(calls.at(-1),"play");
  instance.onUnload();
});

test("swiping back reuses the previous local file and rejects old events for the same media ID", async () => {
  const {instance, calls, downloads, finish} = await downloadingViewer();
  finish(0); await tick();
  const oldGeneration = instance.data.videoGeneration;
  instance.change({detail: {current: 1}}); await tick();
  assert.equal(instance.data.videoSource, "video-cache-0");
  instance.videoPlay({currentTarget: {dataset: {id:62,generation:instance.data.videoGeneration}}});
  instance.videoTime({currentTarget: {dataset: {id:62,generation:instance.data.videoGeneration}},detail:{currentTime:0.1,duration:8}});
  finish(1); await tick();
  instance.change({detail: {current: 0}}); await tick();
  assert.equal(instance.data.videoSource, "video-cache-1");
  assert.equal(downloads.length, 2);
  assert.equal(calls.at(-1), "play");
  const stale = {currentTarget: {dataset: {id: 61, generation: oldGeneration}}, detail: {errMsg: "old decoder"}};
  instance.mediaError(stale); instance.videoPlay(stale);
  assert.equal(instance.data.error, "");
  assert.equal(instance.data.playing, false);
  assert.equal(instance._videoRetries, 0);
  instance.onUnload();
});

test("native playback failure renews the source and remounts once without overriding user pause", async () => {
  const {instance, api, calls, downloads, removed, finish, submission} = await downloadingViewer();
  finish(0); await tick();
  let detailCalls = 0;
  api.detail = async () => {
    detailCalls++;
    const fresh = structuredClone(submission); fresh.revision = 99;
    fresh.media[0].url += "?renewed=1";
    return fresh;
  };
  instance.mediaError({currentTarget: {dataset: {id: 61, generation: instance.data.videoGeneration}}, detail: {errMsg: "Format error"}});
  assert.equal(instance.data.videoMounted, false);
  instance.videoTap();
  await tick();
  assert.equal(detailCalls, 1);
  assert.equal(removed.includes("video-cache-0"), false, "unrelated next-video preloads remain intact");
  assert.match(downloads[1].options.url, /renewed=1/);
  calls.length = 0; finish(1); await tick();
  assert.equal(instance.data.videoSource, "video-cache-1");
  assert.equal(instance.data.memory.revision, 3, "refreshing playback must not silently accept a newer review revision");
  assert.equal(calls.includes("play"), false);
  instance.mediaError({currentTarget: {dataset: {id: 61, generation: instance.data.videoGeneration}}, detail: {errMsg: "Format error"}});
  await tick();
  assert.equal(detailCalls, 1);
  assert.equal(instance.data.error, "媒体加载失败，请刷新重试");
  assert.equal(instance.data.videoLoading, false);
  instance.onUnload();
});

test("leaving before download completion cannot mount or autoplay an obsolete video", async () => {
  const {instance, calls, removed, finish, downloads} = await downloadingViewer();
  calls.length = 0;
  instance.onHide(); finish(0); await tick();
  assert.equal(downloads[0].aborted, true);
  assert.equal(instance.data.videoMounted, false);
  assert.equal(calls.includes("play"), false);
  assert.equal(removed.includes("video-cache-0"), true);
});

test("video poster never receives a downloaded image path or local HTTP URL", () => {
  const {instance} = viewer("video");
  instance.data.memory.media[0].thumbnail_url = "http://192.168.10.2:8002/cover.jpg";
  instance.activate();
  assert.equal(instance.data.videoPoster, "");
  const markup = source("pages/memory_detail/memory_detail.wxml");
  assert.match(markup, /poster="\{\{videoPoster\}\}"/);
  assert.doesNotMatch(markup, /poster="\{\{imageSources/);
  assert.match(markup, /bindloadedmetadata="videoMetadata"/);
});

test("background return preserves the selected video, playhead and user pause after fresh server validation", async () => {
  const {instance, finish, calls} = await downloadingViewer();
  finish(0); instance.change({detail:{current:1}}); await tick();
  const event = () => ({currentTarget:{dataset:{id:62,generation:instance.data.videoGeneration}},detail:{currentTime:4,duration:8}});
  instance.videoPlay(event()); instance.videoTime(event()); instance.videoTap();
  assert.equal(instance.data.pausedByUser,true);
  instance.onHide(); calls.length=0; instance.onShow(); await tick();
  assert.equal(instance.data.current.id,62);
  assert.equal(instance.data.videoInitialTime,4);
  assert.equal(instance.data.pausedByUser,true);
  assert.equal(calls.includes('play'),false);
  instance.videoMetadata(event()); instance.videoMetadata(event());
  assert.deepEqual(calls.filter(value=>value.seek),[{seek:4}]);
  assert.equal(calls.includes('play'),false);
  instance.videoTap();assert.equal(calls.at(-1),'play');instance.onUnload();
});

test("a playing video resumes at its playhead; stale metadata cannot seek the fresh player", async () => {
  const {instance,calls} = await downloadingViewer();
  const old={currentTarget:{dataset:{id:61,generation:instance.data.videoGeneration}},detail:{currentTime:3,duration:8}};
  instance.videoTime(old);instance.onHide();calls.length=0;instance.onShow();await tick();
  assert.equal(instance.data.videoInitialTime,3);assert.equal(instance.data.pausedByUser,false);
  instance.videoMetadata(old);assert.equal(calls.some(value=>value.seek),false);
  instance.videoMetadata({currentTarget:{dataset:{id:61,generation:instance.data.videoGeneration}}});
  assert.ok(calls.some(value=>value.seek===3));instance.onUnload();
});

test("background revalidation cannot restore media removed by the server",async()=>{
  const {instance,api,calls} = await downloadingViewer();
  instance.onHide();api.detail=async()=>({id:7,media:[]});calls.length=0;
  instance.onShow();await tick();
  assert.equal(instance.data.videoMounted,false);
  assert.equal(calls.includes('play'),false);
  assert.match(instance.data.error,/不可用|下架/);instance.onUnload();
});

test("mixed neighbours share the video buffering gate; only one offscreen image downloads after first progress",async()=>{
  const api=service(), jobs=[];
  api.detail=async()=>({id:7,media:[{id:1,kind:'image',url:'https://test.invalid/one.jpg'},
    {id:2,kind:'video',duration:8,url:'https://test.invalid/clip.mp4'},
    {id:3,kind:'image',url:'https://test.invalid/three.jpg'}]});
  const {instance}=page('memory_detail',api,{
    createVideoContext:()=>({play(){},pause(){}}),
    downloadFile(options){const job={options,aborted:false};jobs.push(job);return{abort(){job.aborted=true;}};},
  });
  instance.onLoad({id:'7',media_id:'2'});instance.onShow();await tick();
  assert.equal(jobs.length,0);
  const event=time=>({currentTarget:{dataset:{id:2,generation:instance.data.videoGeneration}},detail:{currentTime:time,duration:8}});
  instance.videoPlay(event(0));assert.equal(jobs.length,0);
  instance.videoTime(event(0.1));assert.equal(jobs.length,1);
  instance.videoWaiting(event(0.1));assert.equal(jobs[0].aborted,true);
  jobs[0].options.success({statusCode:200,tempFilePath:'obsolete'});
  assert.equal(instance.data.imageSources['https://test.invalid/three.jpg'],undefined);
  instance.videoTime(event(0.2));assert.equal(jobs.length,2);
  assert.equal(instance.data.videoSource,'https://test.invalid/clip.mp4');instance.onUnload();
});

test("swiping into an unfinished preloaded video cancels its download before native streaming",async()=>{
  const {instance,downloads,finish}=await downloadingViewer();
  instance.change({detail:{current:1}});await tick();
  assert.equal(downloads[0].aborted,true);
  assert.equal(instance.data.videoSource,'https://test.invalid/62.mp4');
  finish(0);assert.equal(instance.data.videoSource,'https://test.invalid/62.mp4');instance.onUnload();
});

test("mixed media preloads the next video ahead of the previous image",async()=>{
  const api=service(), jobs=[];
  api.detail=async()=>({id:7,media:[{id:1,kind:'image',url:'https://test.invalid/previous.jpg'},
    {id:2,kind:'video',duration:8,url:'https://test.invalid/current.mp4'},
    {id:3,kind:'video',duration:8,url:'https://test.invalid/next.mp4'}]});
  const {instance}=page('memory_detail',api,{createVideoContext:()=>({play(){},pause(){}}),
    downloadFile(options){jobs.push(options);return{abort(){}};}});
  instance.onLoad({id:'7',media_id:'2'});instance.onShow();await tick();
  const event={currentTarget:{dataset:{id:2,generation:instance.data.videoGeneration}},detail:{currentTime:0.1,duration:8}};
  instance.videoPlay(event);instance.videoTime(event);
  assert.equal(jobs[0].url,'https://test.invalid/next.mp4');instance.onUnload();
});

test("fullscreen retains the same player and time, left-drag seeks forward, cancellation does not seek", () => {
  const { instance, calls } = viewer("video");
  instance._currentTime = 15;
  instance.showTime(15);
  instance.enterFullScreen();
  assert.equal(calls.at(-1).value.direction, 90);
  instance.fullScreenChanged({
    currentTarget: { dataset: { id: 10 } },
    detail: { fullScreen: true },
  });
  assert.equal(instance._currentTime, 15);
  instance.dragSeek(1, 0);
  instance.dragSeek(2, -422);
  assert.equal(instance.data.seekForward, true);
  assert.equal(instance.data.progress, 100);
  instance.dragSeek(4, 0);
  assert.equal(instance.data.currentLabel, "0:15");
  assert.equal(
    calls.some((call) => call.name === "seek"),
    false,
  );
  instance.dragSeek(1, 0);
  instance.dragSeek(2, 422);
  instance.dragSeek(3, 0);
  assert.equal(calls.at(-1).value, 0);
  instance.back();
  assert.equal(calls.at(-1).name, "exitFullScreen");
});

test("playback controls auto-hide except while reviewing; leaving cancels all timers and pauses", () => {
  const { instance, calls, timers } = viewer("video");
  instance.videoPlay({ currentTarget: { dataset: { id: 10 } } });
  assert.equal(timers.size, 1);
  const hide = timers.get(instance._controlsTimer);
  hide();
  assert.equal(instance.data.controlsVisible, false);
  instance.toggleSelection();
  assert.equal(instance.data.controlsVisible, true);
  assert.equal(timers.size, 0);
  instance.toggleSelection();
  instance.videoTap();
  instance.onHide();
  assert.equal(timers.size, 0);
  assert.equal(calls.at(-1).name, "pause");
  instance.onUnload();
  instance.videoPlay({ currentTarget: { dataset: { id: 10 } } });
  assert.equal(timers.size, 0);
});

test("viewer wires Skyline gesture controls and one native player with prototype fullscreen SVGs", () => {
  const markup = source("pages/memory_detail/memory_detail.wxml");
  const controls = source("pages/memory_detail/memory-controls.wxml");
  assert.match(markup, /native-view="swiper"/);
  assert.match(markup, /worklet:ongesture="photoScale"/);
  assert.match(markup, /worklet:ongesture="photoDoubleTap"/);
  assert.match(markup, /bindtap="restorePhoto"/);
  assert.match(markup, /controls="\{\{false\}\}"/);
  assert.equal((markup.match(/<video\s/g) || []).length, 1);
  assert.doesNotMatch(markup, /imagePreview|previewImage/);
  for (const icon of [
    "fullscreen-back",
    "exit-fullscreen",
    "fast-forward",
    "rewind",
    "play-large",
  ])
    assert.ok(controls.includes(`/images/memory-${icon}.svg`), icon);
});

test("submission reuses activity form controls and matches the saved Pencil measurements", () => {
  const markup = source("pages/memory_create/memory_create.wxml");
  const styles = readWxss(
    path.join(__dirname, "../pages/memory_create/memory_create.wxss"),
  );
  assert.match(
    source("pages/activity_create/activity_create.wxss"),
    /@import "\.\.\/\.\.\/styles\/formControls.wxss"/,
  );
  assert.match(markup, /class="field memory-input memory-picker/);
  assert.match(markup, /class="remark-input"/);
  assert.match(markup, /class="primary /);
  assert.match(markup, /padding-bottom:{{bottom}}rpx/);
  assert.match(
    markup,
    /<scroll-view class="memory-body" type="list" scroll-y[^>]*bounces="{{false}}"/,
  );
  assert.match(markup, /<view class="memory-footer"/);
  assert.match(
    markup,
    /<scroll-view class="upload-scroll" type="list" scroll-x enable-flex/,
  );
  assert.doesNotMatch(markup, /compactLayout|memory-submit/);
  assert.doesNotMatch(markup, /files.length}}\/10|>清除位置</);
  assert.match(
    styles,
    /\.upload-tile\s*\{[^}]*width:\s*180\.76923rpx;[^}]*border-radius:\s*23\.07692rpx;/s,
  );
  assert.match(
    styles,
    /\.memory-intro\s*\{[^}]*gap:\s*23\.08rpx;[^}]*margin-bottom:\s*116\.53846rpx;/s,
  );
  assert.match(
    styles,
    /\.primary \{[^}]*height:107\.69rpx;[^}]*border-radius:53\.85rpx;/,
  );
});

test("submission custom controls use the same Skyline view nodes as activity creation", () => {
  const markup = source("pages/memory_create/memory_create.wxml");
  assert.doesNotMatch(markup, /<button\b/);
  for (const control of [
    "memory-back",
    "upload-tile upload-add",
    "field memory-input memory-picker",
    "primary ",
  ]) {
    assert.match(
      markup,
      new RegExp(
        `<view[^>]*class="${control}[^>]*aria-role="button"[^>]*aria-disabled=`,
      ),
    );
  }
  for (const pageName of ["memory_review", "memory_detail"]) {
    const pageMarkup = source(`pages/${pageName}/${pageName}.wxml`);
    assert.match(
      pageMarkup,
      /<view class="memory-back"[^>]*aria-role="button"/,
    );
    assert.doesNotMatch(pageMarkup, /<button class="memory-back"/);
  }
});

test("activity picker renders its none option as Skyline text and clears all association fields", async () => {
  const markup = source("pages/memory_create/memory_create.wxml");
  assert.match(markup, /class="activity-option"[^>]*data-id="0"[^>]*><text>不关联活动<\/text><\/view>/);
  const {instance} = page("memory_create", service());
  instance.setData({activities: [{id: 7, name: "Test activity", start_time: "2026-10-13T19:00:00"}], showActivities: true});
  instance.selectActivity({currentTarget: {dataset: {id: "7"}}});
  assert.equal(instance.data.activityId, 7);
  assert.equal(instance.data.activityName, "Test activity");
  assert.ok(instance.data.activityTime);
  await instance.chooseActivity();
  assert.equal(instance.data.showActivities, true);
  instance.selectActivity({currentTarget: {dataset: {id: "0"}}});
  assert.equal(instance.data.activityId, null);
  assert.equal(instance.data.activityName, "");
  assert.equal(instance.data.activityTime, "");
  assert.equal(instance.data.showActivities, false);
});

test("view controls preserve submission disabled guards without native button suppression", async () => {
  let choices = 0,
    locations = 0,
    confirmations = 0,
    returns = 0;
  const { instance } = page("memory_create", service(), {
    chooseMedia() {
      choices++;
    },
    chooseLocation() {
      locations++;
    },
    navigateBack() {
      returns++;
    },
  });
  instance.selectComponent = () => ({
    open() {
      confirmations++;
    },
  });
  instance.pickLocation = () => {
    locations++;
  };
  instance.setData({ busy: true, locked: true, files: [{ id: 1 }] });
  instance.back();
  instance.choose();
  instance.chooseLocation();
  await instance.chooseActivity();
  instance.confirmUpload();
  assert.equal(returns + choices + locations + confirmations, 0);
  assert.equal(instance.data.showActivities, false);
  instance.setData({ busy: false, locked: false, files: [] });
  instance.confirmUpload();
  assert.equal(confirmations, 0);
  instance.setData({ files: [{ id: 1 }], selecting: true });
  instance.choose();
  instance.confirmUpload();
  assert.equal(choices + confirmations, 0);
  instance.setData({ selecting: false });
  instance.confirmUpload();
  assert.equal(confirmations, 1);
});

test("submission explanation keeps the complete copy and lets Skyline wrap naturally", () => {
  const { instance } = page("memory_create", service());
  let options;
  instance.selectComponent = () => ({ open(value) { options = value; } });
  instance.setData({ ready: true, files: [{ id: "explanation" }] });
  instance.confirmUpload();
  assert.equal(options.message,
    "您上传的图片与视频将投稿至管理员，不会直接展示在小程序中。若内容合适，管理员将代为发布。");
  assert.doesNotMatch(options.message, /[\r\n]/);
  assert.equal(options.prototypeStyle, true);
  assert.equal(options.confirmBehavior, "emit");
});

test("thumbnail delete buttons remove only their stable file ID and respect upload locking", () => {
  const { instance } = page("memory_create", service());
  const first = { id: "first", kind: "image" };
  const second = { id: "second", kind: "video" };
  instance.setData({ files: [first, second] });
  const event = { currentTarget: { dataset: { id: "second" } } };
  instance.setData({ locked: true });
  instance.remove(event);
  assert.equal(instance.data.files.length, 2);
  instance.setData({ locked: false, files: [second, first] });
  instance.remove(event);
  assert.deepEqual(
    Array.from(instance.data.files, (file) => file.id),
    ["first"],
  );
  instance.setData({ selecting: true });
  instance.remove({ currentTarget: { dataset: { id: "first" } } });
  assert.equal(instance.data.files.length, 1);
  instance.setData({ selecting: false, files: [first, second] });
  instance.setData({ busy: true });
  instance.remove(event);
  assert.equal(instance.data.files.length, 2);
  instance.setData({ busy: false });
  instance._unloaded = true;
  instance.remove(event);
  assert.equal(instance.data.files.length, 2);
  instance._unloaded = false;
  instance.remove(event);
  instance.remove({ currentTarget: { dataset: { id: "first" } } });
  assert.equal(instance.data.files.length, 0);
});

test("submission media and the trailing add tile share one horizontal scroll with isolated delete taps", () => {
  const markup = source("pages/memory_create/memory_create.wxml");
  const scrollEnd = markup.indexOf(
    "</scroll-view>",
    markup.indexOf('class="upload-scroll"'),
  );
  const addTile = markup.indexOf('class="upload-tile upload-add"');
  assert.ok(addTile < scrollEnd);
  assert.match(markup, /scroll-into-view="{{mediaScrollTarget}}"/);
  assert.match(markup, /scroll-into-view-alignment="end"/);
  assert.match(
    markup,
    /id="upload-add" list-item class="upload-tile upload-add"/,
  );
  assert.match(markup, /id="upload-file-{{item.id}}" list-item/);
  assert.match(
    markup,
    /class="upload-remove" data-id="{{item.id}}" catchtap="remove"/,
  );
  assert.doesNotMatch(markup, /bindlongpress|showFileActions/);
  assert.match(markup, /files.length < 10/);
  const styles = source("pages/memory_create/memory_create.wxss");
  assert.match(
    styles,
    /\.upload-grid\s*\{[^}]*height:\s*180\.76923rpx;[^}]*margin-left:\s*-53\.85rpx;/s,
  );
  assert.doesNotMatch(styles, /flex-wrap:\s*wrap/);
  assert.match(
    styles,
    /\.upload-remove\s*\{[^}]*width:\s*38\.46154rpx;[^}]*height:\s*38\.46154rpx;[^}]*background:\s*#00000066;/s,
  );
  assert.match(
    styles,
    /\.upload-remove image\s*\{[^}]*width:\s*19\.23077rpx;[^}]*height:\s*19\.23077rpx;/s,
  );
  assert.match(
    source("images/memory-upload-remove.svg"),
    /width="10" height="10"/,
  );
});

test("upload state tracks each file independently, caps transfer progress and recovers failure", async () => {
  const tasks = [];
  const memory = {
    ...service(),
    async send(url) {
      if (url === "/memory-drafts") return { id: 1, status: "draft" };
      return { media: [] };
    },
    upload(id, slot, file, progress) {
      let resolve, reject;
      const promise = new Promise((done, fail) => {
        resolve = done;
        reject = fail;
      });
      tasks.push({ slot, progress, resolve, reject });
      return { promise, abort() {} };
    },
  };
  const { instance } = page("memory_create", memory);
  instance.onLoad();
  instance.setData({
    files: [0, 1, 2].map((id) => ({
      id,
      kind: "image",
      path: `photo-${id}`,
      size: 100,
    })),
  });
  const pending = instance.upload();
  await tick();
  assert.deepEqual(
    Array.from(instance.data.files, (file) => file.uploadState),
    ["uploading", "uploading", "waiting"],
  );
  tasks[0].progress({ totalBytesSent: 45 });
  assert.equal(instance.data.files[0].uploadProgress, 45);
  tasks[0].progress({ totalBytesSent: 150 });
  assert.equal(instance.data.files[0].uploadProgress, 99);
  tasks[0].resolve();
  await tick();
  assert.equal(instance.data.files[0].uploadState, "uploaded");
  assert.equal(instance.data.files[0].uploadProgress, 100);
  tasks[0].progress({ totalBytesSent: 20 });
  assert.equal(instance.data.files[0].uploadState, "uploaded");
  assert.equal(instance.data.files[2].uploadState, "uploading");
  tasks[1].reject(new Error("network interrupted"));
  tasks[2].resolve();
  await pending;
  assert.equal(instance.data.files[1].uploadState, "failed");
  assert.equal(instance.data.busy, false);
  assert.equal(instance.data.locked, false);
  instance.remove({ currentTarget: { dataset: { id: 0 } } });
  tasks[1].progress({ totalBytesSent: 80 });
  assert.equal(instance.data.files[0].uploadState, "failed");
  assert.equal(instance.data.files.length, 2);
});

test("memory feed scales grid gutters with the viewport and reuses the dragon watermark", () => {
  const { instance } = page("memory", service(), {
    getWindowInfo: () => ({ windowWidth: 320, statusBarHeight: 24 }),
  });
  instance.onLoad();
  assert.equal(instance.data.gridGap, (8 * 320) / 390);
  assert.equal(instance.data.cardRadius, (12 * 320) / 390);
  assert.equal(instance.data.gridPadding[0], (12 * 320) / 390);
  assert.equal(instance._cardWidth, (171 * 320) / 390);
  assert.equal(instance.data.cardWidth, instance._cardWidth);
  assert.match(
    source("pages/memory/memory.wxml"),
    /dragon-watermark dragon-watermark--absolute/,
  );
  assert.match(
    source("pages/memory/memory.wxss"),
    /\.memory-cover\s*\{[^}]*border-radius:\s*23\.07692rpx/,
  );
});

test("memory heading scrolls with its grid and cards reuse the home open-container transition", () => {
  const markup = source("pages/memory/memory.wxml");
  const scrollStart = markup.indexOf('<scroll-view class="memory-scroll"');
  const heading = markup.indexOf('<view class="memory-heading"');
  const grid = markup.indexOf('<grid-view');
  const scrollEnd = markup.indexOf('</scroll-view>');
  assert.ok(scrollStart < heading && heading < grid && grid < scrollEnd);
  assert.match(markup, /<list-view><view class="memory-heading">/);
  assert.match(markup, /<view[^>]*wx:for="\{\{items\}\}"[^>]*class="memory-card-slot"/);
  assert.match(markup, /<open-container class="memory-card-transition"/);
  assert.match(markup, /closed-border-radius="\{\{cardRadius\}\}"/);
  assert.match(markup, /open-border-radius="0"/);
  assert.match(markup, /open-color="#000000"/);
  assert.match(markup, /transition-type="fadeThrough" transition-duration="320"/);
  assert.match(markup, /bind:tap="open"/);
  const home = source("pages/activity_list/activity_list.wxml");
  assert.match(home, /transition-type="fadeThrough"/);
  assert.match(home, /transition-duration="320"/);
});

test("memory transition keeps a sized ordinary card instead of relying on its native host", () => {
  const markup = source("pages/memory/memory.wxml");
  const styles = source("pages/memory/memory.wxss");
  assert.match(markup, /class="memory-card-slot" style="width:\{\{cardWidth\}\}px;height:\{\{item.coverHeight\}\}px;"/);
  assert.match(markup, /<open-container[^>]*>\s*<view class="memory-cover" style="width:\{\{cardWidth\}\}px;height:\{\{item.coverHeight\}\}px;">\s*<image class="memory-cover-image memory-window-image"/);
  assert.match(styles, /\.memory-card-transition\s*\{[^}]*display:\s*block;[^}]*width:\s*100%;[^}]*height:\s*100%;/);
  assert.match(styles, /\.memory-cover\s*\{[^}]*display:\s*block;/);
});

test("admin summaries display aggregate sizes and durations rather than the first cover only", () => {
  const result = service().presentation({
    media_count: 3,
    image_count: 1,
    video_count: 2,
    total_duration: 45,
    total_original_bytes: 12.5 * 1024 ** 2,
    activity_start_time: "2026-09-20T19:00:00",
    media: [{ kind: "image", duration: 0, original_bytes: 100 }],
  });
  assert.equal(result.mediaLabel, "0:45");
  assert.equal(result.sizeLabel, "12.5 MB");
  assert.equal(result.activityTime, "2026/09/20 19:00");
  assert.equal(
    service().presentation({ media_count: 6, image_count: 6, video_count: 0 })
      .mediaLabel,
    "图片",
  );
});

test("bottom review filter exposes six statuses and maps every selection correctly", async () => {
  const {instance} = page("memory_review", service());
  const statuses = Array.from(instance.data.tabs, item => ({...item}));
  assert.deepEqual(statuses.map(item => item.name), ["待审核", "压缩中", "压缩失败", "已上架", "已下架", "未通过"]);
  assert.ok(!statuses.some(item => item.id === "draft"));
  for (const current of statuses) {
    for (const target of statuses.filter(item => item.id !== current.id)) {
      let query;
      const h = page("memory_review", {...service(), list: async values => {
        query = values;
        return {items: [], cursor: null};
      }}, {showActionSheet() {
        assert.fail("status filtering must use the bottom-anchored shared sheet");
      }});
      h.instance.setData({status: current.id, statusLabel: current.name});
      h.instance.chooseStatus();
      assert.equal(h.instance.data.filterOpen, true);
      assert.equal(h.instance.data.tabs.length, 6);
      h.instance.tab({currentTarget: {dataset: {status: target.id}}});
      await tick();
      assert.equal(h.instance.data.status, target.id);
      assert.equal(h.instance.data.statusLabel, target.name);
      assert.equal(query.status, target.id);
      assert.equal(h.instance.data.filterOpen, false);
    }
  }
});

test("drawer uses global counts and refreshes every opening including zero", async () => {
  let calls = 0;
  const first = {pending: 120, processing: 2, failed: 3, published: 45, offline: 6, rejected: 7};
  const latest = {...first, pending: 0, rejected: 8};
  const {instance} = page("memory_review", {...service(),
    list: async () => ({items: [], cursor: "more", status_counts: first}),
    send: async url => {assert.equal(url, "/admin/memories/counts"); calls++; return {status_counts: latest};},
  });
  await instance.load(true);
  assert.equal(instance.data.statusCounts.pending, 120, "not the zero visible items");
  instance.chooseStatus(); await tick();
  assert.equal(instance.data.statusCounts.pending, 0);
  assert.equal(instance.data.statusCounts.rejected, 8);
  instance.closeFilter(); instance.chooseStatus(); await tick();
  assert.equal(calls, 2);
  assert.match(source("pages/memory_review/memory_review.wxml"), /item.name\}\}（\{\{statusCounts \? statusCounts\[item.id\] : '…'\}\}）/);
});

test("late drawer counts cannot overwrite a newer refresh or a hidden page", async () => {
  const responses = [];
  const {instance} = page("memory_review", {...service(),
    send: () => new Promise(resolve => responses.push(resolve)),
  });
  instance.chooseStatus(); instance.closeFilter(); instance.chooseStatus();
  responses[1]({status_counts: {pending: 9}}); await tick();
  responses[0]({status_counts: {pending: 100}}); await tick();
  assert.equal(instance.data.statusCounts.pending, 9);
  instance.closeFilter(); instance.chooseStatus(); instance.onHide();
  responses[2]({status_counts: {pending: 99}}); await tick();
  assert.equal(instance.data.statusCounts.pending, 9);
});

test("count failures stay unknown and old list totals cannot replace fresh counts", async () => {
  const toasts = [];
  let listResponse;
  const api = {...service(), send: async () => {throw new Error("offline");},
    list: () => new Promise(resolve => {listResponse = resolve;})};
  const {instance} = page("memory_review", api, {showToast(options) {toasts.push(options);}});
  instance.chooseStatus(); await tick();
  assert.equal(instance.data.statusCounts, null);
  assert.equal(toasts[0].title, "数量加载失败，请重试");
  api.send = async () => ({status_counts: {pending: 7}});
  const loading = instance.load(true);
  await instance.refreshCounts();
  listResponse({items: [], cursor: null, status_counts: {pending: 8}});
  await loading;
  assert.equal(instance.data.statusCounts.pending, 7);
});

test("rejected card returns only its file to pending after confirmation and refreshes counts", async () => {
  let confirmation, posted;
  const {instance} = page("memory_review", {...service(),
    send: async (...args) => {posted = args; return {revision: 5};},
    list: async () => ({items: [], cursor: null, status_counts: {rejected: 0, pending: 1}}),
  });
  instance.selectComponent = () => ({open(options) {confirmation = options;}});
  instance.setData({status: "rejected", items: [{id: 8, memory_id: 7, media_id: 8, revision: 4, status: "rejected"}]});
  await instance.resourceAction({currentTarget: {dataset: {id: 8, action: "reopen"}}});
  assert.equal(posted, undefined);
  assert.equal(confirmation.title, "确认重新审核");
  assert.match(confirmation.message, /不会直接上架/);
  await instance.confirmAction();
  assert.equal(posted[0], "/admin/memories/7/review");
  assert.equal(posted[2].action, "reopen");
  assert.equal(posted[2].individual, true);
  assert.equal(posted[2].expected_revision, 4);
  assert.deepEqual(Array.from(posted[2].selected_media_ids), [8]);
  assert.equal(instance.data.items.length, 0);
  assert.equal(instance.data.statusCounts.rejected, 0);
  assert.equal(instance.data.statusCounts.pending, 1);
  assert.match(source("pages/memory_review/memory_review.wxml"), /data-action="reopen"[^>]*>重新审核/);
});

test("rejected preview reopens one file without treating it as approval", async () => {
  let confirmation, posted, returns = 0;
  const {instance} = page("memory_detail", {...service(), send: async (...args) => {posted = args; return {revision: 5};}},
    {navigateBack() {returns++;}});
  instance.onLoad({id: "7", admin: "1", media_id: "8"});
  instance.setData({memory: {id: 7, status: "rejected", revision: 4}, current: {id: 8, kind: "image"}});
  instance.selectComponent = () => ({open(options) {confirmation = options;}});
  instance.askReview({currentTarget: {dataset: {action: "reopen"}}});
  assert.equal(posted, undefined);
  assert.equal(confirmation.confirmText, "重新审核");
  await instance.confirmReview();
  assert.equal(posted[2].action, "reopen");
  assert.equal(posted[2].manually_reviewed, false);
  assert.equal(posted[2].individual, true);
  assert.deepEqual(Array.from(posted[2].selected_media_ids), [8]);
  assert.equal(returns, 1);
});

test("six resource states stay independent of mixed submission status", () => {
  const api = service();
  const examples = [
    {state: "uploaded", publication_status: "unreviewed", expected: "processing", label: "压缩中"},
    {state: "working", publication_status: "unreviewed", expected: "processing", label: "压缩中"},
    {state: "failed", publication_status: "unreviewed", expected: "failed", label: "压缩失败"},
    {state: "ready", publication_status: "unreviewed", expected: "pending", label: "待审核"},
    {state: "ready", publication_status: "published", expected: "published", label: "已上架"},
    {state: "ready", publication_status: "offline", expected: "offline", label: "已下架"},
    {state: "ready", publication_status: "excluded", expected: "rejected", label: "未通过"},
  ];
  for (const parent of ["processing", "pending", "published", "failed", "offline", "rejected"]) {
    for (const example of examples) {
      const card = api.reviewCards({id: 7, status: parent, media: [{id: 8, kind: "image", ...example}]})[0];
      assert.equal(card.status, example.expected);
      assert.equal(card.statusLabel, example.label);
      assert.equal(card.media[0].stateLabel, example.label);
      assert.equal(card.media[0].selectable, example.expected === "pending");
    }
  }
});

test("failed compression retries only one file and blocks duplicate requests", async () => {
  let resolve, calls = 0, sent;
  const {instance} = page("memory_review", {...service(),
    send: async (...args) => {calls++; sent = args; return new Promise(done => {resolve = done;});},
    list: async () => ({items: [], cursor: null}),
  });
  instance.setData({items: [{id: 8, memory_id: 7, media_id: 8, revision: 4, status: "failed"}]});
  const event = {currentTarget: {dataset: {id: 8, action: "retry"}}};
  const pending = instance.resourceAction(event);
  await instance.resourceAction(event);
  assert.equal(calls, 1);
  assert.equal(sent[0], "/admin/memories/7/review");
  assert.equal(sent[2].action, "retry");
  assert.equal(sent[2].expected_revision, 4);
  assert.equal(sent[2].individual, true);
  assert.deepEqual(Array.from(sent[2].selected_media_ids), [8]);
  resolve({revision: 5});
  await pending;
  assert.equal(instance.data.busy, false);
  assert.equal(instance.data.items.length, 0);
});

test("republish requires confirmation, retains failures and cannot bypass resource state guards", async () => {
  let confirmation, calls = 0;
  const {instance} = page("memory_review", {...service(), send: async () => {
    calls++; throw new Error("原文件不可用");
  }});
  instance.selectComponent = () => ({open(options) {confirmation = options;}});
  instance.setData({items: [{id: 8, memory_id: 7, media_id: 8, revision: 4, status: "offline"}]});
  await instance.resourceAction({currentTarget: {dataset: {id: 8, action: "retry"}}});
  assert.equal(calls, 0);
  assert.equal(confirmation, undefined);
  await instance.resourceAction({currentTarget: {dataset: {id: 8, action: "republish"}}});
  assert.equal(calls, 0);
  assert.equal(confirmation.title, "确认重新上架");
  await instance.confirmAction();
  assert.equal(calls, 1);
  assert.equal(instance.data.error, "原文件不可用");
  assert.equal(instance.data.items.length, 1);
  assert.equal(instance.data.busy, false);
  const markup = source("pages/memory_review/memory_review.wxml");
  assert.match(markup, /重新压缩/);
  assert.match(markup, /重新上架/);
  assert.match(markup, /item.statusLabel/);
  assert.doesNotMatch(markup, /status === 'draft'/);
});

test("published list replaces redundant preview with confirmed per-file offline action", async () => {
  let confirmation, complete;
  const sent = [], toasts = [];
  const {instance} = page("memory_review", {...service(),
    send: (...args) => {sent.push(args); return new Promise(resolve => {complete = resolve;});},
    list: async () => ({items: [{id: 7, status: "published", revision: 5,
      media: [{id: 9, kind: "image", state: "ready", publication_status: "published"}]}], cursor: null}),
  }, {showToast(options) {toasts.push(options);}});
  instance.selectComponent = () => ({open(options) {confirmation = options;}});
  instance.setData({status: "published", items: [
    {id: 8, memory_id: 7, media_id: 8, revision: 4, status: "published"},
    {id: 9, memory_id: 7, media_id: 9, revision: 4, status: "published"},
  ]});
  await instance.resourceAction({currentTarget: {dataset: {id: 8, action: "offline"}}});
  assert.equal(sent.length, 0);
  assert.equal(confirmation.title, "确认下架");
  assert.equal(confirmation.confirmText, "内容下架");
  assert.equal(confirmation.variant, "danger");
  assert.match(confirmation.message, /仅下架当前内容.*其他内容不受影响.*文件保留/);
  const request = instance.confirmAction();
  await instance.confirmAction();
  assert.equal(sent.length, 1);
  assert.equal(sent[0][0], "/admin/memories/7/review");
  assert.equal(sent[0][2].action, "offline");
  assert.equal(sent[0][2].expected_revision, 4);
  assert.equal(sent[0][2].individual, true);
  assert.deepEqual(Array.from(sent[0][2].selected_media_ids), [8]);
  complete({revision: 5});
  await request;
  assert.deepEqual(Array.from(instance.data.items, item => item.id), [9]);
  assert.equal(instance.data.items[0].status, "published");
  assert.equal(toasts.at(-1).title, "已下架");
  assert.equal(instance.data.busy, false);
  const markup = source("pages/memory_review/memory_review.wxml");
  assert.match(markup, /<button wx:if="\{\{item.status === 'published'\}\}"[^>]*data-action="offline"[^>]*bindtap="resourceAction"[^>]*>内容下架<\/button>/);
  assert.match(markup, /class="review-preview"[^>]*bindtap="open"/);
  assert.doesNotMatch(markup, /wx:if="[^\n]*published[^\n]*bindtap="open"/);
});

test("offline failure keeps the published card and cannot target a different status", async () => {
  let confirmation, calls = 0;
  const {instance} = page("memory_review", {...service(), send: async () => {
    calls++; throw new Error("下架失败，请重试");
  }});
  instance.selectComponent = () => ({open(options) {confirmation = options;}});
  instance.setData({items: [{id: 8, memory_id: 7, media_id: 8, revision: 4, status: "pending"}]});
  const event = {currentTarget: {dataset: {id: 8, action: "offline"}}};
  await instance.resourceAction(event);
  assert.equal(confirmation, undefined);
  instance.data.items[0].status = "published";
  await instance.resourceAction(event);
  await instance.confirmAction();
  assert.equal(calls, 1);
  assert.equal(instance.data.items[0].status, "published");
  assert.equal(instance.data.error, "下架失败，请重试");
  assert.equal(instance.data.busy, false);
});

test("bottom filter closes without navigation or state changes and respects loading and unload guards", () => {
  let returns = 0;
  const {instance} = page("memory_review", service(), {
    navigateBack() {returns++;},
  });
  instance.chooseStatus();
  assert.equal(instance.data.filterOpen, true);
  instance.back();
  assert.equal(instance.data.filterOpen, false);
  assert.equal(returns, 0);
  instance.chooseStatus(); instance.closeFilter();
  assert.equal(instance.data.filterOpen, false);
  instance.setData({loading: true});
  instance.chooseStatus();
  assert.equal(instance.data.filterOpen, false);
  instance.setData({loading: false, busy: true});
  instance.chooseStatus();
  assert.equal(instance.data.filterOpen, false);
  instance.setData({busy: false});
  instance.chooseStatus();
  instance.onHide();
  assert.equal(instance.data.filterOpen, false);
  instance._unloaded = true;
  instance.chooseStatus();
  instance.tab({currentTarget: {dataset: {status: "published"}}});
  assert.equal(instance.data.filterOpen, false);
  assert.equal(instance.data.status, "pending");
});

test("bottom filter reuses bottom anchoring, keeps cancel visible and scrolls options in short viewports", () => {
  for (const [width, height, top] of [[320, 568, 20], [390, 844, 47], [430, 932, 59], [620, 1170, 0], [620, 260, 0]]) {
    const {instance} = page("memory_review", service(), {
      getWindowInfo: () => ({windowWidth: width, windowHeight: height, statusBarHeight: top}),
    });
    instance.onLoad();
    instance.chooseStatus();
    const unit = width / 750;
    assert.ok(instance.data.filterHeight <= 600 * unit);
    assert.ok(instance.data.filterHeight > 0);
    assert.ok(instance.data.filterHeight + 112 * unit <= height * 0.85 + 0.01);
    if (height >= 568) assert.equal(instance.data.filterHeight, 600 * unit);
    else assert.ok(instance.data.filterHeight < 600 * unit);
    instance.onResize();
    assert.equal(instance.data.filterOpen, true);
  }
  const markup = source("pages/memory_review/memory_review.wxml");
  assert.match(markup, /class="memory-sheet-overlay" bindtap="closeFilter"/);
  assert.match(markup, /review-status-cancel" bindtap="closeFilter"/);
  assert.doesNotMatch(markup, /filterTop|review-status-overlay/);
  assert.match(markup, /scroll-y="\{\{!filterOpen\}\}"/);
  assert.match(markup, /data-status="\{\{item.id\}\}" bindtap="tab"/);
  const styles = readWxss(path.join(__dirname, "../pages/memory_review/memory_review.wxss"));
  assert.match(styles, /\.memory-sheet-overlay\s*\{[^}]*position:\s*fixed[^}]*bottom:\s*0[^}]*align-items:\s*flex-end/);
  assert.match(styles, /\.review-status-menu\s*\{[^}]*height:\s*auto[^}]*max-height:\s*85vh/);
  assert.doesNotMatch(styles, /review-status-overlay|width:\s*192px/);
});

test("review list retains all status filters and rejects one file without a dialog", async () => {
  let confirmation;
  const calls = [];
  const { instance } = page(
    "memory_review",
    {
      ...service(),
      list: async () => ({ items: [], cursor: null }),
      send: async (...args) => args[0] === "/admin/memories/counts" ? {} : calls.push(args),
    },
    {},
  );
  instance.chooseStatus();
  assert.equal(instance.data.filterOpen, true);
  instance.tab({currentTarget: {dataset: {status: "published"}}});
  await tick();
  assert.equal(instance.data.status, "published");
  assert.equal(instance.data.statusLabel, "已上架");
  instance.selectComponent = () => ({
    open(options) {
      confirmation = options;
    },
  });
  instance.setData({
    status: "pending",
    items: [{ id: 8, memory_id: 7, media_id: 8, revision: 3, status: "pending", caption: "备注", captionExpandable: true }],
  });
  instance.toggleCaption({ currentTarget: { dataset: { id: 8 } } });
  assert.equal(instance.data.items[0].expanded, true);
  await instance.reject({ currentTarget: { dataset: { id: 8 } } });
  assert.equal(confirmation, undefined);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "/admin/memories/7/review");
  assert.equal(calls[0][2].expected_revision, 3);
  assert.equal(calls[0][2].action, "reject");
  assert.equal(calls[0][2].individual, true);
  assert.deepEqual(Array.from(calls[0][2].selected_media_ids), [8]);
  assert.equal(instance.data.items.length, 0);
});

test("direct list rejection prevents duplicate requests and preserves the card on failure", async () => {
  let fail, calls = 0;
  const {instance} = page("memory_review", {...service(), send: () => {
    calls++;
    return new Promise((resolve, reject) => {fail = reject;});
  }});
  instance.selectComponent = () => ({open() {assert.fail("rejection must not open a dialog");}});
  instance.setData({items: [{id: 8, memory_id: 7, media_id: 8, revision: 3, status: "pending"}]});
  const event = {currentTarget: {dataset: {id: 8}}};
  const request = instance.reject(event);
  assert.equal(instance.data.busy, true);
  await instance.reject(event);
  assert.equal(calls, 1);
  fail(new Error("network failed"));
  await request;
  assert.equal(instance.data.busy, false);
  assert.equal(instance.data.error, "network failed");
  assert.equal(instance.data.items[0].id, 8);
  await instance.reject({currentTarget: {dataset: {id: 999}}});
  assert.equal(calls, 1);
});

test("list approval publishes only the clicked file without opening preview or a selection dialog", async () => {
  for (const kind of ["image", "video"]) {
    const submission = {id: 7, status: "pending", revision: 3, media: [8, 9].map(id => ({
      id, kind, state: "ready", publication_status: "unreviewed",
    }))};
    let sent;
    const api = {...service(), list: async () => ({items: [structuredClone(submission)], cursor: null,
      status_counts: {pending: 1, published: 1}}), send: async (url, method, body) => {
      sent = {url, method, body};
      submission.revision++;
      submission.media = submission.media.filter(item => item.id !== 8);
    }};
    const {instance, app} = page("memory_review", api, {navigateTo() {assert.fail("approval cannot navigate");}});
    instance.selectComponent = () => ({open() {assert.fail("approval cannot open another step");}});
    instance.setData({items: api.reviewCards(submission)});
    await instance.approve({currentTarget: {dataset: {id: 8}}});
    assert.equal(sent.url, "/admin/memories/7/review");
    assert.equal(sent.method, "POST");
    assert.equal(sent.body.action, "publish");
    assert.equal(sent.body.expected_revision, 3);
    assert.equal(sent.body.manually_reviewed, true);
    assert.equal(sent.body.individual, true);
    assert.deepEqual(Array.from(sent.body.selected_media_ids), [8]);
    assert.deepEqual(Array.from(instance.data.items, item => item.id), [9]);
    assert.equal(instance.data.items[0].revision, 4);
    assert.equal(instance.data.statusCounts.pending, 1);
    assert.equal(instance.data.statusCounts.published, 1);
    assert.equal(app.globalData.memoryVersion, 1);
    const markup = source("pages/memory_review/memory_review.wxml");
    assert.match(markup, /class="review-approve"[^>]*bindtap="approve"[^>]*>通过<\/button>/);
    assert.match(markup, /class="review-preview"[^>]*bindtap="open"/);
  }
});

test("list approval blocks duplicate taps and keeps failed or stale cards instead of reporting success", async () => {
  let fail, calls = 0;
  const {instance, app} = page("memory_review", {...service(), send: () => {
    calls++; return new Promise((resolve, reject) => {fail = reject;});
  }}, {navigateTo() {assert.fail("approval cannot navigate");}});
  instance.setData({items: [{id: 8, media_id: 8, memory_id: 7, revision: 3, status: "pending"}]});
  const event = {currentTarget: {dataset: {id: 8}}};
  const request = instance.approve(event);
  await instance.approve(event);
  assert.equal(calls, 1);
  fail(new Error("内容已更新，请刷新")); await request;
  assert.equal(instance.data.busy, false);
  assert.equal(instance.data.error, "内容已更新，请刷新");
  assert.equal(instance.data.items[0].status, "pending");
  assert.equal(app.globalData.memoryVersion, undefined);
  for (const status of ["processing", "failed", "published", "offline", "rejected"]) {
    instance.data.items[0].status = status; await instance.approve(event);
  }
  assert.equal(calls, 1);
});

test("detail rejection submits immediately but offline still requires confirmation", async () => {
  let finish, sent, confirmation, returns = 0;
  const {instance} = page("memory_detail", {...service(), send: (...args) => {
    sent = args;
    return new Promise(resolve => {finish = resolve;});
  }, list: async () => ({items: [], cursor: null})}, {navigateBack() {returns++;}});
  instance.onLoad({id: "7", admin: "1", media_id: "8"});
  instance.setData({memory: {id: 7, revision: 3, status: "pending", media: [{id: 8}]}});
  instance.selectComponent = () => ({open(options) {confirmation = options;}});
  const request = instance.askReview({currentTarget: {dataset: {action: "reject"}}});
  assert.equal(confirmation, undefined);
  assert.equal(instance.data.busy, true);
  assert.equal(sent[0], "/admin/memories/7/review");
  assert.equal(sent[2].action, "reject");
  assert.equal(sent[2].expected_revision, 3);
  assert.equal(sent[2].individual, true);
  assert.deepEqual(Array.from(sent[2].selected_media_ids), [8]);
  finish();
  await request;
  assert.equal(returns, 0);
  assert.equal(instance.data.reviewComplete, true);
  assert.equal(instance.data.busy, false);
  instance.setData({memory: {id: 7, status: "published", revision: 4}});
  instance.askReview({currentTarget: {dataset: {action: "offline"}}});
  assert.equal(confirmation.title, "确认下架");
});

test("approval and rejection advance in place, refresh sibling revisions and finish without leaving", async () => {
  const api = service();
  const submissions = [
    {id: 7, status: "pending", revision: 3, caption: "first", author: {nickname: "A"}, media: [
      {id: 20, kind: "image", state: "ready", publication_status: "unreviewed"},
      {id: 21, kind: "video", state: "ready", publication_status: "unreviewed", duration: 8},
    ]},
    {id: 8, status: "pending", revision: 5, caption: "second", author: {nickname: "B"}, media: [
      {id: 22, kind: "image", state: "ready", publication_status: "unreviewed"},
    ]},
  ];
  const sent = [];
  api.detail = async id => structuredClone(submissions.find(item => item.id === id));
  api.list = async () => ({items: structuredClone(submissions), cursor: null});
  api.send = async (url, method, body) => {
    const submission = submissions.find(item => url === `/admin/memories/${item.id}/review`);
    assert.equal(body.expected_revision, submission.revision);
    const media = submission.media.find(item => item.id === body.selected_media_ids[0]);
    assert.equal(media.publication_status, "unreviewed");
    media.publication_status = body.action === "publish" ? "published" : "excluded";
    sent.push({url, body});
    return {revision: ++submission.revision};
  };
  let returns = 0;
  const {instance} = page("memory_detail", api, {navigateBack() {returns++;}});
  instance.onLoad({id: "7", admin: "1", media_id: "20"});
  await instance.load();
  instance.selectComponent = () => ({open() {assert.fail("individual approval is a direct decision");}});
  await instance.approve();
  assert.equal(sent[0].body.manually_reviewed, true);
  assert.deepEqual(Array.from(sent[0].body.selected_media_ids), [20]);
  assert.equal(instance.data.current.id, 21);
  assert.equal(instance.data.memory.revision, 4);
  assert.equal(instance.data.selected.length, 0);
  assert.equal(instance.data.reviewed, false);
  assert.equal(instance.data.selectionOpen, false);
  assert.equal(instance.data.muted, false);
  assert.deepEqual(Array.from(instance.data.viewerMedia, item => item.id), [21, 22]);
  assert.deepEqual(Array.from(instance.data.viewerInfo, item => item.caption), ["first", "second"]);
  await instance.askReview({currentTarget: {dataset: {action: "reject"}}});
  assert.equal(instance.data.current.id, 22);
  assert.equal(instance.data.memory.id, 8);
  assert.equal(instance.data.memory.author.nickname, "B");
  assert.equal(instance.data.memory.caption, "second");
  assert.equal(instance.data.viewerInfo.length, 1);
  assert.equal(instance.data.viewerInfo[0].author.nickname, "B");
  assert.equal(instance.data.memory.revision, 5);
  await instance.askReview({currentTarget: {dataset: {action: "reject"}}});
  assert.equal(instance.data.reviewComplete, true);
  assert.equal(instance.data.current, null);
  assert.equal(instance.data.memory, null);
  assert.equal(instance.data.viewerMedia.length, 0);
  assert.equal(instance.data.viewerInfo.length, 0);
  assert.equal(instance.data.loading, false);
  assert.equal(instance.data.busy, false);
  assert.equal(returns, 0);
  assert.equal(sent.length, 3);
  await instance.confirmReview();
  assert.equal(sent.length, 3, "completed content cannot be submitted again");
});

test("review advancement consumes the preloaded next video and clears it on completion", async () => {
  const api = service();
  const submission = {id: 7, status: "pending", revision: 3, media: [
    {id: 20, kind: "image", state: "ready", publication_status: "unreviewed"},
    {id: 21, kind: "video", state: "ready", publication_status: "unreviewed", url: "/clip.mp4", duration: 8},
  ]};
  api.detail = async () => structuredClone(submission);
  api.list = async () => ({items: [structuredClone(submission)], cursor: null});
  api.send = async () => ({revision: ++submission.revision});
  let download, removed;
  const {instance} = page("memory_detail", api, {
    downloadFile(options) {download = options; return {abort() {}};},
    getFileSystemManager: () => ({unlink: ({filePath,success}) => {removed = filePath; success();},
      getFileInfo: options => options.success({size: 1024})}),
  });
  instance.onLoad({id: "7", admin: "1", media_id: "20"});
  instance.onShow();
  await tick();
  download.success({statusCode: 200, tempFilePath: "next-video-cache"});
  await instance.askReview({currentTarget: {dataset: {action: "reject"}}});
  assert.equal(instance.data.current.id, 21);
  assert.equal(instance.data.videoSource, "next-video-cache");
  assert.equal(instance.data.visible, true);
  assert.equal(instance.data.muted, false);
  assert.equal(instance.data.memory.revision, 4);
  await instance.askReview({currentTarget: {dataset: {action: "reject"}}});
  assert.equal(instance.data.reviewComplete, true);
  assert.equal(removed, "next-video-cache");
});

test("review continuation loads the next queue page and retries loading without resubmitting", async () => {
  const api = service();
  const first = {id: 7, status: "pending", revision: 3, media: [
    {id: 20, kind: "image", state: "ready", publication_status: "unreviewed"},
  ]};
  const second = {id: 8, status: "pending", revision: 2, media: [
    {id: 21, kind: "image", state: "ready", publication_status: "unreviewed"},
  ]};
  let oldPrefetch, cursorCalls = 0, writes = 0;
  api.detail = async () => structuredClone(first);
  api.list = async values => {
    if (!values.cursor) return {items: [structuredClone(first)], cursor: "next"};
    cursorCalls++;
    if (cursorCalls === 1) return new Promise(resolve => {oldPrefetch = resolve;});
    if (cursorCalls === 2) throw new Error("next page unavailable");
    return {items: [structuredClone(second)], cursor: null};
  };
  api.send = async () => {writes++; return {revision: 4};};
  const {instance} = page("memory_detail", api);
  instance.onLoad({id: "7", admin: "1", media_id: "20"});
  await instance.load();
  await instance.askReview({currentTarget: {dataset: {action: "reject"}}});
  assert.equal(writes, 1);
  assert.equal(instance.data.reviewComplete, false);
  assert.equal(instance.data.error, "next page unavailable");
  assert.equal(instance.data.memory, null);
  oldPrefetch({items: [first], cursor: null});
  await tick();
  assert.equal(instance.data.memory, null, "late old pagination cannot restore reviewed content");
  await instance.load();
  assert.equal(writes, 1);
  assert.equal(instance.data.current.id, 21);
  assert.equal(instance.data.memory.id, 8);
  assert.equal(instance.data.error, "");
});

test("failed review keeps the current preview and offline still returns to the list", async () => {
  let returns = 0;
  const api = service();
  api.send = async () => {throw new Error("review failed");};
  const {instance} = page("memory_detail", api, {navigateBack() {returns++;}});
  instance.onLoad({id: "7", admin: "1", media_id: "20"});
  instance.setData({memory: {id: 7, revision: 3}, current: {id: 20, kind: "image"}});
  await instance.askReview({currentTarget: {dataset: {action: "reject"}}});
  assert.equal(instance.data.current.id, 20);
  assert.equal(instance.data.memory.id, 7);
  assert.equal(instance.data.error, "review failed");
  assert.equal(instance.data.busy, false);
  assert.equal(returns, 0);
  api.send = async () => ({revision: 4});
  instance._action = "offline";
  await instance.confirmReview();
  assert.equal(returns, 1);
});

test("permanent cleanup still previews its manifest and waits for explicit confirmation", async () => {
  let confirmation;
  const calls = [];
  const {instance} = page("memory_review", {...service(),
    send: async (...args) => {calls.push(args); return {id: 7, media_id: 8, revision: 3, allowed: true, bytes: 1024};},
    list: async () => ({items: [], cursor: null}),
  });
  instance.selectComponent = () => ({open(options) {confirmation = options;}});
  instance.setData({items: [{id: 8, memory_id: 7, media_id: 8}]});
  await instance.askCleanup({currentTarget: {dataset: {id: 8}}});
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "/admin/memories/7/cleanup?media_id=8");
  assert.equal(confirmation.title, "确认删除");
  assert.match(confirmation.message, /服务器.*原件.*压缩文件.*缩略图.*不可恢复/);
  assert.match(source("pages/memory_review/memory_review.wxml"), /bind:confirm="confirmAction"/);
  await instance.confirmAction();
  assert.equal(calls[1][0], "/admin/memories/7/cleanup");
  assert.equal(calls[1][2].confirmed, true);
});

test("review captions only expand when native layout exceeds one line", () => {
  let heights = [16.8, 33.6, 33.6];
  let callback;
  const {instance} = page("memory_review", service(), {
    createSelectorQuery() {
      return {
        selectAll() {return this;},
        boundingClientRect() {return this;},
        exec(value) {callback = value;},
      };
    },
  });
  instance._generation = 1;
  instance.setData({items: [
    {id: 1, caption: "123"},
    {id: 2, caption: "Long caption which wraps on this device"},
    {id: 3, caption: "第一行\n第二行"},
  ]});
  const finish = () => callback([
    heights.map((height, index) => ({dataset: {id: index + 1}, height})),
    heights.map((_, index) => ({dataset: {id: index + 1}, height: 16.8})),
  ]);
  instance.measureCaptions(1);
  finish();
  assert.deepEqual(Array.from(instance.data.items, item => item.captionExpandable), [false, true, true]);
  instance.toggleCaption({currentTarget: {dataset: {id: 1}}});
  assert.equal(instance.data.items[0].expanded, undefined);
  instance.toggleCaption({currentTarget: {dataset: {id: 2}}});
  assert.equal(instance.data.items[1].expanded, true);
  instance.toggleCaption({currentTarget: {dataset: {id: 2}}});
  assert.equal(instance.data.items[1].expanded, false);
  heights = [16.8, 16.8, 33.6];
  instance.onResize();
  finish();
  assert.deepEqual(Array.from(instance.data.items, item => item.captionExpandable), [false, false, true]);
  instance.onResize();
  instance.onHide();
  finish();
  assert.ok(instance.data.items.every(item => !item.captionMeasured));
});

test("review expand control does not reserve the native button default width", () => {
  const markup = source("pages/memory_review/memory_review.wxml");
  assert.match(markup, /<view wx:if="\{\{item.captionExpandable\}\}" class="review-expand"[^>]*bindtap="toggleCaption"[^>]*aria-role="button"/);
  assert.doesNotMatch(markup, /<button[^>]*class="review-expand"/);
  const styles = source("pages/memory_review/memory_review.wxss");
  assert.match(styles, /\.review-expand\s*\{[^}]*min-width:\s*0;\s*width:\s*auto;/);
  assert.match(styles, /\.review-expand\s*\{[^}]*align-self:\s*flex-end;/);
});

test("legacy batch review retains a separate selection sheet and manual acknowledgement", () => {
  const { instance } = viewer("video");
  instance.data.memory.status = "pending";
  instance.beginReview();
  assert.equal(instance.data.selectionOpen, true);
  assert.equal(instance.data.reviewed, false);
  instance.back();
  assert.equal(instance.data.selectionOpen, false);
  assert.equal(instance.data.memory.status, "pending");
  const markup = source("pages/memory_detail/memory_detail.wxml");
  assert.match(source("pages/memory_detail/memory-controls.wxml"), /class="viewer-approve" bindtap="approve"/);
  assert.match(markup, /class="memory-sheet-overlay"/);
  assert.doesNotMatch(markup, /class="viewer-count"/);
});

test("photo previews fit the complete image without cropping in public and review viewers", () => {
  const { instance } = viewer();
  const frames = [[320, 568], [390, 844], [430, 932], [844, 390]];
  const photos = [[800, 1200], [1080, 1920], [1920, 1080], [1000, 1000], [1000, 10000], [10000, 1000], [390, 844]];
  const epsilon = 1e-8;
  for (const admin of [false, true]) for (const [width, height] of frames) {
    instance.setData({admin});
    instance._frame.value = {width, height};
    for (const [photoWidth, photoHeight] of photos) {
      Object.assign(instance.data.memory.media[0], {width: photoWidth, height: photoHeight});
      instance.activate();
      const data = instance.data;
      assert.ok(data.photoWidth <= width + epsilon && data.photoHeight <= height + epsilon);
      assert.ok(data.photoLeft >= -epsilon && data.photoTop >= -epsilon);
      assert.ok(data.photoLeft + data.photoWidth <= width + epsilon);
      assert.ok(data.photoTop + data.photoHeight <= height + epsilon);
      assert.ok(Math.abs(data.photoWidth / data.photoHeight - photoWidth / photoHeight) < epsilon);
      assert.ok(Math.abs(data.photoWidth - width) < epsilon || Math.abs(data.photoHeight - height) < epsilon);
      assert.equal(data.photoLeft, (width - data.photoWidth) / 2);
      assert.equal(data.photoTop, (height - data.photoHeight) / 2);
    }
  }
  assert.match(source("pages/memory_detail/memory_detail.wxml"), /id="memory-photo"[^>]*mode="aspectFit"/);
});

test("restoring and switching portraits returns to uncropped fit instead of filling the screen", () => {
  const {instance} = viewer();
  Object.assign(instance.data.memory.media[0], {width: 800, height: 1200});
  instance.activate();
  assert.equal(instance.data.photoWidth, 390);
  assert.equal(instance.data.photoHeight, 585);
  assert.equal(instance.data.photoLeft, 0);
  assert.equal(instance.data.photoTop, 129.5);
  instance.photoDoubleTap({state: 3, absoluteX: 195, absoluteY: 422});
  instance.photoPan({state: 2, deltaX: 1000, deltaY: 1000});
  assert.equal(instance._scale.value, 2);
  assert.ok(instance._x.value > 0 && instance._y.value > 0);
  instance.restorePhoto();
  assert.equal(instance._scale.value, 1);
  assert.equal(instance._x.value, 0);
  assert.equal(instance._y.value, 0);
  assert.equal(instance.data.photoWidth, 390);
  assert.equal(instance.data.photoHeight, 585);
  assert.equal(instance.data.zoomed, false);
  instance.data.memory.media.push({id: 11, kind: "image", width: 500, height: 3000});
  instance.change({detail: {current: 1}});
  assert.equal(instance.data.current.id, 11);
  assert.ok(Math.abs(instance.data.photoHeight - 844) < 1e-8);
  assert.ok(instance.data.photoWidth < 390 && instance.data.photoLeft > 0);
  assert.equal(instance._scale.value, 1);
  assert.equal(instance.data.zoomed, false);
});
