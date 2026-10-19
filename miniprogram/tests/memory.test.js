const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");
const { readWxss } = require("./helpers/wxss");
const {loadMediaModules} = require("./helpers/memoryMedia");
const {createWorkletClock} = require("./helpers/workletClock");

const source = (file) =>
  fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const tick = () => new Promise((resolve) => setImmediate(resolve));

test("only confirmed file cleanup uses the filesystem operation timeout", async () => {
  const calls = [];
  const api = service({}, options => { calls.push(options); return Promise.resolve({}); });
  await api.send("/admin/memories/7/cleanup", "POST", {confirmed: true});
  await api.send("/admin/memories/7/cleanup?media_id=20");
  await api.send("/admin/memories/7/review", "POST", {action: "publish"});
  await api.send("/memories");
  assert.equal(calls[0].timeout, 120000);
  assert.ok(calls.slice(1).every(options => options.timeout === undefined));
});

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

test("viewer preloads a video arriving on the next queue page and retains completed files briefly on hide", async () => {
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
  assert.equal(removed.length, 0);
  assert.equal(instance._mediaSession.source("https://test.invalid/clip.mp4"), "cached-video");
  instance.videoPlay({currentTarget: {dataset: {id: 21}}});
  assert.equal(instance.data.playing, false);
});

