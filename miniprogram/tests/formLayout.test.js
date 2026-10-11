const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { readWxss } = require("./helpers/wxss");

for (const [name, viewport, content, footer] of [
  ["activity_create", "step-scroll", "fields", "footer"],
  ["activity_edit", "edit-scroll", "edit-content", "footer"],
  ["memory_create", "memory-body", "memory-form", "memory-footer"],
]) {
  test(`${name} shares adaptive form layout and preserves access to overflow`, () => {
    const base = path.join(__dirname, "../pages", name, name);
    const markup = fs.readFileSync(`${base}.wxml`, "utf8");
    const styles = readWxss(`${base}.wxss`);
    assert.equal(
      JSON.parse(fs.readFileSync(`${base}.json`, "utf8")).disableScroll,
      true,
    );
    assert.match(
      markup,
      new RegExp(
        `<scroll-view class="${viewport}"[^>]*type="list"[^>]*scroll-y[^>]*bounces="{{false}}"`,
      ),
    );
    assert.match(styles, /Reserve the action area once/);
    assert.match(
      styles,
      /\.memory-body\s*\{[^}]*flex:\s*1;[^}]*height:\s*0;[^}]*min-height:\s*0;/s,
    );
    assert.match(
      styles,
      /\.memory-footer\s*\{[^}]*position:\s*relative;[^}]*flex-shrink:\s*0;/s,
    );
    assert.doesNotMatch(
      styles,
      new RegExp(
        `\\.${footer}\\s*\\{[^}]*position:\\s*(?:absolute|fixed)`,
        "s",
      ),
    );
    assert.match(
      styles,
      new RegExp(
        `\\.${content}[^{}]*\\{[^}]*padding(?:-bottom)?:[^;]*[ :]+0;`,
        "s",
      ),
    );
    assert.match(markup, /padding-bottom:{{(?:footerSafeAreaRpx|bottom)}}rpx/);
  });
}
