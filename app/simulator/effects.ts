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

import { TOTAL_LEDS, SIGN_ASPECT_RATIO, PERIMETER_BY_LETTER, type NormalizedPixel } from "./pixelLayout";
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

/**
 * Letter Chase — matches shows.py:LetterChase exactly.
 *
 *   "One letter at a time lights up bright, others stay dim or dark.
 *    Cycles through M → R → & → M → R → S → repeat."
 *
 * Per-show params:
 *   • dim_level       — 0..50  (% brightness of inactive letters)
 *   • fade            — 0..100 (smoothness of letter-to-letter transition)
 *   • direction       — 0=forward, 1=reverse, 2=ping-pong
 */
const NUM_LETTERS = 6;

export const effectLetterChase: EffectFn = (pixel, t, p) => {
  const dimLevel = paramN(p, "dim_level", 5) / 100;
  const fadeSmooth = paramN(p, "fade", 30) / 100;
  const direction = paramN(p, "direction", 0);
  const bright = 0.4 + 0.6 * p.intensity;

  const secondsPerLetter = Math.max(0.2, 2.0 - p.speed * 1.7);
  const cyclePos = t / secondsPerLetter;

  // Determine active letter based on direction
  let activeIdx: number;
  if (direction === 1) {
    activeIdx = Math.floor(NUM_LETTERS - 1 - (cyclePos % NUM_LETTERS));
  } else if (direction === 2) {
    const ping = NUM_LETTERS > 1
      ? cyclePos % (2 * (NUM_LETTERS - 1))
      : 0;
    activeIdx = ping < NUM_LETTERS
      ? Math.floor(ping)
      : Math.floor(2 * (NUM_LETTERS - 1) - ping);
  } else {
    activeIdx = Math.floor(cyclePos % NUM_LETTERS);
  }

  const sub = cyclePos - Math.floor(cyclePos);

  // Wrap-aware distance from this letter to the active letter
  const forwardDist = (pixel.li - activeIdx + NUM_LETTERS) % NUM_LETTERS;
  const reverseDist = (activeIdx - pixel.li + NUM_LETTERS) % NUM_LETTERS;
  const cycleDist = Math.min(forwardDist, reverseDist);

  let level: number;
  if (cycleDist === 0) {
    // Active letter — full bright, with smooth fade-in at start of step
    level = bright;
    if (fadeSmooth > 0 && sub < fadeSmooth) {
      const blend = sub / fadeSmooth;
      level = bright * (dimLevel + (1 - dimLevel) * blend);
    }
  } else if (cycleDist === 1 && fadeSmooth > 0 && sub > 1 - fadeSmooth) {
    // Next letter — fade in early
    const blend = (sub - (1 - fadeSmooth)) / fadeSmooth;
    level = bright * (dimLevel + (1 - dimLevel) * blend * 0.6);
  } else {
    // Other letters — dim
    level = bright * dimLevel;
  }

  // Color: palette mode picks one per letter; single mode = primary color
  const baseColor =
    p.usePalette && p.paletteColors.length >= 2
      ? p.paletteColors[pixel.li % p.paletteColors.length]
      : p.color;
  return applyBrightness(baseColor, level * p.brightness);
};

/**
 * Letter Swap — matches shows.py:LetterSwap exactly.
 *
 *   "Each letter holds a color from the palette.  Periodically all
 *    colors shift one position around (wrapping)."
 *
 * Per-show params:
 *   • fade_smooth — 0..100  (what fraction of each cycle is the cross-fade)
 *   • direction   — 0=forward (L→R), 1=reverse
 */
export const effectLetterSwap: EffectFn = (pixel, t, p) => {
  const fadeSmooth = paramN(p, "fade_smooth", 50) / 100;
  const direction = paramN(p, "direction", 0);
  const bright = 0.4 + 0.6 * p.intensity;

  const secondsPerShift = Math.max(0.3, 3.0 - p.speed * 2.5);
  const cyclePos = t / secondsPerShift;
  const shiftStep = Math.floor(cyclePos);
  const sub = cyclePos - shiftStep;

  // Source palette: active palette in palette mode, single color otherwise
  const colors: RGB[] =
    p.usePalette && p.paletteColors.length >= 2 ? p.paletteColors : [p.color];

  const dirSign = direction === 0 ? 1 : -1;

  // Current and next color slot for this letter
  const currentIdx = ((pixel.li - dirSign * shiftStep) % colors.length + colors.length) % colors.length;
  const nextIdx = ((pixel.li - dirSign * (shiftStep + 1)) % colors.length + colors.length) % colors.length;
  const currentC = colors[currentIdx];
  const nextC = colors[nextIdx];

  // Blend with smooth ease-in-out over the fade window
  let blend = 0;
  if (fadeSmooth > 0) {
    const fadeWindow = Math.max(0.05, fadeSmooth);
    if (sub >= 1 - fadeWindow) {
      const raw = (sub - (1 - fadeWindow)) / fadeWindow;
      blend = raw * raw * (3 - 2 * raw); // smoothstep
    }
  }

  const r = (currentC[0] * (1 - blend) + nextC[0] * blend) * bright * p.brightness;
  const g = (currentC[1] * (1 - blend) + nextC[1] * blend) * bright * p.brightness;
  const b = (currentC[2] * (1 - blend) + nextC[2] * blend) * bright * p.brightness;
  return [clamp255(r), clamp255(g), clamp255(b)];
};

