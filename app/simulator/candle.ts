/**
 * CandleXL — stateful effect ported from
 * mrc-marquee-controller/shows.py · class CandleXL.
 *
 *   "Dancing candle flame — sharp flicker with gusts and momentary
 *    dim flares."
 *
 * Per-pixel `flame` and `target` brightness arrays drive an asymmetric
 * flicker:
 *   • Each tick, each pixel has a probability `retarget_prob` of
 *     picking a new target brightness in [low..high].
 *   • Some pixels (5%·flicker_speed chance) get a brief dim flare —
 *     target drops to [0.05..0.30] for one cycle.
 *   • flame snaps toward target by `approach` factor each tick, plus
 *     a per-pixel jitter and a global `wind gust` modifier.
 *
 * Per-show params:
 *   • wind     — 0..100 % gust strength (affects all pixels at once)
 *   • flicker  — 10..100 % retarget rate + approach speed
 *   • depth    — 10..100 % brightness swing range
 */

import type { StatefulEffect, EffectParams } from "./effects";
import { paramN } from "./effects";
import { TOTAL_LEDS } from "./pixelLayout";
import type { RGB } from "./palettes";

const PHYSICS_FPS = 30;
const PHYSICS_DT = 1 / PHYSICS_FPS;

const flame = new Float32Array(TOTAL_LEDS);
const target = new Float32Array(TOTAL_LEDS);
let gust = 0;
let initialized = false;
let simTime = 0;

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

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
  const windStrength = paramN(params, "wind", 40) / 100;
  const flickerSpeed = paramN(params, "flicker", 60) / 100;
  const depth = paramN(params, "depth", 70) / 100;

  const retargetProb = 0.05 + flickerSpeed * 0.35;
  const dimFlareProb = 0.005 * (1 + flickerSpeed);
  const low = Math.max(0, 0.6 - depth * 0.6);
  const high = Math.min(1, 0.6 + depth * 0.4);
  const approach = 0.4 + flickerSpeed * 0.5;

  // Per-pixel retarget + flare + flame approach + jitter
  for (let i = 0; i < TOTAL_LEDS; i++) {
    if (Math.random() < retargetProb) {
      target[i] = low + Math.random() * (high - low);
    }
    if (Math.random() < dimFlareProb) {
      target[i] = 0.05 + Math.random() * 0.25;
    }
    flame[i] += (target[i] - flame[i]) * approach;
    flame[i] += (Math.random() - 0.5) * 0.12 * depth;
    flame[i] = clamp01(flame[i]);
  }

  // Global wind gust
  if (Math.random() < 0.02 + windStrength * 0.05) {
    gust = (Math.random() - 0.5) * 0.8 * windStrength;
  }
  gust *= 0.85;
  for (let i = 0; i < TOTAL_LEDS; i++) {
    flame[i] = clamp01(flame[i] + gust * 0.2);
  }
}

export const candleEffect: StatefulEffect = {
  type: "stateful",

  reset() {
    if (!initialized) {
      // First-ever init — random initial values
      for (let i = 0; i < TOTAL_LEDS; i++) {
        flame[i] = 0.5 + Math.random() * 0.4;
        target[i] = 0.5 + Math.random() * 0.4;
      }
      initialized = true;
    } else {
      // Subsequent re-entries — also re-randomize for variety
      for (let i = 0; i < TOTAL_LEDS; i++) {
        flame[i] = 0.5 + Math.random() * 0.4;
        target[i] = 0.5 + Math.random() * 0.4;
      }
    }
    gust = 0;
    simTime = 0;
  },

  step(buffer, t, _dt, params) {
    if (simTime === 0) simTime = t;
    let safety = 6;
    while (simTime + PHYSICS_DT <= t && safety-- > 0) {
      simTime += PHYSICS_DT;
      tick(params);
    }

    // Render to buffer
    const useP = params.usePalette && params.paletteColors.length >= 2;
    const intMul = (0.4 + 0.6 * params.intensity) * params.brightness;
    if (useP) {
      // Build a small LUT for speed
      const LUT = 64;
      const lutR = new Float32Array(LUT);
      const lutG = new Float32Array(LUT);
      const lutB = new Float32Array(LUT);
      for (let j = 0; j < LUT; j++) {
        const c = paletteSample(params.paletteColors, j / LUT);
        lutR[j] = c[0]; lutG[j] = c[1]; lutB[j] = c[2];
      }
      for (let i = 0; i < TOTAL_LEDS; i++) {
        const f = flame[i];
        const idx = Math.min(LUT - 1, Math.floor(f * (LUT - 1)));
        const lvl = f * intMul;
        const off = i * 3;
        buffer[off] = clamp255(lutR[idx] * lvl);
        buffer[off + 1] = clamp255(lutG[idx] * lvl);
        buffer[off + 2] = clamp255(lutB[idx] * lvl);
      }
    } else {
      const cR = params.color[0], cG = params.color[1], cB = params.color[2];
      for (let i = 0; i < TOTAL_LEDS; i++) {
        const lvl = flame[i] * intMul;
        const off = i * 3;
        buffer[off] = clamp255(cR * lvl);
        buffer[off + 1] = clamp255(cG * lvl);
        buffer[off + 2] = clamp255(cB * lvl);
      }
    }
  },
};
