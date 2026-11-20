const REFERENCE_TICKS_PER_SECOND = 48;
const FULL_TURN = Math.PI * 2;
const LAUNCH_WIDTH_SCALE = 0.00115;
const LAUNCH_HEIGHT_SCALE = 0.00186;
const MAX_VERTICAL_TRAVEL = 1.1;
const COLORS = ["#FF9800", "#FFC83D", "#F5507E", "#FB694C", "#19B991", "#309AF1", "#945CED", "#53C95C"];

// Canvas Confetti's Realistic Look preset, proportionally scaled from 200 to 120 pieces.
// https://www.kirilv.com/canvas-confetti/#realistic
const BURSTS = [
  { count: 30, spread: 26, velocity: 55, decay: 0.9, size: 1 },
  { count: 24, spread: 60, velocity: 45, decay: 0.9, size: 1 },
  { count: 42, spread: 100, velocity: 45, decay: 0.91, size: 0.8 },
  { count: 12, spread: 120, velocity: 25, decay: 0.92, size: 1.2 },
  { count: 12, spread: 120, velocity: 45, decay: 0.9, size: 1 }
];

function createParticles(random = Math.random) {
  const between = (min, max) => min + (max - min) * random();
  return BURSTS.flatMap(({ count, spread, velocity, decay, size }) =>
    Array.from({ length: count }, (_, index) => {
      const sector = (index + random()) / count;
      const angle = (sector - 0.5) * spread * Math.PI / 180;
      const travel = velocity * between(0.75, 1.25) / (1 - decay);
      const launchX = Math.sin(angle) * travel * LAUNCH_WIDTH_SCALE;
      // Spread each layer across the screen once the initial horizontal kick slows down.
      const targetX = 0.045 + 0.91 * sector;
      const originX = Math.max(0.04, Math.min(0.96, targetX - launchX));
      const shape = random();
      const round = shape < 0.24;
      const ribbon = shape > 0.78;
      const width = between(4, 7) * size;
      return {
        originX,
        launchX,
        launchY: Math.min(MAX_VERTICAL_TRAVEL, Math.cos(angle) * travel * LAUNCH_HEIGHT_SCALE),
        decay,
        // https://www.kirilv.com/canvas-confetti/#snow uses these gravity and drift ranges.
        fallPerTick: between(0.4, 0.6) * 3 / 600,
        driftPerTick: between(-0.4, 0.4) / 2400,
        delay: between(0, 0.38),
        lifetime: between(6.3, 7.5),
        phase: between(0, FULL_TURN),
        flutterRate: between(2.7, 5.1),
        flutterWidth: between(0.005, 0.018),
        rotation: between(0, FULL_TURN),
        spin: between(1.4, 3.3) * (random() < 0.5 ? -1 : 1),
        round,
        width,
        height: width * (round ? 1 : ribbon ? between(1.8, 2.4) : between(1.15, 1.55)),
        color: COLORS[Math.floor(random() * COLORS.length)]
      };
    })
  );
}

function sampleParticle(particle, elapsed) {
  const age = elapsed - particle.delay;
  if (age < 0 || age >= particle.lifetime) return null;

  // Closed-form sum of Canvas Confetti's per-tick decaying launch. It uses the same
  // clock at every display refresh rate and turns smoothly where lift meets gravity.
  const ticks = age * REFERENCE_TICKS_PER_SECOND;
  const progress = 1 - Math.pow(particle.decay, ticks);
  const y = 1.015 - particle.launchY * progress + particle.fallPerTick * ticks;
  if (y >= 1.025 || y < -0.03) return null;

  const phase = particle.phase + age * particle.flutterRate;
  const flip = 0.19 + 0.81 * Math.abs(Math.cos(phase));
  return {
    x: particle.originX + particle.launchX * progress + particle.driftPerTick * ticks +
      (Math.sin(phase) - Math.sin(particle.phase)) * particle.flutterWidth * progress,
    y,
    angle: particle.rotation + age * particle.spin + 0.22 * Math.sin(phase),
    flip,
    opacity: Math.min(1, (particle.lifetime - age) / 0.65, (1.025 - y) * 7) * (0.72 + 0.28 * flip)
  };
}

function animateSignupConfetti(canvas, width, height, pixelRatio, onEnd) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const dpr = Math.min(2, Math.max(1, pixelRatio || 1));
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  const particles = createParticles();
  const duration = Math.max(...particles.map(particle => particle.delay + particle.lifetime));
  const size = Math.min(1.35, width / 390);
  const hasCanvasFrames = typeof canvas.requestAnimationFrame === "function" &&
    typeof canvas.cancelAnimationFrame === "function";
  const requestFrame = hasCanvasFrames
    ? callback => canvas.requestAnimationFrame(callback)
    : callback => setTimeout(callback, 16);
  const cancelFrame = hasCanvasFrames ? id => canvas.cancelAnimationFrame(id) : clearTimeout;

  const start = Date.now();
  let frameId;
  const draw = () => {
    frameId = null;
    const elapsed = (Date.now() - start) / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    if (elapsed >= duration) {
      onEnd();
      return;
    }

    for (const particle of particles) {
      const pose = sampleParticle(particle, elapsed);
      if (!pose || pose.x < -0.025 || pose.x > 1.025) continue;
      const cos = Math.cos(pose.angle) * dpr;
      const sin = Math.sin(pose.angle) * dpr;
      ctx.setTransform(cos * pose.flip, sin * pose.flip, -sin, cos, pose.x * width * dpr, pose.y * height * dpr);
      ctx.globalAlpha = pose.opacity;
      ctx.fillStyle = particle.color;
      const halfWidth = particle.width * size / 2;
      const halfHeight = particle.height * size / 2;
      if (particle.round) {
        ctx.beginPath();
        ctx.arc(0, 0, halfWidth, 0, FULL_TURN);
        ctx.fill();
      } else {
        ctx.fillRect(-halfWidth, -halfHeight, halfWidth * 2, halfHeight * 2);
      }
    }

    frameId = requestFrame(draw);
  };

  frameId = requestFrame(draw);
  return () => {
    if (frameId !== null) cancelFrame(frameId);
    frameId = null;
  };
}

module.exports = { animateSignupConfetti, createParticles, sampleParticle };