/**
 * Fly In — matches shows.py:FlyIn exactly.
 *
 *   "Pixels stream in from one side and assemble the full word.
 *    Once fully revealed, holds briefly, then restarts."
 *
 * Per-show params:
 *   • hold_time  — 1..30 seconds to hold after the reveal completes
 *   • trail_len  — 5..80 % of axis (length of the bright comet trail)
 *   • direction  — 0 L→R, 1 R→L, 2 axis-Y first half, 3 axis-Y second half
 *   • sparkle    — 0..100 % chance of white sparkles near the leading edge
 *
 * Cycle tracking is stateless — we just modulo `t` by the cycle total.
 *
 * Coordinate note: the controller's coords flip Y (bottom=0, top=1).
 * Our pixel.ny is top=0/bottom=1.  The translation `1 - controller_y`
 * cancels out for direction 2 → positions = pixel.ny; direction 3 →
 * positions = 1 - pixel.ny.
 */
export const effectFlyIn: EffectFn = (pixel, t, p) => {
  const holdTime = paramN(p, "hold_time", 4);
  const trailLen = paramN(p, "trail_len", 30) / 100;
  const direction = paramN(p, "direction", 0);
  const sparkleDensity = paramN(p, "sparkle", 30) / 100;

  const revealTime = Math.max(0.5, 4.0 - p.speed * 3.0);
  const cycleTotal = revealTime + holdTime;
  const elapsed = t % cycleTotal;
  const waveProgress = elapsed < revealTime ? elapsed / revealTime : 1.0;

  // Per-pixel axis position (matches Python's `positions` array)
  let position: number;
  if (direction === 0)        position = pixel.nx;             // L → R
  else if (direction === 1)   position = 1 - pixel.nx;         // R → L
  else if (direction === 2)   position = pixel.ny;             // top first
  else                         position = 1 - pixel.ny;         // bottom first

  const wavefront = waveProgress * (1.0 + trailLen);
  const behind = wavefront - position;
  const bright = 0.5 + 0.5 * p.intensity;

  // Pixel color (palette gradient by position, or solid)
  const baseColor =
    p.usePalette && p.paletteColors.length >= 2
      ? paletteAt(p.paletteColors, position)
      : p.color;

  if (behind < 0) {
    return [0, 0, 0];
  }
  if (behind < trailLen) {
    // In the trail — bright leading edge fading back to base
    const trailPos = behind / trailLen; // 0=at front, 1=tail end
    const edgeGlow = (1 - trailPos) * (1 - trailPos);
    const lit = Math.min(1.5, bright + edgeGlow * 0.8);
    // Sparkle near the leading edge — deterministic per-pixel-per-frame
    if (trailPos < 0.3) {
      const frame = Math.floor(t * 30);
      const [r1] = frameRand(pixel.gi, frame);
      if (r1 < sparkleDensity * 0.4) {
        return [
          clamp255(255 * p.brightness),
          clamp255(255 * p.brightness),
          clamp255(255 * p.brightness),
        ];
      }
    }
    return applyBrightness(baseColor, lit * p.brightness);
  }
  // Fully revealed and held
  return applyBrightness(baseColor, bright * p.brightness);
};

/**
 * Reading — matches shows.py:Reading exactly.
 *
 *   "A bright spotlight slowly moves across the word like someone
 *    reading it.  The rest stays dimly glowing."
 *
 * Per-show params:
 *   • spotlight_width — 5..60 % width of the moving spotlight
 *   • ambient         — 0..50 % brightness of the rest of the sign
 *   • direction       — 0 L→R loop, 1 R→L loop, 2 ping-pong
 *   • spot_color      — the bright reading beam color (default white)
 */
export const effectReading: EffectFn = (pixel, t, p) => {
  const spotlightWidth = paramN(p, "spotlight_width", 18) / 100;
  const ambient = paramN(p, "ambient", 8) / 100;
  const direction = paramN(p, "direction", 0);
  const spotC = paramC(p, "spot_color", [255, 255, 255]);

  const sweepTime = Math.max(0.8, 8.0 - p.speed * 6.5);
  const sweepRange = 1.0 + 2 * spotlightWidth;
  const cyclePos = (t / sweepTime) % 1.0;

  let spotX: number;
  if (direction === 0) {
    spotX = -spotlightWidth + cyclePos * sweepRange;
  } else if (direction === 1) {
    spotX = (1.0 + spotlightWidth) - cyclePos * sweepRange;
  } else {
    const ping = (t / sweepTime) % 2.0;
    spotX = ping < 1.0
      ? -spotlightWidth + ping * sweepRange
      : (1.0 + spotlightWidth) - (ping - 1.0) * sweepRange;
  }

  const x = pixel.nx;
  const dist = Math.abs(x - spotX);
  const bright = 0.5 + 0.5 * p.intensity;

  // Base color (ambient layer)
  const baseColor =
    p.usePalette && p.paletteColors.length >= 2
      ? paletteAt(p.paletteColors, x)
      : p.color;

  if (dist < spotlightWidth) {
    // Inside the beam — smooth ease-out falloff from center
    let falloff = 1 - dist / spotlightWidth;
    falloff = falloff * falloff * (3 - 2 * falloff); // smoothstep
    const spotLit = falloff * bright;
    const blend = 1 - ambient * 0.5;
    const r = baseColor[0] * ambient * bright + spotC[0] * spotLit * blend;
    const g = baseColor[1] * ambient * bright + spotC[1] * spotLit * blend;
    const b = baseColor[2] * ambient * bright + spotC[2] * spotLit * blend;
    return [
      clamp255(r * p.brightness),
      clamp255(g * p.brightness),
      clamp255(b * p.brightness),
    ];
  }
  // Outside — ambient only
  const a = ambient * bright * p.brightness;
  return [
    clamp255(baseColor[0] * a),
    clamp255(baseColor[1] * a),
    clamp255(baseColor[2] * a),
  ];
};

