const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { readD6Quaternion } = require("../pages/dice_demo/dice_demo_logic");
const { STORAGE_KEY, DEFAULTS, GROUPS, validateConfig, sceneProps } = require("../pages/dice_demo/dice_physics_config");

function loadDefinition(name, file) {
  const previous = global[name];
  let definition;
  try {
    global[name] = value => { definition = value; };
    delete require.cache[require.resolve(file)];
    require(file);
  } finally {
    if (previous === undefined) delete global[name];
    else global[name] = previous;
  }
  return definition;
}

const component = loadDefinition("Component", "../components/xr-dice-scene/index");
const page = loadDefinition("Page", "../pages/dice_demo/dice_demo");
const vector = (x = 0, y = 0, z = 0) => ({ x, y, z });

function harness(t) {
  const timers = new Map();
  const nodes = new Map();
  const events = [];
  let timerId = 0;
  t.mock.method(global, "setTimeout", (callback, delay) => {
    timers.set(++timerId, { callback, delay });
    return timerId;
  });
  t.mock.method(global, "clearTimeout", id => timers.delete(id));
  t.mock.method(console, "error", () => {});
  const oldWx = global.wx;
  global.wx = { getXrFrameSystem: () => ({ Vector3: { createFromNumber: vector } }) };
  t.after(() => {
    if (oldWx === undefined) delete global.wx;
    else global.wx = oldWx;
  });
  for (let i = 0; i < 4; i++) {
    const parts = {
      transform: { position: vector(), rotation: vector(), worldPosition: vector(0, -1.3, 0), worldQuaternion: { x: 0, y: 0, z: 0, w: 1 } },
      rigidbody: {
        changes: [], velocity: vector(), angularVelocity: vector(),
        setData(value) { this.changes.push(value); }, wakeUp() {}
      },
      "cube-shape": {}
    };
    nodes.set("dice-mesh-" + i, { parts, getComponent: name => parts[name] });
  }
  const orbit = { active: true, disable() { this.active = false; }, enable() { this.active = true; } };
  nodes.set("camera", { getComponent: name => name === "camera-orbit-control" ? orbit : null });
  const scene = { getElementById: id => nodes.get(id) };
  const ctx = { ...component.methods, properties: { diceCount: 1, sceneEpoch: 0 }, triggerEvent: (name, detail) => events.push({ name, detail }) };
  component.lifetimes.attached.call(ctx);
  t.after(() => component.lifetimes.detached.call(ctx));
  return {
    ctx, nodes, events, timers, scene, orbit,
    ready() { ctx.handleReady({ detail: { value: scene } }); },
    fire(delay) {
      const timer = [...timers].find(([, entry]) => entry.delay === delay);
      assert.ok(timer, "expected timer " + delay);
      timers.delete(timer[0]);
      timer[1].callback();
    }
  };
}

test("inline-only scene initializes on tick without an assets-loaded callback", t => {
  const h = harness(t);
  h.ctx.handleTick();
  assert.equal(h.ctx._ready, undefined);
  h.ready();
  assert.equal(h.ctx._pending, "first-tick");
  h.ctx.handleTick();
  h.ctx.handleTick();
  assert.equal(h.ctx._ready, true);
  assert.deepEqual(h.events.map(e => e.detail.status), ["ready"]);
  assert.equal(h.timers.size, 0);
  const first = h.nodes.get("dice-mesh-0").parts;
  assert.equal(first.rigidbody.linearDamping, 0.02);
  assert.equal(first.rigidbody.angularDamping, 0.36);
  assert.equal(first.transform.position.y, -1.3);
  assert.equal(h.ctx._dice.length, 1, "unused dice are not initialized");
  assert.equal(h.nodes.get("dice-mesh-1").parts.rigidbody.changes.length, 0);
});

test("unused XR children cannot block the default single-die scene", t => {
  const h = harness(t);
  for (let index = 1; index < 4; index++) {
    h.nodes.delete("dice-mesh-" + index);
  }
  h.ready();
  h.ctx.handleTick();
  assert.equal(h.ctx._ready, true);
  assert.equal(h.ctx._dice.length, 1);
});

