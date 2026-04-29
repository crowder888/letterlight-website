/**
 * Shape — stateful effect ported from
 * mrc-marquee-controller/shows.py · class ShapeEffect.
 *
 *   "Multiple geometric shapes with growth, movement, fade, rotation,
 *    and palette color cycling." (xLights port)
 *
 * Shape types (param `shape_type` 0..7):
 *   0 = Circle     1 = Square     2 = Triangle
 *   3 = Star       4 = Pentagon   5 = Hexagon
 *   6 = Heart      7 = Snowflake
 *
 * Each shape has cx/cy in normalized [0,1] global coords, an age, a
 * lifetime, rotation, spin, drift velocity, and a palette color.  At
 * birth/respawn we randomize position and re-pick a palette color so
 * the active palette is sampled across all shapes over time.
 *
 * Aspect-ratio compensation: distance is computed in physical-space
 * coords (x scaled by SIGN_ASPECT_RATIO) so shapes stay round across
 * the wide marquee.
 */

import type { StatefulEffect, EffectParams } from "./effects";
import { paramN, paramC } from "./effects";
import { PIXEL_LAYOUT, TOTAL_LEDS, SIGN_ASPECT_RATIO } from "./pixelLayout";
import type { RGB } from "./palettes";

interface Shape {
  cx: number;
  cy: number;
  age: number;
  lifetime: number;
  startSize: number;
  rotation: number;
  spin: number;
  vx: number;
  vy: number;
  color: RGB;
}

const PHYSICS_FPS = 40;
const PHYSICS_DT = 1 / PHYSICS_FPS;

let shapes: Shape[] = [];
let colorIdx = 0;
let simTime = 0;

