const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {test} = require('node:test');

function harness(width = 1600, height = 900) {
  const canvases = [], exports = [], removed = [], timers = new Map();
  let failDelete = false, missing = false, size = 100 * 1024;
  const module = {exports: {}};
  const wx = {
    createOffscreenCanvas(options) {
      const image = {width, height};
      const calls = [];
      const context = {fillRect: (...args) => calls.push(['fill', ...args]),
        drawImage: (...args) => calls.push(['draw', ...args])};
      const canvas = {...options, calls, image, context, createImage: () => image, getContext: () => context};
      canvases.push(canvas); return canvas;
    },
    canvasToTempFilePath: options => exports.push(options),
    getFileSystemManager: () => ({
      accessSync() {if (missing) throw new Error('missing');},
      getFileInfo: options => options.success({size}),
      unlink(options) {
        removed.push(options.filePath);
        if (failDelete) options.fail({errMsg: 'permission denied'}); else options.success();
      },
    }),
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../services/memoryShareImage.js'), 'utf8'), {
    module, wx, setTimeout: callback => {const id = {}; timers.set(id, callback); return id;},
    clearTimeout: id => timers.delete(id),
  });
  return {generate: module.exports.memoryShareImage, canvases, exports, removed, timers,
    setSize(value) {size = value;}, failDelete() {failDelete = true;}, missing() {missing = true;}};
}
const tick = async () => {for (let i = 0; i < 10; i++) await Promise.resolve();};

for (const [width, height, crop] of [
  [1600, 900, [237.5, 0, 1125, 900]],
  [900, 1600, [0, 440, 900, 720]],
  [1000, 800, [0, 0, 1000, 800]],
  [100, 80, [0, 0, 100, 80]],
]) test(`memory share center aspectFill for ${width}x${height}`, async () => {
  const h = harness(width, height), promise = h.generate('local-photo');
  const canvas = h.canvases[0];
  assert.equal(canvas.width, 500); assert.equal(canvas.height, 400);
  assert.equal(canvas.image.src, 'local-photo');
  canvas.image.onload();
  const draw = canvas.calls.find(call => call[0] === 'draw').slice(2);
  assert.deepEqual(draw, [...crop, 0, 0, 500, 400]);
  assert.equal(canvas.context.fillStyle, '#FFFFFF', 'transparent images receive a defined JPEG background');
  assert.equal(h.exports[0].fileType, 'jpg'); assert.equal(h.exports[0].quality, 0.85);
  assert.equal(h.exports[0].destWidth, 500); assert.equal(h.exports[0].destHeight, 400);
  h.exports[0].success({tempFilePath: 'share.jpg'});
  assert.equal(await promise, 'share.jpg');
  assert.equal(canvas.width, 0); assert.equal(canvas.height, 0);
  assert.equal(h.timers.size, 0);
});

test('memory share deduplicates work and retains only one completed temporary file', async () => {
  const h = harness(), first = h.generate('a');
  assert.equal(h.generate('a'), first);
  await assert.rejects(h.generate('b'), /生成中/);
  h.canvases[0].image.onload(); h.exports[0].success({tempFilePath: 'first'});
  await first;
  assert.equal(await h.generate('a'), 'first');
  assert.equal(h.canvases.length, 1);
  const second = h.generate('b'); await tick();
  assert.deepEqual(h.removed, ['first']);
  h.canvases[1].image.onload(); h.exports[1].success({tempFilePath: 'second'});
  assert.equal(await second, 'second');
});

test('memory share prevents unbounded files when cleanup fails', async () => {
  const h = harness(), first = h.generate('a');
  h.canvases[0].image.onload(); h.exports[0].success({tempFilePath: 'first'}); await first;
  h.failDelete();
  await assert.rejects(h.generate('b'));
  await assert.rejects(h.generate('c'));
  assert.equal(h.canvases.length, 1);
});

test('memory share regenerates a temporary cover removed by the platform', async () => {
  const h = harness(), first = h.generate('a');
  h.canvases[0].image.onload(); h.exports[0].success({tempFilePath: 'first'}); await first;
  h.missing(); const second = h.generate('a'); await tick();
  h.canvases[1].image.onload(); h.exports[1].success({tempFilePath: 'second'});
  assert.equal(await second, 'second');
});

for (const size of [0, NaN, 512 * 1024 + 1]) test(`memory share rejects invalid output size ${size}`, async () => {
  const h = harness(), promise = h.generate('a'); h.setSize(size);
  h.canvases[0].image.onload(); h.exports[0].success({tempFilePath: 'invalid'});
  await assert.rejects(promise, /体积超限/);
  const second = h.generate('b'); await tick();
  assert.deepEqual(h.removed, ['invalid']);
  h.canvases[1].image.onerror(); await assert.rejects(second);
});

test('memory share bounds decoding time and releases its canvas on failure', async () => {
  const h = harness(), promise = h.generate('a');
  [...h.timers.values()][0](); await assert.rejects(promise, /超时/);
  assert.equal(h.canvases[0].width, 0);
  assert.equal(h.canvases[0].image.onload, null);
  assert.equal(h.timers.size, 0);
});

test('late native export cannot overwrite a newer share or accumulate files', async () => {
  const h = harness(), first = h.generate('a');
  h.canvases[0].image.onload(); [...h.timers.values()][0]();
  await assert.rejects(first, /超时/);
  await assert.rejects(h.generate('b'), /生成中/);
  h.exports[0].success({tempFilePath: 'late'}); await tick();
  assert.deepEqual(h.removed, ['late']);
  const next = h.generate('b'); h.canvases[1].image.onload();
  h.exports[1].success({tempFilePath: 'next'});
  assert.equal(await next, 'next');
});

test('unsupported canvas and empty source reject without a saved file or persistent storage', async () => {
  const h = harness(); await assert.rejects(h.generate(''), /尚未就绪/);
  assert.equal(h.canvases.length, 0);
  const code = fs.readFileSync(path.join(__dirname, '../services/memoryShareImage.js'), 'utf8');
  const module = {exports: {}};
  vm.runInNewContext(code, {module, wx: {}, setTimeout, clearTimeout});
  await assert.rejects(module.exports.memoryShareImage('a'));
  assert.doesNotMatch(code, /saveFile|setStorage|USER_DATA_PATH/);
});
