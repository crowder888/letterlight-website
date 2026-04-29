"use client";

/**
 * ColorWheel — modal HSV color picker, ported from
 * mrc-marquee-controller/static/colorwheel.js.
 *
 *   • Outer hue ring (red at 12 o'clock, clockwise)
 *   • Inner saturation/value square
 *   • Brightness slider below
 *   • Live preview swatch up top
 *   • Confirm / Cancel buttons
 *
 * Touch-first; works fine with mouse too.  When the user drags either
 * the wheel/square or the slider, `onPreview` fires (throttled) so the
 * caller can show the color update on the LEDs in real time without
 * waiting for the Confirm tap.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import type { RGB } from "../palettes";

interface Props {
  initial: RGB;
  open: boolean;
  /** Called with the final color when user taps Confirm */
  onConfirm: (rgb: RGB) => void;
  onCancel: () => void;
  /** Optional: throttled callback while user is dragging */
  onPreview?: (rgb: RGB) => void;
}

const SIZE = 240;
const CENTER = SIZE / 2;
const OUTER_R = SIZE / 2 - 4;
const RING_W = 28;
const INNER_R = OUTER_R - RING_W;
const SQ_SIZE = INNER_R * 1.3;
const SQ_HALF = SQ_SIZE / 2;
const SQ_LEFT = CENTER - SQ_HALF;
const SQ_TOP = CENTER - SQ_HALF;

const BR_W = 240;
const BR_H = 36;

function hsvToRgb(h: number, s: number, v: number): RGB {
  let r = 0, g = 0, b = 0;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const tt = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: r = v; g = tt; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = tt; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = tt; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  let h = 0;
  const v = max;
  const d = max - min;
  const s = max === 0 ? 0 : d / max;
  if (max !== min) {
    if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h /= 6;
  }
  return [h, s, v];
}

