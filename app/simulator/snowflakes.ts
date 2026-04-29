/**
 * Snowflakes — stateful effect ported from
 * mrc-marquee-controller/shows.py · class Snowflakes.
 *
 *   "Snowflakes falling from the top of the letter."
 *
 * Per-show params:
 *   • flake_size  — 10..100 % (max radius of each flake)
 *   • drift       — 0..100 % (horizontal wind drift)
 *   • max_flakes  — 5..100 (cap on simultaneous in-air flakes)
 *   • accumulate  — 0..100 % (flakes pile up at the bottom — set 0 to
 *                   disable accumulation entirely)
 *   • bg_glow     — 0..100 % background glow
 *   • bg_color    — RGB background color
 *
 * Coordinate convention:  the controller uses bottom=0/top=1 internally,
 * but our pixel.ny is top=0/bottom=1.  Flakes use Python convention so
 * `y=1` = top of canvas.  When hit-testing, we flip our pixel.ny.
 */

import type { StatefulEffect, EffectParams } from "./effects";
import { paramN, paramC } from "./effects";
import { PIXEL_LAYOUT, TOTAL_LEDS, SIGN_ASPECT_RATIO } from "./pixelLayout";
import type { RGB } from "./palettes";

interface Flake {
  x: number;       // 0..1 across canvas
  y: number;       // 1=top, 0=bottom (Python convention)
  drift: number;   // x velocity per physics tick
  fallSpeed: number;
  size: number;    // physical radius
  colorIdx: number;
}

const PHYSICS_FPS = 40;
const PHYSICS_DT = 1 / PHYSICS_FPS;

let flakes: Flake[] = [];
let snowFill = 0;     // 0=no snow, grows upward in flake-space (=coord-space y)
let simTime = 0;

function clamp255(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

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

export const snowflakesEffect: StatefulEffect = {
  type: "stateful",

  reset() {
    flakes = [];
    snowFill = 0;
    simTime = 0;
  },

  step(buffer, t, _dt, params) {
    const flakeSizeScale = paramN(params, "flake_size", 40) / 100;
    const driftScale = paramN(params, "drift", 30) / 100;
    const maxFlakes = paramN(params, "max_flakes", 50);
    const accumulate = paramN(params, "accumulate", 0) / 100;
    const bgGlow = paramN(params, "bg_glow", 0) / 100;
    const bgColor = paramC(params, "bg_color", [255, 200, 140]);

    const useP = params.usePalette && params.paletteColors.length >= 2;
    const ar = SIGN_ASPECT_RATIO;

    // ── Background base ───────────────────────────────────────────────
    if (bgGlow > 0) {
      const glow = bgGlow * 0.3 * params.intensity * params.brightness;
      const r = bgColor[0] * glow;
      const g = bgColor[1] * glow;
      const b = bgColor[2] * glow;
      for (let i = 0; i < TOTAL_LEDS; i++) {
        const off = i * 3;
        buffer[off] = r;
        buffer[off + 1] = g;
        buffer[off + 2] = b;
      }
    } else {
      buffer.fill(0);
    }

    // Reset accumulation if slider is 0
    if (accumulate === 0) snowFill = 0;

    // ── Physics ticks at 40 Hz ────────────────────────────────────────
    if (simTime === 0) simTime = t;
    let safety = 8;
    while (simTime + PHYSICS_DT <= t && safety-- > 0) {
      simTime += PHYSICS_DT;

      // Spawn
      const spawnRate = 0.05 + params.speed * 0.2;
      if (Math.random() < spawnRate && flakes.length < maxFlakes) {
        flakes.push({
          x: Math.random(),
          y: 1.0,
          drift: (Math.random() - 0.5) * 0.08 * driftScale,
          fallSpeed: 0.005 + Math.random() * 0.015 * (0.5 + params.speed),
          size: (0.02 + Math.random() * 0.05) * flakeSizeScale + 0.01,
          colorIdx: Math.random(),
        });
      }

      // Update + landing detection
      const survivors: Flake[] = [];
      const snowLine = snowFill;
      for (const f of flakes) {
        f.y -= f.fallSpeed;
        f.x += f.drift;
        if (accumulate > 0 && f.y <= snowLine + 0.02) {
          snowFill += 0.002 * accumulate;
          continue;
        }
        if (f.y < -0.05) continue;
        survivors.push(f);
      }
      flakes = survivors;
    }

    // ── Render flakes ─────────────────────────────────────────────────
    for (const f of flakes) {
      // Flip Y to convert from controller's bottom=0/top=1 to our top=0/bottom=1
      const flakeYInOurCoords = 1 - f.y;
      const fSizeSq = f.size * f.size;
      for (const px of PIXEL_LAYOUT) {
        const dx = (px.nx - f.x) * ar;
        const dy = px.ny - flakeYInOurCoords;
        const distSq = dx * dx + dy * dy;
        if (distSq >= fSizeSq) continue;
        const alpha = 1 - Math.sqrt(distSq) / f.size;
        const bright = alpha * params.intensity * params.brightness;
        const c = useP ? paletteSample(params.paletteColors, f.colorIdx) : params.color;
        const off = px.gi * 3;
        const newR = c[0] * bright;
        const newG = c[1] * bright;
        const newB = c[2] * bright;
        if (newR > buffer[off]) buffer[off] = clamp255(newR);
        if (newG > buffer[off + 1]) buffer[off + 1] = clamp255(newG);
        if (newB > buffer[off + 2]) buffer[off + 2] = clamp255(newB);
      }
    }

    // ── Render accumulated snow pile ──────────────────────────────────
    if (accumulate > 0 && snowFill > 0) {
      const maxBright = (0.5 + 0.5 * params.intensity) * params.brightness;
      const sc = useP
        ? paletteSample(params.paletteColors, 0.5)
        : params.color;
      // In our coords, bottom is ny=1.  snowFill in controller = how high the
      // pile reaches (0=none, 1=full).  So pixels with (1 - ny) <= snowFill
      // are covered.
      for (const px of PIXEL_LAYOUT) {
        const flakeY = 1 - px.ny;
        if (flakeY <= snowFill) {
          const depth = (snowFill - flakeY) / Math.max(0.01, snowFill);
          const bright = maxBright * Math.sqrt(Math.min(1, depth * 1.5));
          const off = px.gi * 3;
          buffer[off] = clamp255(sc[0] * bright);
          buffer[off + 1] = clamp255(sc[1] * bright);
          buffer[off + 2] = clamp255(sc[2] * bright);
        }
      }
    }

    // Reset when full
    if (snowFill > 1) snowFill = 0;
  },
};