/**
 * Strobe — matches shows.py:Strobe.
 *
 *   "Fast random flashes with background glow."
 *
 * Per-show params:
 *   • density   — 0..100 % (how many LEDs flash per frame)
 *   • bg_glow   — 0..100 % (constant base glow brightness)
 *   • bg_color  — RGB (the glow color)
 *
 * Like Sparkle, runs at fixed 30 Hz refresh independent of rAF.
 */
export const effectStrobe: EffectFn = (pixel, t, p) => {
  const density = paramN(p, "density", 50) / 100;
  const bgGlow = paramN(p, "bg_glow", 15) / 100;
  const bgColor = paramC(p, "bg_color", [255, 200, 140]);

  // Background glow base
  const baseLevel = bgGlow * 0.2 * p.intensity * p.brightness;

  // Per-frame seeded random — same approach as Sparkle
  const frame = Math.floor(t * 30);
  const [r1, r2] = frameRand(pixel.gi, frame);
  // Probability per pixel scales with density and speed
  const flashProb = (0.01 + density * 0.15) * Math.max(0.1, p.speed);

  if (r1 < flashProb) {
    // Strobe pop — palette mode picks a random palette color, single uses primary
    const c =
      p.usePalette && p.paletteColors.length >= 2
        ? p.paletteColors[Math.floor(r2 * p.paletteColors.length) % p.paletteColors.length]
        : p.color;
    const bright = (0.7 + 0.3 * p.intensity) * p.brightness;
    return applyBrightness(c, bright);
  }

  return applyBrightness(bgColor, baseLevel);
};

/**
 * Shockwave — matches shows.py:Shockwave.
 *
 *   "Expanding ring of light from the center of the letter."
 *
 * Bright ring sweeps outward from sign center, optional fading trail
 * behind it.  Aspect-ratio compensated so the ring stays circular on
 * the wide marquee canvas.
 *
 * Per-show params:
 *   • ring_width  — 5..100 % (thickness of the bright wavefront)
 *   • max_radius  — 20..100 % (how far the ring travels)
 *   • trail_fade  — 0..100 % (brightness of the trail behind the ring)
 *   • bg_glow     — 0..100 % background glow
 *   • bg_color    — RGB background color
 */
export const effectShockwave: EffectFn = (pixel, t, p) => {
  const ar = SIGN_ASPECT_RATIO;
  const scale = Math.max(1.0, (ar + 1.0) / 2.0);
  const ringW = (0.02 + (paramN(p, "ring_width", 35) / 100) * 0.15) * scale;
  const maxRadius = (paramN(p, "max_radius", 80) / 100) * scale;
  const trailFade = paramN(p, "trail_fade", 70) / 100;
  const bgGlow = paramN(p, "bg_glow", 0) / 100;
  const bgColor = paramC(p, "bg_color", [255, 200, 140]);

  const cycleTime = Math.max(0.5, 3.0 - p.speed * 2.5);
  const progress = (t % cycleTime) / cycleTime;
  const ringRadius = progress * maxRadius;

  // Aspect-compensated distance from center
  const dx = (pixel.nx - 0.5) * ar;
  const dy = pixel.ny - 0.5;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Pixel's color: palette samples by polar angle, single uses primary
  let c: RGB;
  if (p.usePalette && p.paletteColors.length >= 2) {
    const angle = (Math.atan2(dy, dx) / (2 * Math.PI) + 0.5) % 1;
    c = paletteAt(p.paletteColors, angle);
  } else {
    c = p.color;
  }

  // Bright ring at the wavefront
  const ringDist = Math.abs(dist - ringRadius);
  if (ringDist < ringW) {
    const alpha = (1 - ringDist / ringW) * p.intensity * p.brightness;
    return [clamp255(c[0] * alpha), clamp255(c[1] * alpha), clamp255(c[2] * alpha)];
  }

  // Trail behind the ring
  if (trailFade > 0 && dist < ringRadius) {
    const behind = (ringRadius - dist) / Math.max(0.01, ringRadius);
    const trailBright = (1 - behind) * trailFade * 0.3 * p.intensity * p.brightness;
    if (trailBright > 0.01) {
      return [clamp255(c[0] * trailBright), clamp255(c[1] * trailBright), clamp255(c[2] * trailBright)];
    }
  }

  // Background glow base
  if (bgGlow > 0) {
    const glow = bgGlow * 0.3 * p.intensity * p.brightness;
    return [clamp255(bgColor[0] * glow), clamp255(bgColor[1] * glow), clamp255(bgColor[2] * glow)];
  }
  return [0, 0, 0];
};

