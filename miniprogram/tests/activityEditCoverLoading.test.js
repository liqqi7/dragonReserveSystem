const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const pageDir = path.join(__dirname, "../pages/activity_edit");
const wxml = fs.readFileSync(path.join(pageDir, "activity_edit.wxml"), "utf8");
const wxss = fs.readFileSync(path.join(pageDir, "activity_edit.wxss"), "utf8");

function loadPageDefinition(appData = {}) {
  const previousPage = global.Page;
  const previousGetApp = global.getApp;
  let definition;
  try {
    global.Page = value => { definition = value; };
    global.getApp = () => ({ globalData: appData });
    const pagePath = require.resolve("../pages/activity_edit/activity_edit.js");
    delete require.cache[pagePath];
    require(pagePath);
  } finally {
    global.Page = previousPage;
    global.getApp = previousGetApp;
  }
  return definition;
}

function createPage(data) {
  return {
    data: {
      form: {},
      selectedCover: {},
      coverImageSrc: "",
      coverImageMounted: false,
      coverImageState: "empty",
      coverImageFallbackTried: false,
      coverPickerVisible: true,
      ...data
    },
    setData(patch, callback) {
      for (const [key, value] of Object.entries(patch)) {
        if (key.includes(".")) {
          const [root, ...parts] = key.split(".");
          let target = this.data[root];
          for (let index = 0; index < parts.length - 1; index += 1) {
            target = target[parts[index]];
          }
          target[parts[parts.length - 1]] = value;
        } else {
          this.data[key] = value;
        }
      }
      if (callback) callback();
    }
  };
}

test("edit cover mounts a cached source immediately and keeps the change control visible", () => {
  assert.match(wxml, /wx:if="\{\{coverImageMounted\}\}"/);
  assert.match(wxml, /bindload="onCoverImageLoad"/);
  assert.match(wxml, /binderror="onCoverImageError"/);
  assert.doesNotMatch(wxml, /class="cover-loading"/);
  assert.match(wxml, /coverImageState === 'error'/);
  assert.match(wxml, /class="cover-change cover-enter-\{\{coverFadePhase\}\}"/);
  assert.doesNotMatch(wxml, /coverOverlayReady/);
});

test("cached edit cover relies on native fade-in without an opacity gate", () => {
  assert.match(wxml, /class="cover-image cover-enter-\{\{coverFadePhase\}\}"[^>]*fade-in="\{\{true\}\}"/);
  assert.doesNotMatch(wxml, /cover-image--visible/);
  assert.doesNotMatch(wxss, /\.cover-image\s*\{[^}]*opacity:\s*0;/s);
  assert.match(wxss, /\.cover-enter-a\s*\{[^}]*animation-name: cover-enter-a;[^}]*animation-duration: 440ms;[^}]*animation-fill-mode: both;/s);
  assert.match(wxss, /\.cover-enter-b\s*\{[^}]*animation-name: cover-enter-b;[^}]*animation-duration: 440ms;[^}]*animation-fill-mode: both;/s);
  assert.match(wxss, /@keyframes cover-enter-a\s*\{[^}]*from \{ opacity: 0; \}[^}]*to \{ opacity: 1; \}/s);
  assert.doesNotMatch(wxss, /cover-loading-shimmer/);
  assert.doesNotMatch(wxss, /cover-fade-layer--ready/);
});

test("cover image load reveals the already-mounted image", () => {
  const definition = loadPageDefinition();
  const page = createPage({
    selectedCover: { imageUrl: "https://example.com/full.jpg", thumbnailUrl: "https://example.com/thumb.jpg" },
    coverImageSrc: "https://example.com/full.jpg",
    coverImageMounted: true,
    coverImageState: "loading"
  });

  definition.onCoverImageLoad.call(page);

  assert.equal(page.data.coverImageMounted, true);
  assert.equal(page.data.coverImageState, "loaded");
});

test("confirming a cover mounts it immediately for the fade-in", () => {
  const definition = loadPageDefinition();
  const page = createPage({ form: {} });

  definition.confirmCoverPicker.call(page, {
    detail: {
      id: "cover-1",
      imageUrl: "https://example.com/full.jpg",
      thumbnailUrl: "https://example.com/thumb.jpg"
    }
  });

  assert.equal(page.data.form.activityCoverId, "cover-1");
  assert.equal(page.data.coverImageSrc, "https://example.com/full.jpg");
  assert.equal(page.data.coverImageMounted, true);
  assert.equal(page.data.coverImageState, "loading");
  assert.equal(page.data.coverFadePhase, "a");
  assert.equal(page.data.coverPickerVisible, false);
  definition.confirmCoverPicker.call(page, { detail: { id: "cover-2", imageUrl: "https://example.com/second.jpg" } });
  assert.equal(page.data.coverFadePhase, "b");
});

