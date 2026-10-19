const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {spawnSync} = require("node:child_process");

const root = path.resolve(__dirname, "..");
const compiler = process.env.WCC_BIN;

test("compiled photo observer refers to the actual compiled property, not its unnormalized name", {
  skip: !compiler && "Set WCC_BIN to the WeChat WXML compiler to run the native binding check",
}, () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "dragon-wcc-"));
  const output = path.join(directory, "memory.js");
  try {
    const result = spawnSync(compiler, ["-o", output,
      "pages/memory_detail/memory_detail.wxml", "pages/memory_detail/memory-controls.wxml",
      "pages/memory_detail/photo-pointer.wxs", "pages/memory_detail/video-pointer.wxs"], {cwd: root, encoding: "utf8", timeout: 20000});
    assert.equal(result.status, 0, result.error?.message || result.stderr);
    const markup = fs.readFileSync(path.join(root, "pages/memory_detail/memory_detail.wxml"), "utf8");
    const compiled = fs.readFileSync(output, "utf8");
    const groups = compiled.match(/\[[^\[\]\r\n]*'change:[^'\r\n]+'[^\[\]\r\n]*\]/g) || [];
    for (const match of markup.matchAll(/change:([\w-]+)="\{\{(?:photo|video)Pointer.sync\}\}"/g)) {
      const name = match[1];
      const bindings = groups.filter(group => group.includes(`'change:${name}'`));
      assert.ok(bindings.length, "pointer observers must exist in the native compiler output");
      for (const binding of bindings) {
        const attributes = Array.from(binding.matchAll(/'([^']+)'/g), match => match[1]);
        assert.ok(attributes.includes(name), `${name} observer cannot observe compiled attributes: ${attributes.join(", ")}`);
      }
    }
  } finally {
    if (fs.existsSync(output)) fs.unlinkSync(output);
    fs.rmdirSync(directory);
  }
});
