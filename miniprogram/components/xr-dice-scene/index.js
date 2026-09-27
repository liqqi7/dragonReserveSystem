const { readD6Quaternion } = require("../../pages/dice_demo/dice_demo_logic");
const { DEFAULTS, validateConfig, sceneProps } = require("../../pages/dice_demo/dice_physics_config");
const INITIAL_PROPS = sceneProps(DEFAULTS);
const COUNT = 4;
const FLOOR_TOP = -2.1;
const HALF_SIZE = 0.8;
const TRAY_HALF = 7;
const clamp = (v, limit) => Math.max(-limit, Math.min(limit, v));
const magnitude = v => v ? Math.hypot(v.x, v.y, v.z) : Infinity;

Component({
  properties: {
    diceCount: { type: Number, value: 1, observer(value) { this.setDiceCount(value); } },
    rollToken: { type: Number, value: 0, observer(value) { if (value > 0) this.rollAll(); } },
    tuning: { type: Object, value: DEFAULTS },
    sceneEpoch: { type: Number, value: 0 },
    gravityVector: { type: String, value: INITIAL_PROPS.gravityVector },
    rigidbodyConfig: { type: String, value: INITIAL_PROPS.rigidbodyConfig },
    diceInteract: { type: String, value: INITIAL_PROPS.diceInteract },
    groundInteract: { type: String, value: INITIAL_PROPS.groundInteract },
    wallInteract: { type: String, value: INITIAL_PROPS.wallInteract }
  },
  lifetimes: {
    attached() {
      this._tuning = validateConfig(this.properties.tuning).config || DEFAULTS;
      this._dice = [];
      this._activeCount = Math.max(1, Math.min(COUNT, Math.floor(Number(this.properties.diceCount) || 1)));
      this._pending = "scene-ready";
      this._initTimer = setTimeout(() => this._fail("init-timeout", new Error("Waiting for " + this._pending)), 12000);
    },
    detached() {
      this._disposed = true;
      clearTimeout(this._initTimer);
      this._stopWatch();
      this.scene = null;
    }
  },
  pageLifetimes: {
    hide() {
      if (this._watching || this._drag) this._recover("interrupted");
    }
  },
  methods: {
    _status(status, code, diagnostics = {}) {
      if (!this._disposed) this.triggerEvent("statuschange", { status, code, epoch: this.properties.sceneEpoch, ...diagnostics });
    },
    _fail(code, error) {
      if (this._disposed || this._failed) return;
      const phase = this._ready ? "runtime" : "initialization";
      this._failed = true;
      this._ready = false;
      this._stopWatch();
      clearTimeout(this._initTimer);
      console.error("[dice-xr]", code, error || "");
      this._status("error", code, { phase, pending: this._pending, message: error && error.message || "" });
    },
    handleReady({ detail }) {
      if (this._disposed || this._failed) return;
      try {
        this.scene = detail && detail.value;
        this._xr = wx.getXrFrameSystem();
        if (!this.scene || !this._xr) throw new Error("Missing XR scene/system");
        this._pending = "first-tick";
      } catch (error) { this._fail("scene-missing", error); }
    },
    handleLog(event) { this.triggerEvent("xrlog", event && event.detail || {}); },
    _waitFor(value, description) {
      if (!value) this._pending = description;
      return value;
    },
    _initialize() {
      const dice = [];
      // Only the selected dice block initialization; ready just means parsed.
      for (let index = this._dice.length; index < this._activeCount; index++) {
        const element = this.scene.getElementById("dice-mesh-" + index);
        if (!this._waitFor(element, "dice " + index)) return;
        const transform = element.getComponent("transform");
        const body = element.getComponent("rigidbody");
        if (!this._waitFor(transform && body, "physics " + index)) return;
        dice.push({ element, transform, body, id: "d6-" + index });
      }
      dice.forEach(({ body }) => {
        body.linearDamping = this._tuning.linearDamping;
        body.angularDamping = this._tuning.angularDamping;
      });
      this._dice.push(...dice);
      const camera = this.scene.getElementById("camera");
      this._orbit = camera && camera.getComponent("camera-orbit-control");
      this._reset();
      this._ready = true;
      this._pending = "";
      clearTimeout(this._initTimer);
      this._status("ready");
    },
    _vector(x, y, z) { return this._xr.Vector3.createFromNumber(x, y, z); },
    _pauseOrbit() {
      if (this._orbit && this._orbit.disable) { this._orbit.disable(); this._orbitPaused = true; }
    },
    _resumeOrbit() {
      if (this._orbitPaused && this._orbit && this._orbit.enable) this._orbit.enable();
      this._orbitPaused = false;
    },
    _reset() {
      this._stopWatch();
      this._dice.forEach(({ transform, body }, index) => {
        body.setData({ disabled: true });
        transform.position.x = index % 2 ? 1.25 : -1.25;
        transform.position.y = index < this._activeCount ? FLOOR_TOP + HALF_SIZE : -20;
        transform.position.z = index < 2 ? 1.25 : -1.25;
        transform.rotation.x = transform.rotation.y = transform.rotation.z = 0;
      });
    },
    setDiceCount(value) {
      if (this._watching || this._drag || this._disposed || this._failed) return;
      const count = Math.max(1, Math.min(COUNT, Math.floor(Number(value) || 1)));
      if (count === this._activeCount) return;
      this._activeCount = count;
      if (!this.scene) return;
      if (count > this._dice.length) {
        this._ready = false;
        this._pending = "dice " + this._dice.length;
        clearTimeout(this._initTimer);
        this._initTimer = setTimeout(() => this._fail("init-timeout", new Error("Waiting for " + this._pending)), 12000);
        this._status("initializing", "dice-count", { pending: this._pending });
      } else {
        try {
          clearTimeout(this._initTimer);
          this._reset();
          this._ready = true;
          this._pending = "";
          this._status("ready");
        } catch (error) { this._fail("reset-failed", error); }
      }
    },
    _active() { return this._dice.slice(0, this._activeCount); },
    _startWatch() {
      this._stableSince = 0;
      this._stuckSince = {};
      this._watching = true;
      this._rollTimer = setTimeout(() => this._recover("settle-timeout"), this._tuning.rollTimeoutMs);
      this._status("rolling");
    },
    _stopWatch() {
      clearTimeout(this._rollTimer);
      this._watching = false;
      this._drag = null;
      this._resumeOrbit();
    },
    _recover(code) {
      try { this._reset(); this._status("retry", code); }
      catch (error) { this._fail("reset-failed", error); }
    },
    rollAll() {
      if (!this._ready || this._watching || this._drag || this._disposed) return;
      try {
        this._active().forEach(({ transform, body }, index) => {
          body.setData({ disabled: true });
          transform.position.x = index % 2 ? 1.25 : -1.25;
          transform.position.y = this._tuning.launchHeight + index * this._tuning.heightStep;
          transform.position.z = index < 2 ? 1.25 : -1.25;
          ["x", "y", "z"].forEach(axis => { transform.rotation[axis] = Math.random() * Math.PI * 2; });
          body.setData({ disabled: false });
          const t = this._tuning;
          body.velocity = this._vector((Math.random() - 0.5) * t.horizontalSpread, t.upSpeed + Math.random() * t.upRandom, (Math.random() - 0.5) * t.horizontalSpread);
          body.angularVelocity = this._vector(t.spinX + Math.random() * t.spinRandom, t.spinY + Math.random() * t.spinRandom, -t.spinZ - Math.random() * t.spinRandom);
          body.wakeUp();
        });
        this._startWatch();
      } catch (error) { this._fail("throw-failed", error); }
    },
    handleTick() {
      if (this._disposed || this._failed || !this.scene) return;
      try {
        if (!this._ready) this._initialize();
        if (!this._watching) return;
        const results = [];
        let settled = true;
        this._active().forEach(({ id, transform, body }) => {
          const p = transform.worldPosition;
          if (![p.x, p.y, p.z].every(Number.isFinite) || p.y < -3 || Math.abs(p.x) > TRAY_HALF + 0.4 || Math.abs(p.z) > TRAY_HALF + 0.4) {
            throw new Error("Dice escaped tray: " + id);
          }
          const value = readD6Quaternion(transform.worldQuaternion);
          const resting = magnitude(body.velocity) < this._tuning.restSpeed && magnitude(body.angularVelocity) < this._tuning.restSpeed;
          // Require a supported pose as well as low speed; do not read a suspended body.
          const supported = Boolean(value) && p.y <= FLOOR_TOP + HALF_SIZE + 0.12;
          if (!supported || !resting) settled = false;
          // Nudge a die trapped at a wall back inward instead of waiting indefinitely.
          if (resting && !supported && (Math.abs(p.x) > TRAY_HALF - 1.8 || Math.abs(p.z) > TRAY_HALF - 1.8)) {
            if (!this._stuckSince[id]) this._stuckSince[id] = Date.now();
            if (Date.now() - this._stuckSince[id] > this._tuning.wallNudgeAfterMs) {
              body.velocity = this._vector(-Math.sign(p.x) * this._tuning.wallNudgeHorizontal, this._tuning.wallNudgeUp, -Math.sign(p.z) * this._tuning.wallNudgeHorizontal);
              body.angularVelocity = this._vector(this._tuning.wallNudgeSpinX, this._tuning.wallNudgeSpinY, -this._tuning.wallNudgeSpinZ);
              body.wakeUp();
              this._stuckSince[id] = 0;
            }
          } else this._stuckSince[id] = 0;
          results.push({ id, sides: 6, value });
        });
        if (!settled) { this._stableSince = 0; return; }
        if (!this._stableSince) this._stableSince = Date.now();
        if (Date.now() - this._stableSince < this._tuning.stableMs) return;
        this._stopWatch();
        this.triggerEvent("result", { epoch: this.properties.sceneEpoch, results, total: results.reduce((sum, item) => sum + item.value, 0) });
      } catch (error) { this._fail("scene-runtime", error); }
    },
    handleTouchShape({ detail }) {
      if (!this._ready || this._watching || this._drag) return;
      const die = this._active().find(item => item.element === (detail && detail.value && detail.value.target));
      if (!die) return;
      die.body.setData({ disabled: true });
      this._pauseOrbit();
      this._drag = { die, samples: [] };
      this._status("dragging");
    },
    handleDragShape({ detail }) {
      if (!this._drag) return;
      const { origin, dir } = detail && detail.value || {};
      if (!origin || !dir || ![...origin, ...dir].every(Number.isFinite) || Math.abs(dir[1]) < 1e-6) return;
      const t = (-0.2 - origin[1]) / dir[1];
      if (t < 0) return;
      const p = this._drag.die.transform.position;
      p.x = clamp(origin[0] + t * dir[0], 4.7);
      p.y = -0.2;
      p.z = clamp(origin[2] + t * dir[2], 4.7);
      this._drag.samples.push({ x: p.x, z: p.z, at: Date.now() });
      this._drag.samples = this._drag.samples.slice(-2);
    },
    handleUntouchShape() {
      if (!this._drag) return;
      try {
        const { die, samples } = this._drag;
        const last = samples[samples.length - 1];
        const previous = samples[0];
        const dt = last ? Math.max(16, last.at - previous.at) / 1000 : 1;
        const recent = last && Date.now() - last.at < 150;
        this._active().forEach(item => {
          item.body.setData({ disabled: false });
          item.body.velocity = this._vector(0, 0, 0);
          item.body.angularVelocity = this._vector(0, 0, 0);
          item.body.wakeUp();
        });
        const tuning = this._tuning;
        die.body.velocity = this._vector(recent ? clamp((last.x - previous.x) / dt, tuning.dragHorizontalMax) : 0, tuning.dragUpSpeed, recent ? clamp((last.z - previous.z) / dt, tuning.dragHorizontalMax) : 0);
        die.body.angularVelocity = this._vector(tuning.dragSpinX, tuning.dragSpinY, -tuning.dragSpinZ);
        this._drag = null;
        this._resumeOrbit();
        this._startWatch();
      } catch (error) { this._fail("drag-failed", error); }
    }
  }
});
