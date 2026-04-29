/**
 * Fireworks — particle-based stateful effect ported from
 * mrc-marquee-controller/shows.py · class FireworksXL.
 *
 *   "Particle-based fireworks with radial explosions and gravity."
 *
 * Mechanics (per the controller):
 *   • Each of the 6 letters runs an independent firework simulation.
 *   • Each letter has a per-frame trail-fade applied to its canvas slice
 *     (default 70%) so explosions leave fading streaks.
 *   • A new burst launches per letter every (1.5 - 1.2·speed) seconds,
 *     varied ±30% so letters stay desynced.
 *   • Each burst spawns N particles (10 + 35·burst_size) · intensity in
 *     a random radial pattern from a center between (0.2..0.8, 0.4..0.9)
 *     in the letter's local 0–1 coord space.
 *   • Particles have positions, velocities, age, max_age, color_idx
 *     (palette pick).  Each frame: pos += vel; vy -= gravity; age += dt.
 *   • LEDs within hit_radius (≈0.045 in local coords) of a live particle
 *     get illuminated — alpha falls off with distance from particle and
 *     particle age.  We keep the brightest of (existing buffer, new hit)
 *     so multiple particles compose nicely.
 *
 * Defaults: burst_size=50, gravity=40, trail_fade=70 — match the
 * controller's PARAMS defaults.  These could be exposed as per-effect
 * sliders later (Phase 2 enhancement).
 *
 * Coordinate convention: Python uses bottom=0/top=1 for Y so gravity
 * decrements vy.  Our `lny` is top=0/bottom=1, so we flip Y and use
 * `vy -= gravity` in flipped space (equivalent to the Python).
 */

import type { StatefulEffect, EffectParams } from "./effects";
import { PIXEL_LAYOUT, TOTAL_LEDS } from "./pixelLayout";
import { type RGB } from "./palettes";

const NUM_LETTERS = 6;
const HIT_RADIUS = 0.045; // ≈ Python's sqrt(0.002) ≈ 0.045 in local coords
const HIT_RADIUS_SQ = HIT_RADIUS * HIT_RADIUS;
const PHYSICS_FPS = 40; // Python sim runs at 40 Hz
const PHYSICS_DT = 1 / PHYSICS_FPS;
const MAX_PARTICLES_PER_LETTER = 60;

// Defaults from shows.py PARAMS
const BURST_SIZE = 0.5;   // 50%
const GRAVITY_RAW = 0.4;  // 40%
const GRAVITY = GRAVITY_RAW * 0.0015 * PHYSICS_FPS; // per-tick → per-second
const TRAIL_FADE = 0.7;   // 70% of previous frame retained

interface Particle {
  x: number;
  y: number;        // bottom=0, top=1 (Python convention)
  vx: number;
  vy: number;
  age: number;
  maxAge: number;
  colorIdx: number; // palette sample point
}

interface LetterState {
  particles: Particle[];
  lastLaunch: number;
}

// Pre-bucket pixels by letter so each frame we don't filter the full layout
const pixelsByLetter: NormalizedPixelLite[][] = Array.from({ length: NUM_LETTERS }, () => []);
type NormalizedPixelLite = { gi: number; lnx: number; lny: number };
for (const p of PIXEL_LAYOUT) {
  pixelsByLetter[p.li].push({ gi: p.gi, lnx: p.lnx, lny: p.lny });
}

// Mutable simulator state
const letters: LetterState[] = Array.from({ length: NUM_LETTERS }, () => ({
  particles: [],
  lastLaunch: -999,
}));

// Track simulation time so we can step physics at a fixed rate independent of rAF
let simTime = 0;

function rand(): number {
  return Math.random();
}

function launchBurst(state: LetterState, t: number, params: EffectParams) {
  const cx = 0.2 + rand() * 0.6;
  const cy = 0.4 + rand() * 0.5; // Python convention: 0.4–0.9 from BOTTOM
  // Python: int((10 + burst_size * 35) * intensity), max(5, ...)
  const numParticles = Math.max(5, Math.floor((10 + BURST_SIZE * 35) * params.intensity));
  const velocity = 0.01 + BURST_SIZE * 0.03 + params.speed * 0.01;
  // All particles in a burst share a base color_idx so the firework is
  // mostly one color (with small variation per particle).
  const baseColorIdx = rand();

  for (let i = 0; i < numParticles; i++) {
    const angle = rand() * 2 * Math.PI;
    const v = velocity * (0.5 + rand() * 0.5);
    state.particles.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v,
      age: 0,
      maxAge: 1.0 + rand() * 1.5,
      colorIdx: baseColorIdx + (rand() - 0.5) * 0.2,
    });
  }
  state.lastLaunch = t;
}