/**
 * Galaxy — matches shows.py:Galaxy.
 *
 *   "Rotating spiral galaxy arms emanating from the center."
 *
 * Per-show params:
 *   • arms       — 1..8 (number of spiral arms)
 *   • twist      — 10..100 (how tightly the arms curl)
 *   • core_glow  — 0..100 % brightness of the central glow
 *   • bg_glow    — 0..100 % background glow
 *   • bg_color   — RGB background color
 */
export const effectGalaxy: EffectFn = (pixel, t, p) => {
  const numArms = paramN(p, "arms", 3);
  const twist = 1.0 + (paramN(p, "twist", 50) / 100) * 6.0;
  const coreGlow = paramN(p, "core_glow", 50) / 100;
  const bgGlow = paramN(p, "bg_glow", 0) / 100;
  const bgColor = paramC(p, "bg_color", [255, 200, 140]);

  const ar = SIGN_ASPECT_RATIO;
  const distScale = 1.0 / Math.max(1.0, (ar + 1.0) / 2.0);
  const cx = 0.5, cy = 0.5;
  const rotation = t * (0.2 + p.speed * 0.8);
  const armWidth = 0.3 + 0.3 * p.intensity;
  const bright = 0.4 + 0.6 * p.intensity;

  // Aspect-compensated geometry
  const dx = (pixel.nx - cx) * ar;
  const dy = pixel.ny - cy;
  const dxs = dx * distScale;
  const dys = dy * distScale;
  const dist = Math.sqrt(dxs * dxs + dys * dys);
  const angle = Math.atan2(dy, dx);

  const spiralAngle = angle - dist * twist - rotation;
  const armPhase = ((spiralAngle * numArms) / (2 * Math.PI)) % 1;
  const armPhaseW = ((armPhase % 1) + 1) % 1;
  const armDist = 1.0 - Math.abs(armPhaseW - 0.5) * 2.0;

  let alpha = 0;
  if (armDist > 1.0 - armWidth) {
    alpha = (armDist - (1.0 - armWidth)) / armWidth;
  }
  const centerFade = Math.max(0, 1 - dist * 1.5);
  const pixelBright = alpha * centerFade * bright;

  // Pixel color: palette samples by dist (with slow drift); single uses primary
  let baseC: RGB;
  if (p.usePalette && p.paletteColors.length >= 2) {
    const palPos = (dist * 2.0 + t * 0.05) % 1;
    baseC = paletteAt(p.paletteColors, palPos);
  } else {
    baseC = p.color;
  }

  let r = baseC[0] * pixelBright;
  let g = baseC[1] * pixelBright;
  let b = baseC[2] * pixelBright;

  // Core glow added on top
  if (coreGlow > 0) {
    const coreRadius = 0.05 + coreGlow * 0.2;
    if (dist < coreRadius) {
      const coreAmt = (1 - dist / Math.max(0.001, coreRadius)) * coreGlow * 0.5 * p.intensity;
      r += coreAmt * 255;
      g += coreAmt * 200;
      b += coreAmt * 150;
    }
  }

  // Apply global brightness, then fall back to bg_glow if pixel is dark
  r *= p.brightness;
  g *= p.brightness;
  b *= p.brightness;
  if (r + g + b > 1) {
    return [clamp255(r), clamp255(g), clamp255(b)];
  }
  if (bgGlow > 0) {
    const glow = bgGlow * 0.3 * p.intensity * p.brightness;
    return [clamp255(bgColor[0] * glow), clamp255(bgColor[1] * glow), clamp255(bgColor[2] * glow)];
  }
  return [0, 0, 0];
};

/**
 * Circles — matches shows.py:Circles.
 *
 *   "Expanding concentric circles from the center."
 *
 * Per-show params:
 *   • ring_count — 1..12 (number of concentric rings)
 *   • thickness  — 10..100 % (how much of each ring is visible)
 *   • bg_glow    — 0..100 % background glow
 *   • bg_color   — RGB background color
 */
