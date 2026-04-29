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

import { TOTAL_LEDS, SIGN_ASPECT_RATIO, type NormalizedPixel } from "./pixelLayout";
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
  /** Per-show custom params (matches shows.py PARAMS for the active show) */
  showParams: Record<string, number | RGB>;
}

/** Read a numeric show param with fallback. */
export function paramN(p: EffectParams, key: string, fallback: number): number {
  const v = p.showParams[key];
  return typeof v === "number" ? v : fallback;
}

/** Read a color show param with fallback. */
export function paramC(p: EffectParams, key: string, fallback: RGB): RGB {
  const v = p.showParams[key];
  return Array.isArray(v) ? (v as RGB) : fallback;
}

export type EffectFn = (pixel: NormalizedPixel, t: number, params: EffectParams) => RGB;

/**
 * Stateful effects (fireworks, meteors, fire, etc.) need to maintain
 * cross-frame state (particles, trails) and read/write the whole pixel
 * buffer at once.
 *
 * `step` mutates `buffer` in place — buffer is a Float32Array of length
 * TOTAL_LEDS · 3 holding RGB triples [0..255] for each LED.  `t` is
 * elapsed seconds since the page loaded; `dt` is seconds since last frame
 * (capped at ~0.1s by the canvas).
 *
 * `reset` is called when the user switches TO this effect, so any
 * leftover state from the last activation is cleared.
 */
export interface StatefulEffect {
  type: "stateful";
  reset: () => void;
  step: (
    buffer: Float32Array,
    t: number,
    dt: number,
    params: EffectParams
  ) => void;
}

export interface PixelEffect {
  type: "pixel";
  fn: EffectFn;
}

export type Effect = PixelEffect | StatefulEffect;

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

/**
 * Pulse — matches shows.py:Pulse exactly.
 *   freq = 0.3 + speed·2.7
 *   wave = (sin(2π·t·freq) + 1)/2
 *   low  = 1 - intensity·0.8         (low intensity → tiny dynamic range)
 *   bright = low + wave·(1-low)
 *   Palette: gradient across the sign drifting at 0.1·(0.5+speed)
 */
export const effectPulse: EffectFn = (pixel, t, p) => {
  const freq = 0.3 + p.speed * 2.7;
  const wave = (Math.sin(t * freq * 2 * Math.PI) + 1) / 2;
  const low = 1.0 - p.intensity * 0.8;
  const bright = low + wave * (1 - low);

  if (p.usePalette && p.paletteColors.length >= 2) {
    const shift = t * 0.1 * (0.5 + p.speed);
    const pos = (pixel.gi / TOTAL_LEDS + shift) % 1;
    return applyBrightness(paletteAt(p.paletteColors, pos), bright * p.brightness);
  }
  return applyBrightness(p.color, bright * p.brightness);
};

/**
 * Sparkle — matches the operator controller's Sparkle show
 * (mrc-marquee-controller/shows.py · class Sparkle).
 *
 *   • Base layer: every LED at ~15–40% of the chosen color
 *   • Each "render frame" (~30/sec) a fraction of LEDs flash brighter:
 *       count   = TOTAL_LEDS * (0.005 + speed * 0.04)
 *       bright  = (0.7 + 0.3·rand) * (0.5 + 0.5·intensity) * 1.3
 *   • Sparkles inherit the chosen color (or a random palette pick) —
 *     they are NOT pure white.
 *   • No fade trail — each sparkle exists for one frame only.
 *
 * We run the sparkle refresh at 30 Hz independent of actual rAF rate so
 * the visual cadence matches the e131 update rate of the live rig.
 */
const SPARKLE_FPS = 30;