function physicsStep(state: LetterState, t: number, dt: number, params: EffectParams) {
  // Maybe launch a new burst
  const baseInterval = Math.max(0.3, 1.5 - params.speed * 1.2);
  const launchInterval = baseInterval * (0.7 + rand() * 0.6);
  if (t - state.lastLaunch > launchInterval) {
    launchBurst(state, t, params);
  }

  // Update existing particles
  const survivors: Particle[] = [];
  for (const p of state.particles) {
    // Position and velocity in Python coords (bottom=0, top=1)
    p.x += p.vx;
    p.y += p.vy;
    p.vy -= GRAVITY * dt; // gravity pulls down (Python: vy decreases)
    p.age += dt;

    if (p.age >= p.maxAge) continue;
    // Off-stage (with small margin)
    if (p.x < -0.1 || p.x > 1.1 || p.y < -0.1) continue;
    survivors.push(p);
  }
  // Cap to avoid unbounded growth
  if (survivors.length > MAX_PARTICLES_PER_LETTER) {
    survivors.splice(0, survivors.length - MAX_PARTICLES_PER_LETTER);
  }
  state.particles = survivors;
}

function paletteAt(palette: RGB[], position: number): RGB {
  if (palette.length === 0) return [255, 255, 255];
  if (palette.length === 1) return palette[0];
  const tw = ((position % 1) + 1) % 1;
  const segIdx = tw * palette.length;
  const i0 = Math.floor(segIdx) % palette.length;
  const i1 = (i0 + 1) % palette.length;
  const f = segIdx - Math.floor(segIdx);
  const a = palette[i0];
  const b = palette[i1];
  return [
    a[0] + (b[0] - a[0]) * f,
    a[1] + (b[1] - a[1]) * f,
    a[2] + (b[2] - a[2]) * f,
  ];
}

function clamp255(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

export const fireworksEffect: StatefulEffect = {
  type: "stateful",

  reset() {
    for (const l of letters) {
      l.particles = [];
      l.lastLaunch = -999;
    }
    simTime = 0;
  },

  step(buffer, t, dt, params) {
    // ── Trail fade: scale the entire buffer down ─────────────────────────
    for (let i = 0; i < TOTAL_LEDS * 3; i++) {
      buffer[i] *= TRAIL_FADE;
    }

    // ── Step physics at fixed 40 Hz, regardless of rAF rate ──────────────
    // Cap the catch-up loop so a tab being backgrounded doesn't melt the CPU
    if (simTime === 0) simTime = t;
    let safety = 8;
    while (simTime + PHYSICS_DT <= t && safety-- > 0) {
      simTime += PHYSICS_DT;
      for (let li = 0; li < NUM_LETTERS; li++) {
        physicsStep(letters[li], simTime, PHYSICS_DT, params);
      }
    }
    if (safety <= 0) simTime = t; // skipped — resync

    // ── Render particles to buffer ───────────────────────────────────────
    const useP = params.usePalette && params.paletteColors.length >= 2;
    for (let li = 0; li < NUM_LETTERS; li++) {
      const state = letters[li];
      const pixels = pixelsByLetter[li];
      for (const p of state.particles) {
        const fade = 1.0 - Math.sqrt(p.age / p.maxAge);
        const bright = Math.min(1.0, fade * (0.5 + params.intensity * 1.5) * 2.5);
        if (bright <= 0.01) continue;

        // Particle position in MY coord system: pixels use top=0, particle uses top=0 too?
        // Python: lny is top=1/bottom=0, particle y is top=1/bottom=0.
        // My lny is top=0/bottom=1. So flip:
        const py = 1 - p.y;
        const px = p.x;

        let c: RGB;
        if (useP) {
          const idx = ((p.colorIdx % 1) + 1) % 1;
          c = paletteAt(params.paletteColors, idx);
        } else {
          c = params.color;
        }

        for (const pix of pixels) {
          const dx = pix.lnx - px;
          const dy = pix.lny - py;
          const d2 = dx * dx + dy * dy;
          if (d2 >= HIT_RADIUS_SQ) continue;
          const alpha = bright * (1.0 - d2 / HIT_RADIUS_SQ) * params.brightness;
          const off = pix.gi * 3;
          const newR = c[0] * alpha;
          const newG = c[1] * alpha;
          const newB = c[2] * alpha;
          // Composite via max() so overlapping particles brighten naturally
          if (newR > buffer[off]) buffer[off] = clamp255(newR);
          if (newG > buffer[off + 1]) buffer[off + 1] = clamp255(newG);
          if (newB > buffer[off + 2]) buffer[off + 2] = clamp255(newB);
        }
      }
    }
  },
};
