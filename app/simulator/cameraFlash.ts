/**
 * Camera Flash — stateful effect ported from
 * mrc-marquee-controller/shows.py · class CameraFlash.
 *
 *   "Random letters flash brightly like camera flashes at a wedding.
 *    Underneath, the word has a low ambient glow."
 *
 * Per-letter floating "flash level" 0..1 that decays over time; bursts
 * are scheduled with Poisson timing so they feel naturally random.
 *
 * Per-show params:
 *   • flash_rate  — 0..100 % (controls average interval between bursts)
 *   • burst_size  — 1..4   (how many letters flash at once per burst)
 *   • fade_time   — 5..100 % (how long each flash takes to decay)
 *   • ambient     — 0..50  % (brightness of the constant base glow)
 *   • flash_color — RGB     (the flash bulb color, default white)
 */

import type { StatefulEffect, EffectParams } from "./effects";
import { paramN, paramC } from "./effects";
import { PIXEL_LAYOUT, TOTAL_LEDS } from "./pixelLayout";
import type { RGB } from "./palettes";

const NUM_LETTERS = 6;

// Pre-bucket pixels by letter for fast per-letter writes
const pixelsByLetter: number[][] = Array.from({ length: NUM_LETTERS }, () => []);
for (const p of PIXEL_LAYOUT) pixelsByLetter[p.li].push(p.gi);

// Per-letter flash level [0..1], decaying over time
const flashLevels = new Float32Array(NUM_LETTERS);
let nextFlashAt = 0;

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

/** Exponential-distribution random number with mean = `mean`. */
function expRand(mean: number): number {
  const u = Math.max(1e-9, Math.random());
  return -Math.log(u) * mean;
}

export const cameraFlashEffect: StatefulEffect = {
  type: "stateful",

  reset() {
    flashLevels.fill(0);
    nextFlashAt = 0;
  },

  step(buffer, t, dt, params) {
    const flashRate = paramN(params, "flash_rate", 50) / 100;
    const burstSize = Math.max(1, Math.min(4, paramN(params, "burst_size", 1)));
    const fadeTime = paramN(params, "fade_time", 30) / 100;
    const ambient = paramN(params, "ambient", 5) / 100;
    const flashColor = paramC(params, "flash_color", [255, 255, 255]);

    const bright = 0.5 + 0.5 * params.intensity;

    // Decay all flash levels — controller decays at 40fps, scale by dt
    const fadeDurSeconds = 0.1 + fadeTime * 1.5;
    const decayPerSec = 1 / Math.max(1, fadeDurSeconds);
    for (let i = 0; i < NUM_LETTERS; i++) {
      flashLevels[i] = Math.max(0, flashLevels[i] - decayPerSec * dt);
    }

    // Schedule the next burst (Poisson-like)
    const avgInterval = Math.max(
      0.05,
      (2.5 - params.speed * 2.0) / Math.max(0.05, flashRate),
    );
    if (nextFlashAt === 0) nextFlashAt = t + expRand(avgInterval);
    if (t >= nextFlashAt) {
      // Pick `burstSize` distinct letters to flash
      const indices = [0, 1, 2, 3, 4, 5];
      // Fisher-Yates shuffle
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      for (let i = 0; i < burstSize; i++) {
        flashLevels[indices[i]] = 1;
      }
      nextFlashAt = t + expRand(avgInterval);
    }

    // Render: each letter = ambient base + flash overlay
    const useP = params.usePalette && params.paletteColors.length >= 2;
    for (let li = 0; li < NUM_LETTERS; li++) {
      const baseC: RGB = useP
        ? params.paletteColors[li % params.paletteColors.length]
        : params.color;
      const lvl = flashLevels[li];
      const r = baseC[0] * ambient * bright + flashColor[0] * lvl * bright;
      const g = baseC[1] * ambient * bright + flashColor[1] * lvl * bright;
      const b = baseC[2] * ambient * bright + flashColor[2] * lvl * bright;
      const finalR = clamp255(r * params.brightness);
      const finalG = clamp255(g * params.brightness);
      const finalB = clamp255(b * params.brightness);

      for (const gi of pixelsByLetter[li]) {
        const off = gi * 3;
        buffer[off] = finalR;
        buffer[off + 1] = finalG;
        buffer[off + 2] = finalB;
      }
    }
  },
};

// `_` reference so eslint doesn't flag unused imports if shaken further
void TOTAL_LEDS;
void paletteSample;
