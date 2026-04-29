"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { PIXEL_LAYOUT } from "./pixelLayout";
import { EFFECTS, type EffectParams, type RGBTuple } from "./effects";

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_EFFECT = "breathe";
const DEFAULT_COLOR: [number, number, number] = [201, 169, 110]; // Letterlight gold

// How large each LED dot is relative to the sign's rendered height
const LED_RADIUS_FRACTION = 0.007;

// Dark background color (matches site dark bg)
const BG_COLOR = "#111111";

// Preset color swatches
const COLOR_SWATCHES: { label: string; rgb: [number, number, number] }[] = [
  { label: "Gold",    rgb: [255, 200, 80]  },
  { label: "White",   rgb: [255, 255, 255] },
  { label: "Red",     rgb: [255, 40,  40]  },
  { label: "Pink",    rgb: [255, 80, 160]  },
  { label: "Blue",    rgb: [60,  140, 255] },
  { label: "Green",   rgb: [40,  220, 100] },
  { label: "Purple",  rgb: [180, 60, 255]  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function LetterSimulator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number | null>(null);

  // Use refs for params so the rAF loop always reads current values without
  // needing to be recreated on every state change.
  const effectIdRef = useRef<string>(DEFAULT_EFFECT);
  const colorRef = useRef<[number, number, number]>(DEFAULT_COLOR);
  const speedRef = useRef<number>(1);

  // State only for UI rendering
  const [effectId, setEffectId] = useState(DEFAULT_EFFECT);
  const [color, setColor] = useState<[number, number, number]>(DEFAULT_COLOR);
  const [speed, setSpeed] = useState<number>(1);

  // ── Canvas draw loop ────────────────────────────────────────────────────────

  const draw = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (startTimeRef.current === null) startTimeRef.current = timestamp;
    const t = (timestamp - startTimeRef.current) / 1000; // seconds

    const W = canvas.width;
    const H = canvas.height;

    // Background
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, W, H);

    // Find active effect function
    const effectDef = EFFECTS.find((e) => e.id === effectIdRef.current) ?? EFFECTS[0];
    const params: EffectParams = {
      color: colorRef.current,
      speed: speedRef.current,
    };

    const r = Math.max(1.5, H * LED_RADIUS_FRACTION);

    // The pixel layout nx/ny covers [0,1] × [0,1] but we want to:
    //  - Add horizontal padding so the first/last LEDs aren't clipped
    //  - Center vertically
    const padX = r * 2;
    const padY = r * 2;
    const drawW = W - padX * 2;
    const drawH = H - padY * 2;

    for (const pixel of PIXEL_LAYOUT) {
      const px = padX + pixel.nx * drawW;
      const py = padY + pixel.ny * drawH;

      const [red, green, blue] = effectDef.fn(pixel, t, params) as RGBTuple;

      // Outer glow
      const glowR = r * 2.5;
      const grd = ctx.createRadialGradient(px, py, 0, px, py, glowR);
      grd.addColorStop(0, `rgba(${red},${green},${blue},0.35)`);
      grd.addColorStop(1, `rgba(${red},${green},${blue},0)`);
      ctx.beginPath();
      ctx.arc(px, py, glowR, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();

      // Core dot
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgb(${red},${green},${blue})`;
      ctx.fill();
    }

    rafRef.current = requestAnimationFrame(draw);
  }, []);

  // ── Resize observer ─────────────────────────────────────────────────────────

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      const { width } = entry.contentRect;
      // Aspect ratio: sign is roughly 6:1 wide. We render at 3:1 for visual comfort.
      canvas.width = Math.floor(width);
      canvas.height = Math.floor(width / 3.5);
    });
    ro.observe(container);

    // Kick off animation loop
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(rafRef.current);
    };
  }, [draw]);

  // ── Sync refs on state change ───────────────────────────────────────────────

  useEffect(() => { effectIdRef.current = effectId; }, [effectId]);
  useEffect(() => { colorRef.current = color; }, [color]);
  useEffect(() => { speedRef.current = speed; }, [speed]);

  const currentEffect = EFFECTS.find((e) => e.id === effectId) ?? EFFECTS[0];

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Canvas */}
      <div ref={containerRef} className="w-full rounded-sm overflow-hidden bg-[#111]">
        <canvas
          ref={canvasRef}
          className="block w-full"
          style={{ imageRendering: "pixelated" }}
        />
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-5 px-1">

        {/* Effect selector */}
        <div>
          <p className="text-white/40 text-xs tracking-widest uppercase mb-3">Effect</p>
          <div className="flex flex-wrap gap-2">
            {EFFECTS.map((ef) => (
              <button
                key={ef.id}
                onClick={() => setEffectId(ef.id)}
                className={[
                  "px-4 py-1.5 text-xs tracking-widest uppercase transition-colors border",
                  effectId === ef.id
                    ? "bg-[#C9A96E] text-[#1C1C1E] border-[#C9A96E]"
                    : "bg-transparent text-white/50 border-white/20 hover:border-white/40 hover:text-white/80",
                ].join(" ")}
              >
                {ef.label}
              </button>
            ))}
          </div>
        </div>

        {/* Color swatches — only shown when effect uses color */}
        {!currentEffect.ignoresColor && (
          <div>
            <p className="text-white/40 text-xs tracking-widest uppercase mb-3">Color</p>
            <div className="flex flex-wrap gap-2 items-center">
              {COLOR_SWATCHES.map((swatch) => {
                const isActive =
                  color[0] === swatch.rgb[0] &&
                  color[1] === swatch.rgb[1] &&
                  color[2] === swatch.rgb[2];
                return (
                  <button
                    key={swatch.label}
                    title={swatch.label}
                    onClick={() => setColor(swatch.rgb)}
                    className={[
                      "w-7 h-7 rounded-full border-2 transition-transform",
                      isActive ? "border-white scale-110" : "border-transparent hover:scale-105",
                    ].join(" ")}
                    style={{
                      backgroundColor: `rgb(${swatch.rgb[0]},${swatch.rgb[1]},${swatch.rgb[2]})`,
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Speed slider */}
        <div>
          <p className="text-white/40 text-xs tracking-widest uppercase mb-3">
            Speed{" "}
            <span className="text-white/20 normal-case tracking-normal ml-1">
              {speed < 0.6 ? "slow" : speed < 1.4 ? "medium" : speed < 2.2 ? "fast" : "very fast"}
            </span>
          </p>
          <input
            type="range"
            min={0.25}
            max={3}
            step={0.25}
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="w-full max-w-xs accent-[#C9A96E]"
          />
        </div>
      </div>
    </div>
  );
}
