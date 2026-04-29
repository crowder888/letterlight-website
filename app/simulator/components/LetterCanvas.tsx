"use client";

import { useEffect, useRef } from "react";
import { PIXEL_LAYOUT, TOTAL_LEDS, SIGN_ASPECT_RATIO } from "../pixelLayout";
import { effectFor, type EffectParams } from "../effects";

interface Props {
  showId: string;
  params: EffectParams;
}

const LED_RADIUS_FRACTION = 0.011;
const BG_COLOR = "#080812";
const MAX_DT = 0.1; // cap dt so a backgrounded tab doesn't cause huge jumps

export default function LetterCanvas({ showId, params }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number | null>(null);

  // Persistent RGB buffer (3 floats per LED).  Stateful effects mutate
  // it directly; pixel-fn effects fully overwrite it each frame.
  const bufferRef = useRef<Float32Array>(new Float32Array(TOTAL_LEDS * 3));

  // Current props in refs so the rAF loop never tears down on prop changes
  const showIdRef = useRef(showId);
  const paramsRef = useRef(params);
  const lastShowIdRef = useRef<string | null>(null);
  useEffect(() => { showIdRef.current = showId; }, [showId]);
  useEffect(() => { paramsRef.current = params; }, [params]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ro = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor((width / SIGN_ASPECT_RATIO) * dpr);
      canvas.style.height = `${Math.floor(width / SIGN_ASPECT_RATIO)}px`;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(dpr, dpr);
    });
    ro.observe(container);

    const draw = (timestamp: number) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
        lastFrameTimeRef.current = timestamp;
      }
      const t = (timestamp - startTimeRef.current) / 1000;
      const dt = Math.min(
        MAX_DT,
        (timestamp - (lastFrameTimeRef.current ?? timestamp)) / 1000
      );
      lastFrameTimeRef.current = timestamp;

      const dpr = window.devicePixelRatio || 1;
      const W = canvas.width / dpr;
      const H = canvas.height / dpr;

      // ── Resolve effect, reset stateful effects on entry ────────────────
      const showIdNow = showIdRef.current;
      const effect = effectFor(showIdNow);
      if (lastShowIdRef.current !== showIdNow) {
        if (effect.type === "stateful") effect.reset();
        // Clear buffer when switching shows so old colors don't bleed in
        bufferRef.current.fill(0);
        lastShowIdRef.current = showIdNow;
      }
      const buffer = bufferRef.current;
      const p = paramsRef.current;

      // ── Compute LED colors into buffer ─────────────────────────────────
      if (effect.type === "stateful") {
        effect.step(buffer, t, dt, p);
      } else {
        for (let i = 0; i < TOTAL_LEDS; i++) {
          const pixel = PIXEL_LAYOUT[i];
          const [r, g, b] = effect.fn(pixel, t, p);
          const off = i * 3;
          buffer[off] = r;
          buffer[off + 1] = g;
          buffer[off + 2] = b;
        }
      }

      // ── Render buffer to canvas ────────────────────────────────────────
      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, W, H);

      const r = Math.max(2, H * LED_RADIUS_FRACTION);
      const padX = r * 2.2;
      const padY = r * 2.2;
      const drawW = W - padX * 2;
      const drawH = H - padY * 2;
      const glowR = r * 2.6;

      for (let i = 0; i < TOTAL_LEDS; i++) {
        const pixel = PIXEL_LAYOUT[i];
        const off = i * 3;
        const red = buffer[off] | 0;
        const green = buffer[off + 1] | 0;
        const blue = buffer[off + 2] | 0;
        if (red < 2 && green < 2 && blue < 2) continue;

        const px = padX + pixel.nx * drawW;
        const py = padY + pixel.ny * drawH;

        // Outer glow halo
        const grd = ctx.createRadialGradient(px, py, 0, px, py, glowR);
        grd.addColorStop(0, `rgba(${red},${green},${blue},0.4)`);
        grd.addColorStop(1, `rgba(${red},${green},${blue},0)`);
        ctx.beginPath();
        ctx.arc(px, py, glowR, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();

        // Core LED
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgb(${red},${green},${blue})`;
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} className="ll-canvas-wrap">
      <canvas ref={canvasRef} className="ll-canvas" />
    </div>
  );
}
