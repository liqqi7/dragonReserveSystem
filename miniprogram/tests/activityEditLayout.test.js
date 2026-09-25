const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const page = path.join(__dirname, "../pages/activity_edit");
const wxml = fs.readFileSync(path.join(page, "activity_edit.wxml"), "utf8");
const wxss = fs.readFileSync(path.join(page, "activity_edit.wxss"), "utf8");
const js = fs.readFileSync(path.join(page, "activity_edit.js"), "utf8");

test("edit footer uses the native home indicator exactly once", () => {
  assert.doesNotMatch(wxml, /footer-home-indicator|footer-touch-bar/);
  assert.doesNotMatch(wxss, /\.footer-home-indicator|\.footer-touch-bar/);
  assert.match(wxml, /class="footer" style="padding-bottom:{{footerSafeAreaRpx}}rpx;"/);
  assert.match(js, /Math\.max\(0, getBottomSafeAreaRpx\(\) - 9\.62\)/);
});

test("edit scrolling content reserves the same footer height on Skyline and WebView", () => {
  assert.match(wxml, /class="edit-scroll" style="margin-bottom:{{footerSafeAreaRpx \+ 97\.16}}rpx;"/);
  assert.doesNotMatch(wxml, /<scroll-view[^>]*type="list"/);
  assert.match(wxss, /\.edit-scroll\s*\{[^}]*height:\s*0;[^}]*flex:\s*1;/s);
});

test("edit time slots match creation and prototype without clipping date-time labels", () => {
  const createWxss = fs.readFileSync(path.join(__dirname, "../pages/activity_create/activity_create.wxss"), "utf8");
  assert.match(wxml, /class="time-field" bindtap="openPicker" data-target="start"/);
  assert.match(wxml, /class="time-field" bindtap="openPicker" data-target="end"/);
  assert.match(wxml, /class="time-value">\{\{startLabel\}\}<\/text>/);
  assert.match(wxml, /class="time-value">\{\{endLabel\}\}<\/text>/);
  assert.doesNotMatch(wxml, /class="time-chevron"/);
  assert.match(wxss, /\.time-field\s*\{[^}]*flex:\s*1;[^}]*min-width:\s*0;[^}]*height:\s*107\.69rpx;[^}]*justify-content:\s*center;[^}]*white-space:\s*nowrap;/s);
  assert.match(wxss, /\.time-value\s*\{\s*color:\s*#111827;/);
  assert.doesNotMatch(wxss, /\.time-value\s*\{[^}]*text-overflow:\s*ellipsis;/s);
  assert.match(createWxss, /\.time-row\s*\{[^}]*justify-content:center;[^}]*white-space:nowrap;/);
  assert.match(js, /return `\$\{String\(dateValue\)\.replace\(\/-\/g, "\/"\)\} \$\{timeValue\}`/);
});

test("edit time picker has a full-screen embedded host on Skyline and WebView", () => {
  const pickerWxml = fs.readFileSync(path.join(__dirname, "../components/date-time-picker-sheet/index.wxml"), "utf8");
  assert.match(wxml, /<view class="edit-picker-host \{\{pickerVisible \? 'edit-picker-host--visible' : ''\}\}">/);
  assert.match(wxml, /<date-time-picker-sheet id="qaEditDateTimePicker" embedded="\{\{true\}\}" visible="\{\{pickerVisible\}\}"/);
  assert.match(wxss, /\.edit-picker-host\s*\{[^}]*position:\s*absolute;[^}]*z-index:\s*20;[^}]*top:\s*0;[^}]*right:\s*0;[^}]*bottom:\s*0;[^}]*left:\s*0;[^}]*pointer-events:\s*none;/s);
  assert.match(wxss, /\.edit-picker-host--visible\s*\{[^}]*pointer-events:\s*auto;/s);
  assert.match(pickerWxml, /wx:if="\{\{embedded && containerRendered\}\}"/);
});

test("both edit time fields open the picker and persist confirmed values", () => {
  const previousPage = global.Page;
  const previousGetApp = global.getApp;
  let definition;
  try {
    global.Page = value => { definition = value; };
    global.getApp = () => ({ globalData: {} });
    const pagePath = require.resolve("../pages/activity_edit/activity_edit.js");
    delete require.cache[pagePath];
    require(pagePath);
  } finally {
    global.Page = previousPage;
    global.getApp = previousGetApp;
  }

  const page = {
    data: {
      form: { startDate: "2026-09-24", startTime: "09:15", endDate: "2026-09-24", endTime: "11:30" },
      pickerVisible: false
    },
    setData(patch) {
      for (const [key, value] of Object.entries(patch)) {
        if (key.startsWith("form.")) this.data.form[key.slice(5)] = value;
        else this.data[key] = value;
      }
    }
  };
  for (const target of ["start", "end"]) {
    definition.openPicker.call(page, { currentTarget: { dataset: { target } } });
    assert.equal(page.data.pickerVisible, true);
    assert.equal(page.data.pickerTarget, target);
    assert.equal(page.data.pickerValue, `${page.data.form[target + "Date"]} ${page.data.form[target + "Time"]}`);
    definition.confirmPicker.call(page, { detail: { dateValue: "2026-09-25", timeValue: "12:45" } });
    assert.equal(page.data.form[target + "Date"], "2026-09-25");
    assert.equal(page.data.form[target + "Time"], "12:45");
    assert.equal(page.data[target + "Label"], "2026/09/25 12:45");
    assert.equal(page.data.pickerVisible, false);
  }
});
