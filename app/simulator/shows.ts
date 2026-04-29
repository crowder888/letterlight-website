/**
 * shows.ts
 *
 * The full show catalog from the real MRC Marquee controller.
 * SHOW data + PARAMS schemas mirror mrc-marquee-controller/{app.py,shows.py}
 * so the simulator's UI matches the operator tablet exactly.
 *
 * `implemented: true` means the simulator can actually animate it.
 * Unimplemented shows fall back to a sensible default but still display
 * in the grid so the UI looks complete.  Param sliders are still rendered
 * for unimplemented shows so visitors can see what controls exist.
 */

import type { RGB } from "./palettes";

export type ShowCategory = "Essentials" | "Waves & Motion" | "2D Effects" | "Audio Reactive";

export type ShowParamValue = number | RGB;

export interface ShowParam {
  key: string;
  label: string;
  /** "color" → RGB swatch with picker; otherwise → integer slider */
  type?: "color";
  min?: number;
  max?: number;
  default: ShowParamValue;
}

export interface ShowDef {
  id: string;
  label: string;
  category: ShowCategory;
  implemented: boolean;
  params?: ShowParam[];
}

export const SHOWS: ShowDef[] = [
  // ── Essentials ──────────────────────────────────────────────────────────
  { id: "solid", label: "Solid", category: "Essentials", implemented: true },
  {
    id: "letter_colors", label: "Letter Colors", category: "Essentials", implemented: true,
    params: [
      { key: "pulse",         label: "Pulse",          min: 0, max: 100, default: 0 },
      { key: "sparkle",       label: "Sparkle Density",min: 0, max: 100, default: 0 },
      { key: "sparkle_color", label: "Sparkle Color",  type: "color", default: [255, 255, 255] },
    ],
  },
  {
    id: "letter_chase", label: "Letter Chase", category: "Essentials", implemented: true,
    params: [
      { key: "dim_level", label: "Dim Level",      min: 0, max: 50,  default: 5 },
      { key: "fade",      label: "Fade Smoothness",min: 0, max: 100, default: 30 },
      { key: "direction", label: "Direction",      min: 0, max: 2,   default: 0 },
    ],
  },
  {
    id: "letter_swap", label: "Letter Swap", category: "Essentials", implemented: true,
    params: [
      { key: "fade_smooth", label: "Fade Smoothness", min: 0, max: 100, default: 50 },
      { key: "direction",   label: "Direction",       min: 0, max: 1,   default: 0 },
    ],
  },
  {
    id: "fly_in", label: "Fly In", category: "Essentials", implemented: true,
    params: [
      { key: "hold_time", label: "Hold After Reveal", min: 1, max: 30,  default: 4 },
      { key: "trail_len", label: "Trail Length",      min: 5, max: 80,  default: 30 },
      { key: "direction", label: "Direction",         min: 0, max: 3,   default: 0 },
      { key: "sparkle",   label: "Sparkle Density",   min: 0, max: 100, default: 30 },
    ],
  },
  {
    id: "reading", label: "Reading", category: "Essentials", implemented: true,
    params: [
      { key: "spotlight_width", label: "Spotlight Width", min: 5, max: 60,  default: 18 },
      { key: "ambient",         label: "Ambient Glow",    min: 0, max: 50,  default: 8 },
      { key: "direction",       label: "Direction",       min: 0, max: 2,   default: 0 },
      { key: "spot_color",      label: "Spotlight Color", type: "color", default: [255, 255, 255] },
    ],
  },
  {
    id: "camera_flash", label: "Camera Flash", category: "Essentials", implemented: true,
    params: [
      { key: "flash_rate",  label: "Flash Rate",  min: 0, max: 100, default: 50 },
      { key: "burst_size",  label: "Burst Size",  min: 1, max: 4,   default: 1 },
      { key: "fade_time",   label: "Flash Length",min: 5, max: 100, default: 30 },
      { key: "ambient",     label: "Ambient Glow",min: 0, max: 50,  default: 5 },
      { key: "flash_color", label: "Flash Color", type: "color", default: [255, 255, 255] },
    ],
  },
  { id: "pulse",   label: "Pulse",   category: "Essentials", implemented: true },
  { id: "breathe", label: "Breathe", category: "Essentials", implemented: true },
  { id: "sparkle", label: "Sparkle", category: "Essentials", implemented: true },
  { id: "shimmer", label: "Shimmer", category: "Essentials", implemented: true },
  { id: "twinkle", label: "Twinkle", category: "Essentials", implemented: true },
  { id: "fairy_dust", label: "Fairy Dust", category: "Essentials", implemented: true },

  // ── Waves & Motion ──────────────────────────────────────────────────────
  { id: "wave",     label: "Wave",     category: "Waves & Motion", implemented: true },
  { id: "rainbow",  label: "Rainbow",  category: "Waves & Motion", implemented: true },
  { id: "gradient", label: "Gradient", category: "Waves & Motion", implemented: true },
  {
    id: "color_wash", label: "Color Wash", category: "Waves & Motion", implemented: true,
    params: [
      { key: "edge_fade",     label: "Edge Fade",     min: 0, max: 100, default: 50 },
      { key: "vertical_bias", label: "Vertical Bias", min: 0, max: 100, default: 50 },
    ],
  },
  {
    id: "spirals", label: "Spirals", category: "Waves & Motion", implemented: true,
    params: [
      { key: "band_count", label: "Band Count",  min: 1,  max: 10,  default: 4 },
      { key: "twist",      label: "Twist Angle", min: 0,  max: 100, default: 50 },
      { key: "thickness",  label: "Band Width",  min: 10, max: 100, default: 50 },
    ],
  },
  {
    id: "curtain", label: "Curtain", category: "Waves & Motion", implemented: true,
    params: [
      { key: "swag",      label: "Swag / Drape",   min: 0,  max: 100, default: 40 },
      { key: "edge_soft", label: "Edge Softness",  min: 10, max: 100, default: 50 },
    ],
  },
  {
    id: "scanner", label: "Scanner", category: "Waves & Motion", implemented: true,
    params: [
      { key: "bar_width", label: "Bar Width",       min: 5, max: 100, default: 30 },
      { key: "trail_len", label: "Trail Length",    min: 0, max: 100, default: 60 },
      { key: "bg_glow",   label: "Background Glow", min: 0, max: 100, default: 0 },
      { key: "bg_color",  label: "Glow Color",      type: "color", default: [255, 255, 255] },
    ],
  },
  {
    id: "heartbeat", label: "Heartbeat", category: "Waves & Motion", implemented: true,
    params: [
      { key: "pulse_spread", label: "Pulse Spread", min: 0, max: 100, default: 50 },
    ],
  },

  // ── 2D Effects ──────────────────────────────────────────────────────────
  {
    id: "fire", label: "Fire", category: "2D Effects", implemented: true,
    params: [
      { key: "flame_height", label: "Flame Height", min: 1,  max: 100, default: 50 },
      { key: "sparking",     label: "Spark Rate",   min: 10, max: 100, default: 50 },
    ],
  },
  {
    id: "fireworks_xl", label: "Fireworks", category: "2D Effects", implemented: true,
    params: [
      { key: "burst_size", label: "Burst Size",       min: 5,  max: 100, default: 50 },
      { key: "gravity",    label: "Gravity",          min: 0,  max: 100, default: 40 },
      { key: "trail_fade", label: "Trail Fade",       min: 30, max: 95,  default: 70 },
      { key: "bg_glow",    label: "Background Glow",  min: 0,  max: 100, default: 0 },
      { key: "bg_color",   label: "Glow Color",       type: "color", default: [255, 255, 255] },
    ],
  },
  {
    id: "meteors", label: "Meteors", category: "2D Effects", implemented: true,
    params: [
      { key: "direction", label: "Direction",       min: 0, max: 5,   default: 0 },
      { key: "trail_len", label: "Trail Length",    min: 5, max: 100, default: 40 },
      { key: "swirl",     label: "Swirl",           min: 0, max: 100, default: 20 },
      { key: "bg_glow",   label: "Background Glow", min: 0, max: 100, default: 0 },
      { key: "bg_color",  label: "Glow Color",      type: "color", default: [255, 255, 255] },
    ],
  },
  {
    id: "snowflakes", label: "Snowflakes", category: "2D Effects", implemented: true,
    params: [
      { key: "flake_size",  label: "Flake Size",      min: 10, max: 100, default: 40 },
      { key: "drift",       label: "Wind Drift",      min: 0,  max: 100, default: 30 },
      { key: "max_flakes",  label: "Max Flakes",      min: 5,  max: 100, default: 50 },
      { key: "accumulate",  label: "Accumulation",    min: 0,  max: 100, default: 0 },
      { key: "bg_glow",     label: "Background Glow", min: 0,  max: 100, default: 0 },
      { key: "bg_color",    label: "Glow Color",      type: "color", default: [255, 255, 255] },
    ],
  },
  {
    id: "shockwave", label: "Shockwave", category: "2D Effects", implemented: true,
    params: [
      { key: "ring_width", label: "Ring Width",      min: 5,  max: 100, default: 35 },
      { key: "max_radius", label: "Reach",           min: 20, max: 100, default: 80 },
      { key: "trail_fade", label: "Trail Fade",      min: 0,  max: 100, default: 70 },
      { key: "bg_glow",    label: "Background Glow", min: 0,  max: 100, default: 0 },
      { key: "bg_color",   label: "Glow Color",      type: "color", default: [255, 255, 255] },
    ],
  },
  {
    id: "circles", label: "Circles", category: "2D Effects", implemented: true,
    params: [
      { key: "ring_count", label: "Ring Count",      min: 1,  max: 12,  default: 4 },
      { key: "thickness",  label: "Ring Thickness",  min: 10, max: 100, default: 50 },
      { key: "bg_glow",    label: "Background Glow", min: 0,  max: 100, default: 0 },
      { key: "bg_color",   label: "Glow Color",      type: "color", default: [255, 255, 255] },
    ],
  },
  {
    id: "galaxy", label: "Galaxy", category: "2D Effects", implemented: true,
    params: [
      { key: "arms",      label: "Spiral Arms",     min: 1,  max: 8,   default: 3 },
      { key: "twist",     label: "Twist",           min: 10, max: 100, default: 50 },
      { key: "core_glow", label: "Core Glow",       min: 0,  max: 100, default: 50 },
      { key: "bg_glow",   label: "Background Glow", min: 0,  max: 100, default: 0 },
      { key: "bg_color",  label: "Glow Color",      type: "color", default: [255, 255, 255] },
    ],
  },
  {
    id: "butterfly", label: "Butterfly", category: "2D Effects", implemented: false,
    params: [
      { key: "style",  label: "Style",  min: 1, max: 10, default: 1 },
      { key: "chunks", label: "Chunks", min: 1, max: 10, default: 1 },
      { key: "skip",   label: "Skip",   min: 2, max: 10, default: 2 },
    ],
  },
  {
    id: "shape", label: "Shapes", category: "2D Effects", implemented: false,
    params: [
      { key: "shape_type", label: "Shape",           min: 0, max: 7,   default: 0 },
      { key: "count",      label: "Count",           min: 1, max: 20,  default: 5 },
      { key: "growth",     label: "Growth",          min: 0, max: 100, default: 50 },
      { key: "thickness",  label: "Thickness",       min: 1, max: 100, default: 50 },
      { key: "bg_glow",    label: "Background Glow", min: 0, max: 100, default: 0 },
      { key: "bg_color",   label: "Glow Color",      type: "color", default: [255, 255, 255] },
    ],
  },
  {
    id: "candle_xl", label: "Candle", category: "2D Effects", implemented: false,
    params: [
      { key: "wind",    label: "Wind Strength",  min: 0,  max: 100, default: 40 },
      { key: "flicker", label: "Flicker Speed",  min: 10, max: 100, default: 60 },
      { key: "depth",   label: "Flicker Depth",  min: 10, max: 100, default: 70 },
    ],
  },
  {
    id: "strobe", label: "Strobe", category: "2D Effects", implemented: true,
    params: [
      { key: "density",  label: "Flash Density",   min: 0, max: 100, default: 50 },
      { key: "bg_glow",  label: "Glow Brightness", min: 0, max: 100, default: 15 },
      { key: "bg_color", label: "Glow Color",      type: "color", default: [255, 255, 255] },
    ],
  },
  {
    id: "marquee", label: "Marquee", category: "2D Effects", implemented: true,
    params: [
      { key: "chase_width",   label: "Chase Width",   min: 1, max: 20,  default: 5 },
      { key: "gap_width",     label: "Gap Width",     min: 1, max: 20,  default: 5 },
      { key: "interior_glow", label: "Interior Glow", min: 0, max: 100, default: 40 },
      { key: "bg_color",      label: "Glow Color",    type: "color", default: [255, 255, 255] },
    ],
  },

  // ── Audio Reactive ──────────────────────────────────────────────────────
  {
    id: "eq_bars", label: "EQ Bars", category: "Audio Reactive", implemented: false,
    params: [
      { key: "smoothing",  label: "Smoothing",  min: 0, max: 100, default: 30 },
      { key: "min_floor",  label: "Min Floor",  min: 0, max: 50,  default: 5 },
      { key: "peak_hold",  label: "Peak Hold",  min: 0, max: 100, default: 60 },
      { key: "peak_color", label: "Peak Color", type: "color", default: [255, 255, 255] },
    ],
  },
  {
    id: "beat_strobe", label: "Beat Strobe", category: "Audio Reactive", implemented: false,
    params: [
      { key: "trigger",      label: "Trigger Drum",     min: 0, max: 5,   default: 0 },
      { key: "sensitivity",  label: "Beat Sensitivity", min: 0, max: 100, default: 50 },
      { key: "flash_length", label: "Flash Length",     min: 5, max: 100, default: 30 },
      { key: "ambient",      label: "Ambient Glow",     min: 0, max: 50,  default: 5 },
      { key: "scope",        label: "Flash Scope",      min: 0, max: 2,   default: 0 },
      { key: "flash_color",  label: "Flash Color",      type: "color", default: [255, 255, 255] },
    ],
  },
  {
    id: "spectrum_wash", label: "Spectrum Wash", category: "Audio Reactive", implemented: false,
    params: [
      { key: "smoothing",  label: "Smoothing",  min: 0, max: 100, default: 40 },
      { key: "min_floor",  label: "Min Floor",  min: 0, max: 50,  default: 10 },
      { key: "color_mode", label: "Color Mode", min: 0, max: 2,   default: 0 },
    ],
  },
];

export const SHOW_CATEGORIES: ShowCategory[] = [
  "Essentials",
  "Waves & Motion",
  "2D Effects",
  "Audio Reactive",
];

export const SHOWS_BY_CATEGORY: Record<ShowCategory, ShowDef[]> = {
  "Essentials":     SHOWS.filter((s) => s.category === "Essentials"),
  "Waves & Motion": SHOWS.filter((s) => s.category === "Waves & Motion"),
  "2D Effects":     SHOWS.filter((s) => s.category === "2D Effects"),
  "Audio Reactive": SHOWS.filter((s) => s.category === "Audio Reactive"),
};

export function getShow(id: string): ShowDef | undefined {
  return SHOWS.find((s) => s.id === id);
}

/** Build a fresh defaults map for a show's params. */
export function defaultParamValues(showId: string): Record<string, ShowParamValue> {
  const show = getShow(showId);
  if (!show?.params) return {};
  const out: Record<string, ShowParamValue> = {};
  for (const p of show.params) {
    out[p.key] = p.default;
  }
  return out;
}
