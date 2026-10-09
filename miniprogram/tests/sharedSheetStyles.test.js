const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { readRules } = require("./helpers/readWxss");

// Baseline declarations captured before extraction; primary/secondary layouts differ.
const expected = {
  "components/activity-cover-picker-sheet/index.wxss": {
    ".cover-sheet-embedded-root": {
      "position": "absolute",
      "top": "0",
      "right": "0",
      "bottom": "0",
      "left": "0",
      "width": "100%",
      "height": "100%",
      "overflow": "hidden",
      "z-index": "20"
    },
    ".cover-sheet-mask": {
      "position": "absolute",
      "top": "0",
      "right": "0",
      "bottom": "0",
      "left": "0",
      "background": "#00000066",
      "opacity": "0",
      "transition": "opacity 240ms ease-out"
    },
    ".cover-sheet-mask--visible": {
      "opacity": "1"
    },
    ".cover-sheet-header": {
      "width": "100%",
      "height": "107.69rpx",
      "flex": "none",
      "padding": "0 38.46rpx",
      "display": "flex",
      "align-items": "center",
      "justify-content": "space-between",
      "box-sizing": "border-box"
    },
    ".cover-sheet-title": {
      "color": "#000000",
      "font-size": "30.77rpx",
      "line-height": "42.31rpx",
      "font-weight": "600"
    },
    ".cover-sheet-close": {
      "width": "61.54rpx",
      "height": "61.54rpx",
      "display": "flex",
      "align-items": "center",
      "justify-content": "center"
    },
    ".cover-sheet-close-icon": {
      "width": "38.46rpx",
      "height": "38.46rpx",
      "display": "block"
    },
    ".cover-skeleton-shimmer": {
      "position": "absolute",
      "top": "0",
      "bottom": "0",
      "left": "0",
      "width": "72%",
      "height": "100%",
      "background-image": "linear-gradient(\n    90deg,\n    rgba(248, 249, 251, 0) 0%,\n    rgba(248, 249, 251, 0.24) 22%,\n    rgba(248, 249, 251, 0.52) 42%,\n    rgba(248, 249, 251, 0.52) 58%,\n    rgba(248, 249, 251, 0.24) 78%,\n    rgba(248, 249, 251, 0) 100%\n  )",
      "transform": "translateX(-100%)",
      "pointer-events": "none",
      "animation-name": "shared-skeleton-shimmer",
      "animation-duration": "1800ms",
      "animation-timing-function": "linear",
      "animation-iteration-count": "infinite"
    }
  },
  "components/date-time-picker-sheet/index.wxss": {
    ".picker-sheet-embedded-root": {
      "position": "absolute",
      "top": "0",
      "right": "0",
      "bottom": "0",
      "left": "0",
      "width": "100%",
      "height": "100%",
      "overflow": "hidden"
    },
    ".picker-sheet-embedded-mask": {
      "position": "absolute",
      "top": "0",
      "right": "0",
      "bottom": "0",
      "left": "0",
      "background": "rgba(21, 21, 31, 0.4)",
      "opacity": "0",
      "transition": "opacity 220ms ease-out"
    },
    ".picker-sheet-embedded-mask--visible": {
      "opacity": "1"
    },
    ".picker-sheet-header": {
      "height": "107.69rpx",
      "padding": "0 38.46rpx",
      "display": "flex",
      "align-items": "center",
      "gap": "23.08rpx",
      "box-sizing": "border-box"
    },
    ".picker-sheet-title": {
      "color": "#000000",
      "font-size": "30.77rpx",
      "line-height": "42.31rpx",
      "font-weight": "600"
    },
    ".picker-sheet-close": {
      "width": "61.54rpx",
      "height": "61.54rpx",
      "margin-left": "auto",
      "display": "flex",
      "align-items": "center",
      "justify-content": "center"
    },
    ".picker-sheet-close-icon": {
      "width": "38.46rpx",
      "height": "38.46rpx",
      "display": "block"
    }
  },
  "components/participants-drawer/index.wxss": {
    ".drawer-header": {
      "flex": "0 0 auto",
      "height": "76.92rpx",
      "padding": "0 30.77rpx",
      "display": "flex",
      "align-items": "center",
      "justify-content": "space-between",
      "box-sizing": "border-box"
    },
    ".drawer-close": {
      "width": "61.54rpx",
      "height": "61.54rpx",
      "display": "flex",
      "align-items": "center",
      "justify-content": "center"
    },
    ".drawer-close image": {
      "width": "38.46rpx",
      "height": "38.46rpx"
    }
  },
  "pages/activity_detail/activity_detail.wxss": {
    ".detail-skeleton-shimmer": {
      "position": "absolute",
      "top": "0",
      "bottom": "0",
      "left": "0",
      "width": "72%",
      "height": "100%",
      "background-image": "linear-gradient(\n    90deg,\n    rgba(248, 249, 251, 0) 0%,\n    rgba(248, 249, 251, 0.24) 22%,\n    rgba(248, 249, 251, 0.52) 42%,\n    rgba(248, 249, 251, 0.52) 58%,\n    rgba(248, 249, 251, 0.24) 78%,\n    rgba(248, 249, 251, 0) 100%\n  )",
      "transform": "translateX(-100%)",
      "pointer-events": "none",
      "animation-name": "shared-skeleton-shimmer",
      "animation-duration": "1800ms",
      "animation-timing-function": "linear",
      "animation-iteration-count": "infinite"
    },
    ".detail-skeleton-shimmer-dark": {
      "background-image": "linear-gradient(\n    90deg,\n    rgba(255, 255, 255, 0) 0%,\n    rgba(255, 255, 255, 0.04) 22%,\n    rgba(255, 255, 255, 0.1) 42%,\n    rgba(255, 255, 255, 0.1) 58%,\n    rgba(255, 255, 255, 0.04) 78%,\n    rgba(255, 255, 255, 0) 100%\n  )"
    }
  }
};

for (const [file, selectors] of Object.entries(expected)) {
  test(`shared styles preserve every extracted declaration: ${file}`, () => {
    const actual = readRules(path.join(__dirname, "..", file));
    for (const [selector, declarations] of Object.entries(selectors)) {
      assert.deepEqual(actual[selector], declarations, selector);
    }
  });
}