export default function ColorWheel({ initial, open, onConfirm, onCancel, onPreview }: Props) {
  const [hue, setHue] = useState(0);
  const [sat, setSat] = useState(1);
  const [val, setVal] = useState(1);
  const [dragging, setDragging] = useState<"ring" | "square" | "bright" | null>(null);

  const wheelRef = useRef<HTMLCanvasElement>(null);
  const brightRef = useRef<HTMLCanvasElement>(null);
  const previewTimerRef = useRef<number | null>(null);

  // Set initial HSV when modal opens
  useEffect(() => {
    if (open) {
      const [h, s, v] = rgbToHsv(initial[0], initial[1], initial[2]);
      setHue(h);
      setSat(s);
      setVal(v);
    }
  }, [open, initial]);

  // Throttled preview while dragging
  const schedulePreview = useCallback((rgb: RGB) => {
    if (!onPreview) return;
    if (previewTimerRef.current !== null) return;
    previewTimerRef.current = window.setTimeout(() => {
      previewTimerRef.current = null;
      onPreview(rgb);
    }, 80);
  }, [onPreview]);

  // Draw the hue ring + sat/val square
  useEffect(() => {
    const canvas = wheelRef.current;
    if (!canvas || !open) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, SIZE, SIZE);

    // Hue ring
    for (let angle = 0; angle < 360; angle += 1) {
      const a1 = ((angle - 90) * Math.PI) / 180;
      const a2 = ((angle - 88) * Math.PI) / 180;
      const rgb = hsvToRgb(angle / 360, 1, 1);
      ctx.beginPath();
      ctx.arc(CENTER, CENTER, OUTER_R - RING_W / 2, a1, a2);
      ctx.lineWidth = RING_W;
      ctx.strokeStyle = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
      ctx.stroke();
    }

    // Hue indicator on the ring
    const hueAngle = hue * 2 * Math.PI - Math.PI / 2;
    const hx = CENTER + Math.cos(hueAngle) * (OUTER_R - RING_W / 2);
    const hy = CENTER + Math.sin(hueAngle) * (OUTER_R - RING_W / 2);
    ctx.beginPath();
    ctx.arc(hx, hy, RING_W / 2 + 2, 0, Math.PI * 2);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Sat/val square
    const sqSize = Math.floor(SQ_SIZE);
    const img = ctx.createImageData(sqSize, sqSize);
    for (let y = 0; y < sqSize; y++) {
      for (let x = 0; x < sqSize; x++) {
        const s = x / sqSize;
        const v = 1 - y / sqSize;
        const rgb = hsvToRgb(hue, s, v);
        const idx = (y * sqSize + x) * 4;
        img.data[idx] = rgb[0];
        img.data[idx + 1] = rgb[1];
        img.data[idx + 2] = rgb[2];
        img.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, Math.floor(SQ_LEFT), Math.floor(SQ_TOP));

    // Square border
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1;
    ctx.strokeRect(SQ_LEFT, SQ_TOP, SQ_SIZE, SQ_SIZE);

    // Sat/val indicator
    const sx = SQ_LEFT + sat * SQ_SIZE;
    const sy = SQ_TOP + (1 - val) * SQ_SIZE;
    ctx.beginPath();
    ctx.arc(sx, sy, 8, 0, Math.PI * 2);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(sx, sy, 6, 0, Math.PI * 2);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1;
    ctx.stroke();
  }, [hue, sat, val, open]);

  // Draw the brightness slider
  useEffect(() => {
    const canvas = brightRef.current;
    if (!canvas || !open) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, BR_W, BR_H);

    const fullRgb = hsvToRgb(hue, sat, 1);
    const grad = ctx.createLinearGradient(0, 0, BR_W, 0);
    grad.addColorStop(0, "rgb(0,0,0)");
    grad.addColorStop(1, `rgb(${fullRgb[0]},${fullRgb[1]},${fullRgb[2]})`);
    ctx.fillStyle = grad;
    if (typeof (ctx as CanvasRenderingContext2D & { roundRect?: unknown }).roundRect === "function") {
      ctx.beginPath();
      (ctx as unknown as { roundRect: (x: number, y: number, w: number, h: number, r: number) => void }).roundRect(0, 4, BR_W, BR_H - 8, 8);
      ctx.fill();
    } else {
      ctx.fillRect(0, 4, BR_W, BR_H - 8);
    }

    // Thumb
    const tx = val * BR_W;
    ctx.beginPath();
    ctx.arc(tx, BR_H / 2, 14, 0, Math.PI * 2);
    ctx.fillStyle = `rgb(${fullRgb[0]},${fullRgb[1]},${fullRgb[2]})`;
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.stroke();
  }, [hue, sat, val, open]);

  function getPos(canvas: HTMLCanvasElement, e: PointerEvent | React.PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ("clientX" in e ? e.clientX : 0) - rect.left,
      y: ("clientY" in e ? e.clientY : 0) - rect.top,
    };
  }

  function handleWheelDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const canvas = wheelRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    const pos = getPos(canvas, e);
    const dx = pos.x - CENTER;
    const dy = pos.y - CENTER;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > INNER_R && dist < OUTER_R + 5) {
      setDragging("ring");
      handleWheelMove(e, "ring");
    } else if (
      pos.x >= SQ_LEFT && pos.x <= SQ_LEFT + SQ_SIZE &&
      pos.y >= SQ_TOP  && pos.y <= SQ_TOP + SQ_SIZE
    ) {
      setDragging("square");
      handleWheelMove(e, "square");
    }
  }

  function handleWheelMove(e: React.PointerEvent<HTMLCanvasElement>, mode: "ring" | "square" | null = dragging) {
    if (!mode) return;
    const canvas = wheelRef.current;
    if (!canvas) return;
    const pos = getPos(canvas, e);
    if (mode === "ring") {
      const angle = Math.atan2(pos.y - CENTER, pos.x - CENTER);
      const newHue = ((angle + Math.PI / 2) / (2 * Math.PI) + 1) % 1;
      setHue(newHue);
      schedulePreview(hsvToRgb(newHue, sat, val));
    } else if (mode === "square") {
      const newSat = Math.max(0, Math.min(1, (pos.x - SQ_LEFT) / SQ_SIZE));
      const newVal = Math.max(0, Math.min(1, 1 - (pos.y - SQ_TOP) / SQ_SIZE));
      setSat(newSat);
      setVal(newVal);
      schedulePreview(hsvToRgb(hue, newSat, newVal));
    }
  }

  function handleBrightDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const canvas = brightRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    setDragging("bright");
    handleBrightMove(e);
  }

  function handleBrightMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = brightRef.current;
    if (!canvas) return;
    const pos = getPos(canvas, e);
    const newVal = Math.max(0, Math.min(1, pos.x / BR_W));
    setVal(newVal);
    schedulePreview(hsvToRgb(hue, sat, newVal));
  }

  if (!open) return null;

  const previewRgb = hsvToRgb(hue, sat, val);

  return (
    <div
      className="ll-cw-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="ll-cw-popup">
        <div
          className="ll-cw-preview"
          style={{ background: `rgb(${previewRgb[0]},${previewRgb[1]},${previewRgb[2]})` }}
        />
        <canvas
          ref={wheelRef}
          width={SIZE}
          height={SIZE}
          className="ll-cw-wheel"
          onPointerDown={handleWheelDown}
          onPointerMove={(e) => dragging === "ring" || dragging === "square" ? handleWheelMove(e) : null}
          onPointerUp={() => setDragging(null)}
          onPointerCancel={() => setDragging(null)}
        />
        <canvas
          ref={brightRef}
          width={BR_W}
          height={BR_H}
          className="ll-cw-brightness"
          onPointerDown={handleBrightDown}
          onPointerMove={(e) => dragging === "bright" ? handleBrightMove(e) : null}
          onPointerUp={() => setDragging(null)}
          onPointerCancel={() => setDragging(null)}
        />
        <div className="ll-cw-actions">
          <button
            type="button"
            className="ll-action-btn"
            onClick={() => onConfirm(hsvToRgb(hue, sat, val))}
          >
            Select Color
          </button>
          <button
            type="button"
            className="ll-action-btn ll-action-secondary"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