function clamp255(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** Signed distance to shape boundary (≤0 = inside). */
function shapeDistance(shape: number, sx: number, sy: number): number {
  if (shape === 0) return Math.sqrt(sx * sx + sy * sy) - 1.0; // Circle
  if (shape === 1) return Math.max(Math.abs(sx), Math.abs(sy)) - 1.0; // Square
  if (shape === 2 || shape === 4 || shape === 5) {
    // Regular polygon: triangle (3), pentagon (5), hexagon (6)
    const sides = shape === 2 ? 3 : shape === 4 ? 5 : 6;
    const offset = shape === 2 ? Math.PI / 2 : shape === 4 ? Math.PI / 2 : 0;
    const angle = Math.atan2(sy, sx);
    const sector = (2 * Math.PI) / sides;
    const r = Math.sqrt(sx * sx + sy * sy);
    const theta = ((angle - offset) % sector) - sector / 2;
    const polyR = Math.cos(sector / 2) / Math.max(0.001, Math.cos(theta));
    return r - polyR;
  }
  if (shape === 3) {
    // Star (5-point)
    const points = 5;
    const angle = Math.atan2(sy, sx);
    const r = Math.sqrt(sx * sx + sy * sy);
    const sector = (2 * Math.PI) / points;
    const theta = (angle % sector) - sector / 2;
    const inner = 0.4;
    const starR = inner + (1 - inner) * Math.abs(Math.cos((theta * points) / 2));
    return r - starR;
  }
  if (shape === 6) {
    // Heart curve: (x² + y² - 1)³ - x²y³ < 0 inside
    const sy2 = sy - 0.3;
    return Math.pow(sx * sx + sy2 * sy2 - 1.0, 3) - sx * sx * sy2 * sy2 * sy2;
  }
  if (shape === 7) {
    // 6-arm snowflake
    const angle = Math.atan2(sy, sx);
    const r = Math.sqrt(sx * sx + sy * sy);
    const armAngle = (angle % (Math.PI / 3)) - Math.PI / 6;
    const armDist = Math.abs(armAngle) * r * 3;
    return Math.max(armDist - 0.15, r - 1.0);
  }
  return 0;
}

function makeShape(palette: RGB[] | null, fallback: RGB, lifetime: number, ar: number): Shape {
  let sc: RGB;
  if (palette && palette.length >= 2) {
    colorIdx = (colorIdx + 1) % palette.length;
    sc = palette[colorIdx];
  } else {
    sc = fallback;
  }
  return {
    cx: rand(0.05, 0.95),
    cy: rand(0.15, 0.85),
    age: rand(0, lifetime),
    lifetime: lifetime * rand(0.6, 1.4),
    startSize: 0.02 + Math.random() * 0.05,
    rotation: rand(0, 2 * Math.PI),
    spin: rand(-1, 1) * 0.5,
    vx: rand(-0.01, 0.01) / ar,
    vy: rand(-0.01, 0.01),
    color: sc,
  };
}

export const shapeEffect: StatefulEffect = {
  type: "stateful",

  reset() {
    shapes = [];
    colorIdx = 0;
    simTime = 0;
  },

  step(buffer, t, _dt, params) {
    const shapeType = paramN(params, "shape_type", 0);
    const count = Math.max(1, paramN(params, "count", 5));
    const growthRate = paramN(params, "growth", 50) / 100;
    const thickness = paramN(params, "thickness", 50) / 100;
    const bgGlow = paramN(params, "bg_glow", 0) / 100;
    const bgColor = paramC(params, "bg_color", [255, 200, 140]);

    const ar = SIGN_ASPECT_RATIO;
    const lifetime = 3.0 + (1.0 - params.speed) * 5.0;
    const bright = 0.5 + 0.5 * params.intensity;
    const palette = params.usePalette && params.paletteColors.length >= 2
      ? params.paletteColors
      : null;

    // ── Background base ───────────────────────────────────────────────
    if (bgGlow > 0) {
      const glow = bgGlow * 0.75 * params.intensity * params.brightness;
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

    // ── Top up / trim shape pool ──────────────────────────────────────
    if (shapes.length > count) shapes.length = count;
    while (shapes.length < count) {
      shapes.push(makeShape(palette, params.color, lifetime, ar));
    }

    // ── Physics ticks at 40 Hz ────────────────────────────────────────
    if (simTime === 0) simTime = t;
    let safety = 6;
    while (simTime + PHYSICS_DT <= t && safety-- > 0) {
      simTime += PHYSICS_DT;
      for (const s of shapes) {
        s.age += PHYSICS_DT;
        s.cx += s.vx;
        s.cy += s.vy;
        s.rotation += s.spin * PHYSICS_DT;
        if (s.age > s.lifetime) {
          // Respawn — pick next palette color and randomize
          const next = makeShape(palette, params.color, lifetime, ar);
          Object.assign(s, next);
          s.age = 0;
        }
      }
    }

    // ── Render shapes (one pass per shape, hit-test all pixels) ──────
    for (const s of shapes) {
      const progress = s.age / s.lifetime;
      const size = s.startSize + growthRate * 0.4 * progress;
      if (size < 0.005) continue;
      const fade = Math.max(0, 1 - progress);
      const alpha = fade * bright;
      const cosR = Math.cos(s.rotation);
      const sinR = Math.sin(s.rotation);
      const sc = s.color;
      const scx = s.cx * ar;
      // Convert center Y to our coord system (controller bottom=0/top=1, ours top=0/bottom=1)
      const scy = 1 - s.cy;
      const invSize = 1 / Math.max(0.001, size);
      const fillAmount = thickness;
      const border = 0.05 + thickness * 0.4;

      for (const px of PIXEL_LAYOUT) {
        const phx = px.nx * ar;
        const phy = px.ny;
        const dx = phx - scx;
        const dy = phy - scy;
        // Quick bbox reject (rotation-aware bbox is up to ~1.5 in each axis)
        if (Math.abs(dx) > size * 1.6 || Math.abs(dy) > size * 1.6) continue;

        const rx = (dx * cosR - dy * sinR) * invSize;
        const ry = (dx * sinR + dy * cosR) * invSize;
        if (Math.abs(rx) >= 1.5 || Math.abs(ry) >= 1.5) continue;

        const dist = shapeDistance(shapeType, rx, ry);
        if (dist > border * 0.5) continue;

        let edge: number;
        if (dist < 0) {
          const innerDist = -dist;
          if (fillAmount < 0.99) {
            const maxFill = border * (0.3 + fillAmount * 5.0);
            if (innerDist > maxFill) continue;
            edge = maxFill > 0.001 ? Math.max(0, 1 - innerDist / maxFill) : 1;
          } else {
            edge = 1;
          }
        } else {
          edge = Math.max(0, 1 - dist / (border * 0.5));
        }

        const pixelAlpha = edge * alpha * params.brightness;
        if (pixelAlpha < 0.01) continue;

        const off = px.gi * 3;
        const newR = sc[0] * pixelAlpha;
        const newG = sc[1] * pixelAlpha;
        const newB = sc[2] * pixelAlpha;
        if (newR > buffer[off]) buffer[off] = clamp255(newR);
        if (newG > buffer[off + 1]) buffer[off + 1] = clamp255(newG);
        if (newB > buffer[off + 2]) buffer[off + 2] = clamp255(newB);
      }
    }
  },
};