for (const missing of ["node", "physics"]) {
  test("initialization waits for delayed " + missing + " without partial mutation", t => {
    const h = harness(t);
    let restore;
    if (missing === "node") {
      const node = h.nodes.get("dice-mesh-0");
      h.nodes.delete("dice-mesh-0");
      restore = () => h.nodes.set("dice-mesh-0", node);
    } else if (missing === "physics") {
      const parts = h.nodes.get("dice-mesh-0").parts;
      const body = parts.rigidbody;
      delete parts.rigidbody;
      restore = () => { parts.rigidbody = body; };
    }
    h.ready();
    h.ctx.handleTick();
    h.ctx.handleTick();
    assert.equal(h.ctx._failed, undefined);
    assert.equal(h.events.length, 0);
    assert.equal(h.ctx._dice.length, 0);
    restore();
    h.ctx.handleTick();
    assert.equal(h.ctx._ready, true);
    assert.equal(h.events.length, 1);
  });
}

test("expanding waits for the new die and then resumes rolling", t => {
  const h = harness(t);
  h.ready();
  h.ctx.handleTick();
  const newDie = h.nodes.get("dice-mesh-1");
  h.nodes.delete("dice-mesh-1");
  h.ctx.setDiceCount(2);
  assert.equal(h.ctx._ready, false);
  assert.equal(h.events.at(-1).detail.status, "initializing");
  h.ctx.rollAll();
  assert.equal(Boolean(h.ctx._watching), false);
  h.ctx.handleTick();
  assert.equal(h.ctx._pending, "dice 1");
  h.nodes.set("dice-mesh-1", newDie);
  h.ctx.handleTick();
  assert.equal(h.ctx._ready, true);
  assert.equal(h.ctx._dice.length, 2);
  assert.equal(h.events.at(-1).detail.status, "ready");
  assert.equal(h.timers.size, 0);
  h.ctx.rollAll();
  assert.equal(h.events.at(-1).detail.status, "rolling");
});

test("expansion timeout identifies missing die and detaching clears its timer", t => {
  const h = harness(t);
  h.ready();
  h.ctx.handleTick();
  h.nodes.delete("dice-mesh-1");
  h.ctx.setDiceCount(2);
  h.ctx.handleTick();
  h.fire(12000);
  assert.equal(h.events.at(-1).detail.code, "init-timeout");
  assert.equal(h.events.at(-1).detail.pending, "dice 1");
  assert.equal(h.timers.size, 0);
});

for (const stage of ["scene-ready", "first-tick", "physics 0"]) {
  test("initialization timeout identifies " + stage, t => {
    const h = harness(t);
    if (stage !== "scene-ready") h.ready();
    if (stage === "physics 0") {
      delete h.nodes.get("dice-mesh-0").parts.rigidbody;
      h.ctx.handleTick();
    }
    h.fire(12000);
    assert.deepEqual(h.events[0].detail, {
      status: "error", code: "init-timeout", epoch: 0, phase: "initialization", pending: stage, message: "Waiting for " + stage
    });
    h.ctx.handleTick();
    h.ctx._fail("duplicate");
    assert.equal(h.events.length, 1);
  });
}

test("unexpected initialization exception is reported immediately", t => {
  const h = harness(t);
  h.scene.getElementById = () => { throw new Error("XR lookup failed"); };
  h.ready();
  h.ctx.handleTick();
  assert.equal(h.events[0].detail.phase, "initialization");
  assert.equal(h.events[0].detail.message, "XR lookup failed");
  assert.equal(h.timers.size, 0);
});

test("detaching cancels initialization and ignores late ready/tick events", t => {
  const h = harness(t);
  component.lifetimes.detached.call(h.ctx);
  h.ready();
  h.ctx.handleTick();
  assert.equal(h.timers.size, 0);
  assert.equal(h.events.length, 0);
  assert.equal(h.ctx.scene, null);
});

test("rolling resolves all active dice only after a supported stable pose", t => {
  const h = harness(t);
  let now = 1000;
  t.mock.method(Date, "now", () => now);
  h.ctx.setDiceCount(4);
  h.ready();
  h.ctx.handleTick();
  h.ctx.rollAll();
  assert.equal(h.events.at(-1).detail.status, "rolling");
  for (const { body, transform } of h.ctx._dice) {
    body.velocity = vector();
    body.angularVelocity = vector();
    transform.worldPosition.y = 0;
  }
  h.ctx.handleTick();
  now += 500;
  h.ctx.handleTick();
  assert.equal(h.ctx._watching, true, "suspended dice cannot settle");
  h.ctx._dice.forEach(({ transform }) => { transform.worldPosition.y = -1.3; });
  h.ctx.handleTick();
  now += 401;
  h.ctx.handleTick();
  assert.equal(h.ctx._watching, false);
  assert.equal(h.events.at(-1).name, "result");
  assert.equal(h.events.at(-1).detail.total, 20);
  assert.equal(h.events.at(-1).detail.results.length, 4);
  assert.equal(h.timers.size, 0);
});

