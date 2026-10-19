const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// Pencil: sTtl2/KUZIg, Q1qtC/KUZIg, qFFc0/KUZIg at the 390px design width.
for (const [page, selector] of [["activity_list", "navbar-title"], ["memory", "memory-heading"], ["history", "ranking-navbar-title"]]) {
  test(`${page} top title matches the prototype's 24px / 600 / 34px typography`, () => {
    const css = fs.readFileSync(path.join(__dirname, `../pages/${page}/${page}.wxss`), "utf8");
    const rule = css.match(new RegExp("\\." + selector + "\\s*\\{([^}]+)\\}"))[1];
    const size = Number(rule.match(/font-size:\s*([\d.]+)rpx;/)[1]) * 390 / 750;
    const lineHeight = Number(rule.match(/line-height:\s*([\d.]+)rpx;/)[1]) * 390 / 750;
    assert.ok(Math.abs(size - 24) < 0.01, `${selector}: ${size}px`);
    assert.ok(Math.abs(lineHeight - 34) < 0.01, `${selector}: ${lineHeight}px`);
    assert.match(rule, /font-weight:\s*600;/);
    assert.ok(lineHeight < 44, "title fits the navigation row");
  });
}
