const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const miniprogramDir = path.join(__dirname, "..");

function collectWxssFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectWxssFiles(fullPath);
    return entry.isFile() && entry.name.endsWith(".wxss") ? [fullPath] : [];
  });
}

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "");
}

test("visual WXSS dimensions use rpx except approved px cases", () => {
  for (const file of collectWxssFiles(miniprogramDir)) {
    let source = stripComments(fs.readFileSync(file, "utf8"));
    const relative = path.relative(miniprogramDir, file);

    if (relative === path.join("pages", "history", "history.wxss")) {
      source = source
        .replace(/max-width:\s*480px;/g, "")
        .replace(/@media\s*\(min-width:\s*414px\)/g, "");
    }
    if (relative === path.join("pages", "activity_list", "activity_list.wxss")) {
      source = source.replace(/border:\s*1px dashed/g, "border: dashed");
    }

    assert.doesNotMatch(
      source,
      /(^|[^a-zA-Z])[-+]?(?:\d+(?:\.\d*)?|\.\d+)px\b/m,
      `${relative} contains an unapproved visual px value`
    );
  }
});

test("calendar timeline keeps rpx rendering aligned with px scroll coordinates", () => {
  const js = fs.readFileSync(path.join(miniprogramDir, "pages/activity_calendar/activity_calendar.js"), "utf8");
  const wxml = fs.readFileSync(path.join(miniprogramDir, "pages/activity_calendar/activity_calendar.wxml"), "utf8");
  const wxss = fs.readFileSync(path.join(miniprogramDir, "pages/activity_calendar/activity_calendar.wxss"), "utf8");

  assert.match(js, /const HOUR_HEIGHT_RPX = 115\.38;/);
  assert.match(js, /`top:\$\{topRpx\}rpx`/);
  assert.match(js, /`height:\$\{heightRpx\}rpx`/);
  assert.match(js, /this\._hourHeightPx = \(HOUR_HEIGHT_RPX \/ 750\) \* winW;/);
  assert.match(wxml, /top: calc\(\{\{statusBarHeight\}\}px \+ 107\.7rpx\)/);
  assert.match(wxml, /top: calc\(\{\{statusBarHeight\}\}px \+ 244\.7rpx\)/);
  assert.match(wxss, /\.hour-row\s*\{[\s\S]*?height:\s*115\.38rpx;/);
  assert.match(wxss, /\.grid-hour\s*\{[\s\S]*?height:\s*115\.38rpx;/);
});
