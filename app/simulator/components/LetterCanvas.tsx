"use client";

import { useEffect, useRef } from "react";
import { PIXEL_LAYOUT, SIGN_ASPECT_RATIO } from "../pixelLayout";
import { effectFor, type EffectParams } from "../effects";

interface Props {
  showId: string;
  params: EffectParams;
}

const LED_RADIUS_FRACTION = 0.011;
const BG_COLOR = "#080812";

export default function LetterCanvas({ showId, params }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number | null>(null);

  // Current props in refs so the rAF loop never has to be torn down
  const showIdRef = useRef(showId);
  const paramsRef = useRef(params);
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
      if (startTimeRef.current === null) startTimeRef.current = timestamp;
      const t = (timestamp - startTimeRef.current) / 1000;

      const dpr = window.devicePixelRatio || 1;
      const W = canvas.width / dpr;
      const H = canvas.height / dpr;

      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, W, H);

      const fn = effectFor(showIdRef.current);
      const p = paramsRef.current;
      const r = Math.max(2, H * LED_RADIUS_FRACTION);
      const padX = r * 2.2;
      const padY = r * 2.2;
      const drawW = W - padX * 2;
      const drawH = H - padY * 2;

      for (const pixel of PIXEL_LAYOUT) {
        const px = padX + pixel.nx * drawW;
        const py = padY + pixel.ny * drawH;
        const [red, green, blue] = fn(pixel, t, p);

        // Outer glow halo
        const glowR = r * 2.6;
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