test("cover image error retries the thumbnail before showing an error state", () => {
  const definition = loadPageDefinition();
  const page = createPage({
    selectedCover: { imageUrl: "https://example.com/full.jpg", thumbnailUrl: "https://example.com/thumb.jpg" },
    coverImageSrc: "https://example.com/full.jpg",
    coverImageMounted: true,
    coverImageState: "loading"
  });

  definition.onCoverImageError.call(page);

  assert.equal(page.data.coverImageSrc, "https://example.com/thumb.jpg");
  assert.equal(page.data.coverImageMounted, true);
  assert.equal(page.data.coverImageState, "loading");
  assert.equal(page.data.coverImageFallbackTried, true);

  definition.onCoverImageError.call(page);
  assert.equal(page.data.coverImageState, "error");
  assert.equal(page.data.coverImageMounted, false);
});

test("stale cover image events cannot reveal a newer cover", () => {
  const definition = loadPageDefinition();
  const page = createPage({
    coverImageSrc: "https://example.com/new.jpg",
    coverImageMounted: true,
    coverImageState: "loading"
  });

  definition.onCoverImageLoad.call(page, { currentTarget: { dataset: { coverSrc: "https://example.com/old.jpg" } } });
  definition.onCoverImageError.call(page, { currentTarget: { dataset: { coverSrc: "https://example.com/old.jpg" } } });

  assert.equal(page.data.coverImageState, "loading");
});


test("detail prefills edit page and opens cover drawer without waiting for its request", async () => {
  const definition = loadPageDefinition({ accessToken: "token", isAuthenticated: true, userRole: "admin" });
  const service = require("../services/activity");
  const originalGet = service.getActivity;
  const originalList = service.listActivityCovers;
  const previousWx = global.wx;
  let resolveDetail;
  let listCalls = 0;
  let init;
  service.getActivity = () => new Promise(resolve => { resolveDetail = resolve; });
  service.listActivityCovers = () => { listCalls += 1; return Promise.resolve([]); };
  global.wx = { showToast() {}, navigateBack() {} };
  try {
    const page = createPage({ loading: true, coverPickerVisible: false });
    Object.assign(page, definition);
    page.getOpenerEventChannel = () => ({ on(name, callback) {
      assert.equal(name, "initActivityEdit");
      init = callback;
    } });
    page.onLoad({ id: "activity-1" });
    init({ activity: {
      _id: "activity-1", name: "原活动", activityCoverId: "cover-1",
      activityCover: { id: "cover-1", imageUrl: "https://example.com/cover.jpg", thumbnailUrl: "https://example.com/thumb.jpg" },
      participants: [], subItems: []
    } });
    assert.equal(page.data.loading, false);
    assert.equal(page.data.coverImageSrc, "https://example.com/cover.jpg");
    assert.equal(page.data.coverImageMounted, true);
    page.openCoverPicker();
    assert.equal(page.data.coverPickerVisible, true);
    assert.equal(listCalls, 0);
    resolveDetail({ id: "activity-1", name: "过期网络数据" });
    await Promise.resolve();
    assert.equal(page.data.form.name, "原活动");
  } finally {
    service.getActivity = originalGet;
    service.listActivityCovers = originalList;
    global.wx = previousWx;
  }
});

test("direct edit entry uses detail cover without requesting the cover catalog", async () => {
  const definition = loadPageDefinition();
  const service = require("../services/activity");
  const originalGet = service.getActivity;
  const originalList = service.listActivityCovers;
  let listCalls = 0;
  service.getActivity = () => Promise.resolve({
    id: "activity-2", name: "直接进入", participants: [], sub_items: [],
    activity_cover_id: "cover-2",
    activity_cover: { id: "cover-2", image_url: "https://example.com/direct.jpg" }
  });
  service.listActivityCovers = () => { listCalls += 1; return Promise.resolve([]); };
  try {
    const page = createPage({ loading: true, coverPickerVisible: false });
    await definition.loadActivity.call({ ...page, applyActivity: definition.applyActivity }, "activity-2");
    assert.equal(page.data.loading, false);
    assert.equal(page.data.coverImageSrc, "https://example.com/direct.jpg");
    assert.equal(listCalls, 0);
  } finally {
    service.getActivity = originalGet;
    service.listActivityCovers = originalList;
  }
});

test("edit has no visible activity loading copy and matches prototype cover label weight", () => {
  assert.doesNotMatch(wxml, /活动信息加载中/);
  assert.match(wxss, /\.cover-change\s*\{[^}]*font-weight:\s*600;/s);
  assert.match(wxml, /class="cover-card" bindtap="openCoverPicker"/);
  const detailJs = fs.readFileSync(path.join(__dirname, "../pages/activity_detail/activity_detail.js"), "utf8");
  assert.match(detailJs, /eventChannel\.emit\("initActivityEdit", \{ activity \}\)/);
});
