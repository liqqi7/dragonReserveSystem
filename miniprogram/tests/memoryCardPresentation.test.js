const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const {readWxss} = require("./helpers/readWxss");
const {masonryColumns} = require("../utils/memoryCardPresentation");
const read = file => file.endsWith(".wxss") ? readWxss(path.join(__dirname, "..", file)) :
  fs.readFileSync(path.join(__dirname, "..", file), "utf8");

function setup() {
  let now = 0, serial = 0;
  const timers = new Map(), calls = [], module = {exports: {}};
  vm.runInNewContext(read("utils/memoryCardPresentation.js"), {
    module,
    setTimeout(fn, ms) {timers.set(++serial, {fn, at: now + ms}); return serial;},
    clearTimeout(id) {timers.delete(id);},
  });
  const page = {data: {}, setData(patch) {Object.assign(this.data, patch);}};
  const controller = module.exports.createMemoryCardPresentation(page, urls => calls.push(Array.from(urls)));
  const run = ms => {
    const end = now + ms;
    while (true) {
      const next = [...timers].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      now = next[1].at; timers.delete(next[0]); next[1].fn();
    }
    now = end;
  };
  const loaded = url => controller.loaded(url, page.data.coverStates[url].token);
  const recreate = () => module.exports.createMemoryCardPresentation(page, urls => calls.push(Array.from(urls)));
  return {page, controller, calls, run, loaded, timers, recreate};
}

test("WebView masonry uses shortest-column placement and keeps stable keys when appending", () => {
  const items = [180, 120, 100, 240, 80, 150].map((coverHeight, id) => ({id, coverHeight}));
  const columns = masonryColumns(items.slice(0, 4), 8);
  assert.deepEqual(columns.map(column => column.id), [0, 1]);
  assert.deepEqual(columns.map(column => column.items.map(item => item.id)), [[0, 3], [1, 2]]);
  const appended = masonryColumns(items, 8);
  assert.deepEqual(appended[0].items.slice(0, 2), columns[0].items);
  assert.deepEqual(appended[1].items.slice(0, 2), columns[1].items);
  assert.deepEqual(appended.flatMap(column => column.items).map(item => item.id).sort(), [0, 1, 2, 3, 4, 5]);
  assert.deepEqual(masonryColumns([]), [{id: 0, items: []}, {id: 1, items: []}]);
});

test("three covers load together and reveal top to bottom at 60ms intervals, overlapping the fade", () => {
  const h = setup(); h.controller.window(["top", "middle", "bottom"]);
  assert.deepEqual(h.calls.at(-1), ["top", "middle", "bottom"]);
  assert.equal(h.page.data.coverStates.top.ready, false);
  h.loaded("bottom"); h.loaded("middle");
  assert.equal(h.page.data.coverStates.middle.loaded, true);
  assert.equal(h.page.data.coverStates.middle.ready, false);
  assert.equal(h.page.data.coverStates.bottom.ready, false);
  h.loaded("top"); assert.equal(h.page.data.coverStates.top.ready, true);
  h.run(59); assert.equal(h.page.data.coverStates.middle.ready, false);
  h.run(1); assert.equal(h.page.data.coverStates.middle.ready, true);
  assert.equal(h.page.data.coverStates.bottom.ready, false);
  h.run(59); assert.equal(h.page.data.coverStates.bottom.ready, false);
  h.run(1); assert.equal(h.page.data.coverStates.bottom.ready, true);
  // All three fades have begun by 120ms, well before the first 440ms fade ends.
  assert.equal(h.page.data.skeletonShimmerRunning, false);
  assert.ok(Object.values(h.page.data.coverStates).every(state => state.ready));
  h.controller.dispose(); assert.equal(h.timers.size, 0);
});

test("an out-of-order load immediately refills its slot without waiting for reveal or fade", () => {
  const h = setup(); h.controller.window(["top", "middle", "bottom", "fourth", "fifth"]);
  assert.deepEqual(h.calls.at(-1), ["top", "middle", "bottom"]);
  h.loaded("bottom");
  assert.deepEqual(h.calls.at(-1), ["top", "middle", "bottom", "fourth"]);
  assert.equal(h.page.data.coverStates.bottom.ready, false);
  h.loaded("top"); h.loaded("middle"); h.loaded("fourth"); h.loaded("fifth");
  assert.equal(h.page.data.coverStates.top.ready, true);
  assert.equal(h.page.data.coverStates.middle.ready, false);
  h.run(240);
  assert.ok(Object.values(h.page.data.coverStates).every(state => state.ready));
  h.run(60); assert.equal(h.timers.size, 0);
  h.controller.dispose();
  assert.equal(h.timers.size, 0);
});

test("a slow image waits for readiness without delaying other downloads or adding a new cooldown", () => {
  const h = setup(); h.controller.window(["a", "b", "c", "d"]);
  h.loaded("a"); h.loaded("c"); h.loaded("d"); h.run(300);
  assert.equal(h.page.data.coverStates.c.loaded, true);
  assert.equal(h.page.data.coverStates.c.ready, false);
  h.loaded("b"); assert.equal(h.page.data.coverStates.b.ready, true);
  h.run(60); assert.equal(h.page.data.coverStates.c.ready, true);
  h.run(60); assert.equal(h.page.data.coverStates.d.ready, true);
  h.controller.dispose();
});

