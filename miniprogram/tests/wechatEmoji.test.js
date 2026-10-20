const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const {captionParts} = require("../utils/wechatEmoji");
const emojiMap = require("../utils/wechatEmojiMap.json");

test("existing WeChat bracket captions render the matching local emoji", () => {
  assert.deepEqual(captionParts("[耶]"), [
    {type: "emoji", offset: 0, text: "[耶]", src: "/images/wechat-emoji/211.png"},
  ]);
  assert.equal(captionParts("[微笑]")[0].src, "/images/wechat-emoji/0.png");
  assert.equal(captionParts("[歐耶]")[0].src, captionParts("[Yeah!]")[0].src);
  assert.equal(captionParts("[破涕为笑]")[0].src, "/images/wechat-emoji/302.png");
});

test("mixed captions preserve Unicode sequences, newlines, spaces and unknown codes", () => {
  const caption = "  开心👨‍👩‍👧‍👦👍🏽🇨🇳[耶][微笑]\n[自定义] <b>&文字[耶]🎉  ";
  const parts = captionParts(caption);
  assert.equal(parts.map(part => part.text).join(""), caption);
  assert.deepEqual(parts.filter(part => part.type === "emoji").map(part => part.text), ["[耶]", "[微笑]", "[耶]"]);
  assert.ok(parts.some(part => part.type === "text" && part.text.includes("\n[自定义] <b>&文字")));
  assert.equal(new Set(parts.map(part => part.offset)).size, parts.length);
  for (const part of parts) assert.equal(caption.slice(part.offset, part.offset + part.text.length), part.text);
});

test("plain, unrecognised and empty captions retain their original content", () => {
  for (const caption of ["普通文字", "😀❤️‍🔥✌️", "[不存在][][半截", "[换\n行]", "[[未知]]"]) {
    assert.deepEqual(captionParts(caption), [{type: "text", offset: 0, text: caption}]);
  }
  for (const caption of ["", undefined, null]) assert.deepEqual(captionParts(caption), []);
  assert.deepEqual(captionParts("[耶]").map(part => part.text), ["[耶]"]);
});

test("every recognised name has a packaged PNG and duplicate aliases share assets", () => {
  for (const [name, id] of Object.entries(emojiMap)) {
    const [part] = captionParts(name);
    assert.equal(part.type, "emoji", name);
    const file = fs.readFileSync(path.join(__dirname, "..", part.src));
    assert.equal(file.subarray(1, 4).toString(), "PNG", name);
    assert.equal(file.readUInt32BE(16), 32, name);
    assert.equal(file.readUInt32BE(20), 32, name);
    assert.equal(part.src, `/images/wechat-emoji/${id}.png`);
  }
});

// The mini-program loader resolves require targets as JS, unlike Node's JSON loader.
test("emoji parsing loads with mini-program JavaScript module resolution", () => {
  const load = filename => {
    const module = {exports: {}};
    vm.runInNewContext(fs.readFileSync(filename, "utf8"), {
      module,
      require: name => load(path.resolve(path.dirname(filename), name.endsWith(".js") ? name : `${name}.js`)),
    }, {filename});
    return module.exports;
  };
  const runtime = load(path.join(__dirname, "../utils/wechatEmoji.js"));
  assert.equal(runtime.captionParts("[耶]")[0].src, "/images/wechat-emoji/211.png");
});