export const effectCircles: EffectFn = (pixel, t, p) => {
  const ringCount = paramN(p, "ring_count", 4);
  const thickness = paramN(p, "thickness", 50) / 100;
  const bgGlow = paramN(p, "bg_glow", 0) / 100;
  const bgColor = paramC(p, "bg_color", [255, 200, 140]);

  const ar = SIGN_ASPECT_RATIO;
  const ringSpeed = 0.2 + p.speed * 0.8;
  const bright = 0.4 + 0.6 * p.intensity;

  const dx = (pixel.nx - 0.5) * ar;
  const dy = pixel.ny - 0.5;
  const dist = Math.sqrt(dx * dx + dy * dy);

  const ringPhase = (dist * ringCount - t * ringSpeed) % 1.0;
  const phaseW = ((ringPhase % 1) + 1) % 1;
  let wave = (Math.sin(phaseW * 2 * Math.PI) + 1) / 2;
  wave = Math.max(0, (wave - (1 - thickness)) / thickness);

  // Background glow (always present as the floor)
  const bgLevel = bgGlow * 0.3 * p.intensity * p.brightness;
  const bgR = bgColor[0] * bgLevel;
  const bgG = bgColor[1] * bgLevel;
  const bgB = bgColor[2] * bgLevel;

  if (wave < 0.01) {
    return [clamp255(bgR), clamp255(bgG), clamp255(bgB)];
  }

  // Ring color: palette samples by dist (with slow time drift); single uses primary
  const c =
    p.usePalette && p.paletteColors.length >= 2
      ? paletteAt(p.paletteColors, (dist * 2 + t * 0.05) % 1)
      : p.color;
  const lvl = wave * bright * p.brightness;
  // Composite via max over background
  return [
    clamp255(Math.max(c[0] * lvl, bgR)),
    clamp255(Math.max(c[1] * lvl, bgG)),
    clamp255(Math.max(c[2] * lvl, bgB)),
  ];
};

/**
 * Marquee — matches shows.py:Marquee.
 *
 *   "Classic marquee — chasing lights around the perimeter with a
 *    different fill color on the interior.  Palette colors 1-2 do the
 *    chase (alternating per cycle); interior_color fills the inside."
 *
 * Perimeter ordering computed in pixelLayout.ts (boundary detection +
 * clockwise angular sort) since my regenerated pixel maps don't match
 * the controller's hand-traced perimeter JSONs.
 *
 * Per-show params:
 *   • chase_width   — 1..20 LEDs per chase segment
 *   • gap_width     — 1..20 LEDs per gap between chases
 *   • interior_glow — 0..100 % brightness of non-perimeter pixels
 *   • bg_color      — RGB color for the interior glow
 */
// Build a perimeter-position lookup so the per-pixel function can find
// each pixel's index along its letter's perimeter walk in O(1).
// Map: gi → { letterIdx, posInPerim, perimLen } (or null if interior)
type PerimSlot = { posInPerim: number; perimLen: number };
const PERIM_LOOKUP: (PerimSlot | null)[] = (() => {
  const map: (PerimSlot | null)[] = new Array(TOTAL_LEDS).fill(null);
  for (let li = 0; li < PERIMETER_BY_LETTER.length; li++) {
    const ring = PERIMETER_BY_LETTER[li];
    for (let pos = 0; pos < ring.length; pos++) {
      map[ring[pos]] = { posInPerim: pos, perimLen: ring.length };
    }
  }
  return map;
})();

export const effectMarquee: EffectFn = (pixel, t, p) => {
  const chaseWidth = Math.max(1, paramN(p, "chase_width", 5));
  const gapWidth = Math.max(1, paramN(p, "gap_width", 5));
  const interiorGlow = paramN(p, "interior_glow", 40) / 100;
  const interiorColor = paramC(p, "bg_color", [255, 200, 140]);

  const bright = 0.5 + 0.5 * p.intensity;
  const chaseSpeed = 2.0 + p.speed * 15.0;
  const offset = t * chaseSpeed;
  const cycleLen = chaseWidth + gapWidth;

  const slot = PERIM_LOOKUP[pixel.gi];

  if (!slot) {
    // Interior — gentle glow
    const glow = interiorGlow * bright * p.brightness;
    return [
      clamp255(interiorColor[0] * glow),
      clamp255(interiorColor[1] * glow),
      clamp255(interiorColor[2] * glow),
    ];
  }

  const pos = (slot.posInPerim + offset) % cycleLen;
  if (pos >= chaseWidth) return [0, 0, 0];

  // Pick color (alternates per cycle segment)
  let chase1: RGB;
  let chase2: RGB;
  if (p.usePalette && p.paletteColors.length >= 2) {
    chase1 = p.paletteColors[0];
    chase2 = p.paletteColors[1];
  } else {
    chase1 = p.color;
    chase2 = [
      Math.round(p.color[0] * 0.6),
      Math.round(p.color[1] * 0.6),
      Math.round(p.color[2] * 0.6),
    ];
  }
  const segment = Math.floor((slot.posInPerim + offset) / cycleLen);
  const c = segment % 2 === 0 ? chase1 : chase2;
  return applyBrightness(c, bright * p.brightness);
};

/**
 * Scanner — matches shows.py:Scanner.
 *
 *   "KITT/Cylon-style scanning bar that sweeps back and forth."
 *
 * Per-show params:
 *   • bar_width  — 5..100 % width of the bright bar
 *   • trail_len  — 0..100 % length of the dim trail behind the bar
 *   • bg_glow    — 0..100 % background glow brightness
 *   • bg_color   — RGB background color
 */
