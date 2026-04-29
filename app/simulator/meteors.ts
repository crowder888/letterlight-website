/**
 * Meteors — stateful effect ported from
 * mrc-marquee-controller/shows.py · class Meteors.
 *
 *   "Streaks with explicit tails, swirl, direction control, and
 *    per-pixel color variation."
 *
 * Per-show params:
 *   • direction  — 0 Down, 1 Up, 2 Left, 3 Right, 4 Implode, 5 Explode
 *   • trail_len  — 5..100 % (length of the comet tail)
 *   • swirl      — 0..100 % (lateral wiggle along the trail)
 *   • bg_glow    — 0..100 % background glow
 *   • bg_color   — RGB background color
 *
 * Coordinate convention: simulation runs in physical-space coordinates
 * (x scaled by aspect ratio) so meteors stay on consistent angles
 * across the wide marquee canvas.
 *
 * Y direction matches the controller (bottom=0/top=1 → "Down" means
 * decreasing y).  Our pixel.ny is top=0/bottom=1, so we flip.
 */

import type { StatefulEffect, EffectParams } from "./effects";
import { paramN, paramC } from "./effects";
import { PIXEL_LAYOUT, TOTAL_LEDS, SIGN_ASPECT_RATIO } from "./pixelLayout";
import type { RGB } from "./palettes";

interface Meteor {
  x: number;       // 0..1
  y: number;       // 1=top, 0=bottom (Python convention)
  dx: number;
  dy: number;
  colorIdx: number;
  swirlPhase: number;
}

const PHYSICS_FPS = 40;
const PHYSICS_DT = 1 / PHYSICS_FPS;
const LATERAL_THRESHOLD = 0.05;

let meteors: Meteor[] = [];
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

function spawnMeteor(direction: number, speedMul: number, ar: number): Meteor {
  const m: Meteor = {
    x: 0, y: 0, dx: 0, dy: 0,
    colorIdx: Math.random(),
    swirlPhase: Math.random() * 100,
  };
  if (direction === 0) {           // Down
    m.x = Math.random(); m.y = 1.1; m.dy = -speedMul;
  } else if (direction === 1) {    // Up
    m.x = Math.random(); m.y = -0.1; m.dy = speedMul;
  } else if (direction === 2) {    // Left
    m.x = 1 + 0.1 / ar; m.y = Math.random(); m.dx = -speedMul / ar;
  } else if (direction === 3) {    // Right
    m.x = -0.1 / ar; m.y = Math.random(); m.dx = speedMul / ar;
  } else if (direction === 4) {    // Implode
    const angle = Math.random() * 2 * Math.PI;
    const spawnPhys = Math.max(0.8, ar / 2 + 0.2);
    m.x = 0.5 + Math.cos(angle) * spawnPhys / ar;
    m.y = 0.5 + Math.sin(angle) * spawnPhys;
    m.dx = -Math.cos(angle) * speedMul / ar;
    m.dy = -Math.sin(angle) * speedMul;
  } else {                          // Explode
    const angle = Math.random() * 2 * Math.PI;
    m.x = 0.5; m.y = 0.5;
    m.dx = Math.cos(angle) * speedMul / ar;
    m.dy = Math.sin(angle) * speedMul;
  }
  return m;
}