test("launch height and velocity stay unchanged while physics tuning changes", t => {
  const sceneXml = fs.readFileSync(path.join(__dirname, "../components/xr-dice-scene/index.wxml"), "utf8");
  const props = sceneProps(DEFAULTS);
  assert.equal(props.gravityVector, "0 -14 0");
  assert.equal(props.rigidbodyConfig, "disabled: true; mass: 3");
  assert.match(props.diceInteract, /staticFriction: 0.75; dynamicFriction: 0.58; bounciness: 0.08/);
  assert.match(props.groundInteract, /staticFriction: 0.8; dynamicFriction: 0.65; bounciness: 0.05/);
  assert.match(props.wallInteract, /staticFriction: 0.4; dynamicFriction: 0.3; bounciness: 0.05/);
  assert.ok(sceneXml.includes('<xr-physics gravity="{{gravityVector}}" />'));
  assert.equal(sceneXml.split('rigidbody="{{rigidbodyConfig}}"').length - 1, 4);
  assert.equal(sceneXml.split('shape-interact="{{diceInteract}}"').length - 1, 4);
  const h = harness(t);
  h.ready();
  h.ctx.handleTick();
  const die = h.ctx._dice[0];
  h.ctx.rollAll();
  assert.equal(die.transform.position.y, 0.7);
  assert.ok(die.body.velocity.y >= 4.2 && die.body.velocity.y <= 5);
});

test("roll has a lighter launch and hand dragging does not rotate the camera", t => {
  const h = harness(t);
  h.ready();
  h.ctx.handleTick();
  const die = h.ctx._dice[0];
  h.ctx.handleTouchShape({ detail: { value: { target: die.element } } });
  assert.equal(h.orbit.active, false);
  h.ctx.handleUntouchShape();
  assert.equal(h.orbit.active, true);
  assert.equal(die.body.velocity.y, 3.5);
  h.ctx._recover("test");
  h.ctx.rollAll();
  assert.ok(die.body.velocity.y >= 4.2 && die.body.velocity.y <= 5);
});

test("an unsupported die trapped against a wall is nudged inward after a pause", t => {
  const h = harness(t);
  let now = 1000;
  t.mock.method(Date, "now", () => now);
  h.ready();
  h.ctx.handleTick();
  h.ctx.rollAll();
  const die = h.ctx._dice[0];
  die.transform.worldPosition = vector(6.1, 0, 0);
  die.body.velocity = vector();
  die.body.angularVelocity = vector();
  h.ctx.handleTick();
  now += 950;
  h.ctx.handleTick();
  assert.equal(die.body.velocity.x, -2);
  assert.equal(die.body.velocity.y, 1.5);
  assert.equal(h.ctx._watching, true);
});
test("a roll without subsequent ticks times out and permits another roll", t => {
  const h = harness(t);
  h.ready();
  h.ctx.handleTick();
  h.ctx.rollAll();
  h.fire(15000);
  assert.equal(h.events.at(-1).detail.status, "retry");
  assert.equal(h.events.at(-1).detail.code, "settle-timeout");
  assert.equal(h.ctx._watching, false);
  h.ctx.rollAll();
  assert.equal(h.events.at(-1).detail.status, "rolling");
  component.lifetimes.detached.call(h.ctx);
  assert.equal(h.timers.size, 0);
});

test("post-initialization exception is marked as runtime failure", t => {
  const h = harness(t);
  h.ready();
  h.ctx.handleTick();
  h.ctx._dice[0].body.wakeUp = () => { throw new Error("body failed"); };
  h.ctx.rollAll();
  assert.equal(h.events.at(-1).detail.phase, "runtime");
  assert.equal(h.events.at(-1).detail.code, "throw-failed");
  assert.equal(h.timers.size, 0);
});

