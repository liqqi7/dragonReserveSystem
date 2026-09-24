const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { buildActivityShareAppMessageOptions } = require("../utils/shareActivity");
const { adaptActivity } = require("../utils/activityEnrich");

const pageDir = path.join(__dirname, "../pages/activity_detail");

test("share uses the pre-generated URL and never falls back to original GIF", () => {
  const activity = { _id: "42", name: "活动", largeCardBgImageUrl: "https://example.com/a.gif" };
  const ready = buildActivityShareAppMessageOptions(activity, "https://example.com/share.png");
  assert.equal(ready.imageUrl, "https://example.com/share.png");
  assert.equal(ready.path, "/pages/activity_detail/activity_detail?id=42");
  assert.equal(buildActivityShareAppMessageOptions(activity, "").imageUrl, undefined);
  assert.equal(buildActivityShareAppMessageOptions(activity, "wxfile://tmp/share.png").imageUrl, "wxfile://tmp/share.png");
  assert.equal(buildActivityShareAppMessageOptions(activity, "http://tmp/share.png").imageUrl, "http://tmp/share.png");
  assert.equal(buildActivityShareAppMessageOptions(activity, "http://192.168.10.2:8001/share.png").imageUrl, undefined);
});

test("detail adapter consumes the stored URL; button has no render-loading gate", () => {
  const adapted = adaptActivity({ id: 42, start_time: "2026-12-31T19:30:00", participants: [], share_preview_image_url: "https://example.com/share.png" });
  assert.equal(adapted.sharePreviewImageUrl, "https://example.com/share.png");
  const wxml = fs.readFileSync(path.join(pageDir, "activity_detail.wxml"), "utf8");
  const js = fs.readFileSync(path.join(pageDir, "activity_detail.js"), "utf8");
  assert.match(wxml, /open-type="share"/);
  assert.doesNotMatch(wxml, /sharePreviewLoading/);
  assert.doesNotMatch(js, /refreshSharePreview|getActivitySharePreview|sharePreviewLoading/);
  assert.match(js, /const shareSource = activity\.sharePreviewImageUrl \|\| ""/);
  assert.match(js, /sharePreviewImageUrl: useLocalShareImage \? localShareImage : shareSource/);
});


test("local test share image preloads without blocking the share click and ignores stale downloads", () => {
  const previous = { Page: global.Page, getApp: global.getApp, wx: global.wx };
  let definition;
  const pending = [];
  try {
    global.Page = value => { definition = value; };
    global.getApp = () => ({ globalData: {} });
    global.wx = { downloadFile(options) { pending.push(options); } };
    const pagePath = require.resolve("../pages/activity_detail/activity_detail.js");
    delete require.cache[pagePath];
    require(pagePath);
    const page = {
      data: { activity: { _id: "42", name: "活动" }, sharePreviewImageUrl: "" },
      _detailUnloaded: false,
      setData(changes) { Object.assign(this.data, changes); }
    };
    definition.preloadLocalTestShareImage.call(page, "http://127.0.0.1:8001/media/share-previews/a.png");
    assert.equal(pending.length, 1);
    assert.equal(page.data.sharePreviewImageUrl, "");
    assert.equal(definition.onShareAppMessage.call(page).imageUrl, undefined);
    definition.preloadLocalTestShareImage.call(page, "http://127.0.0.1:8001/media/share-previews/a.png");
    assert.equal(pending.length, 1);
    definition.preloadLocalTestShareImage.call(page, "http://127.0.0.1:8001/media/share-previews/b.png");
    pending[0].success({ statusCode: 200, tempFilePath: "wxfile://tmp/old.png" });
    assert.equal(page.data.sharePreviewImageUrl, "");
    pending[1].success({ statusCode: 200, tempFilePath: "wxfile://tmp/new.png" });
    assert.equal(definition.onShareAppMessage.call(page).imageUrl, "wxfile://tmp/new.png");
  } finally {
    global.Page = previous.Page;
    global.getApp = previous.getApp;
    global.wx = previous.wx;
  }
});