export const meteorsEffect: StatefulEffect = {
  type: "stateful",

  reset() {
    meteors = [];
    simTime = 0;
  },

  step(buffer, t, _dt, params) {
    const direction = paramN(params, "direction", 0);
    const trailPct = paramN(params, "trail_len", 40) / 100;
    const swirlAmt = paramN(params, "swirl", 20) / 100;
    const bgGlow = paramN(params, "bg_glow", 0) / 100;
    const bgColor = paramC(params, "bg_color", [255, 200, 140]);

    const ar = SIGN_ASPECT_RATIO;
    const useP = params.usePalette && params.paletteColors.length >= 2;

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

    // ── Physics ticks at 40 Hz ────────────────────────────────────────
    const meteorSpeed = 0.005 + params.speed * 0.025;
    const tailLen = Math.max(0.02, trailPct * 0.5);

    if (simTime === 0) simTime = t;
    let safety = 8;
    while (simTime + PHYSICS_DT <= t && safety-- > 0) {
      simTime += PHYSICS_DT;

      // Cap depending on direction (horizontal needs more for wide canvas)
      let count = Math.max(3, Math.floor(5 + params.intensity * 25));
      if (direction === 2 || direction === 3) {
        count = Math.max(3, Math.floor(count * Math.max(1.0, ar / 2.0)));
      }

      // Spawn
      let spawnChance = (0.05 + params.speed * 0.15) * Math.max(1.0, ar / 2.0);
      while (Math.random() < spawnChance && meteors.length < count) {
        spawnChance -= 0.1;
        meteors.push(spawnMeteor(direction, meteorSpeed, ar));
      }

      // Update + cull
      const survivors: Meteor[] = [];
      for (const m of meteors) {
        m.x += m.dx;
        m.y += m.dy;
        if (direction === 4) {
          // Implode: remove near center
          const phx = (m.x - 0.5) * ar;
          const phy = m.y - 0.5;
          if (Math.sqrt(phx * phx + phy * phy) < 0.03) continue;
        } else if (m.x < -0.3 || m.x > 1.3 || m.y < -0.3 || m.y > 1.3) {
          continue;
        }
        survivors.push(m);
      }
      meteors = survivors;
    }

    // ── Render meteors with tails ─────────────────────────────────────
    for (const m of meteors) {
      const meteorColor = useP
        ? paletteSample(params.paletteColors, m.colorIdx)
        : params.color;

      // Physical-space velocity (matches controller)
      const phvx = m.dx * ar;
      const phvy = m.dy;
      const moveLen = Math.sqrt(phvx * phvx + phvy * phvy);
      if (moveLen < 1e-4) continue;

      const tailDx = -phvx / moveLen;
      const tailDy = -phvy / moveLen;
      // Meteor head in our coord system (flip Y from controller convention)
      const mhx = m.x * ar;
      const mhy = 1 - m.y; // flip

      for (const px of PIXEL_LAYOUT) {
        const phx = px.nx * ar;
        const phy = px.ny;
        let hx = phx - mhx;
        let hy = phy - mhy;
        let along = hx * tailDx + hy * (-tailDy); // negate dy because Y is flipped

        // Quick reject before swirl
        if (along < -0.02 || along >= tailLen) continue;

        let lateral: number;
        if (swirlAmt > 0) {
          const swirlOffset = swirlAmt * 0.08 * Math.sin(along * 30 + m.swirlPhase);
          // perp_x = -tail_dy (in physical space), perp_y = tail_dx
          // (signs flipped to match our Y orientation)
          const perpX = tailDy;
          const perpY = tailDx;
          hx = phx - swirlOffset * perpX - mhx;
          hy = phy - swirlOffset * perpY - mhy;
          along = hx * tailDx + hy * (-tailDy);
          if (along < -0.02 || along >= tailLen) continue;
          lateral = Math.abs(hx * tailDy + hy * tailDx);
        } else {
          lateral = Math.abs(hx * tailDy + hy * tailDx);
        }
        if (lateral >= LATERAL_THRESHOLD) continue;

        const tailFrac = Math.max(0, along / tailLen);
        const bright =
          (1 - tailFrac) *
          params.intensity *
          (1 - lateral / LATERAL_THRESHOLD) *
          params.brightness;
        if (bright < 0.01) continue;

        const off = px.gi * 3;
        const newR = meteorColor[0] * bright;
        const newG = meteorColor[1] * bright;
        const newB = meteorColor[2] * bright;
        if (newR > buffer[off]) buffer[off] = clamp255(newR);
        if (newG > buffer[off + 1]) buffer[off + 1] = clamp255(newG);
        if (newB > buffer[off + 2]) buffer[off + 2] = clamp255(newB);
      }
    }
  },
};
