/**
 * Audio-reactive effects — stateful ports from
 * mrc-marquee-controller/shows.py classes EQBars, BeatStrobe, SpectrumWash.
 *
 * Real rig: each effect is fed live FFT bands + beat-detection events
 * from the DJ's microphone via beat.py.  No mic on the marketing site,
 * so we use the SAME synthetic-audio fallback the controller uses when
 * the mic is unavailable: sine-wave amplitude bands per letter, plus a
 * speed-driven fake-BPM beat clock.  The visualization math is
 * identical — only the input source differs.
 *
 * UI shows a note next to these effects explaining they react to a
 * microphone at the actual event.
 */

import type { StatefulEffect, EffectParams } from "./effects";
import { paramN, paramC } from "./effects";
import { PIXEL_LAYOUT, TOTAL_LEDS } from "./pixelLayout";
import type { RGB } from "./palettes";

const NUM_LETTERS = 6;

// Pre-bucket pixels by letter so each frame we don't re-filter the layout
const pixelsByLetter: Array<Array<{ gi: number; lny: number }>> =
  Array.from({ length: NUM_LETTERS }, () => []);
for (const p of PIXEL_LAYOUT) {
  pixelsByLetter[p.li].push({ gi: p.gi, lny: p.lny });
}

function clamp255(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}
function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

// ── Synthetic audio "bands" ───────────────────────────────────────────────
//
// These match the controller's `np.array(...)` fallbacks line-for-line.
// They produce slowly evolving 0..1 amplitudes per letter that read as
// "music" without requiring real audio.
function synthEqBands(t: number): Float32Array {
  const out = new Float32Array(NUM_LETTERS);
  for (let i = 0; i < NUM_LETTERS; i++) {
    out[i] = 0.4 + 0.5 * (Math.sin(t * (1.5 + i * 0.3) + i) * 0.5 + 0.5);
  }
  return out;
}