export const effectScanner: EffectFn = (pixel, t, p) => {
  const barWidth = 0.03 + (paramN(p, "bar_width", 30) / 100) * 0.2;
  const trailPct = paramN(p, "trail_len", 60) / 100;
  const bgGlow = paramN(p, "bg_glow", 0) / 100;
  const bgColor = paramC(p, "bg_color", [255, 200, 140]);

  const sweepSpeed = 0.2 + p.speed * 0.8;
  const phase = (t * sweepSpeed) % 2.0;
  const pos = phase < 1.0 ? phase : 2.0 - phase; // ping-pong
  const bright = 0.5 + 0.5 * p.intensity;

  const dist = Math.abs(pixel.nx - pos);

  // Pixel color (palette samples by global x)
  const c =
    p.usePalette && p.paletteColors.length >= 2
      ? paletteAt(p.paletteColors, pixel.nx)
      : p.color;

  if (dist < barWidth) {
    const alpha = (1 - dist / barWidth) * bright * p.brightness;
    return [clamp255(c[0] * alpha), clamp255(c[1] * alpha), clamp255(c[2] * alpha)];
  }

  // Trail behind the bar (symmetric in front + behind for ping-pong feel)
  if (trailPct > 0) {
    const trailWidth = barWidth + trailPct * 0.3;
    if (dist < trailWidth) {
      let trailAlpha = 1 - (dist - barWidth) / (trailWidth - barWidth);
      trailAlpha = trailAlpha * trailAlpha * bright * 0.4 * p.brightness;
      return [clamp255(c[0] * trailAlpha), clamp255(c[1] * trailAlpha), clamp255(c[2] * trailAlpha)];
    }
  }

  // Background glow
  if (bgGlow > 0) {
    const glow = bgGlow * 0.3 * p.intensity * p.brightness;
    return [clamp255(bgColor[0] * glow), clamp255(bgColor[1] * glow), clamp255(bgColor[2] * glow)];
  }
  return [0, 0, 0];
};

/**
 * Spirals — matches shows.py:Spirals.
 *
 *   "Rotating spiral bands that wrap across the letter shape."
 *
 * Per-show params:
 *   • band_count — 1..10  (number of spiral bands)
 *   • twist      — 0..100 (how much the bands diagonal-shift across Y)
 *   • thickness  — 10..100 (how much of each sine band is visible)
 */
export const effectSpirals: EffectFn = (pixel, t, p) => {
  const rotationSpeed = 0.2 + p.speed * 1.5;
  const spiralCount = paramN(p, "band_count", 4);
  const twistFactor = paramN(p, "twist", 50) / 100;
  const thickness = (paramN(p, "thickness", 50) / 100) * 0.6 + 0.1;
  const bright = 0.4 + 0.6 * p.intensity;

  // Match controller's coord convention (bottom=0, top=1).  My ny is top=0 → flip.
  const x = pixel.nx;
  const y = 1 - pixel.ny;

  const band =
    (x * spiralCount + y * spiralCount * twistFactor * 1.4 + t * rotationSpeed) % 1.0;
  const bandW = ((band % 1) + 1) % 1;
  const wave = (Math.sin(bandW * 2 * Math.PI) + 1) / 2;
  const alpha = Math.max(0, Math.min(1, (wave - (1 - thickness)) / thickness));

  const c =
    p.usePalette && p.paletteColors.length >= 2
      ? paletteAt(p.paletteColors, bandW)
      : p.color;
  const lvl = alpha * bright * p.brightness;
  return [clamp255(c[0] * lvl), clamp255(c[1] * lvl), clamp255(c[2] * lvl)];
};

/**
 * Color Wash — matches shows.py:ColorWash.
 *
 *   "Smooth palette cycling with horizontal and vertical fades."
 *
 * Whole sign cycles through a palette (or hue-shifts a single color)
 * over time, with optional darker edges and a bottom-heavy bias.
 *
 * Per-show params:
 *   • edge_fade     — 0..100 (0 = uniform, 100 = heavy edge darkening)
 *   • vertical_bias — 0..100 (0 = uniform, 100 = top fades to dark)
 */
function rgbToHsv(rgb: RGB): [number, number, number] {
  const r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const v = max;
  const d = max - min;
  const s = max === 0 ? 0 : d / max;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return [h, s, v];
}

