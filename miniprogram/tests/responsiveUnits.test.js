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
    if (relative === path.join("pages", "activity_detail", "activity_detail.wxss")) {
      source = source.replace(/radial-gradient\(circle\s+420px\s+at/g, "radial-gradient(circle at");
    }
    if (relative === path.join("custom-tab-bar", "index.wxss")) {
      const fixedTabPixelValues = source.match(/(?:top|width|height|font-size|line-height|border-radius):\s*\d+px;|padding:\s*\d+px\s+7\.69231rpx;/g) || [];
      assert.deepEqual(
        fixedTabPixelValues,
        [
          "height: 52px;",
          "padding: 4px 7.69231rpx;",
          "border-radius: 26px;",
          "height: 44px;",
          "border-radius: 22px;",
          "height: 44px;",
          "width: 34px;",
          "height: 26px;",
          "border-radius: 8px;",
          "width: 16px;",
          "height: 16px;",
          "top: 5px;",
          "width: 18px;",
          "height: 18px;",
          "width: 18px;",
          "height: 18px;",
          "top: 25px;",
          "height: 14px;",
          "font-size: 10px;",
          "line-height: 14px;"
        ],
        "custom tab vertical geometry must use the exact Pencil pixel values"
      );
      source = source.replace(/(?:top|width|height|font-size|line-height|border-radius):\s*\d+px;|padding:\s*\d+px\s+7\.69231rpx;/g, "");
    }
    if (relative === path.join("pages", "memory_detail", "memory_detail.wxss")) {
      // Native video rotates the viewport: fixed controls must not double with landscape rpx.
      const fullscreenPixels = {
        ".viewer-fullscreen .viewer-play-button": "width:64px;height:64px;padding:18px;",
        ".viewer-fullscreen .viewer-play-button image": "width:28px;height:28px;",
        ".fullscreen-head": "height:80px;padding:6px 14px;",
        ".memory-viewer button.fullscreen-back,.memory-viewer button.fullscreen-exit": "width:44px;height:44px;padding:10px;",
        ".fullscreen-back image": "width:24px;height:24px;",
        ".fullscreen-exit image": "width:22px;height:22px;",
        ".fullscreen-controls": "height:70px;padding:26px 12px 6px 24px;gap:12px;",
        ".fullscreen-time": "width:40px;font-size:11px;",
        ".fullscreen-time--duration": "width:28px;",
        ".fullscreen-controls .viewer-progress-input": "height:32px;",
        ".fullscreen-controls .viewer-progress": "height:32px;",
        ".fullscreen-controls .viewer-progress-track,.fullscreen-controls .viewer-progress-played": "height:3px;",
        ".fullscreen-controls .viewer-progress-thumb": "width:12px;height:12px;",
        ".fullscreen-controls .viewer-progress-bubble": "width:64px;height:24px;line-height:24px;bottom:32px;font-size:12px;border-radius:12px;",
        ".viewer-seek-indicator": "width:220px;height:64px;border-radius:32px;gap:10px;font-size:16px;",
        ".viewer-seek-indicator image": "width:24px;height:24px;",
      };
      source = source.replace(/([^{}]+)\{([^{}]*)\}/g, (rule, selector, body) => {
        const key = selector.trim().replace(/\s*,\s*/g, ",");
        if (!fullscreenPixels[key]) return rule;
        const declarations = body.match(/[\w-]+:\s*[^;{}]*\dpx[^;{}]*;/g) || [];
        assert.equal(declarations.join("").replace(/:\s*/g, ":"), fullscreenPixels[key], key);
        return selector + "{" + body.replace(/[\w-]+:\s*[^;{}]*\dpx[^;{}]*;/g, "") + "}";
      });
    }

    assert.doesNotMatch(
      source,
      /(^|[^a-zA-Z])[-+]?(?:\d+(?:\.\d*)?|\.\d+)px\b/m,
      `${relative} contains an unapproved visual px value`
    );
  }
});
