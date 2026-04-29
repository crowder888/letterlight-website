/**
 * Fire — stateful effect ported from
 * mrc-marquee-controller/shows.py · class Fire.
 *
 *   "Cellular automaton with heat diffusion, probabilistic cooling /
 *    sparking, and proper height control.  Adapted from xLights."
 *
 * Each LED has a heat value 0..1.  Each tick:
 *   • Pixels with no neighbors below ("local bottom" cells) spark with
 *     probability `spark_rate`, otherwise cool by 0.05.
 *   • All other pixels average heat from their below-neighbors, then
 *     20% chance to spark (+step_norm) or 80% cool (-step_norm).  step
 *     scales inversely with flame_height — taller flames cool more
 *     slowly.
 *
 * Heat is rendered as palette[heat] (palette mode) or color * heat
 * (single mode), matching the xLights black → red → yellow look when
 * a fire-themed palette is active.
 *
 * Neighbor lookup is precomputed once per process based on PIXEL_LAYOUT,
 * with per-letter scoping so flames inside one letter don't bleed heat
 * to its neighbors.  We use the controller's spacing constants (0.06
 * normalized units in both directions) but applied within each letter's
 * LOCAL coord system since global coords would put the threshold
 * outside any single letter.
 */

import type { StatefulEffect, EffectParams } from "./effects";
import { paramN } from "./effects";
import { PIXEL_LAYOUT, TOTAL_LEDS } from "./pixelLayout";
import type { RGB } from "./palettes";

// Local-coord spacing thresholds.  Within one letter, a typical 13×22
// grid means cells are at ~1/12 spacing horizontally → 0.085, and 1/22
// vertically → 0.045.  We pick 0.18 (3 cells) as the neighbor radius
// to be tolerant of off-grid LEDs from curved letter edges.
const LOCAL_SPACING_X = 0.18;
const LOCAL_SPACING_Y = 0.18;

const PHYSICS_FPS = 30;
const PHYSICS_DT = 1 / PHYSICS_FPS;

// Precompute neighbors-below for each pixel (within its own letter only).
// "below" in our coord system = higher ny value.
const NEIGHBORS_BELOW: number[][] = (() => {
  const result: number[][] = new Array(TOTAL_LEDS);
  // Bucket pixels by letter for quick scoped scan
  const byLetter = new Map<number, typeof PIXEL_LAYOUT>();
  for (const p of PIXEL_LAYOUT) {
    if (!byLetter.has(p.li)) byLetter.set(p.li, []);
    byLetter.get(p.li)!.push(p);
  }
  for (const p of PIXEL_LAYOUT) {
    const below: number[] = [];
    const others = byLetter.get(p.li)!;
    for (const q of others) {
      if (q.gi === p.gi) continue;
      const dy = q.lny - p.lny; // positive = q is below p (higher lny = lower in letter)
      if (dy <= 0 || dy > LOCAL_SPACING_Y) continue;
      const dx = Math.abs(q.lnx - p.lnx);
      if (dx > LOCAL_SPACING_X) continue;
      below.push(q.gi);
    }
    result[p.gi] = below;
  }
  return result;
})();

// Mutable heat array
const heat = new Float32Array(TOTAL_LEDS);
const newHeat = new Float32Array(TOTAL_LEDS);
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

function tick(params: EffectParams) {
  const heightPct = Math.max(1, paramN(params, "flame_height", 50));
  const sparkRate = paramN(params, "sparking", 50) / 100;
  const step = 100 / heightPct;
  const stepNorm = step / 20;

  for (let i = 0; i < TOTAL_LEDS; i++) {
    const below = NEIGHBORS_BELOW[i];
    if (below.length === 0) {
      // Local bottom — sparks or cools
      if (Math.random() < sparkRate) {
        newHeat[i] = 0.75 + Math.random() * 0.25;
      } else {
        newHeat[i] = Math.max(0, heat[i] - 0.05);
      }
    } else {
      let total = 0;
      for (const j of below) total += heat[j];
      let avg = total / below.length;
      // 20% spark, 80% cool
      if (Math.random() < 0.2) avg += stepNorm;
      else avg -= stepNorm;
      newHeat[i] = Math.max(0, Math.min(1, avg));
    }
  }
  heat.set(newHeat);
}

export const fireEffect: StatefulEffect = {
  type: "stateful",

  reset() {
    heat.fill(0);
    newHeat.fill(0);
    simTime = 0;
  },

  step(buffer, t, _dt, params) {
    // ── Fixed-rate physics ────────────────────────────────────────────
    if (simTime === 0) simTime = t;
    let safety = 6;
    while (simTime + PHYSICS_DT <= t && safety-- > 0) {
      simTime += PHYSICS_DT;
      tick(params);
    }

    // ── Render heat → color ───────────────────────────────────────────
    const useP = params.usePalette && params.paletteColors.length >= 2;
    for (let i = 0; i < TOTAL_LEDS; i++) {
      const h = heat[i];
      if (h < 0.01) {
        const off = i * 3;
        buffer[off] = 0;
        buffer[off + 1] = 0;
        buffer[off + 2] = 0;
        continue;
      }
      let c: RGB;
      if (useP) {
        c = paletteSample(params.paletteColors, h);
      } else {
        c = params.color;
      }
      const off = i * 3;
      const lvl = h * params.brightness;
      buffer[off] = clamp255(c[0] * lvl);
      buffer[off + 1] = clamp255(c[1] * lvl);
      buffer[off + 2] = clamp255(c[2] * lvl);
    }
  },
};