test("failed covers advance immediately and pausing cancels the remaining load", () => {
  const h = setup(); h.controller.window(["a", "b"]);
  h.controller.failed("a");
  assert.deepEqual(h.calls.at(-1), ["b"]);
  const token = h.page.data.coverStates.b.token;
  const calls = h.calls.length;
  h.controller.pause(); h.controller.loaded("b", token); h.run(20000);
  assert.equal(h.calls.length, calls);
  assert.equal(h.page.data.coverStates.b.ready, false);
  assert.equal(h.timers.size, 0);
  h.controller.dispose();
});

test("failed or timed out cover never blocks subsequent cards; explicit retry gets a new token", () => {
  const h = setup(); h.controller.window(["a", "b", "c"]);
  const old = h.page.data.coverStates.a.token;
  h.loaded("c"); h.controller.failed("a", old);
  assert.equal(h.page.data.coverStates.a.failed, true);
  assert.deepEqual(h.calls.at(-1), ["b", "c"]);
  h.run(15000); assert.equal(h.page.data.coverStates.b.failed, true);
  assert.equal(h.page.data.coverStates.c.ready, true);
  h.run(60); h.controller.retry("a");
  assert.notEqual(h.page.data.coverStates.a.token, old);
  h.controller.loaded("a", old); assert.equal(h.page.data.coverStates.a.ready, false);
  h.loaded("a"); assert.equal(h.page.data.coverStates.a.ready, true);
  h.controller.dispose();
});

test("scrolling discards old window state and ignores late callbacks", () => {
  const h = setup(); h.controller.window(["old", "stay"]);
  const old = h.page.data.coverStates.old.token;
  h.controller.window(["stay", "new"]);
  h.controller.loaded("old", old);
  assert.deepEqual(Object.keys(h.page.data.coverStates), ["stay", "new"]);
  assert.deepEqual(h.calls.at(-1), ["stay", "new"]);
  h.controller.window(["stay", "new"]);
  h.loaded("stay"); h.run(80);
  assert.deepEqual(h.calls.at(-1), ["stay", "new"]);
  h.controller.dispose();
});

test("window deduplicates URLs, retains at most 24 entries and releases sources when empty", () => {
  const h = setup(); h.controller.window(["a", "a", ...Array.from({length: 100}, (_, i) => String(i))]);
  assert.equal(Object.keys(h.page.data.coverStates).length, 24);
  h.controller.window([]);
  assert.deepEqual(h.calls.at(-1), []);
  assert.equal(Object.keys(h.page.data.coverStates).length, 0);
  assert.equal(h.timers.size, 0);
});

test("scroll measurements of an unchanged window do not publish or prepare sources again", () => {
  const h = setup(); h.controller.window(["a", "b"]);
  const count = h.calls.length, states = h.page.data.coverStates;
  for (let i = 0; i < 20; i++) h.controller.window(["a", "a", "b"]);
  assert.equal(h.calls.length, count);
  assert.equal(h.page.data.coverStates, states);
  h.controller.pause(); h.controller.resume(); h.controller.window(["a", "b"]);
  assert.equal(h.calls.length, count + 1, "resuming must re-admit unfinished images");
  h.controller.dispose();
});

test("metadata loading shimmers before covers exist and disposal stops every timer", () => {
  const h = setup(); h.controller.fetching(true); h.run(32);
  assert.equal(h.page.data.skeletonShimmerRunning, true);
  h.controller.window(["a", "b"]);
  const token = h.page.data.coverStates.a.token;
  h.page._imagesHidden = true; h.controller.dispose();
  const calls = h.calls.length;
  h.controller.loaded("a", token); h.controller.window(["c"]); h.run(20000);
  assert.equal(h.calls.length, calls);
  assert.equal(h.timers.size, 0);
  assert.equal(h.page.data.skeletonShimmerRunning, false);
});

test("returning to the page cannot accept the previous controller's image callbacks", () => {
  const h = setup(); h.controller.window(["same"]);
  const old = h.page.data.coverStates.same.token;
  h.controller.dispose();
  const next = h.recreate(); next.window(["same"]);
  assert.notEqual(h.page.data.coverStates.same.token, old);
  next.loaded("same", old);
  assert.equal(h.page.data.coverStates.same.ready, false);
  next.loaded("same", h.page.data.coverStates.same.token);
  assert.equal(h.page.data.coverStates.same.ready, true);
  next.dispose();
});