function hsvToRgb(h: number, s: number, v: number): RGB {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const pp = v * (1 - s);
  const q = v * (1 - f * s);
  const tt = v * (1 - (1 - f) * s);
  let r = 0, g = 0, b = 0;
  switch (i % 6) {
    case 0: r = v;  g = tt; b = pp; break;
    case 1: r = q;  g = v;  b = pp; break;
    case 2: r = pp; g = v;  b = tt; break;
    case 3: r = pp; g = q;  b = v;  break;
    case 4: r = tt; g = pp; b = v;  break;
    case 5: r = v;  g = pp; b = q;  break;
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

export const effectColorWash: EffectFn = (pixel, t, p) => {
  const cycleSpeed = 0.1 + p.speed * 0.5;
  const bright = 0.3 + 0.7 * p.intensity;
  const edgeFade = (paramN(p, "edge_fade", 50) / 100) * 2;
  const vBias = paramN(p, "vertical_bias", 50) / 100;

  const x = pixel.nx;
  // Match controller's bottom=0/top=1 convention: their y = 1 - my_ny
  const ctrlY = 1 - pixel.ny;

  const hFade = 1 - Math.abs(x - 0.5) * edgeFade;
  const vFade = 1 - vBias * ctrlY;
  const fade = Math.max(0, Math.min(1, hFade * Math.max(0, vFade)));

  if (p.usePalette && p.paletteColors.length >= 2) {
    const pos = (t * cycleSpeed) % 1.0;
    const c = paletteAt(p.paletteColors, pos);
    const lvl = fade * bright * p.brightness;
    return [clamp255(c[0] * lvl), clamp255(c[1] * lvl), clamp255(c[2] * lvl)];
  }

  // Single color: gentle hue oscillation (controller uses HSV here)
  const shift = Math.sin(t * cycleSpeed * 2 * Math.PI) * 0.1;
  const [h, s, v] = rgbToHsv(p.color);
  const newRgb = hsvToRgb((h + shift + 1) % 1, s, v * fade * bright * p.brightness);
  return newRgb;
};

/**
 * Curtain — matches shows.py:Curtain.
 *
 *   "Color reveal that opens/closes like a curtain from the edges."
 *
 * Sign reveals from the center outward (or closes from edges inward),
 * with a draped "swag" shape — bottom of the curtain is more revealed
 * than the top, like real fabric drapery.
 *
 * Per-show params:
 *   • swag      — 0..100 % how much the bottom hangs lower (drape effect)
 *   • edge_soft — 10..100 (1 = sharp curtain edge, 100 = soft fade)
 */
export const effectCurtain: EffectFn = (pixel, t, p) => {
  const swagAmount = (paramN(p, "swag", 40) / 100) * 0.4;
  const edgeSharpness = 1 + (paramN(p, "edge_soft", 50) / 100) * 9.0;
  const bright = 0.4 + 0.6 * p.intensity;

  const cycleTime = Math.max(1.0, 4.0 - p.speed * 3.0);
  const progress = (t % cycleTime) / cycleTime;
  const reveal = progress < 0.5 ? progress * 2.0 : 2.0 - progress * 2.0;

  const x = pixel.nx;
  // Controller uses (1 - y)² where y is bottom=0/top=1.  Our ny is top=0/bottom=1.
  // So (1 - ctrl_y)² = (1 - (1 - ny))² = ny².  More swag at the bottom of letters.
  const yForSwag = pixel.ny;

  const distFromCenter = Math.abs(x - 0.5) * 2;
  const swagOffset = swagAmount * yForSwag * yForSwag;
  const threshold = reveal + swagOffset;

  if (distFromCenter >= threshold) return [0, 0, 0];

  const alpha = Math.min(1, (threshold - distFromCenter) * edgeSharpness);
  const c =
    p.usePalette && p.paletteColors.length >= 2
      ? paletteAt(p.paletteColors, (x + t * 0.05) % 1)
      : p.color;
  const lvl = alpha * bright * p.brightness;
  return [clamp255(c[0] * lvl), clamp255(c[1] * lvl), clamp255(c[2] * lvl)];
};

/**
 * Butterfly — matches shows.py:Butterfly.
 *
 *   "10 styles of mathematical patterns and plasma effects mapped
 *    through rainbow or palette colors." (xLights port)
 *
 * Per-show params:
 *   • style  — 1..10 (Style 1: classic butterfly wings; 2: pulsing
 *              rings; 3: sinusoidal grid; 4: wrapping butterfly;
 *              5: scaled-frequency butterfly; 6–10: plasma variants)
 *   • chunks — 1..10 (banding/posterization)
 *   • skip   — 2..10 (which chunk levels are dimmed to black)
 *
 * The controller maps normalized 0–1 coords onto a virtual 10–50 grid;
 * we use 20×20 for a nicer LED-density feel.
 */
const BFLY_BUF_W = 20;
const BFLY_BUF_H = 20;

export const effectButterfly: EffectFn = (pixel, t, p) => {
  const style = paramN(p, "style", 1);
  const chunks = Math.max(1, paramN(p, "chunks", 1));
  const skip = Math.max(2, paramN(p, "skip", 2));

  const bflySpeed = p.speed * 100;
  const curState = Math.floor(t * 40 * bflySpeed * 25 / 50);
  const offset = curState / 200;
  const PI2 = Math.PI * 2;
  const sz = BFLY_BUF_H + BFLY_BUF_W;

  // Match controller's bottom=0/top=1 convention so the pattern reads
  // the same way as on the rig
  const x = pixel.nx * BFLY_BUF_W;
  const y = (1 - pixel.ny) * BFLY_BUF_H;

  let h = 0;
  if (style === 1) {
    const x2 = x * x;
    const y2 = y * y;
    const nn = Math.abs((x2 - y2) * Math.sin(offset + (x + y) * PI2 / sz));
    const d = x2 + y2;
    h = d > 0.001 ? Math.min(1, nn / d) : 0;
  } else if (style === 2) {
    const maxFrame = BFLY_BUF_H * 2;
    const frame = (BFLY_BUF_H * Math.floor(curState / 200)) % maxFrame;
    const f = frame < BFLY_BUF_H ? frame + 1 : maxFrame - frame;
    const x1 = (x - BFLY_BUF_W / 2) / Math.max(0.1, f);
    const y1 = (y - BFLY_BUF_H / 2) / Math.max(0.1, f);
    h = Math.sqrt(x1 * x1 + y1 * y1) % 1;
  } else if (style === 3) {
    const maxFrame = BFLY_BUF_H * 2;
    const frame = (BFLY_BUF_H * Math.floor(curState / 200)) % maxFrame;
    let f = frame < maxFrame / 2 ? frame + 1 : maxFrame - frame;
    f = f * 0.1 + BFLY_BUF_H / 60;
    const x1 = (x - BFLY_BUF_W / 2) / Math.max(0.1, f);
    const y1 = (y - BFLY_BUF_H / 2) / Math.max(0.1, f);
    h = (Math.sin(x1) * Math.cos(y1) + 1) / 2;
  } else if (style === 4) {
    const nn = (x * x - y * y) * Math.sin(offset + (x + y) * PI2 / sz);
    const d = x * x + y * y;
    let raw = d > 0.001 ? nn / d : 0;
    raw = raw - Math.floor(raw);
    if (raw < 0) raw = 1 + raw;
    h = raw;
  } else if (style === 5) {
    const nn = Math.abs((x * x - y * y) * Math.sin(offset + (x + y) * PI2 / Math.max(1, BFLY_BUF_H * BFLY_BUF_W)));
    const d = x * x + y * y;
    h = d > 0.001 ? Math.min(1, nn / d) : 0;
  } else {
    // Plasma styles 6–10
    const speedPlasma = (101 - bflySpeed) * (style === 10 ? 3 : 5);
    const time = (t * 40 + 1) / Math.max(0.1, speedPlasma);
    const rx = x / BFLY_BUF_W - 0.5;
    const ry = y / BFLY_BUF_H - 0.5;

    let v = Math.sin(rx * 10 + time);
    v += Math.sin(10 * (rx * Math.sin(time / 2) + ry * Math.cos(time / 3)) + time);
    const cx = rx + 0.5 * Math.sin(time / 5);
    const cy = ry + 0.5 * Math.cos(time / 3);
    v += Math.sin(Math.sqrt(100 * (cx * cx + cy * cy) + 1 + time));
    v += Math.sin(rx + time);
    v += Math.sin((ry + time) / 2);
    v += Math.sin((rx + ry + time) / 2);
    v += Math.sin(Math.sqrt(rx * rx + ry * ry + 1) + time);
    v = v / 2;
    h = (Math.sin(v * chunks * Math.PI) + 1) / 2;
  }

  // Chunks/skip posterization filter
  if (chunks > 1 && Math.floor(h * chunks) % skip === 0) return [0, 0, 0];

  // Color mapping
  if (p.usePalette && p.paletteColors.length >= 2) {
    const c = paletteAt(p.paletteColors, h);
    return [
      clamp255(c[0] * p.brightness),
      clamp255(c[1] * p.brightness),
      clamp255(c[2] * p.brightness),
    ];
  }
  // Single color: modulate brightness by h
  return applyBrightness(p.color, h * p.brightness);
};

// ── Registry ──────────────────────────────────────────────────────────────────

import { fireworksEffect } from "./fireworks";
import { cameraFlashEffect } from "./cameraFlash";
import { fairyDustEffect } from "./fairyDust";
import { snowflakesEffect } from "./snowflakes";
import { meteorsEffect } from "./meteors";
import { fireEffect } from "./fire";
import { shapeEffect } from "./shape";
import { candleEffect } from "./candle";
import { eqBarsEffect, beatStrobeEffect, spectrumWashEffect } from "./audioReactive";

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
  letter_chase:  effectLetterChase,
  letter_swap:   effectLetterSwap,
  fly_in:        effectFlyIn,
  reading:       effectReading,
  heartbeat:     effectHeartbeat,
  strobe:        effectStrobe,
  shockwave:     effectShockwave,
  galaxy:        effectGalaxy,
  circles:       effectCircles,
  marquee:       effectMarquee,
  scanner:       effectScanner,
  spirals:       effectSpirals,
  color_wash:    effectColorWash,
  curtain:       effectCurtain,
  butterfly:     effectButterfly,
};

const STATEFUL_EFFECTS: Record<string, StatefulEffect> = {
  fireworks_xl:  fireworksEffect,
  camera_flash:  cameraFlashEffect,
  fairy_dust:    fairyDustEffect,
  snowflakes:    snowflakesEffect,
  meteors:       meteorsEffect,
  fire:          fireEffect,
  shape:         shapeEffect,
  candle_xl:     candleEffect,
  eq_bars:       eqBarsEffect,
  beat_strobe:   beatStrobeEffect,
  spectrum_wash: spectrumWashEffect,
};

/** Resolve a show id to its full effect (pixel or stateful). */
export function effectFor(showId: string): Effect {
  if (STATEFUL_EFFECTS[showId]) return STATEFUL_EFFECTS[showId];
  const fn = PIXEL_EFFECTS[showId] ?? effectSolid;
  return { type: "pixel", fn };
}

/** Backward-compat — kept so callers that only need the pixel-fn flavor work. */
export const EFFECT_FNS = PIXEL_EFFECTS;
