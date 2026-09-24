const test = require("node:test");
const assert = require("node:assert/strict");

function definition(file, registration) {
  const previous = global[registration];
  let result;
  global[registration] = value => { result = value; };
  const modulePath = require.resolve(file);
  try {
    delete require.cache[modulePath];
    require(modulePath);
  } finally {
    delete require.cache[modulePath];
    if (previous === undefined) delete global[registration];
    else global[registration] = previous;
  }
  return result;
}

function instance(def, data, properties = {}) {
  const object = {
    ...(def.methods || def),
    data: { ...def.data, ...data },
    properties,
    setData(patch, callback) {
      for (const [path, value] of Object.entries(patch)) {
        const keys = path.replace(/\[(\d+)\]/g, ".$1").split(".");
        let target = this.data;
        for (const key of keys.slice(0, -1)) target = target[key];
        target[keys.at(-1)] = value;
      }
      if (callback) callback();
    }
  };
  return object;
}

const picker = definition("../components/activity-cover-picker-sheet/index.js", "Component");
const preview = definition("../pages/activity_cover_preview/activity_cover_preview.js", "Page");
const url = name => `https://example.com/${name}.jpg`;
const artist = {
  avatarUrl: url("avatar"), displayAvatarUrl: "",
  artworks: [0, 1, 2].map(index => ({ id: String(index), imageUrl: url(index), displayUrl: "" }))
};

test("picker gives visible artwork precedence and pauses when hidden", () => {
  const calls = [];
  const sheet = instance(picker, { artists: [artist] }, { visible: true });
  sheet._visibleCoverIds = new Set(["1"]);
  sheet._coverVisibilityKnown = true;
  sheet._coverImageLoader = {
    enqueue: (urls, options) => calls.push({ urls, options }),
    pause: () => calls.push("pause"),
    resume: () => calls.push("resume")
  };
  sheet._prepareCoverImages();
  assert.deepEqual(calls[0].urls, [url("avatar"), url("1"), url("0"), url("2")]);
  assert.deepEqual(calls[0].options.foregroundUrls, [url("avatar"), url("1")]);
  assert.equal(calls[1], "resume");
  picker.pageLifetimes.hide.call(sheet);
  assert.equal(calls.at(-1), "pause");
  sheet._prepareCoverImages();
  assert.equal(calls.length, 3);
});

test("preview prioritizes current artwork and avatar, then neighboring works; ready paths are shared", () => {
  const calls = [];
  const previewArtist = structuredClone(artist);
  previewArtist.artworks.forEach((artwork, index) => { artwork.artistAvatarUrl = url(`avatar-${index}`); artwork.displayAvatarUrl = ""; });
  const page = instance(preview, { previewArtist, previewArtworkIndex: 1, previewArtwork: structuredClone(previewArtist.artworks[1]) });
  page._ensurePreviewImageLoader = () => {
    page._previewImageLoader = {
      enqueue: (urls, options) => calls.push({ urls, options }),
      pause: () => calls.push("pause"),
      resume: () => calls.push("resume")
    };
  };
  page._preparePreviewImages();
  assert.deepEqual(calls[0].urls, [url("1"), url("avatar-1"), url("2"), url("0")]);
  assert.deepEqual(calls[0].options.foregroundUrls, [url("1"), url("avatar-1")]);
  page._markPreviewImageReady(url("1"), "/cache/current.jpg");
  page._markPreviewImageReady(url("avatar-1"), "/cache/avatar.jpg");
  assert.equal(page.data.previewArtwork.displayUrl, "/cache/current.jpg");
  assert.equal(page.data.previewArtist.artworks[1].displayUrl, "/cache/current.jpg");
  assert.equal(page.data.previewArtwork.displayAvatarUrl, "/cache/avatar.jpg");
  assert.equal(page.data.previewArtist.artworks[1].displayAvatarUrl, "/cache/avatar.jpg");
  assert.equal(page.data.previewArtist.artworks[0].displayAvatarUrl, "");
  preview.onHide.call(page);
  assert.equal(calls.at(-1), "pause");
  preview.onShow.call(page);
  assert.equal(calls.at(-1), "resume");
});