function synthSpectrumBands(t: number): Float32Array {
  const out = new Float32Array(NUM_LETTERS);
  for (let i = 0; i < NUM_LETTERS; i++) {
    out[i] = 0.4 + 0.5 * (Math.sin(t * (1.5 + i * 0.4) + i * 1.3) * 0.5 + 0.5);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────
// EQ Bars
// ─────────────────────────────────────────────────────────────────────────
const eqSmoothed = new Float32Array(NUM_LETTERS);
const eqPeaks = new Float32Array(NUM_LETTERS);
let eqLastTickTime = 0;

export const eqBarsEffect: StatefulEffect = {
  type: "stateful",
  reset() {
    eqSmoothed.fill(0);
    eqPeaks.fill(0);
    eqLastTickTime = 0;
  },
  step(buffer, t, _dt, params) {
    const smoothing = paramN(params, "smoothing", 30) / 100;
    const minFloor = paramN(params, "min_floor", 5) / 100;
    const peakHold = paramN(params, "peak_hold", 60) / 100;
    const peakColor = paramC(params, "peak_color", [255, 255, 255]);

    const bands = synthEqBands(t);

    // Asymmetric smoothing — higher smoothing slows attack and release
    const alphaUp = 0.7 - smoothing * 0.6;
    const alphaDown = 0.3 - smoothing * 0.25;
    for (let li = 0; li < NUM_LETTERS; li++) {
      const target = bands[li];
      const prev = eqSmoothed[li];
      const a = target > prev ? alphaUp : alphaDown;
      eqSmoothed[li] = prev * (1 - a) + target * a;
    }

    // Peaks: hold then slowly drift down
    eqLastTickTime = t;
    for (let li = 0; li < NUM_LETTERS; li++) {
      const newPeak = Math.max(eqPeaks[li] - 0.008, eqSmoothed[li]);
      eqPeaks[li] = Math.max(newPeak, eqSmoothed[li]);
    }

    const brightScale = 0.4 + 0.6 * params.intensity;
    const useP = params.usePalette && params.paletteColors.length >= 2;

    for (let li = 0; li < NUM_LETTERS; li++) {
      const level = clamp01(eqSmoothed[li]);
      const peak = peakHold > 0 ? clamp01(eqPeaks[li]) : -1;
      const baseC: RGB = useP
        ? params.paletteColors[li % params.paletteColors.length]
        : params.color;

      for (const px of pixelsByLetter[li]) {
        // Controller's local_y has 0=bottom, 1=top.  Our lny is top=0, bottom=1.
        // Flip so controller_y = 1 - lny.
        const cy = 1 - px.lny;
        let r: number, g: number, b: number;
        if (cy <= level) {
          // Inside the bar — slight gradient brighter at base
          const barBright = (1 - cy * 0.3) * brightScale * params.brightness;
          r = baseC[0] * barBright;
          g = baseC[1] * barBright;
          b = baseC[2] * barBright;
        } else if (peak >= 0 && Math.abs(cy - peak) < 0.04) {
          // Peak indicator cap
          const lvl = brightScale * params.brightness;
          r = peakColor[0] * lvl;
          g = peakColor[1] * lvl;
          b = peakColor[2] * lvl;
        } else {
          // Above the bar — dim floor in the same color
          const f = minFloor * brightScale * params.brightness;
          r = baseC[0] * f;
          g = baseC[1] * f;
          b = baseC[2] * f;
        }
        const off = px.gi * 3;
        buffer[off] = clamp255(r);
        buffer[off + 1] = clamp255(g);
        buffer[off + 2] = clamp255(b);
      }
    }
  },
};

// ─────────────────────────────────────────────────────────────────────────
// Beat Strobe
// ─────────────────────────────────────────────────────────────────────────
let bsFlashLevel = 0;
let bsNextFakeBeat = 0;
let bsActiveLetters: Set<number> | null = null;
let bsCycleIdx = 0;
let bsLastTickTime = 0;

export const beatStrobeEffect: StatefulEffect = {
  type: "stateful",
  reset() {
    bsFlashLevel = 0;
    bsNextFakeBeat = 0;
    bsActiveLetters = null;
    bsCycleIdx = 0;
    bsLastTickTime = 0;
  },
  step(buffer, t, _dt, params) {
    const flashLength = paramN(params, "flash_length", 30) / 100;
    const ambient = paramN(params, "ambient", 5) / 100;
    const scope = paramN(params, "scope", 0);
    const flashColor = paramC(params, "flash_color", [255, 255, 255]);

    // Synthetic beat: speed slider drives BPM 60..180
    const fakeBpm = 60 + params.speed * 120;
    const beatInterval = 60 / fakeBpm;
    if (bsNextFakeBeat === 0) bsNextFakeBeat = t + beatInterval;

    let newBeat = false;
    if (t >= bsNextFakeBeat) {
      newBeat = true;
      bsNextFakeBeat = t + beatInterval;
    }

    if (newBeat) {
      bsFlashLevel = 1;
      // Pick active letters per scope
      if (scope === 0) {
        bsActiveLetters = null; // all letters flash
      } else if (scope === 1) {
        bsActiveLetters = new Set([Math.floor(Math.random() * NUM_LETTERS)]);
      } else {
        bsActiveLetters = new Set([bsCycleIdx % NUM_LETTERS]);
        bsCycleIdx++;
      }
    }

    // Decay flash over fade_dur seconds (proportional to wall-clock dt)
    const fadeDur = 0.05 + flashLength * 0.5;
    const decayPerSec = 1 / Math.max(0.05, fadeDur);
    const dtForDecay = bsLastTickTime ? Math.min(0.1, t - bsLastTickTime) : 0;
    bsLastTickTime = t;
    bsFlashLevel = Math.max(0, bsFlashLevel - decayPerSec * dtForDecay);

    const bright = 0.5 + 0.5 * params.intensity;
    const useP = params.usePalette && params.paletteColors.length >= 2;

    for (let li = 0; li < NUM_LETTERS; li++) {
      const baseC: RGB = useP
        ? params.paletteColors[li % params.paletteColors.length]
        : params.color;
      const isFlashing = bsActiveLetters === null || bsActiveLetters.has(li);
      const level = isFlashing ? bsFlashLevel : 0;
      const r = (baseC[0] * ambient * bright + flashColor[0] * level * bright) * params.brightness;
      const g = (baseC[1] * ambient * bright + flashColor[1] * level * bright) * params.brightness;
      const b = (baseC[2] * ambient * bright + flashColor[2] * level * bright) * params.brightness;
      const finalR = clamp255(r);
      const finalG = clamp255(g);
      const finalB = clamp255(b);
      for (const px of pixelsByLetter[li]) {
        const off = px.gi * 3;
        buffer[off] = finalR;
        buffer[off + 1] = finalG;
        buffer[off + 2] = finalB;
      }
    }
  },
};

// ─────────────────────────────────────────────────────────────────────────
// Spectrum Wash
// ─────────────────────────────────────────────────────────────────────────
const swSmoothed = new Float32Array(NUM_LETTERS);

const SW_RAINBOW: RGB[] = [
  [255, 50, 50],
  [255, 140, 30],
  [255, 230, 60],
  [60, 220, 80],
  [60, 130, 255],
  [180, 80, 255],
];

export const spectrumWashEffect: StatefulEffect = {
  type: "stateful",
  reset() {
    swSmoothed.fill(0);
  },
  step(buffer, t, _dt, params) {
    const smoothing = paramN(params, "smoothing", 40) / 100;
    const minFloor = paramN(params, "min_floor", 10) / 100;
    const colorMode = paramN(params, "color_mode", 0);

    const bands = synthSpectrumBands(t);

    const alphaUp = 0.6 - smoothing * 0.5;
    const alphaDown = 0.2 - smoothing * 0.18;
    for (let li = 0; li < NUM_LETTERS; li++) {
      const target = bands[li];
      const prev = swSmoothed[li];
      const a = target > prev ? alphaUp : alphaDown;
      swSmoothed[li] = prev * (1 - a) + target * a;
    }

    const brightScale = (0.4 + 0.6 * params.intensity) * params.brightness;
    const useP = params.usePalette && params.paletteColors.length >= 2;

    for (let li = 0; li < NUM_LETTERS; li++) {
      const level = clamp01(swSmoothed[li]);
      const brightness = (minFloor + level * (1 - minFloor)) * brightScale;

      let baseC: RGB;
      if (colorMode === 0) {
        // Rainbow across letters
        const pos = (li / Math.max(1, NUM_LETTERS - 1)) * (SW_RAINBOW.length - 1);
        const lo = Math.floor(pos);
        const hi = Math.min(lo + 1, SW_RAINBOW.length - 1);
        const blend = pos - lo;
        const c0 = SW_RAINBOW[lo];
        const c1 = SW_RAINBOW[hi];
        baseC = [
          c0[0] * (1 - blend) + c1[0] * blend,
          c0[1] * (1 - blend) + c1[1] * blend,
          c0[2] * (1 - blend) + c1[2] * blend,
        ];
      } else if (colorMode === 1) {
        baseC = useP
          ? params.paletteColors[li % params.paletteColors.length]
          : params.color;
      } else {
        baseC = params.color;
      }

      const r = clamp255(baseC[0] * brightness);
      const g = clamp255(baseC[1] * brightness);
      const b = clamp255(baseC[2] * brightness);
      for (const px of pixelsByLetter[li]) {
        const off = px.gi * 3;
        buffer[off] = r;
        buffer[off + 1] = g;
        buffer[off + 2] = b;
      }
    }
  },
};

// reference suppress unused (TOTAL_LEDS is implicit via pixelsByLetter)
void TOTAL_LEDS;
void eqLastTickTime;
