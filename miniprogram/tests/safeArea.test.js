const test = require("node:test");
const assert = require("node:assert/strict");

const safeArea = require("../utils/safeArea");

function withWx(wxValue, callback) {
  const previousWx = global.wx;
  try {
    global.wx = wxValue;
    return callback();
  } finally {
    if (previousWx === undefined) delete global.wx;
    else global.wx = previousWx;
  }
}

test("shared gesture conversion uses the current window width on every call", () => {
  let width = 375;
  withWx({ getWindowInfo: () => ({ windowWidth: width }) }, () => {
    assert.equal(safeArea.getRpxPerPx(), 2);
    width = 750;
    assert.equal(safeArea.getRpxPerPx(), 1);
    width = "390";
    assert.equal(safeArea.getRpxPerPx(), 750 / 390);
  });
  withWx({ getSystemInfoSync: () => ({ windowWidth: 375 }) }, () => {
    assert.equal(safeArea.getRpxPerPx(), 2);
  });
});

test("shared gesture conversion preserves the 390px fallback for unavailable width", () => {
  const fail = () => { throw new Error("unavailable"); };
  for (const wxValue of [undefined, null, {}, { getWindowInfo: fail },
    { getSystemInfoSync: fail }, { getWindowInfo: () => null },
    ...[undefined, 0, -1, "invalid"].map(windowWidth => ({ getWindowInfo: () => ({ windowWidth }) }))
  ]) {
    withWx(wxValue, () => assert.equal(safeArea.getRpxPerPx(), 750 / 390));
  }
  withWx({ getWindowInfo: fail, getSystemInfoSync: () => ({ windowWidth: 375 }) }, () => {
    assert.equal(safeArea.getRpxPerPx(), 750 / 390);
  });
});

test("runtime info falls back independently when newer APIs fail or return no object", () => {
  const legacyInfo = {
    windowWidth: 375,
    windowHeight: 812,
    safeAreaInsets: { bottom: 34 },
    platform: "android",
    model: "Legacy Android"
  };
  const unavailableMethods = [
    undefined,
    () => { throw new Error("runtime info unavailable"); },
    () => null,
    () => undefined,
    () => "unavailable",
    () => []
  ];
  for (const method of unavailableMethods) {
    withWx({
      getWindowInfo: method,
      getDeviceInfo: method,
      getSystemInfoSync: () => legacyInfo
    }, () => {
      assert.equal(safeArea.getWindowInfoCompat(), legacyInfo);
      assert.equal(safeArea.getDeviceInfoCompat(), legacyInfo);
      assert.equal(safeArea.getBottomSafeAreaRpx(), 68);
      assert.equal(safeArea.getDeviceInfoCompat().model, "Legacy Android");
    });
  }
});

test("valid newer runtime info avoids the legacy API", () => {
  const windowInfo = { windowWidth: 390, windowHeight: 844, safeAreaInsets: { bottom: 34 } };
  const deviceInfo = { platform: "android" };
  let legacyCalls = 0;
  withWx({
    getWindowInfo: () => windowInfo,
    getDeviceInfo: () => deviceInfo,
    getSystemInfoSync() { legacyCalls += 1; return {}; }
  }, () => {
    assert.equal(safeArea.getWindowInfoCompat(), windowInfo);
    assert.equal(safeArea.getDeviceInfoCompat(), deviceInfo);
    assert.equal(legacyCalls, 0);
  });
});

test("missing or failing runtime APIs return empty info and zero bottom inset", () => {
  const fail = () => { throw new Error("runtime unavailable"); };
  for (const wxValue of [undefined, null, {}, {
    getWindowInfo: fail, getDeviceInfo: fail, getSystemInfoSync: fail
  }, {
    getWindowInfo: () => null, getDeviceInfo: () => null, getSystemInfoSync: () => null
  }]) {
    withWx(wxValue, () => {
      assert.deepEqual(safeArea.getWindowInfoCompat(), {});
      assert.deepEqual(safeArea.getDeviceInfoCompat(), {});
      assert.equal(safeArea.getBottomSafeAreaRpx(), 0);
    });
  }
});

test("safe area prefers safeAreaInsets.bottom and converts px to rpx", () => {
  withWx({
    getWindowInfo() {
      return {
        windowWidth: 375,
        windowHeight: 812,
        safeAreaInsets: { bottom: 34 },
        safeArea: { bottom: 778 }
      };
    },
    getDeviceInfo() {
      return { platform: "ios", system: "iOS 19" };
    }
  }, () => {
    assert.equal(safeArea.getBottomSafeAreaPx(safeArea.getWindowInfoCompat()), 34);
    assert.equal(safeArea.getBottomSafeAreaRpx(), 68);
  });
});

