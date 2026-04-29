/**
 * Fairy Dust — stateful effect ported from
 * mrc-marquee-controller/shows.py · class FairyDust.
 *
 *   "Tiny glitter points that drift and fade."
 *
 * Spawns short-lived particles at random LED positions, each drifting
 * along the strip and fading in/out across its lifetime.  No per-show
 * params on this one — speed controls spawn rate and drift, intensity
 * controls peak brightness.
 *
 * Particles use the global LED index as their position (mod TOTAL_LEDS),
 * matching the controller's 1-D strip-position approach.
 */

import type { StatefulEffect } from "./effects";
import { PIXEL_LAYOUT, TOTAL_LEDS } from "./pixelLayout";
import type { RGB } from "./palettes";

interface Particle {
  pos: number;       // LED index, fractional (drifts with `drift`)
  drift: number;     // index units per physics tick
  life: number;      // seconds elapsed
  maxLife: number;   // total lifetime in seconds
  colorIdx: number;  // palette sample point
}

const PHYSICS_FPS = 40;
const PHYSICS_DT = 1 / PHYSICS_FPS;
const MAX_PARTICLES = 120;

let particles: Particle[] = [];
let simTime = 0;

function paletteSample(palette: RGB[], position: number): RGB {
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

export const fairyDustEffect: StatefulEffect = {
  type: "stateful",

  reset() {
    particles = [];
    simTime = 0;
  },

  step(buffer, t, _dt, params) {
    const useP = params.usePalette && params.paletteColors.length >= 2;
    // On the rig, base=0.06·intensity reads as a clear warm glow because
    // each physical LED still emits visible light at low duty cycles.  On
    // a screen, that maps to nearly-black pixels.  Bump the base so the
    // simulator matches the perceptual look of the actual letters.
    const baseLevel = (0.1 + 0.15 * params.intensity) * params.brightness;

    // ── Paint the dim ambient base across all LEDs ─────────────────────
    if (useP) {
      for (const px of PIXEL_LAYOUT) {
        const c = paletteSample(params.paletteColors, px.gi / TOTAL_LEDS);
        const off = px.gi * 3;
        buffer[off] = c[0] * baseLevel;
        buffer[off + 1] = c[1] * baseLevel;
        buffer[off + 2] = c[2] * baseLevel;
      }
    } else {
      const r = params.color[0] * baseLevel;
      const g = params.color[1] * baseLevel;
      const b = params.color[2] * baseLevel;
      for (let i = 0; i < TOTAL_LEDS; i++) {
        const off = i * 3;
        buffer[off] = r;
        buffer[off + 1] = g;
        buffer[off + 2] = b;
      }
    }

    // ── Step the particle simulation at fixed 40 Hz ────────────────────
    if (simTime === 0) simTime = t;
    let safety = 8;
    while (simTime + PHYSICS_DT <= t && safety-- > 0) {
      simTime += PHYSICS_DT;

      // Spawn (matches Python's per-frame chance, scaled by speed)
      const spawnChance = 0.05 + params.speed * 0.15;
      if (Math.random() < spawnChance && particles.length < MAX_PARTICLES) {
        particles.push({
          pos: Math.random() * TOTAL_LEDS,
          drift: (Math.random() - 0.5) * (0.5 + params.speed),
          life: 0,
          maxLife: 0.8 + Math.random() * 1.5,
          colorIdx: Math.random(),
        });
      }

      // Update existing
      const survivors: Particle[] = [];
      for (const p of particles) {
        p.life += PHYSICS_DT;
        p.pos += p.drift;
        if (p.life >= p.maxLife) continue;
        survivors.push(p);
      }
      particles = survivors;
    }

    // ── Render particles on top of the base layer ──────────────────────
    for (const p of particles) {
      let px = Math.floor(p.pos) % TOTAL_LEDS;
      if (px < 0) px += TOTAL_LEDS;

      const progress = p.life / p.maxLife;
      // Triangular envelope — quick fade-in (first 20%), long fade-out
      const bright =
        progress < 0.2
          ? (progress / 0.2) * params.intensity
          : (1 - (progress - 0.2) / 0.8) * params.intensity;

      const c: RGB = useP
        ? paletteSample(params.paletteColors, p.colorIdx)
        : params.color;

      const off = px * 3;
      const newR = c[0] * bright * params.brightness;
      const newG = c[1] * bright * params.brightness;
      const newB = c[2] * bright * params.brightness;
      // Composite via max() so particles never dim what's already there
      if (newR > buffer[off]) buffer[off] = clamp255(newR);
      if (newG > buffer[off + 1]) buffer[off + 1] = clamp255(newG);
      if (newB > buffer[off + 2]) buffer[off + 2] = clamp255(newB);
    }
  },
};
