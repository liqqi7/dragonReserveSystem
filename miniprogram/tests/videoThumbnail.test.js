const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const tick = () => new Promise((resolve) => setImmediate(resolve));

function setup(overrides = {}) {
  const state = { removed: 0, unlinked: [], timers: new Map() };
  const frame = {
    width: 2,
    height: 3,
    data: Uint8Array.from({ length: 24 }, (_, i) => i).buffer,
  };
  const decoder = {
    start(options) {
      state.start = options;
      return Promise.resolve();
    },
    getFrameData: () => frame,
    remove() {
      state.removed++;
      return Promise.resolve();
    },
    ...overrides.decoder,
  };
  const canvas = {
    width: 2,
    height: 3,
    getContext: () => ({
      createImageData: (w, h) => ({ data: new Uint8Array(w * h * 4) }),
      putImageData(pixels) {
        state.pixels = Array.from(pixels.data);
      },
    }),
  };
  const wx = {
    createVideoDecoder: () => decoder,
    createOffscreenCanvas: () => canvas,
    canvasToTempFilePath(options) {
      state.export = options;
      options.success({ tempFilePath: "wxfile://first-frame.jpg" });
    },
    getFileSystemManager: () => ({
      unlink: ({ filePath }) => state.unlinked.push(filePath),
    }),
    ...overrides.wx,
  };
  const module = { exports: {} };
  let timer = 0;
  vm.runInNewContext(
    fs.readFileSync(
      path.join(__dirname, "../services/videoThumbnail.js"),
      "utf8",
    ),
    {
      wx,
      module,
      Promise,
      Uint8Array,
      setTimeout(callback, delay) {
        state.timers.set(++timer, { callback, delay });
        return timer;
      },
      clearTimeout(id) {
        state.timers.delete(id);
      },
    },
  );
  return { ...module.exports, state, canvas };
}

test("first-frame extraction uses a silent local decoder and JPEG canvas export", async () => {
  const api = setup();
  const thumbnail = await api.createVideoThumbnail("wxfile://original.mp4")
    .promise;
  assert.equal(thumbnail, "wxfile://first-frame.jpg");
  assert.deepEqual(
    { ...api.state.start },
    { source: "wxfile://original.mp4", mode: 0, abortAudio: true },
  );
  assert.deepEqual(
    api.state.pixels,
    Array.from({ length: 24 }, (_, i) => i),
  );
  assert.equal(api.state.export.fileType, "jpg");
  assert.equal(api.state.export.quality, 0.8);
  assert.equal(api.state.removed, 1);
  assert.equal(api.canvas.width, 0);
  assert.equal(api.state.timers.size, 0);
  api.discardThumbnail("wxfile://original.mp4");
  api.discardThumbnail("wxfile://picker.jpg");
  assert.equal(api.state.unlinked.length, 0);
  api.discardThumbnail(thumbnail);
  api.discardThumbnail(thumbnail);
  assert.deepEqual(api.state.unlinked, [thumbnail]);
});

test("export bounds the longest edge without stretching or upscaling", async () => {
  const api = setup({
    decoder: {
      getFrameData: () => ({
        width: 720,
        height: 1280,
        data: new ArrayBuffer(720 * 1280 * 4),
      }),
    },
  });
  await api.createVideoThumbnail("video").promise;
  assert.equal(api.state.export.destWidth, 216);
  assert.equal(api.state.export.destHeight, 384);
});

test("decoder buffering is polled until the first frame arrives", async () => {
  let reads = 0;
  const api = setup({
    decoder: {
      getFrameData: () =>
        ++reads === 1
          ? null
          : { width: 1, height: 1, data: new ArrayBuffer(4) },
    },
  });
  const task = api.createVideoThumbnail("video");
  await tick();
  const timer = [...api.state.timers.values()].find(
    (item) => item.delay === 40,
  );
  assert.ok(timer);
  timer.callback();
  await task.promise;
  assert.equal(reads, 2);
  assert.equal(api.state.timers.size, 0);
});

for (const [name, overrides, stage] of [
  [
    "start rejection",
    { decoder: { start: () => Promise.reject(new Error("private path")) } },
    "start",
  ],
  ["missing decoder API", { wx: { createVideoDecoder: undefined } }, "start"],
  [
    "decode exception",
    {
      decoder: {
        getFrameData() {
          throw new Error("private path");
        },
      },
    },
    "decode",
  ],
  [
    "invalid RGBA",
    {
      decoder: {
        getFrameData: () => ({ width: 2, height: 3, data: new ArrayBuffer(1) }),
      },
    },
    "frame",
  ],
  [
    "oversized frame",
    {
      decoder: {
        getFrameData: () => ({
          width: 10000,
          height: 10000,
          data: new ArrayBuffer(4),
        }),
      },
    },
    "frame",
  ],
  [
    "canvas exception",
    {
      wx: {
        createOffscreenCanvas() {
          throw new Error("private path");
        },
      },
    },
    "canvas",
  ],
  [
    "export failure",
    {
      wx: {
        canvasToTempFilePath(options) {
          options.fail({ errMsg: "private path" });
        },
      },
    },
    "export",
  ],
]) {
  test(`thumbnail ${name} releases resources without exposing paths`, async () => {
    const api = setup(overrides);
    await assert.rejects(
      api.createVideoThumbnail("private path").promise,
      (error) =>
        error.stage === stage && !error.message.includes("private path"),
    );
    assert.equal(api.state.timers.size, 0);
    assert.equal(api.state.removed, name === "missing decoder API" ? 0 : 1);
  });
}

test("stalled decoding times out and does not keep polling", async () => {
  const api = setup({ decoder: { getFrameData: () => null } });
  const task = api.createVideoThumbnail("video");
  const rejected = assert.rejects(
    task.promise,
    (error) => error.stage === "timeout",
  );
  await tick();
  [...api.state.timers.values()].find((item) => item.delay === 8000).callback();
  await rejected;
  assert.equal(api.state.timers.size, 0);
  assert.equal(api.state.removed, 1);
});

test("cancellation before decoder start completes prevents frame reads", async () => {
  let start,
    reads = 0;
  const api = setup({
    decoder: {
      start: () =>
        new Promise((resolve) => {
          start = resolve;
        }),
      getFrameData() {
        reads++;
      },
    },
  });
  const task = api.createVideoThumbnail("video");
  const rejected = assert.rejects(task.promise, (error) => error.cancelled);
  task.cancel();
  task.cancel();
  start();
  await rejected;
  await tick();
  assert.equal(reads, 0);
  assert.equal(api.state.removed, 1);
  assert.equal(api.state.timers.size, 0);
});

test("an export arriving after cancellation is deleted instead of leaked", async () => {
  let exportOptions;
  const api = setup({
    wx: {
      canvasToTempFilePath(options) {
        exportOptions = options;
      },
    },
  });
  const task = api.createVideoThumbnail("video");
  const rejected = assert.rejects(task.promise, (error) => error.cancelled);
  await tick();
  task.cancel();
  await rejected;
  exportOptions.success({ tempFilePath: "wxfile://late.jpg" });
  assert.deepEqual(api.state.unlinked, ["wxfile://late.jpg"]);
  assert.equal(api.state.removed, 1);
});