test("safe area supports the legacy safeArea.bottom coordinate", () => {
  withWx({
    getWindowInfo() {
      return { windowWidth: 390, windowHeight: 844, safeArea: { bottom: 810 } };
    }
  }, () => {
    assert.equal(safeArea.getBottomSafeAreaPx(safeArea.getWindowInfoCompat()), 34);
    assert.equal(safeArea.getBottomSafeAreaRpx(), 65.38);
  });
});

test("Android uses the 24px design fallback when the runtime explicitly reports zero inset", () => {
  withWx({
    getWindowInfo() {
      return {
        windowWidth: 360,
        windowHeight: 800,
        safeAreaInsets: null,
        safeArea: { top: 35, bottom: 800, height: 765 }
      };
    },
    getDeviceInfo() {
      return {
        platform: "android",
        brand: "vivo",
        model: "V2359A",
        system: "Android 15"
      };
    }
  }, () => {
    assert.equal(safeArea.getBottomSafeAreaPx(safeArea.getWindowInfoCompat()), 0);
    assert.equal(safeArea.getBottomSafeAreaRpx(), 46.15);
  });
});

test("HarmonyOS simulator uses the same 24px design fallback when no inset is reported", () => {
  withWx({
    getWindowInfo() {
      return {
        windowWidth: 366,
        windowHeight: 809,
        safeArea: { top: 39, bottom: 809, height: 770 }
      };
    },
    getDeviceInfo() {
      return {
        platform: "devtools",
        brand: "devtools",
        model: "HUAWEI Mate 80",
        system: "HarmonyOS"
      };
    }
  }, () => {
    assert.equal(safeArea.getBottomSafeAreaPx(safeArea.getWindowInfoCompat()), 0);
    assert.equal(safeArea.getBottomSafeAreaRpx(), 46.15);
  });
});

test("Android still prefers a real positive bottom inset", () => {
  withWx({
    getWindowInfo() {
      return {
        windowWidth: 420,
        windowHeight: 876,
        safeAreaInsets: { bottom: 24 },
        safeArea: { top: 36, bottom: 852 }
      };
    },
    getDeviceInfo() {
      return { platform: "android", system: "Android 16" };
    }
  }, () => {
    assert.equal(safeArea.getBottomSafeAreaRpx(), 42.86);
  });
});

test("non-Android environments remain zero when no bottom inset is reported", () => {
  withWx({
    getWindowInfo() {
      return { windowWidth: 390, windowHeight: 844 };
    }
  }, () => {
    assert.equal(safeArea.getBottomSafeAreaRpx(), 0);
  });
});

test("safe area clamps invalid or negative values to zero outside Android", () => {
  withWx({
    getWindowInfo() {
      return {
        windowWidth: 375,
        windowHeight: 812,
        safeAreaInsets: { bottom: -10 }
      };
    }
  }, () => {
    assert.equal(safeArea.getBottomSafeAreaRpx(), 0);
  });
});

test("runtime info preserves raw device values while the resolver converts the inset", () => {
  withWx({
    getWindowInfo() {
      return {
        pixelRatio: 3,
        screenWidth: 420,
        screenHeight: 900,
        windowWidth: 420,
        windowHeight: 876,
        safeAreaInsets: { bottom: 24 },
        safeArea: { top: 36, bottom: 852 }
      };
    },
    getDeviceInfo() {
      return {
        platform: "android",
        brand: "Example",
        model: "Example Phone",
        system: "Android 16"
      };
    }
  }, () => {
    const windowInfo = safeArea.getWindowInfoCompat();
    const deviceInfo = safeArea.getDeviceInfoCompat();
    assert.deepEqual(windowInfo.safeAreaInsets, { bottom: 24 });
    assert.deepEqual(windowInfo.safeArea, { top: 36, bottom: 852 });
    assert.equal(deviceInfo.platform, "android");
    assert.equal(windowInfo.windowHeight, 876);
    assert.equal(windowInfo.screenHeight, 900);
    assert.equal(safeArea.getBottomSafeAreaPx(windowInfo), 24);
    assert.equal(safeArea.getBottomSafeAreaRpx(), 42.86);
  });
});

test("tab pages with bottom content and the custom tab bar share the same safe-area resolver", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const relativeFiles = [
    "../pages/activity_list/activity_list.js",
    "../pages/history/history.js",
    "../pages/profile/profile.js",
    "../custom-tab-bar/index.js"
  ];

  for (const relativeFile of relativeFiles) {
    const source = fs.readFileSync(path.join(__dirname, relativeFile), "utf8");
    assert.match(source, /getBottomSafeAreaRpx/);
  }
});