test("page distinguishes initialization and runtime errors and locks throwing", t => {
  t.mock.method(console, "error", () => {});
  const ctx = { ...page, data: { ...page.data }, setData(data) { Object.assign(this.data, data); } };
  ctx.onSceneStatusChange({ detail: { status: "error", phase: "initialization", code: "init-timeout", pending: "first-tick" } });
  assert.ok(ctx.data.statusText.includes("first-tick"));
  const initText = ctx.data.statusText;
  ctx.onRollTap();
  assert.equal(ctx.data.rollToken, 0);
  ctx.onSceneStatusChange({ detail: { status: "error", phase: "runtime", code: "throw-failed" } });
  assert.notEqual(ctx.data.statusText.split(" (")[0], initText.split(" (")[0]);
  ctx.onSceneStatusChange({ detail: { status: "ready" } });
  ctx.onRollTap();
  assert.equal(ctx.data.rollToken, 1);
});

test("page retry unmounts the failed XR scene before measuring and mounting again", t => {
  const previousWx = global.wx;
  global.wx = { nextTick(callback) { callback(); } };
  t.after(() => { if (previousWx === undefined) delete global.wx; else global.wx = previousWx; });
  const steps = [];
  const ctx = {
    ...page,
    data: { ...page.data, status: "unavailable", sceneMounted: true },
    setData(value, callback) { steps.push(value.sceneMounted); Object.assign(this.data, value); if (callback) callback(); },
    onReady() { steps.push("measure"); this.setData({ sceneMounted: true }); }
  };
  ctx.onSceneRetry();
  assert.deepEqual(steps, [false, undefined, "measure", true]);
  assert.equal(ctx.data.status, "loading");
  assert.equal(ctx.data.rollToken, 0);
});

test("D6 quaternion reader matches all six face labels", () => {
  const s = Math.SQRT1_2;
  for (const [expected, x, y, z, w] of [[5, 0, 0, 0, 1], [2, 1, 0, 0, 0], [1, -s, 0, 0, s], [6, s, 0, 0, s], [3, 0, 0, s, s], [4, 0, 0, -s, s]]) {
    assert.equal(readD6Quaternion({ x, y, z, w }), expected);
  }
  assert.equal(readD6Quaternion({ x: 0, y: 0, z: Math.sin(Math.PI / 8), w: Math.cos(Math.PI / 8) }), null);
});

test("scene retains explicit XR nodes without an inline-assets loaded gate", () => {
  const wxml = fs.readFileSync(path.join(__dirname, "../components/xr-dice-scene/index.wxml"), "utf8");
  assert.doesNotMatch(wxml, /wx:for|bind:loaded/);
  assert.equal((wxml.match(/id="dice-mesh-\d" node-id=/g) || []).length, 4);
  assert.match(wxml, /bind:ready="handleReady"/);
  assert.match(wxml, /bind:tick="handleTick"/);
  assert.match(wxml, /id="ground-visual"[^>]*scale="14 0\.2 14"/);
  assert.match(wxml, /camera-orbit-control="rotateSpeed: 0\.8; isLockMove: true; isLockZoom: true"/);
  assert.equal((wxml.match(/position="[0-9.-]+ 1 [0-9.-]+" cube-shape="size: (?:0\.2 8 14\.2|14\.2 8 0\.2)"/g) || []).length, 4);
  assert.equal((wxml.match(/id="dice-visual-\d"[^>]*scale="1\.6 1\.6 1\.6"/g) || []).length, 4);
  assert.doesNotMatch(fs.readFileSync(path.join(__dirname, "../components/xr-dice-scene/index.js"), "utf8"), /boundBox|_fitMesh/);
  const pageWxml = fs.readFileSync(path.join(__dirname, "../pages/dice_demo/dice_demo.wxml"), "utf8");
  assert.match(pageWxml, /<xr-dice-scene[\s\S]*?disable-scroll/);
  assert.match(pageWxml, /bindtap="onSceneRetry"/);
});


