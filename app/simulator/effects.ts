/**
 * effects.ts
 *
 * Show effect functions.  Each effect signature:
 *   effectFn(pixel, t, params) → [r, g, b]
 *
 * params mirror the controller's three universal sliders plus the active
 * color/palette so visitors are operating the same dials the wedding
 * coordinator uses.  Speed/intensity/brightness are 0–1 normalized.
 *
 * Phase 1: 6 effects (solid, breathe, sparkle, wave, rainbow, letter_colors).
 * Unimplemented shows fall back to `effectSolid` so the canvas never blanks.
 */

import type { NormalizedPixel } from "./pixelLayout";
import type { RGB } from "./palettes";

export interface EffectParams {
  /** Primary color (single-color mode) */
  color: RGB;
  /** Active palette colors (palette/custom mode) */
  paletteColors: RGB[];
  /** false = use single color, true = use palette */
  usePalette: boolean;
  /** 0–1 — slower → faster */
  speed: number;
  /** 0–1 — subtle → bold */
  intensity: number;
  /** 0–1 — dim → full */
  brightness: number;
}

export type EffectFn = (pixel: NormalizedPixel, t: number, params: EffectParams) => RGB;

// ── Helpers ───────────────────────────────────────────────────────────────────

function clamp255(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function applyBrightness(c: RGB, b: number): RGB {
  return [clamp255(c[0] * b), clamp255(c[1] * b), clamp255(c[2] * b)];
}

function lerpColor(a: RGB, b: RGB, t: number): RGB {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

function hslToRgb(h: number, s: number, l: number): RGB {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 1 / 6)      { r = c; g = x; b = 0; }
  else if (h < 2 / 6) { r = x; g = c; b = 0; }
  else if (h < 3 / 6) { r = 0; g = c; b = x; }
  else if (h < 4 / 6) { r = 0; g = x; b = c; }
  else if (h < 5 / 6) { r = x; g = 0; b = c; }
  else                 { r = c; g = 0; b = x; }
  return [
    clamp255((r + m) * 255),
    clamp255((g + m) * 255),
    clamp255((b + m) * 255),
  ];
}

/** Pick palette color at a continuous position [0,1] with smooth interpolation. */
function paletteAt(palette: RGB[], t: number): RGB {
  if (palette.length === 0) return [255, 200, 140];
  if (palette.length === 1) return palette[0];
  const tw = ((t % 1) + 1) % 1;
  const segIdx = tw * palette.length;
  const i0 = Math.floor(segIdx) % palette.length;
  const i1 = (i0 + 1) % palette.length;
  const f = segIdx - Math.floor(segIdx);
  return lerpColor(palette[i0], palette[i1], f);
}

/** Active "primary" color — single color or sampled from active palette. */
function activeColor(p: EffectParams, sample = 0): RGB {
  if (p.usePalette && p.paletteColors.length) {
    return paletteAt(p.paletteColors, sample);
  }
  return p.color;
}

// ── Effects ───────────────────────────────────────────────────────────────────

export const effectSolid: EffectFn = (_pixel, _t, p) => {
  return applyBrightness(activeColor(p), p.brightness);
};

export const effectBreathe: EffectFn = (_pixel, t, p) => {
  const speedMul = 0.4 + p.speed * 1.6;
  const phase = Math.sin(t * speedMul);
  const wave = phase * phase;
  const floor = 0.05 + 0.4 * (1 - p.intensity);
  const lvl = floor + (1 - floor) * wave;
  return applyBrightness(activeColor(p), lvl * p.brightness);
};

export const effectPulse: EffectFn = (_pixel, t, p) => {
  const speedMul = 0.6 + p.speed * 2.4;
  const ph = (t * speedMul) % (Math.PI * 2);
  const wave = Math.max(0, Math.sin(ph));
  const sharp = Math.pow(wave, 2 + p.intensity * 4);
  const floor = 0.1 * (1 - p.intensity);
  const lvl = floor + (1 - floor) * sharp;
  return applyBrightness(activeColor(p), lvl * p.brightness);
};

const sparkleState = new Float32Array(2000);
export const effectSparkle: EffectFn = (pixel, t, p) => {
  const idx = pixel.gi % sparkleState.length;
  const speedMul = 0.5 + p.speed * 4;
  const bucket = Math.floor(t * speedMul * 6);
  const seed = (pixel.gi * 1664525 + bucket * 1013904223) & 0x7fffffff;
  const flashProb = 0.02 + p.intensity * 0.1;
  let flash = 0;
  if ((seed / 0x7fffffff) < flashProb) {
    const flashStart = bucket / (speedMul * 6);
    const elapsed = t - flashStart;
    flash = Math.max(0, 1 - elapsed * speedMul * 4);
  }
  sparkleState[idx] = Math.max(sparkleState[idx] * 0.86, flash);
  const f = sparkleState[idx];
  const base = applyBrightness(activeColor(p), 0.12 * p.brightness);
  const peak: RGB = [
    clamp255(255 * p.brightness),
    clamp255(255 * p.brightness),
    clamp255(255 * p.brightness),
  ];
  const out = lerpColor(base, peak, f);
  return [clamp255(out[0]), clamp255(out[1]), clamp255(out[2])];
};

export const effectWave: EffectFn = (pixel, t, p) => {
  const speedMul = 0.15 + p.speed * 0.4;
  const wavePos = (t * speedMul) % 1;
  const dist = Math.abs(pixel.nx - wavePos);
  const d = Math.min(dist, 1 - dist);
  const width = 0.08 + 0.18 * (1 - p.intensity);
  const inten = Math.max(0, 1 - d / width);
  const floor = 0.08 + 0.2 * (1 - p.intensity);
  const lvl = floor + (1 - floor) * inten;
  const c = activeColor(p, wavePos);
  return applyBrightness(c, lvl * p.brightness);
};

export const effectRainbow: EffectFn = (pixel, t, p) => {
  const speedMul = 0.05 + p.speed * 0.3;
  const hue = (pixel.nx + t * speedMul) % 1;
  const sat = 0.7 + 0.3 * p.intensity;
  return applyBrightness(hslToRgb(hue, sat, 0.5), p.brightness);
};

const LETTER_COLOR_HUES = [0.0, 0.1, 0.25, 0.55, 0.7, 0.85];
export const effectLetterColors: EffectFn = (pixel, t, p) => {
  const speedMul = 0.3 + p.speed * 1.5;
  let base: RGB;
  if (p.usePalette && p.paletteColors.length) {
    base = p.paletteColors[pixel.li % p.paletteColors.length];
  } else {
    const hue = LETTER_COLOR_HUES[pixel.li % LETTER_COLOR_HUES.length];
    base = hslToRgb(hue, 1, 0.5);
  }
  const breathe = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * speedMul + pixel.li));
  return applyBrightness(base, breathe * p.brightness);
};

// ── Registry ──────────────────────────────────────────────────────────────────

export const EFFECT_FNS: Record<string, EffectFn> = {
  solid:         effectSolid,
  breathe:       effectBreathe,
  pulse:         effectPulse,
  sparkle:       effectSparkle,
  wave:          effectWave,
  rainbow:       effectRainbow,
  letter_colors: effectLetterColors,
};

/** Resolve a show id to its effect function (falls back to solid). */
export function effectFor(showId: string): EffectFn {
  return EFFECT_FNS[showId] ?? effectSolid;
}