test("pause retains decoded covers, cancels timers and resumes only unfinished cards", () => {
  const h = setup(); h.controller.window(["ready", "pending"]);
  h.loaded("ready"); h.run(80);
  const readyToken = h.page.data.coverStates.ready.token;
  const old = h.page.data.coverStates.pending.token;
  h.page._imagesHidden = true;
  assert.deepEqual(Array.from(h.controller.pause()), ["ready"]);
  assert.equal(h.timers.size, 0);
  const count = h.calls.length;
  h.controller.loaded("pending", old); h.run(20000);
  assert.equal(h.calls.length, count);
  assert.equal(h.page.data.coverStates.ready.ready, true);
  h.page._imagesHidden = false; h.controller.resume(); h.controller.window(["ready", "pending"]);
  assert.equal(h.page.data.coverStates.ready.token, readyToken);
  assert.equal(h.page.data.coverStates.ready.ready, true);
  assert.notEqual(h.page.data.coverStates.pending.token, old);
  h.controller.loaded("pending", old);
  assert.equal(h.page.data.coverStates.pending.ready, false);
  h.loaded("pending"); h.run(80); h.controller.pause();
  h.controller.resume(); h.controller.window(["ready", "pending"]);
  assert.equal(h.timers.size, 0);
  h.controller.dispose();
});

test("a retained cover that becomes unreadable can retry without resetting other cards", () => {
  const h = setup(); h.controller.window(["a", "b"]);
  h.loaded("a"); h.run(80);
  const old = h.page.data.coverStates.a.token;
  h.controller.failed("a", old);
  assert.equal(h.page.data.coverStates.a.failed, true);
  assert.deepEqual(h.calls.at(-1), ["b"]);
  h.controller.retry("a");
  assert.equal(h.page.data.coverStates.a.failed, false);
  h.loaded("b"); h.run(80);
  assert.notEqual(h.page.data.coverStates.a.token, old);
  assert.equal(h.page.data.coverStates.b.ready, false);
  h.loaded("a"); h.run(60); assert.equal(h.page.data.coverStates.b.ready, true);
  h.controller.dispose();
});

test("pause retains decoded covers that are still waiting for their reveal turn", () => {
  const h = setup(); h.controller.window(["a", "b", "c"]);
  h.loaded("b"); h.loaded("c");
  const b = h.page.data.coverStates.b.token, a = h.page.data.coverStates.a.token;
  assert.deepEqual(Array.from(h.controller.pause()), ["b", "c"]);
  assert.equal(h.timers.size, 0);
  h.controller.resume(); h.controller.window(["a", "b", "c"]);
  assert.equal(h.page.data.coverStates.b.token, b);
  assert.notEqual(h.page.data.coverStates.a.token, a);
  assert.equal(h.page.data.coverStates.b.ready, false);
  h.loaded("a"); h.run(120);
  assert.ok(Object.values(h.page.data.coverStates).every(state => state.ready));
  h.controller.dispose();
});

test("scrolling removes buffered covers and fills all available slots in the new window", () => {
  const h = setup(); h.controller.window(["a", "b", "c", "d"]);
  const a = h.page.data.coverStates.a.token;
  h.loaded("c");
  const d = h.page.data.coverStates.d.token;
  h.controller.window(["d", "e", "f", "g"]);
  assert.deepEqual(h.calls.at(-1), ["d", "e", "f"]);
  assert.equal(h.page.data.coverStates.d.token, d);
  h.controller.loaded("a", a);
  assert.equal(h.page.data.coverStates.a, undefined);
  assert.equal(h.page.data.coverStates.c, undefined);
  h.controller.dispose(); assert.equal(h.timers.size, 0);
});

test("memory skeleton and reveal reuse homepage visual timings without changing the 12px card radius", () => {
  const markup = read("pages/memory/memory.wxml"), css = read("pages/memory/memory.wxss");
  const home = read("pages/activity_list/activity_list.wxss");
  for (const text of ["background: #EAECEF", "transition: opacity 440ms ease-out", "transition: transform 1400ms linear", "transform: translateX(325%)"]) {
    assert.ok(css.includes(text)); assert.ok(home.includes(text));
  }
  assert.match(css, /\.memory-card-skeleton\s*\{[^}]*border-radius: 23\.07692rpx/);
  assert.match(markup, /bindload="coverLoaded" binderror="coverFailed"/);
  assert.match(markup, /loading && !items.length/);
  assert.doesNotMatch(markup, /<text>加载中<\/text>/);
  assert.doesNotMatch(read("utils/memoryCardPresentation.js"), /setStorage|saveFile/);
});

test("memory card background matches its skeleton throughout the reveal", () => {
  const css = read("pages/memory/memory.wxss");
  const rule = name => css.match(new RegExp("\\." + name + "\\s*\\{([^}]+)\\}"))[1];
  for (const selector of ["memory-cover", "memory-card-skeleton", "memory-initial-skeleton"])
    assert.match(rule(selector), /background: #EAECEF;/);
  assert.match(rule("memory-card-transition"), /transition: none;/);
  assert.match(rule("memory-card-transition--ready"), /opacity: 1;/);
  assert.match(rule("memory-card-skeleton"), /transition: opacity 440ms ease-out;/);
  assert.match(rule("memory-card-skeleton--ready"), /opacity: 0;/);
});