test("physics editor validates all 36 values and builds complete XR strings", () => {
  assert.equal(GROUPS.reduce((n, group) => n + group.fields.length, 0), 36);
  assert.deepEqual(validateConfig(DEFAULTS).config, DEFAULTS);
  assert.match(validateConfig({ ...DEFAULTS, diceBounce: 1.1 }).error, /骰子弹性/);
  assert.match(validateConfig({ ...DEFAULTS, gravity: "" }).error, /重力强度/);
  assert.match(validateConfig({ ...DEFAULTS, diceBounce: "   " }).error, /骰子弹性/);
  assert.match(validateConfig({ ...DEFAULTS, mass: "NaN" }).error, /骰子质量/);
  assert.match(validateConfig({ ...DEFAULTS, stableMs: true }).error, /稳定确认/);
  const custom = { ...DEFAULTS, gravity: 20, mass: 7, diceBounce: 0.25 };
  assert.equal(sceneProps(custom).gravityVector, "0 -20 0");
  assert.match(sceneProps(custom).rigidbodyConfig, /mass: 7/);
  assert.match(sceneProps(custom).diceInteract, /bounciness: 0.25/);
  const xml = fs.readFileSync(path.join(__dirname, "../pages/dice_demo/dice_demo.wxml"), "utf8");
  for (const attribute of ["tuning", "scene-epoch", "gravity-vector", "rigidbody-config", "dice-interact", "ground-interact", "wall-interact"]) assert.ok(xml.includes(attribute + '="{{'));
});

test("tuned motion values reach dice velocity, damping, and stability", t => {
  const h = harness(t);
  h.ctx._tuning = { ...DEFAULTS, launchHeight: 1.5, upSpeed: 2, upRandom: 0, horizontalSpread: 0, spinX: 2, spinY: 1, spinZ: 3, spinRandom: 0, linearDamping: 0.4, angularDamping: 1.2 };
  h.ready(); h.ctx.handleTick();
  const die = h.ctx._dice[0];
  assert.equal(die.body.linearDamping, 0.4);
  assert.equal(die.body.angularDamping, 1.2);
  h.ctx.rollAll();
  assert.equal(die.transform.position.y, 1.5);
  assert.equal(Math.abs(die.body.velocity.x), 0);
  assert.equal(die.body.velocity.y, 2);
  assert.equal(Math.abs(die.body.velocity.z), 0);
  assert.deepEqual(die.body.angularVelocity, vector(2, 1, -3));
});

test("local tuning restores on load, rejects invalid input, and saves only valid applied values", t => {
  const previousWx = global.wx;
  const stored = { ...DEFAULTS, gravity: 19 };
  let saved;
  const toasts = [];
  global.wx = { getWindowInfo: () => ({ statusBarHeight: 24 }), getStorageSync: key => { assert.equal(key, STORAGE_KEY); return stored; }, setStorageSync: (key, value) => { saved = value; }, showToast: value => toasts.push(value), nextTick: callback => callback() };
  t.after(() => { if (previousWx === undefined) delete global.wx; else global.wx = previousWx; });
  const steps = [];
  const ctx = { ...page, data: { ...page.data, sceneMounted: true }, setData(value, callback) { steps.push(value.sceneMounted); Object.assign(this.data, value); if (callback) callback(); }, onReady() { steps.push("measure"); this.setData({ sceneMounted: true }); } };
  ctx.onLoad();
  assert.equal(ctx.data.physicsConfig.gravity, 19);
  ctx.onPhysicsInput({ currentTarget: { dataset: { key: "gravity" } }, detail: { value: "100" } });
  ctx.onPhysicsApply();
  assert.equal(toasts.length, 1);
  assert.equal(saved, undefined);
  assert.equal(ctx.data.sceneMounted, true);
  ctx.onPhysicsInput({ currentTarget: { dataset: { key: "gravity" } }, detail: { value: "22" } });
  ctx.onPhysicsApply();
  assert.deepEqual(steps.slice(-4), [false, undefined, "measure", true]);
  assert.equal(saved.gravity, 22);
  assert.equal(ctx.data.sceneProps.gravityVector, "0 -22 0");
  assert.equal(ctx.data.rollToken, 0);
  ctx.onSceneStatusChange({ detail: { status: "ready", epoch: ctx.data.sceneEpoch - 1 } });
  assert.equal(ctx.data.rollToken, 0);
  ctx.onSceneStatusChange({ detail: { status: "ready", epoch: ctx.data.sceneEpoch } });
  assert.equal(ctx.data.rollToken, 1);
  assert.equal(ctx.data.scrollIntoView, "dice-stage-anchor");
  ctx.onSceneStatusChange({ detail: { status: "ready", epoch: ctx.data.sceneEpoch } });
  assert.equal(ctx.data.rollToken, 1);
  ctx.onSceneStatusChange({ detail: { status: "settled", epoch: ctx.data.sceneEpoch } });
  ctx.onPhysicsReset();
  assert.equal(ctx.data.physicsConfig.gravity, DEFAULTS.gravity);
  assert.equal(saved.gravity, DEFAULTS.gravity);
});