test("submission upload label matches the prototype without a swipe hint", () => {
  const markup = source("pages/memory_create/memory_create.wxml");
  assert.match(markup, /<text class="subtitle">整点有意思的东西上来<\/text>/);
  assert.doesNotMatch(markup, /这不是网盘/);
  assert.doesNotMatch(markup, /好记忆值得被官方收藏/);
  assert.match(markup, /<view class="label memory-label upload-label"><text>上传内容<\/text><text class="upload-subtitle /);
  assert.doesNotMatch(markup, /服务器确认中|准备提交|提交中|uploadLabel|confirming/);
  assert.doesNotMatch(markup, /左右滑动|upload-hint/);
  assert.doesNotMatch(source("pages/memory_create/memory_create.wxss"), /\.upload-hint\b/);
  assert.match(markup, /class="upload-scroll" type="list" scroll-x enable-flex/);
});

test("upload subtitle matches the prototype and file errors replace it in the same text node", () => {
  const markup = source("pages/memory_create/memory_create.wxml");
  const styles = source("pages/memory_create/memory_create.wxss");
  const slot = markup.match(/<text class="upload-subtitle ([^"]+)" aria-live="polite">\{\{([^}]+)\}\}<\/text>/);
  assert.ok(slot);
  assert.equal((markup.match(/class="upload-subtitle /g) || []).length, 1);
  const text = uploadError => new Function("uploadError", `return (${slot[2]})`)(uploadError);
  assert.equal(text(""), "单个文件大小不超过20m，视频不超过30s");
  for (const error of ["原图片不能超过 20MB", "视频时长不能超过 30 秒", "第 2 项：无法读取原文件"]) {
    assert.equal(text(error), error);
    assert.doesNotMatch(text(error), /单个文件大小/);
  }
  assert.equal(text(""), "单个文件大小不超过20m，视频不超过30s");
  assert.match(styles, /\.upload-label\s*\{[^}]*gap:\s*15\.38462rpx;/s);
  assert.match(styles, /\.upload-subtitle\s*\{[^}]*font-size:\s*23\.07692rpx;[^}]*font-weight:\s*400;[^}]*line-height:\s*1\.2;[^}]*color:\s*#6b7280;/s);
  assert.match(styles, /\.upload-subtitle--error\s*\{\s*color:\s*#dc2626;/);
  assert.doesNotMatch(markup + styles, /upload-error/);
});

test("WebView submission scrolling does not query a Skyline node", () => {
  const {instance} = page("memory_create", service());
  instance.renderer = "webview";
  instance.createSelectorQuery = () => assert.fail("ordinary scroll-into-view remains the WebView path");
  instance.configureMediaScroller();
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

function page(name, memory, wx = {}, thumbnails = {}, sharedMediaModules) {
  let definition;
  const logs = [];
  const animations = [], cancelledAnimations = [];
  const app = {
    validateStoredSession: async () => true,
    showSessionExpiredPrompt() {},
    globalData: {
      userRole: "user",
      accessToken: "token",
      userId: "100",
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
      timing: (target, options) => {animations.push({target, options}); return target;},
      cancelAnimation: value => cancelledAnimations.push(value),
      Easing: {linear: value => value, cubic: value => value ** 3, out: easing => value => 1 - easing(1 - value)},
    },
    ...wx,
  };
  const originalFileSystem = api.getFileSystemManager;
  api.getFileSystemManager = () => ({getFileInfo: options => options.success({size:1024}), ...originalFileSystem()});
  const timers = new Map(), timerDelays = new Map();
  let timerId = 0;
  const mediaModules = sharedMediaModules || loadMediaModules(api, {}, {}, {
    setTimeout: callback => {timers.set(++timerId, callback); return timerId;},
    clearTimeout: id => timers.delete(id),
  });
  vm.runInNewContext(source(`pages/${name}/${name}.js`), {
    wx: api,
    console: {info: (...args) => logs.push(args)},
    getApp: () => app,
    Page: (value) => {
      definition = value;
    },
    Date,
    Promise,
    setTimeout(callback, delay) {
      timers.set(++timerId, callback);
      timerDelays.set(timerId, delay);
      return timerId;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
    require(name) {
      if (name.endsWith("/memoryCardPresentation")) {
        const module = {exports: {}};
        vm.runInNewContext(source("utils/memoryCardPresentation.js"), {
          module, setTimeout: callback => {timers.set(++timerId, callback); return timerId;},
          clearTimeout: id => timers.delete(id),
        });
        return module.exports;
      }
      if (name.endsWith("/memoryPreviewMedia")) {
        return mediaModules.previewMedia;
      }
      if (name.endsWith("/memoryMediaSession")) return mediaModules.session;
      if (name.endsWith("/memoryPreviewSession")) return mediaModules.previews;
      if (name.endsWith("/memoryShareImage")) return mediaModules.shares;
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
      if (name.endsWith("/workletCompat")) return require("../utils/workletCompat");
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
      if (name.endsWith("/safeArea")) {
        const module = {exports: {}};
        vm.runInNewContext(source("utils/safeArea.js"), {module, wx: api});
        return module.exports;
      }
      if (name.endsWith("/tabBarSync")) return { patchTabBarIfNeeded() {} };
      return { listActivities: async () => [] };
    },
  });
  const instance = {
    ...definition,
    data: structuredClone(definition.data),
    applyAnimatedStyle(selector, updater) {
      this._animatedStyle = { selector, updater };
      (this._animatedStyles ||= new Map()).set(selector, updater);
    },
    setData(patch, callback) {
      for (const [key, value] of Object.entries(patch)) {
        const keys = key.replace(/\[(\d+)\]/g, ".$1").split(".");
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
  return { instance, app, wx: api, timers, timerDelays, mediaModules, logs, animations, cancelledAnimations };
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
  assert.equal(instance.data.uploadError, "第 2 项：开发者工具缺少 FFmpeg");
  assert.equal(instance.data.error, "");
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
  assert.equal(instance.data.error, "acknowledgement lost");
  assert.equal(instance.data.uploadError, "");
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

test("memory feed admits only three native covers, then refills immediately even before the top cover is ready", async () => {
  const api = {...service(), list: async () => ({items: [{id: 7, media:
    [1,2,3,4,5].map(id => ({id, kind: "image", thumbnail_url: `/cover-${id}.jpg`}))}], cursor: null})};
  const {instance} = page("memory", api);
  instance.onLoad(); instance.onShow(); await tick();
  const urls = Array.from(instance.data.items, item => item.cover);
  assert.deepEqual(Object.keys(instance.data.imageSources), urls.slice(0,3));
  assert.equal(instance.data.coverStates[urls[3]].token, undefined);
  instance.coverLoaded({currentTarget: {dataset: {url: urls[2], token: instance.data.coverStates[urls[2]].token}}});
  assert.deepEqual(Object.keys(instance.data.imageSources), urls.slice(0,4));
  assert.equal(instance.data.coverStates[urls[0]].ready, false);
  assert.equal(instance.data.coverStates[urls[2]].loaded, true);
  assert.equal(instance.data.coverStates[urls[2]].ready, false);
  assert.ok(instance.data.coverStates[urls[3]].token);
  instance.onUnload();
});

test("retry repeats a failed refresh from the beginning even after reaching the last page", async () => {
  const queries = [];
  const api = {...service(), list: async query => {
    queries.push(query);
    if (queries.length === 2) throw new Error("刷新失败");
    return {items: [{id: 7, media: [{id: queries.length, kind: "image", thumbnail_url: "/cover.jpg"}]}], cursor: null};
  }};
  const {instance} = page("memory", api);
  instance.onLoad(); await instance.load(true); await tick();
  const url = instance.data.items[0].cover, covers = instance._covers;
  instance.coverLoaded({currentTarget: {dataset: {url, token: instance.data.coverStates[url].token}}});
  await instance.refresh(); await tick();
  assert.equal(instance.data.error, "刷新失败");
  assert.equal(instance._covers, covers, "failed refresh must preserve already displayed covers");
  assert.equal(instance.data.coverStates[url].ready, true);
  await instance.more();
  assert.equal(queries.length, 2, "scroll events must not replace the failed refresh with pagination");
  await instance.retry(); await tick();
  assert.equal(queries.length, 3);
  assert.ok(queries.every(query => query.cursor === undefined));
  assert.deepEqual(Array.from(instance.data.items, item => item.id), [3]);
  assert.equal(instance.data.error, "");
  assert.notEqual(instance._covers, covers, "successful refresh invalidates the old covers");
  instance.onUnload();
});

test("retry of a failed next page preserves its cursor and existing cards", async () => {
  const queries = [];
  const api = {...service(), list: async query => {
    queries.push(query);
    if (queries.length === 2) throw new Error("翻页失败");
    return {items: [{id: 7, media: [{id: queries.length, kind: "image"}]}], cursor: queries.length === 1 ? "next" : null};
  }};
  const {instance} = page("memory", api);
  instance.onLoad(); await instance.load(true); await tick();
  await instance.more(); await tick(); await instance.retry(); await tick();
  assert.deepEqual(queries.map(query => query.cursor), [undefined, "next", "next"]);
  assert.deepEqual(Array.from(instance.data.items, item => item.id), [1, 3]);
  instance.onUnload();
});

test("memory tab return retains ready sources and does not request the list again", async () => {
  let requested = 0;
  const api = {...service(), list: async () => {
    requested++;
    return {items: [{id: 7, media: [1,2].map(id => ({id, kind: "image", thumbnail_url: `/cover-${id}.jpg`}))}], cursor: null};
  }};
  const {instance} = page("memory", api);
  instance.onLoad(); instance.onShow(); await tick();
  const url = instance.data.items[0].cover;
  instance.coverLoaded({currentTarget: {dataset: {url, token: instance.data.coverStates[url].token}}});
  const covers = instance._covers, images = instance._memoryImages, source = instance.data.imageSources[url];
  const token = instance.data.coverStates[url].token;
  instance.onHide();
  assert.equal(instance.data.coverStates[url].ready, true);
  assert.equal(instance.data.imageSources[url], source);
  assert.equal(instance.data.skeletonShimmerRunning, false);
  instance.onShow(); await tick();
  assert.equal(requested, 1);
  assert.equal(instance._covers, covers);
  assert.equal(instance._memoryImages, images);
  assert.equal(instance.data.coverStates[url].token, token);
  assert.equal(instance.data.coverStates[url].ready, true);
  instance.onUnload();
  assert.equal(instance._covers, null); assert.equal(instance._memoryImages, null);
});

test("signed-out visitors can view memories and retain ready covers on tab return", async () => {
  let requests = 0, opened;
  const {instance, app} = page("memory", {...service(), list: async () => {
    requests++; return {items: [{id: 7, media: [{id: 1, kind: "image", thumbnail_url: "/cover.jpg"}]}], cursor: null};
  }}, {navigateTo(options) {opened = options.url;}});
  app.globalData.userRole = "guest"; app.globalData.isAuthenticated = false;
  app.globalData.accessToken = ""; app.globalData.userId = "";
  instance.onLoad(); instance.onShow(); await tick();
  assert.equal(requests, 1); assert.equal(instance.data.items.length, 1);
  const url = instance.data.items[0].cover;
  instance.coverLoaded({currentTarget: {dataset: {url, token: instance.data.coverStates[url].token}}});
  instance.open({currentTarget: {dataset: {id: 1}}});
  assert.equal(opened, "/pages/memory_detail/memory_detail?id=7&media_id=1");
  instance.onHide(); instance.onShow(); await tick();
  assert.equal(requests, 1); assert.equal(instance.data.coverStates[url].ready, true);
  assert.equal(instance.data.imageSources[url], url);
  instance.refresh(); await tick(); assert.equal(requests, 2);
  assert.doesNotMatch(source("pages/memory/memory.wxml"), /login-empty|canView|登录后查看记忆/);
  instance.onUnload();
});

test("memory content version changes and explicit refresh reset retained covers", async () => {
  let requested = 0;
  const api = {...service(), list: async () => {
    requested++;
    return {items: [{id: 7, media: [{id: 1, kind: "image", thumbnail_url: "/cover.jpg"}]}], cursor: null};
  }};
  const {instance, app} = page("memory", api);
  instance.onLoad(); instance.onShow(); await tick();
  const url = instance.data.items[0].cover;
  instance.coverLoaded({currentTarget: {dataset: {url, token: instance.data.coverStates[url].token}}});
  const old = instance._covers;
  instance.onHide(); app.globalData.memoryVersion = 1; instance.onShow(); await tick();
  assert.equal(requested, 2); assert.notEqual(instance._covers, old);
  assert.equal(instance.data.coverStates[url].ready, false);
  assert.equal(instance._version, 1);
  instance.refresh(); await tick(); assert.equal(requested, 3);
  instance.onUnload();
});

test("returning during a pending list request refreshes only if the content version changed", async () => {
  for (const changed of [false, true]) {
    let requested = 0, finish;
    const result = {items: [], cursor: null};
    const api = {...service(), list: () => {
      requested++;
      return requested === 1 ? new Promise(resolve => {finish = resolve;}) : Promise.resolve(result);
    }};
    const {instance, app} = page("memory", api);
    instance.onLoad(); instance.onShow(); instance.onHide();
    app.globalData.memoryVersion = changed ? 1 : 0;
    instance.onShow(); assert.equal(requested, 1);
    finish(result); await tick();
    assert.equal(requested, changed ? 2 : 1);
    assert.equal(instance._version, changed ? 1 : 0);
    instance.onUnload();
  }
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

for (const kind of ["image", "video"]) test(`memory ${kind} share crops the current photo or poster, with a stable target`, async () => {
  const {mediaModules} = page("memory_detail", service());
  let source;
  mediaModules.shares.memoryShareImage = value => {source = value; return Promise.resolve("cropped.jpg");};
  // Reload the page after supplying the shared service so its destructured import uses this stub.
  const target = page("memory_detail", service(), {}, {}, mediaModules).instance;
  target._id = 70;
  target.data.memory = {caption: "桌游夜的回忆"};
  target.data.current = {id: 3, kind, url: "display", thumbnail_url: "thumbnail"};
  target.data.imageSources = {display: "photo.jpg", thumbnail: "poster.jpg"};
  const share = target.onShareAppMessage();
  assert.equal(source, kind === "video" ? "poster.jpg" : "photo.jpg");
  assert.equal(share.imageUrl, source);
  target.data.current = {id: 4, kind: "image"};
  const completed = await share.promise;
  assert.equal(completed.imageUrl, "cropped.jpg");
  assert.equal(completed.title, "桌游夜的回忆");
  assert.equal(completed.path, "/pages/memory_detail/memory_detail?id=70&media_id=3");
  target._admin = true;
  assert.equal(target.onShareAppMessage().imageUrl, undefined);
  assert.equal(target.onShareAppMessage().promise, undefined);
});

test("memory share export failure keeps its chosen image and path instead of a page screenshot", async () => {
  const {mediaModules} = page("memory_detail", service());
  mediaModules.shares.memoryShareImage = () => Promise.reject(new Error("export failed"));
  const instance = page("memory_detail", service(), {}, {}, mediaModules).instance;
  instance._id = 70;
  instance.data.memory = {caption: "周末聚会"};
  instance.data.current = {id: 3, kind: "video", url: "video.mp4", thumbnail_url: "poster.jpg"};
  const result = await instance.onShareAppMessage().promise;
  assert.equal(result.imageUrl, "poster.jpg");
  assert.equal(result.path, "/pages/memory_detail/memory_detail?id=70&media_id=3");
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

function viewer(kind = "image", wx = {}) {
  const calls = [];
  const context = Object.fromEntries(
    ["play", "pause", "seek", "requestFullScreen", "exitFullScreen"].map(
      (name) => [name, (value) => calls.push({ name, value })],
    ),
  );
  const result = page("memory_detail", service(), {
    createVideoContext: () => context,
    ...wx,
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

test("submission footer shares the home minimum gap, preserves larger safe areas and updates after resize", () => {
  for (const platform of ["windows", "ios", "android"]) {
    let width = 390, inset = 0;
    const {instance} = page("memory_create", service(), {
      getWindowInfo: () => ({windowWidth: width, windowHeight: 844, statusBarHeight: 20, safeAreaInsets: {bottom: inset}}),
      getDeviceInfo: () => ({platform}),
    });
    instance.onLoad();
    assert.equal(instance.data.footerSafeAreaRpx, 46.15);
    assert.equal(instance.data.bottom, platform === "android" ? 46.15 : 0, "drawers keep the existing safe-area policy");
    inset = 34; instance.onResize();
    assert.equal(instance.data.footerSafeAreaRpx, 65.38, "use max, not 34px + 24px");
    width = 620; inset = 0; instance.onResize();
    assert.equal(instance.data.footerSafeAreaRpx, platform === "android" ? 46.15 : 29.03);
    assert.equal(instance.data.top, 20);
    instance.onUnload();
  }
  const markup = source("pages/memory_create/memory_create.wxml");
  assert.match(markup, /class="memory-footer" style="padding-bottom:{{footerSafeAreaRpx}}rpx;"/);
  assert.match(markup, /class="memory-sheet"[^>]*padding-bottom:{{bottom}}rpx/);
});

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
  instance.photoDoubleTap({ state: 1, absoluteX: 195, absoluteY: 422 });
  assert.equal(instance._scale.value, 2);
  instance.photoDoubleTap({state: 1, absoluteX: 100, absoluteY: 300});
  assert.equal(instance._scale.value, 1);
  assert.equal(instance._x.value, 0);
  assert.equal(instance._y.value, 0);
  assert.equal(instance.data.zoomed, false);
  instance.photoDoubleTap({state: 1, absoluteX: 195, absoluteY: 422});
  instance.back();
  assert.equal(instance.data.zoomed, false);
  instance.photoScale({ state: 1, focalX: 195, focalY: 422 });
  instance.photoScale({ state: 2, focalX: 195, focalY: 422, scale: 1.01 });
  instance.photoScale({ state: 4 });
  assert.equal(instance._scale.value, 1);
  assert.equal(instance.pagerAllowed(), true);
});

test("Skyline double tap consumes the discrete BEGIN event, not a drag END or cancellation", () => {
  const {instance} = viewer();
  for (const state of [0, 2, 3, 4]) {
    instance.photoDoubleTap({state, absoluteX: 195, absoluteY: 422});
    assert.equal(instance._scale.value, 1);
    assert.equal(instance.data.zoomed, false);
  }
  instance.photoDoubleTap({state: 1, absoluteX: 100, absoluteY: 300});
  assert.equal(instance._scale.value, 2);
  assert.equal(instance.data.zoomed, true);
  assert.equal(instance.pagerAllowed(), false);
  assert.match(instance._animatedStyle.updater().transform, /scale\(2\)/);
  instance.photoDoubleTap({state: 1, absoluteX: 100, absoluteY: 300});
  assert.equal(instance._scale.value, 1);
  assert.equal(instance._x.value, 0);
  assert.equal(instance._y.value, 0);
  assert.equal(instance.data.zoomed, false);
  assert.equal(instance.pagerAllowed(), true);
  assert.match(instance._animatedStyle.updater().transform, /scale\(1\)/);
  instance.onUnload();
});

test("photo zoom interpolates scale and position, reverses from the live frame and lets pinch take over", () => {
  const clock = createWorkletClock();
  const {instance} = viewer("image", {worklet: clock.api});
  instance.renderer = "skyline";
  instance.photoDoubleTap({state: 1, absoluteX: 100, absoluteY: 300});
  assert.equal(instance._scale.value, 1, "the first frame must not jump to the target");
  assert.equal(instance.data.zoomed, true, "UI controls follow the zoom intent, not the tween's first frame");
  assert.ok(clock.requests.every(animation => animation.duration === 240));
  clock.advance(120);
  const halfway = instance._scale.value;
  assert.ok(halfway > 1 && halfway < 2);
  assert.ok(instance._x.value > 0 && instance._x.value < 95);
  assert.match(instance._animatedStyle.updater().transform, /scale\(1\./);
  instance.photoDoubleTap({state: 1, absoluteX: 100, absoluteY: 300});
  assert.equal(instance._scale.value, halfway, "a quick second double tap reverses without jumping");
  clock.advance(240);
  assert.equal(instance._scale.value, 1);
  assert.equal(instance._x.value, 0);
  instance.photoDoubleTap({state: 1, absoluteX: 100, absoluteY: 300});
  clock.advance(100);
  instance.photoScale({state: 1, focalX: 195, focalY: 422});
  const held = instance._scale.value;
  clock.advance(300);
  assert.equal(instance._scale.value, held, "pinch cancels the in-flight tween");
  instance.restorePhoto({type: "tap"});
  clock.advance(120);
  assert.ok(instance._scale.value > 1 && instance._scale.value < held);
  clock.advance(120);
  assert.equal(instance._scale.value, 1);
  instance.onUnload();
  assert.equal(clock.active.size, 0);
});

test("PC photo double clicks send progressive zoom targets to the view layer", () => {
  const {instance} = viewer();
  instance.renderer = "webview";
  const tap = (time, x = 195, y = 422) => instance.photoTap({timeStamp: time,
    currentTarget: {dataset: {id: 10}}, detail: {x, y}});
  tap(100);
  assert.equal(instance.data.zoomed, false, "single clicks do not zoom");
  tap(200);
  assert.equal(instance.data.zoomed, true);
  assert.equal(instance._scale.value, 2);
  assert.equal(instance.data.photoPointerState.scale, 2);
  assert.equal(instance.data.photoPointerState.animated, true);
  assert.equal(instance.pagerAllowed(), false);
  tap(500); tap(600);
  assert.equal(instance.data.zoomed, false);
  assert.equal(instance.data.photoPointerState.scale, 1);
  assert.equal(instance._scale.value, 1);
  assert.equal(instance.pagerAllowed(), true);
  tap(1000, 50, 300); tap(1100, 50, 300);
  assert.ok(instance._x.value > 0);
  instance.restorePhoto();
  assert.equal(instance.data.photoPointerState.scale, 1);
  assert.equal(instance._photoTap, null);
  instance.onUnload();
});

test("PC double click scales the actual image binding independently of the WXS observer", () => {
  const {instance:p}=viewer();p.renderer="webview";
  const markup=source("pages/memory_detail/memory_detail.wxml");
  const template=markup.match(/<image id="memory-photo"[^>]*style="([^"]+)"/)[1];
  const style=()=>template.replace(/\{\{([\s\S]*?)\}\}/g,(_,expression)=>String(vm.runInNewContext(expression,p.data)));
  p.photoTap({timeStamp:100});p.photoTap({timeStamp:200});
  assert.equal(p.data.zoomed,true);
  assert.match(style(),/transform:scale\(2\);transition:transform 240ms ease-out;/);
  p.photoTap({timeStamp:500});p.photoTap({timeStamp:600});
  assert.equal(p.data.zoomed,false);
  assert.match(style(),/transform:scale\(1\);transition:transform 240ms ease-out;/);
  p.renderer="skyline";p.data.photoPointerState=null;
  assert.doesNotMatch(style(),/transform:|transition:/,"Skyline's worklet remains the sole owner of its image transform");
  p.onUnload();
});

function photoPointerBridge(instance) {
  const module={exports:{}};
  vm.runInNewContext(source("pages/memory_detail/photo-pointer.wxs"),{module});
  instance.setViewerData({visible:true});
  const state={},styles={},calls=[];
  const stage={getState:()=>state,setStyle(patch){
    for(const key of Object.keys(styles))delete styles[key];
    Object.assign(styles,patch);
  }};
  const owner={callMethod(name,event){calls.push(event);instance[name](event);}};
  let previous;
  const sync=()=>{
    const value=instance.data.photoPointerState;
    if(value!==previous){module.exports.sync(value,previous,owner,stage);previous=value;}
  };
  const touch=(type,x,y,extra={})=>{
    sync();
    const point={clientX:x,clientY:y,identifier:1};
    const result=module.exports.touch({type,instance:stage,currentTarget:{dataset:{id:instance.data.current?.id,
      generation:instance.data.videoGeneration}},
      touches:type==="touchend"||type==="touchcancel"?[]:[point],changedTouches:[point],...extra},
    owner);
    sync();return result;
  };
  Object.assign(touch,{state,styles,calls,sync});
  sync();return touch;
}

test("PC enlarged photos pan in both axes, consume swiper movement and reuse the native pan bounds",()=>{
  const {instance:p}=viewer();p.renderer="webview";
  p.photoTap({timeStamp:100,detail:{x:195,y:422}});p.photoTap({timeStamp:200,detail:{x:195,y:422}});
  const touch=photoPointerBridge(p);
  assert.equal(touch("touchstart",195,422),undefined);
  assert.equal(touch("touchmove",255,502),false,"WXS prevents the move from reaching the swiper");
  assert.equal(touch.state.x,60);assert.equal(touch.state.y,80);
  assert.equal(touch.styles.transform,"translate(60px, 80px)");
  assert.equal(touch.styles.transition,"none","dragging follows the pointer without a CSS transition lag");
  assert.equal(p._x.value,0,"movement does not wait for a round trip through the JS thread");
  assert.equal(touch.calls.length,1,"only gesture start has crossed to JS");
  assert.equal(touch("touchmove",-9999,-9999),false);
  assert.equal(touch.state.x,-195);assert.equal(touch.state.y,-422);
  assert.equal(touch("touchmove",9999,9999),false);
  assert.equal(touch.state.x,195);assert.equal(touch.state.y,422);
  touch("touchend",9999,9999);
  assert.equal(p._x.value,195);assert.equal(p._y.value,422,"the final position is committed once at release");
  assert.equal(touch.calls.length,2);
  const style=touch.styles.transform;
  touch("touchmove",9000,9000);assert.equal(touch.styles.transform,style,"ended pointers cannot continue panning");
  p.data.memory.media.push({id:11,kind:"image"});p.change({detail:{current:1}});
  assert.equal(p.data.index,0);assert.equal(p.pagerAllowed(),false);
  p.restorePhoto();assert.equal(touch("touchmove",100,100),undefined,"fit mode leaves ordinary paging untouched");
  assert.equal(p.pagerAllowed(),true);p.onUnload();
});

test("200 PC pointer moves paint in the view layer with no JS calls or setData round trips",()=>{
  const {instance:p}=viewer();p.renderer="webview";
  p.photoTap({timeStamp:100});p.photoTap({timeStamp:200});
  const touch=photoPointerBridge(p),config=p.data.photoPointerState;
  let writes=0;const setData=p.setData.bind(p);
  p.setData=(patch,callback)=>{writes++;setData(patch,callback);};
  touch("touchstart",100,200);
  for(let frame=1;frame<=200;frame++)touch("touchmove",100+frame/2,200+frame);
  assert.equal(touch.styles.transform,"translate(100px, 200px)");
  assert.equal(touch.calls.length,1,"only start has reached the logic thread");
  assert.equal(writes,0);
  assert.equal(p.data.photoPointerState,config);
  touch("touchend",200,400);
  assert.equal(touch.calls.length,2);
  assert.equal(writes,1,"only release commits the final transform");
  assert.equal(p._x.value,100);assert.equal(p._y.value,200);
  p.onUnload();
});

test("PC press and unmoved release preserve an existing off-centre zoom without repainting",()=>{
  const {instance:p}=viewer();p.renderer="webview";
  p.photoTap({timeStamp:100,detail:{x:100,y:300}});p.photoTap({timeStamp:200,detail:{x:100,y:300}});
  const touch=photoPointerBridge(p);
  assert.equal(touch.styles.transform,"translate(95px, 122px)");
  const pose={...touch.styles};let writes=0;
  const setData=p.setData.bind(p);p.setData=(patch,callback)=>{writes++;setData(patch,callback);};
  touch("touchstart",195,422);
  assert.deepEqual(touch.styles,pose,"press must not drop the translation or interrupt the zoom transition");
  touch("touchend",195,422);
  assert.deepEqual(touch.styles,pose,"an unmoved release must not snap the image to an animation target");
  assert.equal(writes,0);
  touch("touchstart",195,422);touch("touchmove",215,452);
  assert.equal(touch.styles.transform,"translate(115px, 152px)");
  assert.equal(touch.styles.transition,"none","movement writes a complete pose even when setStyle replaces old keys");
  touch("touchend",215,452);
  const moved={...touch.styles};
  touch("touchstart",215,452);assert.deepEqual(touch.styles,moved);
  touch("touchend",215,452);assert.deepEqual(touch.styles,moved);
  assert.equal(writes,1,"only the actual drag commits a pose");
  p.onUnload();
});

test("a late drag acknowledgement cannot rewind a newer view-layer gesture or block restore",()=>{
  const module={exports:{}};
  vm.runInNewContext(source("pages/memory_detail/photo-pointer.wxs"),{module});
  const state={},styles={},calls=[];
  const stage={getState:()=>state,setStyle:patch=>Object.assign(styles,patch)};
  const owner={callMethod:(name,event)=>calls.push(event)};
  const config={enabled:true,id:10,generation:2,x:0,y:0,scale:2,maxX:195,maxY:422,serial:0,animated:true};
  module.exports.sync(config,null,owner,stage);
  const touch=(type,x)=>module.exports.touch({type,instance:stage,currentTarget:{dataset:{id:10,generation:2}},
    touches:type==="touchend"?[]:[{identifier:1,clientX:x,clientY:200}],
    changedTouches:[{identifier:1,clientX:x,clientY:200}]},owner);
  touch("touchstart",100);touch("touchmove",130);touch("touchend",140);
  assert.equal(calls[1].x,40);
  touch("touchstart",100);touch("touchmove",120);
  assert.equal(state.x,60,"the next gesture starts from the live view position, before JS acknowledges");
  module.exports.sync({...config,x:40,serial:1,animated:false},config,owner,stage);
  assert.equal(state.x,60);
  touch("touchmove",140);touch("touchend",140);
  assert.equal(calls[3].x,80);
  module.exports.sync({...config,x:80,serial:2,animated:false},config,owner,stage);
  assert.equal(styles.transform,"translate(80px, 0px)");
  touch("touchstart",100);touch("touchmove",120);
  module.exports.sync({...config,enabled:false,x:0,y:0,scale:1},config,owner,stage);
  assert.equal(styles.transform,"translate(0px, 0px)");
  assert.equal(styles.transition,"transform 240ms ease-out");
  touch("touchmove",180);assert.equal(state.x,0);
});

test("disabled, hidden and error states stop PC view-layer dragging before the logic thread",()=>{
  for(const patch of [{busy:true},{selectionOpen:true},{fullScreen:true},{visible:false},{error:"failed"}]){
    const {instance:p}=viewer();p.renderer="webview";
    p.photoTap({timeStamp:100});p.photoTap({timeStamp:200});
    const touch=photoPointerBridge(p);
    touch("touchstart",100,200);touch("touchmove",130,240);
    p.setViewerData(patch);touch.sync();
    const style=touch.styles.transform,count=touch.calls.length;
    touch("touchmove",180,290);touch("touchend",180,290);
    assert.equal(touch.styles.transform,style);
    assert.equal(touch.calls.length,count);
    p.onUnload();
  }
});

test("PC dragging cannot count as a double click, but subsequent ordinary double clicks still restore",()=>{
  const {instance:p}=viewer();p.renderer="webview";
  const tap=timeStamp=>p.photoTap({timeStamp,detail:{x:195,y:422}});
  tap(100);tap(200);
  const touch=photoPointerBridge(p);
  touch("touchstart",195,422);touch("touchmove",220,450);touch("touchend",220,450);
  tap(250);tap(300);assert.equal(p.data.zoomed,true,"the post-drag click must be ignored");
  for(const time of [500,600]){
    touch("touchstart",195,422);touch("touchend",195,422);tap(time);
  }
  assert.equal(p.data.zoomed,false);assert.equal(p.data.photoPointerState.scale,1);p.onUnload();
});

test("PC photo pan clamps short images and rejects stale, cancelled, multi-touch and hidden gestures",()=>{
  const {instance:p}=viewer();p.renderer="webview";
  p.data.memory.media[0].width=2000;p.data.memory.media[0].height=1000;p.fitPhoto(p.data.current);
  p.photoTap({timeStamp:100});p.photoTap({timeStamp:200});
  const touch=photoPointerBridge(p);
  touch("touchstart",195,422);touch("touchmove",10000,10000);
  assert.equal(touch.state.x,195);assert.equal(touch.state.y,0);
  const style=touch.styles.transform;
  touch("touchcancel",10000,10000);touch("touchmove",1,1);assert.equal(touch.styles.transform,style);
  touch("touchstart",195,422);
  const obsolete={type:"touchmove",id:10,generation:p.data.videoGeneration-1,touches:[{identifier:1,clientX:10,clientY:10}]};
  p.photoPointer(obsolete);assert.equal(touch.styles.transform,style);
  touch("touchmove",1,1,{touches:[{clientX:1,clientY:1},{clientX:2,clientY:2}]});
  touch("touchmove",10,10);assert.equal(touch.styles.transform,style);
  p.onHide();assert.equal(p._photoPointer,null);
  p.photoPointer({...obsolete,generation:p.data.videoGeneration});assert.equal(touch.styles.transform,style);
  p.onUnload();
});

test("photo pointer bridge never intercepts fit-mode swipes or duplicates Skyline worklet panning",()=>{
  for(const renderer of ["webview","skyline"]){
    const {instance:p}=viewer();p.renderer=renderer;const touch=photoPointerBridge(p);
    assert.equal(touch("touchstart",100,100),undefined);assert.equal(touch("touchmove",150,150),undefined);
    if(renderer==="skyline"){
      p.photoDoubleTap({state:1,absoluteX:195,absoluteY:422});
      assert.equal(touch("touchmove",200,200),undefined);assert.equal(p._photoPointer,null);
      p.photoPan({state:2,deltaX:30,deltaY:40});assert.equal(p._x.value,30);assert.equal(p._y.value,40);
    }
    p.onUnload();
  }
  const markup=source("pages/memory_detail/memory_detail.wxml");
  assert.match(markup,/prop="\{\{photoPointerState\}\}" change:prop="\{\{photoPointer.sync\}\}"/);
  for(const type of ["start","move","end","cancel"])
    assert.match(markup,new RegExp(`bindtouch${type}="\\{\\{photoPointer.touch\\}\\}"`));
  assert.equal((markup.match(/id="memory-photo"/g)||[]).length,1,"the pointer adapter does not duplicate or remount the image");
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
    assert.equal(instance.data.photoPointerState, null);
    instance.onUnload();
  }
  const markup = source("pages/memory_detail/memory_detail.wxml");
  assert.match(markup, /class="viewer-photo-stage" data-id="\{\{item.id\}\}" bindtap="photoTap"/);
  assert.doesNotMatch(markup, /photoTransformStyle|photoAnimating/);
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
  instance._previewMedia={update(...items){prepared.push(items);},dispose(){}};
  instance.data.memory.media=[0,1,2,3,4].map(id=>({id,kind:"image",url:`https://test.invalid/${id}.jpg`,thumbnail_url:`https://test.invalid/${id}-thumb.jpg`}));
  instance.data.index=2;
  instance.data.viewerMedia=[];
  instance.preparePreviewMedia();
  assert.deepEqual(Array.from(prepared[0].slice(0,3), item=>item.id),[2,3,1]);
  instance.data.index=0;
  instance.preparePreviewMedia();
  assert.equal(prepared[1][1].id,1);
  assert.equal(prepared[1][2],undefined);
  instance.data.memory=null; instance.data.viewerMedia=[];
  assert.doesNotThrow(()=>instance.preparePreviewMedia());
  const markup=source("pages/memory_detail/memory_detail.wxml");
  assert.match(markup,/cache-extent="1"/);
  assert.match(markup,/wx:if="\{\{loadingIndicatorVisible && !error && !fullScreen\}\}" is="memory-loading"/);
  assert.doesNotMatch(markup,/<text>加载中<\/text>/);
  assert.doesNotMatch(markup,/loading \|\| imageLoading \|\| videoLoading/);
  assert.match(markup,/imageSources\[item.url\] \|\| imageSources\[item.thumbnail_url\]/);
  instance.onUnload();
});

test("short landscape photos cannot pan into blank space vertically", () => {
  const { instance } = viewer();
  instance.data.memory.media[0].width = 1920;
  instance.data.memory.media[0].height = 1080;
  instance.activate();
  instance.photoDoubleTap({ state: 1, absoluteX: 195, absoluteY: 422 });
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
  instance.setViewerData({visible: true, playing: true});
  assert.equal(instance.portraitSeekAllowed(), true, "the native hit area, not screen coordinates, gates the gesture");
  instance._currentTime = 10;
  instance.showTime(10);
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

test("video progress advances between native time events and freezes on pause, buffering and exit", () => {
  const clock = createWorkletClock();
  const {instance} = viewer("video", {worklet: clock.api});
  instance.renderer = "skyline";
  instance.setViewerData({visible: true, playing: true});
  instance.bindVideoProgress();
  const time = value => instance.videoTime({currentTarget: {dataset: {id: 10}}, detail: {currentTime: value, duration: 30}});
  time(1);
  clock.advance(500);
  assert.equal(instance._progress.value, 5);
  assert.equal(instance.data.currentLabel, "0:01", "text is a clock, not the progress animation driver");
  assert.equal(instance._animatedStyles.get(".portrait-progress-played")().width, "5%");
  assert.equal(instance._animatedStyles.get(".portrait-progress-thumb")().left, "5%");
  instance.videoPause();
  clock.advance(2000);
  assert.equal(instance._progress.value, 5);
  instance.setViewerData({playing: true});
  time(2);
  clock.advance(500);
  const buffered = instance._progress.value;
  instance.videoWaiting();
  clock.advance(2000);
  assert.equal(instance._progress.value, buffered);
  time(3);
  instance.onHide();
  const hidden = instance._progress.value;
  clock.advance(2000);
  assert.equal(instance._progress.value, hidden);
  assert.equal(clock.active.size, 0);
  instance.onUnload();
});

test("video looping resets progress without animating backwards and interpolation never exceeds the duration", () => {
  const clock = createWorkletClock();
  const {instance} = viewer("video", {worklet: clock.api});
  instance.setViewerData({visible: true, playing: true});
  instance.data.videoBuffering = false;
  instance.showTime(29.8, true);
  clock.advance(1500);
  assert.equal(instance._progress.value, 100);
  instance.showTime(0, true);
  assert.equal(instance._progress.value, 0);
  clock.advance(500);
  assert.ok(Math.abs(instance._progress.value - 100 / 60) < 1e-9);
  instance.onUnload();
});

test("portrait seeking updates fractional progress on the UI thread before queued JS callbacks", () => {
  const clock = createWorkletClock(), queue = [];
  const {instance, calls} = viewer("video", {worklet: {...clock.api, runOnJS: callback => (...args) => queue.push(() => callback(...args))}});
  instance.renderer = "skyline";
  instance.setViewerData({visible: true, playing: true});
  instance._currentTime = 10;
  instance.showTime(10);
  instance.bindVideoProgress();
  instance.portraitVideoDrag({state: 1});
  instance.portraitVideoDrag({state: 2, deltaX: 17.9});
  const progress = instance._progress.value;
  assert.ok(Math.abs(progress - 11.5 / 30 * 100) < 1e-9);
  assert.equal(calls.length, 0, "the native visual must not wait for JS");
  assert.equal(instance.data.progress, 10 / 30 * 100);
  while (queue.length) queue.shift()();
  assert.equal(instance._progress.value, progress);
  assert.equal(instance.data.seekCurrentLabel, "00:11");
  instance.portraitVideoDrag({state: 3});
  while (queue.length) queue.shift()();
  assert.ok(Math.abs(calls.find(call => call.name === "seek").value - 11.5) < 1e-9);
  instance.onUnload();
});

test("PC progress uses fractional frame updates and stale callbacks cannot continue after pause", () => {
  const {instance, timers} = viewer("video");
  instance.renderer = "webview";
  instance.setViewerData({visible: true, playing: true});
  instance.data.videoBuffering = false;
  const originalNow = Date.now;
  let now = 1000;
  Date.now = () => now;
  try {
    instance.showTime(1, true);
    const advance = timers.get(instance._progressFrame);
    now += 125;
    advance();
    assert.equal(instance.data.progress, 1.125 / 30 * 100);
    instance.videoPause();
    const frozen = instance.data.progress;
    now += 500;
    advance();
    assert.equal(instance.data.progress, frozen);
    assert.equal(instance._progressFrame, null);
  } finally {Date.now = originalNow; instance.onUnload();}
});

test("development portrait diagnostics distinguish raw touch, gesture acceptance and the JS bridge without starting a second seek", () => {
  const {instance, calls, logs} = viewer("video", {
    getAccountInfoSync: () => ({miniProgram: {envVersion: "develop"}}),
  });
  instance.renderer = "skyline";
  instance.setViewerData({visible: true, playing: true});
  const point = x => ({identifier: 0, clientX: x, clientY: 680});
  instance.portraitTouchStart({touches: [point(100)]});
  instance.portraitTouchMove({touches: [point(140)]});
  instance.portraitTouchMove({touches: [point(180)]});
  assert.equal(instance.data.seeking, false, "diagnostics must not enable the PC touch fallback on Skyline");
  assert.equal(instance.portraitSeekAllowed(), true);
  instance.portraitVideoDrag({state: 1});
  instance.portraitVideoDrag({state: 2, deltaX: 100});
  instance.portraitTouchEnd({changedTouches: [point(200)]});
  assert.equal(instance._portraitDragging.value, true, "raw diagnostic events cannot release the native gesture lock");
  instance.portraitVideoDrag({state: 3});
  assert.equal(calls.filter(call => call.name === "seek").length, 1);
  const records = logs.map(([prefix, json]) => {assert.equal(prefix, "[memory_seek]"); return JSON.parse(json);});
  assert.deepEqual(records.map(record => record.stage), ["mounted", "touch-start", "touch-move", "accept", "bridge", "touch-end", "bridge"]);
  assert.ok(records.every(record => record.build === "portrait-shared-v3"));
  assert.equal(records.find(record => record.stage === "accept").uiGeneration, instance.data.videoGeneration);
  assert.equal(records.find(record => record.stage === "touch-move").horizontal, true);
  assert.ok(records.every(record => !Object.keys(record).some(key => /url|path|token|caption|nickname/i.test(key))));
  instance.onUnload();
});

test("portrait diagnostic acceptance logs retain rejected state and hiding clears the touch probe", () => {
  const {instance, logs} = viewer("video", {
    getAccountInfoSync: () => ({miniProgram: {envVersion: "develop"}}),
  });
  instance.renderer = "skyline";
  instance.setViewerData({visible: true, videoLoading: true});
  instance.portraitTouchStart({touches: [{identifier: 0, clientX: 100, clientY: 680}]});
  assert.equal(instance.portraitSeekAllowed(), false);
  const record = JSON.parse(logs.at(-1)[1]);
  assert.equal(record.allowed, false);
  assert.equal(record.loading, true);
  assert.equal(record.uiGeneration, instance.data.videoGeneration);
  assert.equal(instance._pointerSeek, null);
  instance.onHide();
  assert.equal(instance._portraitProbeTouch, null);
  instance.onUnload();
});

test("portrait diagnostics are disabled in trial, release and unknown environments", () => {
  for (const envVersion of ["trial", "release", undefined]) {
    const {instance, logs} = viewer("video", {getAccountInfoSync: () => ({miniProgram: {envVersion}})});
    instance.renderer = "skyline";
    instance.setData({visible: true});
    instance.portraitTouchStart({touches: [{identifier: 0, clientX: 100, clientY: 680}]});
    instance.portraitSeekAllowed();
    instance.portraitVideoDrag({state: 1});
    instance.portraitVideoDrag({state: 4});
    assert.equal(logs.length, 0);
    assert.equal(instance._portraitProbeTouch, null);
    instance.onUnload();
  }
});

function videoPointerBridge(instance, deferred = false) {
  const module = {exports: {}};
  vm.runInNewContext(source("pages/memory_detail/video-pointer.wxs"), {module});
  const state = {}, nodes = {}, calls = [], queue = [];
  const root = {getState: () => state};
  const owner = {selectComponent: () => root,
    selectAllComponents: name => touch.missing ? [] : [nodes[name] ||= {style: {}, setStyle(patch) {this.style = {...patch};}}],
    callMethod(name, event) {calls.push({name, event});
      if (deferred) queue.push(() => instance[name](event)); else instance[name](event);
    }};
  let previous, stamp = 1000;
  const sync = () => {
    const next = instance.data.videoPointerState;
    if (next !== previous) {const old = previous; previous = next; module.exports.sync(next, old, owner, root);}
  };
  const setData = instance.setData.bind(instance);
  instance.setData = (patch, callback) => {setData(patch); sync(); callback?.();};
  instance.setViewerData({});
  const touch = (type, x = 100, y = 680, dataset = {mediaId: instance.data.current.id}) => {
    stamp += 17;
    const point = {identifier: 0, clientX: x, clientY: y};
    return module.exports[type]({type: `touch${type}`, timeStamp: stamp, instance: root,
      currentTarget: {dataset}, touches: type === "end" || type === "cancel" ? [] : [point], changedTouches: [point]}, owner);
  };
  touch.slider = (type, value) => module.exports[type]({detail: {value}, timeStamp: stamp += 17}, owner);
  touch.flush = () => {while (queue.length) queue.shift()();};
  return Object.assign(touch, {state, nodes, calls, queue});
}

test("ordinary pointer events seek PC review video through the same state machine", () => {
  const {instance, calls} = viewer("video");
  instance.renderer = "webview";
  instance._admin = true;
  instance.setData({visible: true, playing: true, admin: true});
  instance._currentTime = 10;
  instance.showTime(10);
  const touch = videoPointerBridge(instance);
  touch("start", 100, 680);
  touch("move", 102, 680);
  assert.equal(instance.data.seeking, false, "click jitter is not seeking");
  touch("move", 279, 680);
  assert.equal(instance.data.seeking, true);
  assert.equal(instance.data.seekCurrentLabel, "00:25");
  touch("end", 300, 680);
  assert.equal(instance.data.seeking, false);
  assert.equal(instance.data.progressVisible, true);
  assert.equal(calls.filter(call => call.name === "seek").length, 1);
  assert.equal(calls.at(-1).name, "play");
  assert.equal(instance._pointerSeek, null);
  const markup = source("pages/memory_detail/memory_detail.wxml");
  assert.match(markup, /class="memory-viewer"[^>]*bindtouchmove="{{videoPointer.move}}" bindtouchend="{{videoPointer.end}}" bindtouchcancel="{{videoPointer.cancel}}"/);
  const controls = source("pages/memory_detail/memory-controls.wxml");
  assert.equal((controls.match(/bindtouchstart="{{videoPointer.start}}"/g) || []).length, 3);
  instance.onUnload();
});

test("pointer seeking does not steal vertical scrolling, replay paused video or duplicate Skyline gestures", () => {
  const {instance, calls} = viewer("video");
  instance.renderer = "webview";
  instance._currentTime = 10;
  instance.setData({visible: true, pausedByUser: true});
  instance.showTime(10);
  const touch = videoPointerBridge(instance);
  touch("start", 100, 680);
  touch("move", 101, 710);
  touch("end", 130, 711);
  assert.equal(instance.data.seeking, false);
  assert.equal(calls.length, 0);
  touch("start", 100, 680);
  touch("move", 179, 680);
  touch("cancel");
  assert.equal(instance.data.currentLabel, "0:10");
  assert.equal(calls.some(call => call.name === "seek" || call.name === "play"), false);
  instance.renderer = "skyline";
  instance.setViewerData({});
  calls.length = 0;
  touch("start", 100, 680);
  instance._portraitDragging.value = true;
  touch("end", 200, 680);
  assert.equal(calls.length, 0);
  assert.equal(instance._portraitDragging.value, true, "raw events cannot clear a Skyline-owned gesture");
  instance.onUnload();
});

test("WebView fullscreen drags reuse seek, cancel and user-pause handling without worklets", () => {
  const {instance, calls} = viewer("video", {worklet: undefined});
  instance.renderer = "webview";
  instance.setData({visible: true, fullScreen: true, pausedByUser: true});
  instance._currentTime = 15;
  instance.showTime(15);
  const touch = videoPointerBridge(instance);
  const start = () => touch("start", 300, 150, {fullScreen: true});
  touch("start", 300, 150);
  assert.ok(!touch.state.gesture, "portrait hitboxes cannot start fullscreen seeks");
  start();
  touch("move", 160, 150);
  assert.equal(instance.data.seeking, true);
  assert.ok(instance._seekTarget > 15, "fullscreen keeps the existing left-drag-forward direction");
  touch("end", 120, 150);
  assert.equal(instance.data.seeking, false);
  assert.equal(calls.filter(call => call.name === "seek").length, 1);
  assert.equal(calls.some(call => call.name === "play"), false);
  const settled = instance._currentTime;
  start();
  touch("move", 450, 150);
  touch("cancel");
  assert.equal(instance._currentTime, settled);
  assert.equal(calls.filter(call => call.name === "seek").length, 1);
  assert.equal(instance._portraitDragging.value, false);
  instance.onUnload();
});

test("WebView seek frames render ahead of delayed JS and only send bounded text updates", () => {
  const {instance, calls} = viewer("video");
  instance.renderer = "webview";
  instance.setViewerData({visible: true, playing: true});
  instance._currentTime = 10; instance.showTime(10);
  const touch = videoPointerBridge(instance, true);
  let writes = 0;
  const setData = instance.setData.bind(instance);
  instance.setData = (patch, callback) => {writes++; setData(patch, callback);};
  touch("start", 100);
  for (let i = 1; i <= 60; i++) touch("move", 100 + i);
  assert.equal(writes, 0, "visual frames do not wait for any logic-layer work");
  const expected = (10 / 30 + 60 / 358) * 100;
  assert.ok(Math.abs(parseFloat(touch.nodes[".portrait-seek-played"].style.width) - expected) < 1e-9);
  assert.ok(Math.abs(parseFloat(touch.nodes[".portrait-seek-thumb"].style.left) - expected) < 1e-9);
  assert.ok(touch.calls.length <= 8, "only start and changed seconds cross the bridge, not 60 frames");
  touch.flush();
  assert.ok(writes <= 8);
  assert.equal(calls.filter(call => call.name === "seek").length, 0);
  touch("end", 161.25);
  touch.flush();
  assert.ok(Math.abs(calls.find(call => call.name === "seek").value - (10 + 61.25 / 358 * 30)) < 1e-9,
    "release commits the exact fractional position, not the last throttled text update");
  assert.deepEqual(touch.nodes[".portrait-seek-played"].style, {}, "release returns style ownership to normal playback");
  assert.equal(instance.data.progressVisible, true);
  instance.onUnload();
});

test("WebView fullscreen slider paints every frame but seeks once; cancellation restores a paused playhead", () => {
  const {instance, calls} = viewer("video");
  instance.renderer = "webview";
  instance.setViewerData({visible: true, fullScreen: true, pausedByUser: true});
  instance._currentTime = 10; instance.showTime(10);
  const touch = videoPointerBridge(instance);
  let writes = 0;
  const setData = instance.setData.bind(instance);
  instance.setData = (patch, callback) => {writes++; setData(patch, callback);};
  for (let i = 1; i <= 60; i++) touch.slider("changing", 300 + i);
  assert.equal(touch.nodes[".viewer-progress-played"].style.width, "36%");
  assert.equal(touch.nodes[".viewer-progress-thumb"].style.left, "36%");
  assert.ok(writes < 10, `60 slider changes should not cause ${writes} page updates`);
  assert.equal(instance.data.seekGesture, false, "slider drag must not display the fullscreen swipe indicator");
  assert.equal(calls.filter(call => call.name === "seek").length, 0);
  touch.slider("changed", 367);
  assert.ok(Math.abs(calls.find(call => call.name === "seek").value - 11.01) < 1e-9);
  assert.equal(calls.some(call => call.name === "play"), false);
  touch.slider("changing", 900);
  touch("cancel");
  assert.equal(calls.filter(call => call.name === "seek").length, 1);
  assert.equal(instance.data.currentLabel, "0:11");
  assert.deepEqual(touch.nodes[".viewer-progress-played"].style, {});
  instance.onUnload();
});

test("WebView pointer invalidation rejects queued seek events after hide, resize or media changes", () => {
  for (const accepted of [false, true]) {
    for (const invalidate of [p => p.onHide(), p => p.onResize(), p => {
      p._videoGeneration++; p.setViewerData({current: {...p.data.current, id: 99}});
    }]) {
      const {instance, calls} = viewer("video");
      instance.renderer = "webview";
      instance.setViewerData({visible: true, playing: true});
      const touch = videoPointerBridge(instance, true);
      touch("start", 100); touch("move", 130);
      if (accepted) touch.flush();
      touch("move", 150); touch("end", 160);
      invalidate(instance);
      touch.flush();
      assert.equal(calls.filter(call => call.name === "seek").length, 0);
      instance.onUnload();
    }
  }
});

test("WebView seeking discovers late native nodes, clamps both edges and keeps fractional release accuracy", () => {
  const {instance, calls} = viewer("video");
  instance.renderer = "webview";
  instance.setViewerData({visible: true, pausedByUser: true});
  instance._currentTime = 15; instance.showTime(15);
  const touch = videoPointerBridge(instance);
  touch.missing = true;
  touch("start", 100); touch("move", 110);
  assert.equal(Object.keys(touch.nodes).length, 0);
  touch.missing = false;
  touch("move", -9999);
  assert.equal(touch.nodes[".portrait-seek-played"].style.width, "0%");
  assert.equal(touch.nodes[".portrait-seek-thumb"].style.left, "1.2%");
  touch("move", 9999);
  assert.equal(touch.nodes[".portrait-seek-played"].style.width, "100%");
  assert.equal(touch.nodes[".portrait-seek-thumb"].style.left, "98.8%");
  touch("end", 101.25);
  assert.ok(Math.abs(calls.find(call => call.name === "seek").value - (15 + 1.25 / 358 * 30)) < 1e-9);
  instance.onUnload();
});

test("WebView photo initialization and double-click do not need native animated-style APIs", () => {
  const {instance} = page("memory_detail", service(), {worklet: null});
  instance.renderer = "webview";
  instance.applyAnimatedStyle = () => assert.fail("WebView must use CSS transforms");
  instance.onLoad({id: 1});
  instance._visible = true;
  instance.setData({memory: {media: [{id: 10, kind: "image", width: 390, height: 844}]}});
  instance.activate();
  instance.photoTap({timeStamp: 100, detail: {x: 195, y: 422}});
  instance.photoTap({timeStamp: 240, detail: {x: 195, y: 422}});
  assert.equal(instance.data.zoomed, true);
  assert.equal(instance.data.photoPointerState.scale, 2);
  assert.equal(instance.data.photoPointerState.animated, true);
  instance.restorePhoto();
  assert.equal(instance.data.zoomed, false);
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

test("portrait gestures exclude hidden pages, images and loading video", () => {
  const {instance} = viewer("video");
  instance._admin = true;
  instance.setViewerData({visible: true});
  instance.activate();
  assert.equal(instance.portraitSeekAllowed(), true);
  for (const values of [{selectionOpen: true}, {busy: true}, {videoLoading: true}, {error: "failed"}, {fullScreen: true}, {visible: false}]) {
    const previous = {...instance.data};
    instance.setViewerData(values);
    assert.equal(instance.portraitSeekAllowed(), false);
    instance.setViewerData(previous);
  }
  instance.setViewerData({current: {...instance.data.current, kind: "image"}});
  assert.equal(instance.portraitSeekAllowed(), false);
});

test("portrait worklets see live shared state even when the UI page data remains the initial snapshot", () => {
  const {instance, calls} = viewer("video");
  const ui = {
    _portraitState: instance._portraitState,
    _portraitDragging: instance._portraitDragging,
    _portraitGestureGeneration: instance._portraitGestureGeneration,
    _portraitTraceEnabled: instance._portraitTraceEnabled,
    _progress: instance._progress,
    _playback: instance._playback,
    _seekMotion: instance._seekMotion,
    _frame: instance._frame,
    dragSeek: instance.dragSeek.bind(instance),
    tracePortraitSeek: instance.tracePortraitSeek.bind(instance),
  };
  Object.defineProperty(ui, "data", {get() {throw new Error("UI data is not a live JS state channel");}});
  const allowed = () => instance.portraitSeekAllowed.call(ui);
  const drag = event => instance.portraitVideoDrag.call(ui, event);
  assert.equal(allowed(), false);
  instance.setViewerData({visible: true, playing: true});
  assert.equal(allowed(), true);
  instance._currentTime = 10;
  instance.showTime(10);
  drag({state: 1});
  assert.equal(instance.data.seeking, true);
  assert.equal(instance._portraitGestureGeneration.value, instance._videoGeneration);
  drag({state: 2, deltaX: 179});
  assert.equal(instance.data.seekCurrentLabel, "00:25");
  drag({state: 3});
  assert.equal(calls.find(call => call.name === "seek").value, 25);
  assert.equal(calls.at(-1).name, "play");
  assert.equal(instance.pagerAllowed(), true);

  const oldGeneration = instance._videoGeneration;
  instance.activate();
  assert.ok(instance._portraitState.value.generation > oldGeneration);
  drag({state: 1});
  assert.equal(instance._portraitGestureGeneration.value, instance._videoGeneration);
  drag({state: 4});
  for (const patch of [{videoLoading: true}, {busy: true}, {selectionOpen: true},
      {error: "failed"}, {fullScreen: true}, {visible: false},
      {current: {...instance.data.current, kind: "image"}}]) {
    const previous = {...instance.data};
    instance.setViewerData(patch);
    assert.equal(allowed(), false);
    instance.setViewerData(previous);
    assert.equal(allowed(), true);
  }
  instance.onHide();
  assert.equal(allowed(), false);
  instance.onUnload();
  assert.equal(allowed(), false);
});

test("viewer data synchronization precedes render callbacks and avoids rewriting unchanged gesture state", () => {
  const {instance} = viewer("video");
  instance.setViewerData({visible: true});
  const state = instance._portraitState.value;
  instance.showTime(10);
  assert.equal(instance._portraitState.value, state, "playback ticks need not cross the UI bridge again");
  instance.setViewerData({busy: true}, () => {
    assert.equal(instance.portraitSeekAllowed(), false);
    instance.setViewerData({busy: false});
  });
  assert.equal(instance.portraitSeekAllowed(), true);
  const rawUpdates = source("pages/memory_detail/memory_detail.js").match(/this\.setData\(/g) || [];
  assert.equal(rawUpdates.length, 1, "only the synchronization helper may call raw setData");
  instance.onUnload();
});

test("Skyline portrait gestures bind directly to stable touch targets, not the transparent overlay or review buttons", () => {
  const controls = source("pages/memory_detail/memory-controls.wxml");
  const styles = source("pages/memory_detail/memory_detail.wxss");
  const bottom = controls.slice(controls.indexOf('<template name="memory-portrait-bottom">'), controls.indexOf('<template name="memory-fullscreen">'));
  const handlers = [...bottom.matchAll(/<horizontal-drag-gesture-handler\b[^>]*>([\s\S]*?)<\/horizontal-drag-gesture-handler>/g)];
  assert.equal(handlers.length, 2);
  assert.match(handlers[0][1], /^\s*<view class="viewer-seek-region"/);
  assert.match(handlers[1][1], /^\s*<view class="viewer-info /);
  for (const [markup, child] of handlers) {
    assert.match(markup, /worklet:should-accept-gesture="portraitSeekAllowed"/);
    assert.match(markup, /worklet:ongesture="portraitVideoDrag"/);
    assert.doesNotMatch(child, /class="viewer-bottom"|class="viewer-footer"/);
    assert.match(child, /bindtouchstart="{{videoPointer.start}}" data-media-id="{{current.id}}"/);
  }
  const fadingInfo = styles.match(/\.viewer-info--seeking\s*\{([^}]*)\}/)[1];
  assert.match(fadingInfo, /opacity:\s*0;/);
  assert.doesNotMatch(fadingInfo, /pointer-events:\s*none|display:\s*none|visibility:\s*hidden/,
    "fading metadata must not remove the active gesture's touch target");
  assert.doesNotMatch(source("pages/memory_detail/memory_detail.js"), /_seekBounds|updateSeekBounds/,
    "do not mix global touch coordinates with window-relative bounds");
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

test("resizing preserves portrait seeking without restarting video and refits images without cropping", () => {
  const video = viewer("video");
  video.instance.setViewerData({playing: true, visible: true});
  video.instance._currentTime = 12;
  video.instance.showTime(12);
  const generation = video.instance.data.videoGeneration;
  video.wx.getWindowInfo = () => ({windowWidth: 320, windowHeight: 568, statusBarHeight: 20});
  video.instance.onResize();
  assert.equal(video.instance.data.videoGeneration, generation);
  assert.equal(video.instance._currentTime, 12);
  assert.equal(video.instance.data.playing, true);
  assert.equal(video.calls.length, 0);
  assert.equal(video.instance.portraitSeekAllowed(), true);
  video.instance.portraitVideoDrag({state: 1});
  video.instance.portraitVideoDrag({state: 2, deltaX: 320 * 358 / 390 / 10});
  video.instance.portraitVideoDrag({state: 3});
  assert.equal(video.calls.find(call => call.name === "seek").value, 15);
  const photo = viewer();
  photo.instance.photoDoubleTap({state: 1, absoluteX: 195, absoluteY: 422});
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
  const touch = videoPointerBridge(instance);
  touch("start", 100, 680, {mediaId: 99});
  touch("move", 180, 680);
  touch("end", 180, 680);
  assert.equal(instance.data.seeking, false);
  assert.equal(touch.calls.length, 0);
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

test("image and video portrait metadata and review buttons share the same bottom safe-area offsets", () => {
  const controls = source("pages/memory_detail/memory-controls.wxml");
  const expression = name => controls.match(new RegExp(`class="${name}[^\"]*" style="bottom:\\{\\{([^}]+)\\}\\}rpx;"`))[1];
  const offset = (name, kind, admin, bottom) =>
    new Function("current", "admin", "bottom", `return (${expression(name)})`)({kind}, admin, bottom);
  for (const width of [320, 390, 620]) for (const bottom of [0, 34 * 750 / width]) {
    for (const admin of [false, true]) {
      const image = offset("viewer-info", "image", admin, bottom);
      const video = offset("viewer-info", "video", admin, bottom);
      assert.equal(image, video);
      assert.equal(image, bottom + (admin ? 169.23077 : 30.76923));
    }
    const imageFooter = offset("viewer-footer", "image", true, bottom);
    assert.equal(imageFooter, offset("viewer-footer", "video", true, bottom));
    assert.equal(imageFooter, bottom + 30.76923);
    const buttonHeight = Number(source("pages/memory_detail/memory_detail.wxss")
      .match(/\.viewer-footer button\s*\{\s*height:\s*([\d.]+)rpx/)[1]);
    assert.ok(offset("viewer-info", "image", true, bottom) - imageFooter - buttonHeight > 0);
  }
});

test("portrait controls retain the Pencil progress geometry and fullscreen controls", () => {
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

test("preview shows a spinner from detail fetch through native image decode, not merely download completion", async () => {
  let finish;
  const api = {...service(), detail: () => new Promise(resolve => {finish = resolve;})};
  const h = page("memory_detail", api);
  h.instance.onLoad({id:"7"}); h.instance.onShow();
  assert.equal(h.instance.data.mediaLoading, true);
  finish({id:7, media:[{id:10, kind:"image", url:"/photo.jpg", thumbnail_url:"/thumb.jpg"}]});
  await tick();
  const p = h.instance, generation = p.data.videoGeneration, url = p.data.current.url;
  p.setData({imageSources:{[url]:"photo-cache"}});
  p.photoLoaded({currentTarget:{dataset:{id:10,generation,source:"thumbnail-cache"}}});
  assert.equal(p.data.mediaLoading, true, "a thumbnail load cannot finish the full photo spinner");
  p.photoLoaded({currentTarget:{dataset:{id:10,generation,source:"photo-cache"}}});
  assert.equal(p.data.photoReady, true); assert.equal(p.data.mediaLoading, false);
  p.onUnload();
});

test("late photo load and error events cannot settle the new image attempt or a hidden preview", () => {
  const {instance:p} = viewer();
  p.data.memory.media[0].url = "https://test.invalid/photo.jpg";
  p.setViewerData({visible:true}); p.activate();
  p.setData({imageSources:{"https://test.invalid/photo.jpg":"photo-cache"}});
  const old = p.data.videoGeneration;
  p.activate();
  p.setData({imageSources:{"https://test.invalid/photo.jpg":"photo-cache"}});
  const event = generation => ({currentTarget:{dataset:{id:10,generation,source:"photo-cache"}}});
  p.photoLoaded(event(old)); p.mediaError({...event(old), detail:{errMsg:"old failure"}});
  assert.equal(p.data.photoReady, false); assert.equal(p.data.error, "");
  p.onHide(); p.photoLoaded(event(p.data.videoGeneration));
  assert.equal(p.data.photoReady, false); assert.equal(p.data.mediaLoading, false);
  p.onUnload();
});

test("paging updates the photo, index and load generation atomically before a fast cached native callback", async () => {
  const api = service(), jobs = [];
  api.detail = async () => ({id:7,revision:3,media:[1,2].map(id => ({id,kind:"image",url:`/${id}.jpg`}))});
  const h = page("memory_detail", api, {downloadFile(options) {jobs.push(options); return {abort(){}};}});
  const p = h.instance;
  p.onLoad({id:"7"}); p.onShow(); await tick();
  jobs[0].success({statusCode:200,tempFilePath:"photo-1"});
  jobs[1].success({statusCode:200,tempFilePath:"photo-2"});
  p.photoLoaded({currentTarget:{dataset:{id:1,generation:p.data.videoGeneration,source:"photo-1"}}});
  const setData = p.setData.bind(p);
  let nativeLoads = 0;
  p.setData = (patch, callback) => {
    const changed = patch.index !== undefined && patch.index !== p.data.index;
    setData(patch);
    if (changed && patch.index === 1) {
      nativeLoads++;
      p.photoLoaded({currentTarget:{dataset:{id:2,generation:p.data.videoGeneration,source:"photo-2"}}});
    }
    if (callback) callback();
  };
  p.change({detail:{current:1}});
  assert.equal(p.data.current.id, 2); assert.equal(p.data.photoReady, true);
  assert.equal(p.data.mediaLoading, false);
  p.change({detail:{current:0}});
  assert.equal(p.data.current.id, 1); assert.equal(p.data.mediaLoading, false,
    "backward paging does not wait for a second bindload when bytes were already decoded");
  assert.equal(nativeLoads, 1); assert.equal(jobs.length, 2);
  p.onUnload();
});

test("both adjacent native photos become ready without another download or metadata inspection", async () => {
  const api = service(), jobs = [], reads = [];
  api.detail = async () => ({id:7,revision:3,media:[1,2,3].map(id => ({id,kind:"image",url:`/${id}.jpg`}))});
  const h = page("memory_detail", api, {
    downloadFile(options) {jobs.push(options);return {abort(){}};},
    getImageInfo(options) {reads.push(options);},
  });
  const p = h.instance;
  p.onLoad({id:"7",media_id:"2"}); p.onShow(); await tick();
  assert.equal(jobs.length, 1);
  for (let i = 0; i < 3; i++) jobs[i].success({statusCode:200,tempFilePath:`photo-${i}`});
  assert.deepEqual(jobs.map(job => job.url), [2,3,1].map(id => `https://test.invalid/${id}.jpg`));
  assert.equal(reads.length,0,"native bindload, not getImageInfo, determines readiness");
  p.photoLoaded({currentTarget:{dataset:{id:2,generation:p.data.videoGeneration,source:"photo-0"}}});
  for (const [id, file] of [[3,"photo-1"],[1,"photo-2"]])
    p.photoLoaded({currentTarget:{dataset:{id,generation:p.data.videoGeneration,source:file}}});
  p.preparePreviewMedia(); assert.equal(reads.length, 0);
  for (const index of [2,1,0,1,2]) {
    p.change({detail:{current:index}});
    assert.equal(p.data.photoReady, true);
    assert.equal(p.data.mediaLoading, false); assert.equal(p.data.loadingIndicatorVisible, false);
  }
  assert.equal(jobs.length, 3); p.onUnload();
});

test("stale neighbour native events cannot mark a new generation or hidden resource ready", async () => {
  const api = service(), jobs = [], reads = [];
  api.detail = async () => ({id:7,media:[1,2,3,4,5].map(id => ({id,kind:"image",url:`/${id}.jpg`}))});
  const h = page("memory_detail", api, {
    downloadFile(options) {jobs.push(options);return {abort(){}};},getImageInfo(options) {reads.push(options);},
  });
  const p = h.instance; p.onLoad({id:"7",media_id:"2"}); p.onShow(); await tick();
  for (let i = 0; i < 3; i++) jobs[i].success({statusCode:200,tempFilePath:`photo-${i}`});
  const stale = {currentTarget:{dataset:{id:3,generation:p.data.videoGeneration,source:"photo-1"}}};
  p.change({detail:{current:4}});
  p.photoLoaded(stale);
  assert.equal(p._previewLease.photoReady("https://test.invalid/3.jpg"), false);
  assert.equal(p.data.photoReady, false);
  p.onHide(); p.photoLoaded(stale);
  assert.equal(p.data.loadingIndicatorVisible, false); assert.equal(reads.length, 0);
  p.onUnload();
});

test("a completed neighbour download alone does not claim the native photo is ready", async () => {
  const api = service(), jobs = [], reads = [];
  api.detail = async () => ({id:7,media:[1,2].map(id => ({id,kind:"image",url:`/${id}.jpg`}))});
  const h = page("memory_detail", api, {
    downloadFile(options) {jobs.push(options);return {abort(){}};},getImageInfo(options) {reads.push(options);},
  });
  const p = h.instance; p.onLoad({id:"7"}); p.onShow(); await tick();
  jobs[0].success({statusCode:200,tempFilePath:"one"}); jobs[1].success({statusCode:200,tempFilePath:"two"});
  assert.equal(reads.length,0);
  p.change({detail:{current:1}});
  assert.equal(p.data.photoReady, false); assert.equal(p.data.mediaLoading, true);
  p.photoLoaded({currentTarget:{dataset:{id:2,generation:p.data.videoGeneration,source:"two"}}});
  assert.equal(p.data.mediaLoading, false); p.onUnload();
});

test("video startup gets a 500ms grace period while sustained playback buffering uses 180ms", async () => {
  const h = await downloadingViewer(false), p = h.instance;
  const event = {currentTarget:{dataset:{id:61,generation:p.data.videoGeneration}}};
  const initial = h.timers.get(p._loadingTimer);
  assert.equal(h.timerDelays.get(p._loadingTimer), 500);
  assert.equal(p.data.mediaLoading, true); assert.equal(p.data.loadingIndicatorVisible, false);
  p.videoPlay(event);
  assert.equal(p.data.mediaLoading, true, "play intent cannot finish startup before decoded frames advance");
  p.videoTime({...event,detail:{currentTime:0.1,duration:8}});
  assert.equal(p.data.mediaLoading, false); assert.equal(p.data.loadingIndicatorVisible, false);
  initial(); assert.equal(p.data.loadingIndicatorVisible, false, "cancelled startup timer cannot flash later");
  p.videoWaiting(event);
  const timer = p._loadingTimer;
  assert.equal(h.timerDelays.get(timer), 180);
  assert.equal(p.data.loadingIndicatorVisible, false);
  h.timers.get(timer)(); assert.equal(p.data.loadingIndicatorVisible, true);
  p.videoTime({...event,detail:{currentTime:0.2,duration:8}});
  assert.equal(p.data.loadingIndicatorVisible, false);
  p.videoWaiting(event); const obsolete = h.timers.get(p._loadingTimer);
  p.change({detail:{current:1}}); obsolete();
  assert.equal(p.data.loadingIndicatorVisible, false, "old video timers cannot affect the next file");
  const hidden = h.timers.get(p._loadingTimer);
  p.onHide(); hidden(); assert.equal(p.data.loadingIndicatorVisible, false);
  p.onUnload();
});

test("cached PC video mounting cannot start a loading timer even when its render callback is delayed", async () => {
  const h=await downloadingViewer();
  h.finish(0);h.timers.get(h.instance._videoWarmTimer)();h.finish(1);
  h.instance.onHide();h.instance.onUnload();
  const next=page("memory_detail",h.api,h.wx,{},h.mediaModules),p=next.instance;
  p.renderer="webview";
  const setData=p.setData.bind(p);let mount;
  p.setData=(patch,callback)=>{
    setData(patch);
    if(patch.current?.kind==="video" && patch.videoLoading) mount=callback;
    else callback?.();
  };
  p.onLoad({id:"7",media_id:"61"});p.onShow();
  assert.equal(typeof mount,"function");assert.equal(p.data.videoLoading,true);
  assert.equal(p.data.videoMounted,false,"native mount acknowledgement has not arrived");
  assert.equal(p.data.videoBuffering,false);assert.equal(p.data.mediaLoading,false);
  assert.equal(p._loadingTimer,null);assert.equal(p.data.loadingIndicatorVisible,false);
  mount();await tick();
  assert.equal(p.data.videoSource,"video-cache-1");assert.equal(p.data.mediaLoading,false);
  assert.equal(h.downloads.length,2);p.onUnload();
});

test("play and waiting bursts remain startup until playback time advances; sustained waits still show feedback", async () => {
  const h=await downloadingViewer(false),p=h.instance;
  p.renderer="webview";
  const event={currentTarget:{dataset:{id:61,generation:p.data.videoGeneration}},detail:{currentTime:0.1,duration:8}};
  const initial=p._loadingTimer,stale=h.timers.get(initial);
  p.videoWaiting(event);
  assert.equal(p._loadingTimer,initial,"duplicate startup waiting must not restart the grace period");
  assert.equal(h.timerDelays.get(initial),500);
  p.videoPlay(event);
  p.videoWaiting(event);
  assert.equal(p._loadingTimer, initial, "play intent must neither reset nor shorten the startup wait");
  p.videoTime({...event,detail:{currentTime:0,duration:8}});
  assert.equal(p._videoProgressed,false,"an initial zero timestamp is not a decoded playback advance");
  assert.equal(p._loadingTimer,initial);
  p.videoTime(event);stale();
  assert.equal(p.data.loadingIndicatorVisible,false);
  p.videoWaiting(event);
  const buffered=p._loadingTimer;
  assert.equal(h.timerDelays.get(buffered),180,"real buffering after play keeps prompt feedback");
  p.videoTime({...event,detail:{currentTime:0.2,duration:8}});h.timers.get(buffered)?.();
  assert.equal(p.data.loadingIndicatorVisible,false);
  p.change({detail:{current:1}});
  const startup=p._loadingTimer;
  assert.equal(h.timerDelays.get(startup),500);
  h.timers.get(startup)();assert.equal(p.data.loadingIndicatorVisible,true);
  p.onUnload();
});

test("repeated cached PC video entries do not download again or show a spinner for play-before-progress waits", async () => {
  const h=await downloadingViewer();
  h.finish(0);h.timers.get(h.instance._videoWarmTimer)();h.finish(1);
  h.instance.onHide();h.instance.onUnload();
  const downloads=h.downloads.length;
  for(let visit=0;visit<3;visit++) {
    const next=page("memory_detail",h.api,h.wx,{},h.mediaModules),p=next.instance;
    p.renderer="webview";p.onLoad({id:"7",media_id:"61"});p.onShow();await tick();
    assert.equal(p.data.videoSource,"video-cache-1");
    assert.equal(p.data.mediaLoading,false);assert.equal(p._loadingTimer,null);
    assert.equal(p._videoProgressed,false);
    const event={currentTarget:{dataset:{id:61,generation:p.data.videoGeneration}}};
    p.videoPlay(event);p.videoWaiting(event);
    const startup=p._loadingTimer,obsolete=next.timers.get(startup);
    assert.equal(next.timerDelays.get(startup),500,"cached decoder startup must not use the 180ms stall path");
    p.videoPlay(event);p.videoWaiting(event);
    assert.equal(p._loadingTimer,startup);
    assert.equal(p.data.loadingIndicatorVisible,false);
    p.videoTime({...event,detail:{currentTime:0,duration:8}});
    assert.equal(p._loadingTimer,startup);
    p.videoTime({...event,detail:{currentTime:0.1,duration:8}});
    obsolete();
    assert.equal(p.data.mediaLoading,false);assert.equal(p.data.loadingIndicatorVisible,false);
    assert.equal(p._videoProgressed,true);
    assert.equal(h.downloads.length,downloads);
    p.onHide();p.onUnload();obsolete();
    assert.equal(p.data.loadingIndicatorVisible,false);
  }
});

test("a cached video's sustained decoder wait remains visible until progress, not another play event", async () => {
  const h=await downloadingViewer();
  h.finish(0);h.timers.get(h.instance._videoWarmTimer)();h.finish(1);
  h.instance.change({detail:{current:1}});await tick();
  const p=h.instance,event={currentTarget:{dataset:{id:62,generation:p.data.videoGeneration}}};
  assert.equal(p.data.videoSource,"video-cache-0");
  p.videoPlay(event);p.videoWaiting(event);
  const timer=p._loadingTimer;
  assert.equal(h.timerDelays.get(timer),500);
  h.timers.get(timer)();assert.equal(p.data.loadingIndicatorVisible,true);
  p.videoPlay(event);assert.equal(p.data.loadingIndicatorVisible,true,"a play event alone does not end the decoder wait");
  p.videoTime({...event,detail:{currentTime:0.1,duration:8}});
  assert.equal(p.data.loadingIndicatorVisible,false);
  p.videoWaiting(event);
  assert.equal(h.timerDelays.get(p._loadingTimer),180,"after real progress, stalls use normal feedback");
  p.onUnload();
});

async function cachedPhotoViewer() {
  const api = service(), jobs = [], submission = {id:7,revision:3,caption:"cached",media:
    [1,2].map(id => ({id,kind:"image",url:`/${id}.jpg`}))};
  api.detail = async () => structuredClone(submission);
  const h = page("memory_detail", api, {downloadFile(options) {jobs.push(options);return {abort(){}};}});
  h.instance.onLoad({id:"7"}); h.instance.onShow(); await tick();
  jobs[0].success({statusCode:200,tempFilePath:"photo-1"});
  jobs[1].success({statusCode:200,tempFilePath:"photo-2"});
  h.instance.photoLoaded({currentTarget:{dataset:{id:1,generation:h.instance.data.videoGeneration,source:"photo-1"}}});
  h.instance.onHide(); h.instance.onUnload();
  const next = () => page("memory_detail", api, h.wx, {}, h.mediaModules);
  return {...h,api,jobs,submission,next};
}

test("reopening an already viewed photo shows cached content before revalidation and does not reset it afterwards", async () => {
  const h = await cachedPhotoViewer(); let finish;
  h.api.detail = () => new Promise(resolve => {finish = resolve;});
  const {instance:p} = h.next(); p.onLoad({id:"7",media_id:"1"}); p.onShow();
  assert.equal(p.data.loading, true, "server revalidation is still in flight");
  assert.equal(p.data.memory.id, 7); assert.equal(p.data.current.id, 1);
  assert.equal(p.data.photoReady, true); assert.equal(p.data.mediaLoading, false);
  assert.equal(p.data.imageSources[p.data.current.url], "photo-1");
  const generation = p.data.videoGeneration;
  p.photoDoubleTap({state:1, x:195,y:422});
  finish({...structuredClone(h.submission),caption:"fresh"}); await tick();
  assert.equal(p.data.memory.caption, "fresh"); assert.equal(p.data.videoGeneration, generation);
  assert.equal(p.data.photoReady, true); assert.equal(p.data.mediaLoading, false);
  assert.equal(h.jobs.length, 2); p.onUnload();
});

test("background revalidation preserves the file selected while waiting and removes revoked cached content", async () => {
  for (const revoked of [0,401,403,404,410]) {
    const h = await cachedPhotoViewer(); let finish, fail;
    h.api.detail = () => new Promise((resolve,reject) => {finish = resolve;fail = reject;});
    const {instance:p} = h.next(); p.onLoad({id:"7",media_id:"1"}); p.onShow();
    assert.equal(p.data.current.id, 1);
    p.change({detail:{current:1}});
    if (revoked) fail({statusCode:revoked,message:"content removed"});
    else finish(structuredClone(h.submission));
    await tick();
    if (revoked) {
      assert.equal(p.data.memory, null); assert.equal(p.data.current, null);
      assert.equal(p.data.mediaLoading, false); assert.equal(p.data.error, "content removed");
      assert.equal(p._previewLease.detail(7), null);
      assert.equal(p._mediaSession.source("https://test.invalid/1.jpg"), "");
    } else {assert.equal(p.data.current.id, 2); assert.equal(p.data.index, 1);}
    p.onUnload();
  }
});

test("transient public validation failures retain usable cached media with a retry action", async () => {
  for (const statusCode of [0,500,503]) {
    const h=await cachedPhotoViewer();
    h.api.detail=async()=>{throw {statusCode,message:"temporary failure"};};
    const {instance:p}=h.next(); p.onLoad({id:"7",media_id:"1"});p.onShow();await tick();
    assert.equal(p.data.current.id,1); assert.equal(p.data.error,"");
    assert.equal(p.data.photoReady,true);assert.equal(p.data.revalidationFailed,true);
    assert.equal(p.data.mediaLoading,false);assert.equal(h.jobs.length,2);
    p.onUnload();
  }
});

test("per-file content identity survives metadata revision and token renewal but changes with the bytes", async () => {
  const h=await cachedPhotoViewer();
  // First authorize a response that supplies the new per-file identity.
  h.submission.media.forEach(item=>item.content_version="bytes-"+item.id);
  let p=h.next().instance; p.onLoad({id:"7",media_id:"1"});p.onShow();await tick();
  // Upgrading from an old server identity downloads once, then remains stable.
  for(let i=2;i<h.jobs.length;i++)h.jobs[i].success({statusCode:200,tempFilePath:"versioned-"+i});
  p.photoLoaded({currentTarget:{dataset:{id:1,generation:p.data.videoGeneration,source:p.data.imageSources[p.data.current.url]}}});
  p.onHide();p.onUnload();
  const count=h.jobs.length;
  h.submission.revision++;
  const next=h.next(); next.app.globalData.accessToken="renewed-token";
  p=next.instance;p.onLoad({id:"7",media_id:"1"});p.onShow();await tick();
  assert.equal(h.jobs.length,count);assert.equal(p.data.photoReady,true);assert.equal(p.data.mediaLoading,false);
  p.onHide();p.onUnload();
  h.submission.media[0].content_version="different-bytes";
  p=h.next().instance;p.onLoad({id:"7",media_id:"1"});p.onShow();await tick();
  assert.equal(h.jobs.length,count+1);assert.equal(p.data.photoReady,false);
  p.onUnload();
});

test("a native preparation timeout ends loading, while old deadlines cannot fail a later slide", async () => {
  const h=await downloadingViewer(false),p=h.instance;
  const stale=h.timers.get(p._mediaDeadline);
  assert.equal(h.timerDelays.get(p._mediaDeadline),20000);
  p.change({detail:{current:1}});stale();assert.equal(p.data.error,"");
  h.timers.get(p._mediaDeadline)();
  assert.match(p.data.error,/超时/);assert.equal(p.data.mediaLoading,false);
  assert.equal(p.data.videoMounted,false);assert.equal(p.data.loadingIndicatorVisible,false);
  p.onUnload();
});

test("a play event without progressing time still has a finite native preparation deadline", async () => {
  const h=await downloadingViewer(false),p=h.instance;
  const event={currentTarget:{dataset:{id:61,generation:p.data.videoGeneration}},detail:{currentTime:0,duration:8}};
  const deadline=p._mediaDeadline;p.videoPlay(event);p.videoTime(event);
  assert.equal(p._mediaDeadline,deadline);
  h.timers.get(deadline)();assert.match(p.data.error,/超时/);p.onUnload();
});

test("a ready cached PC image can be double-clicked while metadata revalidation is pending", async()=>{
  const h=await cachedPhotoViewer();let finish;
  h.api.detail=()=>new Promise(resolve=>{finish=resolve;});
  const {instance:p}=h.next();p.renderer="webview";p.onLoad({id:"7",media_id:"1"});p.onShow();
  assert.equal(p.data.loading,true);assert.equal(p.data.photoReady,true);
  for(const timeStamp of [100,200])p.photoTap({timeStamp,currentTarget:{dataset:{id:1}},detail:{x:100,y:100}});
  assert.equal(p.data.zoomed,true);
  finish(structuredClone(h.submission));await tick();assert.equal(p.data.zoomed,true);p.onUnload();
});

test("entry thumbnail handoff is transient, ID-scoped and removed on confirmed unavailability", async () => {
  const api=service(); let receive,fail;
  api.detail=()=>new Promise((_,reject)=>{fail=reject;});
  const {instance:p}=page("memory_detail",api);
  p.getOpenerEventChannel=()=>({on(name,fn){assert.equal(name,"memoryEntry");receive=fn;}});
  p.onLoad({id:"7",media_id:"1"});p.onShow();
  receive({id:9,mediaId:1,source:"wrong"});assert.equal(p.data.entrySource,"");
  receive({id:7,mediaId:1,source:"shown-thumbnail"});assert.equal(p.data.entrySource,"shown-thumbnail");
  fail({statusCode:404,message:"removed"});await tick();
  assert.equal(p.data.entrySource,"");p.onUnload();
});

test("admin previews never show public snapshot contents before fresh authorization", async () => {
  const h = await cachedPhotoViewer(); let finish;
  h.api.detail = () => new Promise(resolve => {finish = resolve;});
  const {instance:p} = h.next(); p.onLoad({id:"7",admin:"1",media_id:"1"}); p.onShow();
  assert.equal(p.data.memory, null); assert.equal(p.data.mediaLoading, true);
  finish(structuredClone(h.submission)); await tick();
  assert.equal(p.data.memory.id, 7); p.onUnload();
});

test("a new revision invalidates a warm photo while a late response cannot restore an unloaded preview", async () => {
  for (const unload of [false,true]) {
    const h = await cachedPhotoViewer(); let finish;
    h.api.detail = () => new Promise(resolve => {finish = resolve;});
    const {instance:p} = h.next(); p.onLoad({id:"7",media_id:"1"}); p.onShow();
    assert.equal(p.data.mediaLoading, false);
    if (unload) p.onUnload();
    finish({...structuredClone(h.submission),revision:4}); await tick();
    if (unload) {
      assert.equal(p.data.memory.revision, 3);
      assert.equal(h.jobs.length, 2, "late validation cannot start transfers after unloading");
    } else {
      assert.equal(p.data.memory.revision, 4); assert.equal(p.data.photoReady, false);
      assert.equal(p.data.mediaLoading, true); assert.equal(h.jobs.length, 3);
      p.onUnload();
    }
  }
});

test("cached video starts before revalidation and an unchanged response never remounts or restarts it", async () => {
  const h = await downloadingViewer();
  h.finish(0); h.timers.get(h.instance._videoWarmTimer)(); h.finish(1); await tick();
  h.instance.onHide(); h.instance.onUnload();
  let finish;
  h.api.detail = () => new Promise(resolve => {finish = resolve;});
  const next = page("memory_detail", h.api, h.wx, {}, h.mediaModules), p = next.instance;
  p.onLoad({id:"7",media_id:"61"}); p.onShow();
  assert.equal(p.data.videoSource, "video-cache-1"); assert.equal(p.data.videoMounted, true);
  const generation = p.data.videoGeneration;
  const event = {currentTarget:{dataset:{id:61,generation}},detail:{currentTime:2,duration:8}};
  p.videoPlay(event); p.videoTime(event);
  const plays = h.calls.filter(value => value === "play").length;
  finish(structuredClone(h.submission)); await tick();
  assert.equal(p.data.videoGeneration, generation); assert.equal(p._currentTime, 2);
  assert.equal(p.data.mediaLoading, false);
  assert.equal(h.calls.filter(value => value === "play").length, plays);
  assert.equal(h.downloads.length, 2); p.onUnload();
});

test("video mounting awaits actual progress, while real waiting restores loading feedback", async () => {
  const h = await downloadingViewer(false), p = h.instance;
  const event = {currentTarget:{dataset:{id:61,generation:p.data.videoGeneration}}};
  assert.equal(p.data.videoLoading, false); assert.equal(p.data.videoMounted, true);
  assert.equal(p.data.mediaLoading, true);
  p.videoPlay(event); assert.equal(p.data.mediaLoading, true);
  p.videoTime({...event,detail:{currentTime:0.1,duration:8}});
  assert.equal(p.data.mediaLoading, false);
  p.videoWaiting(event); assert.equal(p.data.mediaLoading, true);
  p.videoPause(event); assert.equal(p.data.mediaLoading, true, "native buffering is not an intentional pause");
  p.videoTap(); assert.equal(p.data.pausedByUser, true); assert.equal(p.data.mediaLoading, false);
  p.videoTap(); assert.equal(p.data.mediaLoading, true);
  p.videoPlay(event); p.videoTime({...event,detail:{currentTime:0.2,duration:8}});
  assert.equal(p.data.mediaLoading, false);
  p.setViewerData({error:"load failed",videoBuffering:true});
  assert.equal(p.data.mediaLoading, false);
  p.onUnload();
});

test("portrait and native fullscreen share one centered animated loader and never offer play while loading", () => {
  const markup = source("pages/memory_detail/memory_detail.wxml");
  const controls = source("pages/memory_detail/memory-controls.wxml");
  const css = source("pages/memory_detail/memory_detail.wxss");
  assert.match(markup, /bindload="photoLoaded"/);
  assert.match(markup, /data-generation="\{\{videoGeneration\}\}" data-source=/);
  assert.match(markup, /wx:if="\{\{loadingIndicatorVisible && !error && !fullScreen\}\}" is="memory-loading"/);
  assert.match(controls, /wx:if="\{\{loadingIndicatorVisible && !error\}\}" is="memory-loading"/);
  for (const file of [markup, controls])
    assert.match(file, /wx:if="\{\{!playing && [^"]*!mediaLoading && !error[^\"]*\}\}" class="viewer-play-button"/);
  assert.match(css, /\.viewer-loading\s*\{[^}]*top: 50%;[^}]*left: 50%;[^}]*pointer-events: none/);
  assert.match(css, /animation-name: viewer-loading-spin/);
  assert.match(css, /@keyframes viewer-loading-spin/);
  assert.match(controls, /src="\/images\/memory-upload-spinner.svg"/);
});

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

test("a stable streaming video warms a temporary file and reopening reuses it without a second download", async () => {
  const h = await downloadingViewer();
  h.finish(0);
  const warm = h.instance._videoWarmTimer;
  assert.ok(warm); h.timers.get(warm)();
  assert.equal(h.downloads.length, 2);
  assert.equal(h.downloads[1].options.url, "https://test.invalid/61.mp4");
  h.finish(1); await tick();
  assert.equal(h.instance.data.videoSource, "https://test.invalid/61.mp4", "warming never remounts a playing video");
  h.instance.onHide(); h.instance.onUnload();
  let reads = 0;
  h.api.detail = async () => {reads++; return structuredClone(h.submission);};
  const next = page("memory_detail", h.api, h.wx, {}, h.mediaModules);
  next.instance.onLoad({id: "7"}); next.instance.onShow(); await tick();
  assert.equal(reads, 1, "reopening still validates the resource with the server");
  assert.equal(next.instance.data.videoSource, "video-cache-1");
  assert.equal(h.downloads.length, 2);
  assert.equal(next.instance.data.mediaLoading, false, "a complete cached video does not force loading feedback");
  const event = {currentTarget:{dataset:{id:61,generation:next.instance.data.videoGeneration}}};
  next.instance.videoPlay(event); next.instance.videoTime({...event,detail:{currentTime:0.1,duration:8}});
  assert.equal(next.instance.data.mediaLoading, false);
  assert.equal(next.instance.data.muted, false);
  next.instance.onUnload();
});

test("reopening a photo uses its completed temporary file after fresh server validation", async () => {
  const api = service(), jobs = [];
  let revision = 3, reads = 0;
  api.detail = async () => {reads++; return {id: 7, revision, media: [{id: 1, kind: "image", url: "/photo.jpg"}]};};
  const h = page("memory_detail", api, {downloadFile(options) {jobs.push(options); return {abort() {}};}});
  h.instance.onLoad({id: "7"}); h.instance.onShow(); await tick();
  jobs[0].success({statusCode: 200, tempFilePath: "photo-cache"});
  h.instance.onHide(); h.instance.onUnload();
  const next = page("memory_detail", api, h.wx, {}, h.mediaModules);
  next.instance.onLoad({id: "7"}); next.instance.onShow(); await tick();
  assert.equal(reads, 2); assert.equal(jobs.length, 1);
  assert.equal(next.instance.data.imageSources["https://test.invalid/photo.jpg"], "photo-cache");
  assert.equal(next.instance.data.mediaLoading, true);
  next.instance.photoLoaded({currentTarget:{dataset:{id:1,generation:next.instance.data.videoGeneration,source:"photo-cache"}}});
  assert.equal(next.instance.data.mediaLoading, false);
  assert.equal(jobs.length, 1, "showing the loader never triggers a duplicate file download");
  next.instance.onHide(); next.instance.onUnload();
  revision++;
  const changed = page("memory_detail", api, h.wx, {}, h.mediaModules);
  changed.instance.onLoad({id: "7"}); changed.instance.onShow(); await tick();
  assert.equal(jobs.length, 2, "a fresh revision cannot reuse stale media bytes");
  changed.instance.onUnload();
});

test("buffering or leaving before the warm timer fires never starts a current-video transfer", async () => {
  const h = await downloadingViewer();
  const callback = h.timers.get(h.instance._videoWarmTimer);
  h.instance.videoWaiting({currentTarget: {dataset: {id: 61, generation: h.instance.data.videoGeneration}}});
  callback(); assert.equal(h.downloads.length, 1);
  h.instance.onHide(); callback(); assert.equal(h.downloads.length, 1);
  h.instance.onUnload();
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
  assert.equal(downloads.length,1,"intentional pause opens neighbour preparation even before native play");
  instance.videoPlay({currentTarget: {dataset: {id:61,generation:instance.data.videoGeneration}}});
  assert.equal(calls.at(-1),"pause");
  assert.equal(downloads.length,1);
  instance.videoTap();
  instance.videoPlay({currentTarget: {dataset: {id:61,generation:instance.data.videoGeneration}}});
  instance.videoTime({currentTarget: {dataset: {id:61,generation:instance.data.videoGeneration}},detail:{currentTime:0.1,duration:8}});
  assert.equal(downloads.length,2,"resuming startup temporarily yields bandwidth back to the native player");
  assert.equal(downloads[0].aborted,true);
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

test("submission explanation is left aligned with an explicit paragraph break", () => {
  const { instance } = page("memory_create", service());
  let options;
  instance.selectComponent = () => ({ open(value) { options = value; } });
  instance.setData({ ready: true, files: [{ id: "explanation" }] });
  instance.confirmUpload();
  assert.equal(options.message,
    "您上传的图片与视频将投稿至管理员，不会直接展示在小程序中。\n若内容合适，管理员将代为发布。");
  assert.equal(options.messageAlign, "left");
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

test("upload progress remains at 99 until receipt, patches only its tile and recovers failure", async () => {
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
    ["uploading", "waiting", "waiting"],
  );
  const patches = [];
  const setData = instance.setData.bind(instance);
  instance.setData = (patch, callback) => { patches.push(patch); setData(patch, callback); };
  const waitingTile = instance.data.files[2];
  tasks[0].progress({ totalBytesSent: 90, totalBytesExpectedToSend: 200 });
  assert.equal(instance.data.files[0].uploadProgress, 45);
  assert.equal(patches.length, 1);
  assert.ok(Object.keys(patches[0]).every(key => key.startsWith("files[0].") || key === "progress"));
  assert.equal(instance.data.files[2], waitingTile);
  tasks[0].progress({ progress: 45, totalBytesSent: 90, totalBytesExpectedToSend: 200 });
  tasks[0].progress({ progress: 20 });
  assert.equal(patches.length, 1, "duplicate or stale progress must not refresh waiting spinners");
  tasks[0].progress({ progress: 75, totalBytesSent: 150, totalBytesExpectedToSend: 200 });
  assert.equal(instance.data.files[0].uploadProgress, 75, "multipart overhead cannot count as original bytes");
  tasks[0].progress({ progress: 100 });
  assert.equal(instance.data.files[0].uploadProgress, 99);
  assert.equal(instance.data.files[0].uploadState, "uploading");
  assert.equal(instance._uploader.submitted, undefined);
  const writes = patches.length;
  tasks[0].progress({ progress: 100 });
  tasks[0].progress({ progress: 99 });
  assert.equal(patches.length, writes);
  tasks[0].resolve();
  await tick();
  assert.equal(instance.data.files[0].uploadState, "uploaded");
  assert.equal(instance.data.files[0].uploadProgress, 100);
  tasks[0].progress({ totalBytesSent: 20 });
  assert.equal(instance.data.files[0].uploadState, "uploaded");
  assert.equal(instance.data.files[1].uploadState, "uploading");
  assert.equal(instance.data.files[2].uploadState, "waiting");
  tasks[1].reject(new Error("network interrupted"));
  await tick();
  assert.equal(instance.data.files[2].uploadState, "uploading");
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

test("one upload progress holds at 99 through receipt and final submission, with safe retries", async () => {
  const tasks = [], submissions = [], calls = [];
  const api = {
    ...service(),
    async send(url, method) {
      calls.push([url, method]);
      if (url === "/memory-drafts") return {id: 1, status: "draft"};
      if (url.endsWith("/submit")) return new Promise(resolve => submissions.push(resolve));
      return {state: "empty"};
    },
    upload(id, slot, file, progress) {
      let resolve, reject;
      const promise = new Promise((done, fail) => {resolve = done; reject = fail;});
      tasks.push({progress, resolve, reject});
      return {promise, abort() {}};
    },
  };
  const {instance} = page("memory_create", api);
  instance.onLoad();
  instance.setData({files: [{id: "photo", kind: "image", path: "photo.jpg", size: 100}]});
  let pending = instance.upload();
  await tick();
  tasks[0].progress({progress: 100});
  assert.equal(instance.data.progress, 99);
  assert.equal(instance.data.files[0].uploadState, "uploading");
  assert.equal(submissions.length, 0);
  assert.equal(instance.data.busy, true);
  tasks[0].reject(new Error("server validation failed"));
  await pending;
  assert.equal(instance.data.files[0].uploadState, "failed");
  assert.equal(instance.data.uploadError, "server validation failed");
  assert.equal(instance.data.error, "");
  assert.equal(instance.data.busy, false);
  assert.equal(instance._uploader.submitAttempted, undefined);
  pending = instance.upload();
  await tick();
  assert.equal(instance.data.files[0].uploadProgress, 0);
  assert.equal(instance.data.files[0].uploadState, "uploading");
  tasks[1].progress({totalBytesSent: 150, totalBytesExpectedToSend: 200});
  assert.equal(instance.data.progress, 75);
  tasks[1].progress({progress: 100});
  tasks[1].resolve();
  await tick();
  assert.equal(instance.data.files[0].uploadState, "uploaded");
  assert.equal(instance.data.progress, 99);
  assert.equal(instance._uploader.submitted, undefined);
  assert.equal(submissions.length, 1);
  submissions[0]({status: "received"});
  await pending;
  assert.equal(instance._uploader.submitted, true);
  assert.equal(instance.data.progress, 100);
  assert.equal(calls.filter(([url]) => url === "/memory-drafts").length, 1);
  instance.onUnload();
});

test("file validation and picker errors belong beside the upload label, without hiding other form errors", async () => {
  let options;
  const {instance} = page("memory_create", service(), {chooseMedia: value => {options = value;}});
  instance.onLoad();
  await tick();
  instance.setData({files: [{id: "large", kind: "image", path: "large.jpg", size: 20 * 1024 ** 2 + 1}]});
  await instance.upload();
  assert.ok(instance.data.uploadError);
  assert.equal(instance.data.error, "");
  assert.equal(instance.data.busy, false);
  assert.equal(instance.data.locked, false);
  assert.equal(instance._uploader, undefined);
  instance.setData({error: "活动加载失败"});
  instance.choose();
  assert.equal(instance.data.uploadError, "");
  assert.equal(instance.data.error, "活动加载失败");
  options.fail({errMsg: "chooseMedia:fail permission denied"});
  assert.equal(instance.data.uploadError, "选择内容失败，请重试");
  assert.equal(instance.data.error, "活动加载失败");
  instance.choose();
  options.fail({errMsg: "chooseMedia:fail cancel"});
  assert.equal(instance.data.uploadError, "");
  assert.equal(instance.data.selecting, false);
  instance.onUnload();
});

test("thumbnail updates patch only changed fields and keep upload spinner animation linear", () => {
  const {instance} = thumbnailPage();
  const patches = [];
  const setData = instance.setData.bind(instance);
  instance.setData = (patch, callback) => {patches.push(patch); setData(patch, callback);};
  instance.updateThumbnail("first", {thumbnailState: "working"});
  instance.updateThumbnail("first", {thumbnailState: "working"});
  instance.updateThumbnail("removed", {thumbnail: "late.jpg"});
  assert.equal(patches.length, 1);
  assert.deepEqual(Object.keys(patches[0]), ["files[0].thumbnailState"]);
  const styles = source("pages/memory_create/memory_create.wxss");
  assert.match(styles, /\.upload-spinner\s*\{[^}]*animation-timing-function:\s*linear;[^}]*animation-iteration-count:\s*infinite;/s);
  assert.match(styles, /@keyframes upload-spin\s*\{\s*from\s*\{\s*transform:\s*rotate\(0deg\);\s*\}\s*to\s*\{\s*transform:\s*rotate\(360deg\);/);
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

test("WebView memory columns resize without dropping covers, duplicating cards or resetting presentation", async () => {
  let windowWidth = 390;
  const api = service();
  api.list = async values => ({items: [{id: values.cursor ? 8 : 7, media: [
    {id: values.cursor ? 12 : 10, kind: "image", state: "ready", width: 390, height: 600, thumbnail_url: "/a.jpg"},
    {id: values.cursor ? 13 : 11, kind: "video", state: "ready", width: 600, height: 390, thumbnail_url: "/b.jpg"},
  ]}], cursor: values.cursor ? null : "next"});
  const {instance} = page("memory", api, {getWindowInfo: () => ({windowWidth, statusBarHeight: 20})});
  instance.renderer = "webview";
  instance.onLoad();
  assert.equal(instance.data.webview, true);
  assert.equal(instance.data.skeletonColumns.flatMap(column => column.items).length, 6);
  await instance.load(true);
  await instance.load(false);
  const ids = () => Array.from(instance.data.columns.flatMap(column => column.items), item => item.id).sort();
  assert.deepEqual(ids(), [10, 11, 12, 13]);
  const states = instance.data.coverStates, sources = instance.data.imageSources;
  windowWidth = 620;
  instance.onResize();
  assert.deepEqual(ids(), [10, 11, 12, 13]);
  assert.ok(instance.data.items.every(item => item.coverHeight === Math.round(instance.data.cardWidth * item.coverRatio)));
  assert.equal(instance.data.coverStates, states);
  assert.equal(instance.data.imageSources, sources);
  instance.onUnload();
});

test("memory heading scrolls with its grid and cards reuse the home open-container transition", () => {
  const markup = source("pages/memory/memory.wxml");
  const scrollStart = markup.indexOf('<scroll-view class="memory-scroll"');
  const heading = markup.indexOf('<view class="memory-heading"');
  const grid = markup.indexOf('<grid-view');
  const scrollEnd = markup.indexOf('</scroll-view>');
  assert.ok(scrollStart < heading && heading < grid && grid < scrollEnd);
  assert.match(markup, /<list-view wx:if="\{\{!webview\}\}"><view class="memory-heading">/);
  assert.match(markup, /<template name="memory-grid-item">/);
  assert.match(markup, /<block wx:for="\{\{loading && !items.length \? skeletonItems : items\}\}" wx:key="id"><template is="memory-grid-item"/);
  assert.match(markup, /<open-container wx:else class="memory-card-transition /);
  assert.match(markup, /<view wx:if="\{\{webview\}\}" class="memory-card-transition [^>]*bindtap="open"/);
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
  assert.match(markup, /<open-container[^>]*>\s*<template is="memory-cover-content"/);
  assert.match(markup, /<template name="memory-cover-content">\s*<view class="memory-cover" style="width:\{\{cardWidth\}\}px;height:\{\{item.coverHeight\}\}px;">\s*<image class="memory-cover-image memory-window-image"/);
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

test("review advancement consumes the preloaded next video across a publication-only revision change", async () => {
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
    createVideoContext: () => ({play() {}, pause() {}}),
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
  assert.equal(removed, undefined, "completed files remain within the shared short-lived budget");
  instance.onUnload();
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
  instance.photoDoubleTap({state: 1, absoluteX: 195, absoluteY: 422});
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
