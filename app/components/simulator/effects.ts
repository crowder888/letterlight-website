/**
 * effects.ts
 *
 * Each effect is a pure function:
 *   (pixel, t, params) → [r, g, b]   (values 0–255)
 *
 * pixel  — NormalizedPixel (nx, ny, li, gi)
 * t      — time in seconds (monotonically increasing)
 * params — EffectParams (color, speed, etc.)
 */

import type { NormalizedPixel } from "./pixelLayout";

export interface EffectParams {
  /** Primary color as [r, g, b] 0–255 */
  color: [number, number, number];
  /** Speed multiplier 0.25–4 */
  speed: number;
}

export type RGBTuple = [number, number, number];
export type EffectFn = (pixel: NormalizedPixel, t: number, params: EffectParams) => RGBTuple;

// ── Helpers ───────────────────────────────────────────────────────────────────

function hslToRgb(h: number, s: number, l: number): RGBTuple {
  // h in [0,1], s in [0,1], l in [0,1]
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
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

function clamp255(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// ── Effects ───────────────────────────────────────────────────────────────────

/**
 * Solid — every LED shows the chosen color at full brightness.
 */
export const effectSolid: EffectFn = (_pixel, _t, { color }) => {
  return [color[0], color[1], color[2]];
};

/**
 * Breathe — all LEDs pulse together, fading in/out slowly.
 */
export const effectBreathe: EffectFn = (_pixel, t, { color, speed }) => {
  // Sine wave: 0→1→0 over ~4 s base period
  const raw = Math.sin((t * speed * Math.PI) / 2);
  const brightness = 0.08 + 0.92 * Math.max(0, raw * raw); // keep a dim floor
  return [
    clamp255(color[0] * brightness),
    clamp255(color[1] * brightness),
    clamp255(color[2] * brightness),
  ];
};

/**
 * Sparkle — random LEDs briefly flash white against a dim base color.
 */
const sparkleState = new Float32Array(2000); // per-led flash timers

export const effectSparkle: EffectFn = (pixel, t, { color, speed }) => {
  const idx = pixel.gi;
  // Pseudo-random flash trigger based on gi and time bucket
  const bucket = Math.floor(t * speed * 8);
  const seed = (idx * 1664525 + bucket * 1013904223) & 0x7fffffff;
  const flashProb = 0.04; // ~4% chance per bucket

  let flash = 0;
  if ((seed / 0x7fffffff) < flashProb) {
    // Duration of flash = fraction of a speed-adjusted second
    const flashStart = bucket / (speed * 8);
    const elapsed = t - flashStart;
    flash = Math.max(0, 1 - elapsed * speed * 6);
  }

  // Also decay any stored state
  sparkleState[idx] = Math.max(sparkleState[idx] * 0.85, flash);

  const f = sparkleState[idx];
  return [
    clamp255(lerp(color[0] * 0.15, 255, f)),
    clamp255(lerp(color[1] * 0.15, 255, f)),
    clamp255(lerp(color[2] * 0.15, 255, f)),
  ];
};

/**
 * Rainbow — hue shifts across the sign horizontally over time.
 */
export const effectRainbow: EffectFn = (pixel, t, { speed }) => {
  // nx in [0,1] → hue offset; t scrolls the hue
  const hue = (pixel.nx + t * speed * 0.15) % 1;
  return hslToRgb(hue, 1, 0.5);
};

/**
 * Wave — a bright band sweeps left-to-right, repeating.
 * Uses the primary color tinted brighter at the wave peak.
 */
export const effectWave: EffectFn = (pixel, t, { color, speed }) => {
  // Wave position in [0, 1] — moves across the sign
  const wavePos = (t * speed * 0.25) % 1;
  const dist = Math.abs(pixel.nx - wavePos);
  // Wrap-around distance
  const d = Math.min(dist, 1 - dist);
  const width = 0.12;
  const intensity = Math.max(0, 1 - d / width);
  const brightness = 0.12 + 0.88 * intensity;
  return [
    clamp255(color[0] * brightness),
    clamp255(color[1] * brightness),
    clamp255(color[2] * brightness),
  ];
};

/**
 * LetterColors — each of the 6 letters gets its own hue, all breathing gently.
 * Ignores the primary color picker (always full-saturation).
 */
const LETTER_HUES = [0.0, 0.1, 0.25, 0.55, 0.7, 0.85]; // R, O, G, B, V, Mg

export const effectLetterColors: EffectFn = (pixel, t, { speed }) => {
  const hue = LETTER_HUES[pixel.li % LETTER_HUES.length];
  const breathe = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(t * speed * Math.PI * 0.5));
  return hslToRgb(hue, 1, breathe * 0.5);
};

// ── Registry ──────────────────────────────────────────────────────────────────

export interface EffectDef {
  id: string;
  label: string;
  fn: EffectFn;
  /** If true, the color picker has no effect */
  ignoresColor?: boolean;
}

export const EFFECTS: EffectDef[] = [
  { id: "solid",        label: "Solid",         fn: effectSolid },
  { id: "breathe",      label: "Breathe",        fn: effectBreathe },
  { id: "sparkle",      label: "Sparkle",        fn: effectSparkle },
  { id: "wave",         label: "Wave",           fn: effectWave },
  { id: "rainbow",      label: "Rainbow",        fn: effectRainbow, ignoresColor: true },
  { id: "lettercolors", label: "Letter Colors",  fn: effectLetterColors, ignoresColor: true },
];