// Cheap per-pixel per-frame deterministic random.  Two independent draws
// from one seed give us "is this pixel a sparkle?" + "how bright?".
function frameRand(gi: number, frame: number): [number, number] {
  let s = (gi * 2654435761 + frame * 1597) >>> 0;
  s ^= s << 13; s >>>= 0;
  s ^= s >>> 17;
  s ^= s << 5;  s >>>= 0;
  const r1 = (s & 0xffff) / 0xffff;
  s = (s * 48271) >>> 0;
  const r2 = (s & 0xffff) / 0xffff;
  return [r1, r2];
}

export const effectSparkle: EffectFn = (pixel, t, p) => {
  const frame = Math.floor(t * SPARKLE_FPS);
  const [r1, r2] = frameRand(pixel.gi, frame);
  const sparkleProb = 0.005 + p.speed * 0.04;
  const isSparkle = r1 < sparkleProb;

  const baseLevel = (0.15 + 0.25 * p.intensity) * p.brightness;

  if (!isSparkle) {
    // Base layer — palette gradient across the sign, or solid single color
    const baseColor =
      p.usePalette && p.paletteColors.length >= 2
        ? paletteAt(p.paletteColors, pixel.gi / TOTAL_LEDS)
        : p.color;
    return applyBrightness(baseColor, baseLevel);
  }

  // Sparkle — brighter punch on the same color (or random palette pick)
  const sparkleBright = (0.7 + 0.3 * r2) * (0.5 + 0.5 * p.intensity) * 1.3;
  const sparkleColor =
    p.usePalette && p.paletteColors.length >= 2
      ? p.paletteColors[Math.floor(r2 * p.paletteColors.length) % p.paletteColors.length]
      : p.color;
  return applyBrightness(sparkleColor, sparkleBright * p.brightness);
};

/**
 * Wave — matches the operator controller's Wave show
 * (mrc-marquee-controller/shows.py · class Wave).
 *
 *   "Gentle sine wave of brightness rolling bottom-to-top across the shape."
 *
 *   • Direction: bottom → top (uses Y coord, flipped so bottom=0 top=1)
 *   • Multiple wave peaks visible at once (1.5 + 2·intensity cycles)
 *   • Continuous sine wave of brightness, not a single moving band
 *   • Palette mode: colors flow vertically with the wave too
 */
