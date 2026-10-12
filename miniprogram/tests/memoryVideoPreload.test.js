const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function setup() {
  const downloads = [], removed = [];
  const module = {exports: {}};
  const wx = {
    getFileSystemManager: () => ({unlink: ({filePath}) => removed.push(filePath)}),
    downloadFile(options) {
      const job = {options, aborted: false};
      downloads.push(job);
      return {abort() {job.aborted = true;}};
    },
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../services/memoryVideoPreload.js"), "utf8"), {module, wx});
  function finish(index, statusCode = 200) {
    const {options} = downloads[index];
    options.success({statusCode, tempFilePath: `temp-${index}`});
    options.complete();
  }
  return {preload: module.exports.createVideoPreloader(), downloads, removed, finish, wx};
}
const video = (id) => ({id, kind: "video", url: `https://test.invalid/${id}.mp4`});

test("only the next video is downloaded and cached sources match the signed URL", () => {
  const {preload, downloads, finish} = setup();
  preload.update(video(1), {id: 2, kind: "image", url: "photo"});
  assert.equal(downloads.length, 0);
  preload.update(video(1), video(2));
  preload.update(video(1), video(2));
  assert.equal(downloads.length, 1);
  assert.equal(downloads[0].options.url, video(2).url);
  assert.equal(preload.source(video(1)), video(1).url);
  finish(0);
  assert.equal(preload.source(video(2)), "temp-0");
  assert.equal(preload.source({...video(2), url: "renewed"}), "renewed");
});

test("paging keeps current and next only, pruning old temporary files", () => {
  const {preload, downloads, removed, finish} = setup();
  preload.update(video(1), video(2)); finish(0);
  preload.update(video(2), video(3)); finish(1);
  assert.equal(preload.source(video(2)), "temp-0");
  assert.equal(preload.source(video(3)), "temp-1");
  preload.update(video(3), video(4));
  assert.deepEqual(removed, ["temp-0"]);
  assert.equal(downloads.length, 3);
  preload.dispose();
  assert.equal(downloads[2].aborted, true);
  assert.deepEqual(removed, ["temp-0", "temp-1"]);
});

test("rapid switching aborts obsolete downloads and discards late completions", () => {
  const {preload, downloads, removed, finish} = setup();
  preload.update(video(1), video(2));
  preload.update(video(3), video(4));
  assert.equal(downloads[0].aborted, true);
  finish(0);
  assert.equal(preload.source(video(2)), video(2).url);
  assert.deepEqual(removed, ["temp-0"]);
  finish(1);
  assert.equal(preload.source(video(4)), "temp-1");
});

test("disposing aborts pending work, removes late files and prevents new downloads", () => {
  const {preload, downloads, removed, finish} = setup();
  preload.update(video(1), video(2));
  preload.dispose();
  assert.equal(downloads[0].aborted, true);
  finish(0);
  preload.update(video(2), video(3));
  assert.equal(downloads.length, 1);
  assert.deepEqual(removed, ["temp-0"]);
});

test("failed or unavailable speculative downloads fall back to remote playback", () => {
  const {preload, downloads, finish, wx, removed} = setup();
  preload.update(video(1), video(2));
  finish(0, 403);
  assert.equal(preload.source(video(2)), video(2).url);
  assert.deepEqual(removed, ["temp-0"]);
  preload.update(video(1), video(2));
  downloads[1].options.fail({errMsg: "network error"});
  downloads[1].options.complete();
  assert.equal(preload.source(video(2)), video(2).url);
  wx.downloadFile = () => {throw new Error("unavailable");};
  assert.doesNotThrow(() => preload.update(video(1), video(2)));
});
