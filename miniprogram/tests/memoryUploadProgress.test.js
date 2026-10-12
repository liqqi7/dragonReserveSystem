const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function progressImages() {
  const module = { exports: {} };
  let encodings = 0;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../utils/memoryUploadProgress.js"), "utf8"), {
    module,
    wx: { arrayBufferToBase64(value) { encodings++; return Buffer.from(value).toString("base64"); } },
  });
  return { image: module.exports.uploadProgressImage, encodings: () => encodings };
}
const decode = image => Buffer.from(image.split(",")[1], "base64").toString("utf8");

test("every progress image retains the exact Pencil ring rather than a CSS substitute", () => {
  const { image } = progressImages();
  const original = fs.readFileSync(path.join(__dirname, "../images/memory-upload-progress-mask.svg"), "utf8");
  const geometry = original.match(/<path[^>]* d="([^"]+)"/)[1];
  for (let progress = 0; progress <= 100; progress++) {
    const svg = decode(image(progress));
    const rings = Array.from(svg.matchAll(/<path data-pencil-id="xkSru"[^>]* d="([^"]+)"/g), match => match[1]);
    assert.equal(rings.length, progress > 0 ? 2 : 1);
    rings.forEach(ring => assert.equal(ring, geometry));
    assert.match(svg, /viewBox="0 0 26 26" width="26" height="26"/);
    assert.match(svg, /fill-opacity="0.25098"/);
    assert.doesNotMatch(svg, /<script|<image|stroke|NaN|Infinity/);
  }
});

test("progress sectors advance clockwise and treat empty and full rings separately", () => {
  const { image } = progressImages();
  assert.doesNotMatch(decode(image(0)), /clipPath/);
  assert.doesNotMatch(decode(image(100)), /clipPath/);
  assert.match(decode(image(25)), /A26 26 0 0 1 39\.00000 13\.00000 Z/);
  assert.match(decode(image(50)), /A26 26 0 0 1 13\.00000 39\.00000 Z/);
  assert.match(decode(image(75)), /A26 26 0 1 1 -13\.00000 13\.00000 Z/);
  assert.match(decode(image(99)), /clip-path="url\(#progress\)"/);
});

test("bounded integer progress reuses at most 101 encoded SVGs", () => {
  const { image, encodings } = progressImages();
  for (let progress = 0; progress <= 100; progress++) image(progress);
  assert.equal(encodings(), 101);
  for (const value of [-1, -Infinity, null, undefined, NaN, "bad"]) assert.equal(image(value), image(0));
  assert.equal(image(25.9), image("25"));
  assert.equal(image(Infinity), image(100));
  assert.equal(image(900), image(100));
  assert.equal(encodings(), 101);
});