export const effectWave: EffectFn = (pixel, t, p) => {
  // Controller's coords system has Y=0 at bottom, Y=1 at top.
  // Our pixel.ny is Y=0 at top — flip it.
  const spatial = 1 - pixel.ny;

  const waveSpeed = 0.3 + p.speed * 2.0;
  const waveCount = 1.5 + p.intensity * 2.0;
  const phase = spatial * waveCount * 2 * Math.PI - t * waveSpeed * 2 * Math.PI;
  const wave = (Math.sin(phase) + 1) / 2;
  const base = 0.15 + 0.15 * p.intensity;
  const depth = 0.7 * p.intensity;
  const bright = base + wave * depth;

  if (p.usePalette && p.paletteColors.length >= 2) {
    const pos = (spatial + t * 0.05) % 1.0;
    const c = paletteAt(p.paletteColors, pos);
    return applyBrightness(c, bright * p.brightness);
  }
  return applyBrightness(p.color, bright * p.brightness);
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

/**
 * Twinkle — matches shows.py:Twinkle exactly.
 *   "Soft random fading like fairy lights."
 *
 * Each LED has a fixed random phase φᵢ and breathes independently:
 *   wave   = (sin(t·rate + φᵢ) + 1)/2     where rate = 0.5 + 3·speed
 *   bright = (0.15 + 0.2·intensity) + wave · 0.6·intensity
 *   Palette: each LED's color picked by its phase value (so colors
 *            are stable across time, only brightness twinkles)
 *
 * The Python uses np.random for phases; we use a deterministic hash of
 * pixel.gi so phases stay stable across frames (and across reloads).
 */
function pixelPhase(gi: number): number {
  // Deterministic 32-bit hash → [0, 2π)
  let s = (gi * 2654435761) >>> 0;
  s ^= s << 13; s >>>= 0;
  s ^= s >>> 17;
  s ^= s << 5;  s >>>= 0;
  return ((s & 0xffffff) / 0xffffff) * 2 * Math.PI;
}

export const effectTwinkle: EffectFn = (pixel, t, p) => {
  const phi = pixelPhase(pixel.gi);
  const rate = 0.5 + p.speed * 3.0;
  const wave = (Math.sin(t * rate + phi) + 1) / 2;
  const base = 0.15 + 0.2 * p.intensity;
  const depth = 0.6 * p.intensity;
  const bright = base + wave * depth;

  if (p.usePalette && p.paletteColors.length >= 2) {
    const c = paletteAt(p.paletteColors, phi / (2 * Math.PI));
    return applyBrightness(c, bright * p.brightness);
  }
  return applyBrightness(p.color, bright * p.brightness);
};

/**
 * Gradient — matches shows.py:Gradient exactly.
 *   "Smooth color blend that slowly shifts and breathes."
 *
 *   global breathe over the whole sign:
 *     low=0.4+0.2·intensity, high=0.7+0.3·intensity
 *   horizontal palette drift at speed t·(0.02 + speed·0.08)
 *   In single-color mode there's a soft secondary sin-modulation across X.
 */
export const effectGradient: EffectFn = (pixel, t, p) => {
  const breatheRate = 0.15 + p.speed * 0.4;
  const breathe = (Math.sin(t * breatheRate * 2 * Math.PI) + 1) / 2;
  const low = 0.4 + 0.2 * p.intensity;
  const high = 0.7 + 0.3 * p.intensity;
  const globalBright = low + breathe * (high - low);
  const shift = t * (0.02 + p.speed * 0.08);
  const spatial = pixel.nx;

  if (p.usePalette && p.paletteColors.length >= 2) {
    const pos = (spatial + shift) % 1.0;
    return applyBrightness(paletteAt(p.paletteColors, pos), globalBright * p.brightness);
  }
  // Single-color: add a soft sin-shaped modulation across X
  const pos = (spatial + shift) % 1.0;
  const localMod = 0.6 + 0.4 * ((Math.sin(pos * 2 * Math.PI) + 1) / 2);
  return applyBrightness(p.color, globalBright * localMod * p.brightness);
};

/**
 * Shimmer — matches shows.py:Shimmer exactly.
 *   "Subtle fast micro-sparkles — like sequin fabric catching light."
 *
 *   Base layer at 0.3 + 0.3·intensity of color (palette gradient or solid),
 *   each frame ~(0.01 + speed·0.06) of LEDs get boosted by 1 + rand·0.6·intensity.
 *
 * Like Sparkle, runs at 30 Hz refresh rate independent of rAF.
 */
const SHIMMER_FPS = 30;
export const effectShimmer: EffectFn = (pixel, t, p) => {
  const baseBright = (0.3 + 0.3 * p.intensity) * p.brightness;
  // Base layer
  const baseColor =
    p.usePalette && p.paletteColors.length >= 2
      ? paletteAt(p.paletteColors, pixel.gi / TOTAL_LEDS)
      : p.color;

  const frame = Math.floor(t * SHIMMER_FPS);
  const [r1, r2] = frameRand(pixel.gi, frame);
  const density = 0.01 + p.speed * 0.06;
  const isBoost = r1 < density;

  const out: RGB = [
    baseColor[0] * baseBright,
    baseColor[1] * baseBright,
    baseColor[2] * baseBright,
  ];
  if (isBoost) {
    const boost = 1.0 + r2 * 0.6 * p.intensity;
    out[0] *= boost;
    out[1] *= boost;
    out[2] *= boost;
  }
  return [clamp255(out[0]), clamp255(out[1]), clamp255(out[2])];
};

/**
 * Heartbeat — matches shows.py:Heartbeat exactly.
 *   "Double-pulse lub-dub that fills the whole letter — perfect for weddings."
 *
 *   cycle = max(0.6, 1.5 - 0.9·speed) seconds
 *   Within each cycle (phase ∈ [0,1)):
 *     0.00–0.15 → lub:  pulse = sin(p·π)²
 *     0.15–0.20 → small hold at 0.1
 *     0.20–0.35 → dub:  pulse = sin(p·π)² · 0.7
 *     0.35–1.00 → dark
 *   Pulse expands as a circle from center (0.5, 0.5) with radius
 *   pulse·(0.05 + 0.95·pulse_spread)·scale, with aspect-ratio compensation
 *   so the ripple stays circular across the ~4.6:1 sign.
 *
 * pulse_spread defaults to 50 (controller's default).
 */
export const effectHeartbeat: EffectFn = (pixel, t, p) => {
  // Per-effect param: pulse_spread is 0..100 in the controller schema
  const PULSE_SPREAD = paramN(p, "pulse_spread", 50) / 100;
  const cycle = Math.max(0.6, 1.5 - p.speed * 0.9);
  const phase = (t % cycle) / cycle;

  let pulse = 0;
  if (phase < 0.15) {
    const pp = phase / 0.15;
    pulse = Math.sin(pp * Math.PI) ** 2;
  } else if (phase < 0.2) {
    pulse = 0.1;
  } else if (phase < 0.35) {
    const pp = (phase - 0.2) / 0.15;
    pulse = Math.sin(pp * Math.PI) ** 2 * 0.7;
  }

  const baseBright = 0.05 * p.intensity;
  const pulseBright = pulse * (0.5 + 0.5 * p.intensity);

  // Aspect compensation: keep the pulse a circle, scale to cover canvas
  const ar = SIGN_ASPECT_RATIO;
  const scale = Math.max(1.0, (ar + 1.0) / 2.0);
  const dx = (pixel.nx - 0.5) * ar;
  const dy = pixel.ny - 0.5;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const spreadRadius = pulse * (0.05 + PULSE_SPREAD * 0.95) * scale;

  let local: number;
  if (spreadRadius > 0.01 && dist < spreadRadius) {
    local = pulseBright * (1.0 - (dist / spreadRadius) * 0.5);
  } else {
    local = baseBright;
  }

  // Color: palette mode samples by distance-from-center, single uses the color
  let baseColor: RGB;
  if (p.usePalette && p.paletteColors.length >= 2) {
    const palPos = Math.min(1, dist / Math.max(0.01, spreadRadius));
    baseColor = paletteAt(p.paletteColors, palPos);
  } else {
    baseColor = p.color;
  }
  return applyBrightness(baseColor, local * p.brightness);
};

// ── Registry ──────────────────────────────────────────────────────────────────

import { fireworksEffect } from "./fireworks";

const PIXEL_EFFECTS: Record<string, EffectFn> = {
  solid:         effectSolid,
  breathe:       effectBreathe,
  pulse:         effectPulse,
  sparkle:       effectSparkle,
  twinkle:       effectTwinkle,
  shimmer:       effectShimmer,
  wave:          effectWave,
  gradient:      effectGradient,
  rainbow:       effectRainbow,
  letter_colors: effectLetterColors,
  heartbeat:     effectHeartbeat,
};

const STATEFUL_EFFECTS: Record<string, StatefulEffect> = {
  fireworks_xl: fireworksEffect,
};

/** Resolve a show id to its full effect (pixel or stateful). */
export function effectFor(showId: string): Effect {
  if (STATEFUL_EFFECTS[showId]) return STATEFUL_EFFECTS[showId];
  const fn = PIXEL_EFFECTS[showId] ?? effectSolid;
  return { type: "pixel", fn };
}

/** Backward-compat — kept so callers that only need the pixel-fn flavor work. */
export const EFFECT_FNS = PIXEL_EFFECTS;
