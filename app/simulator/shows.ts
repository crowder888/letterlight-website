/**
 * shows.ts
 *
 * The full show catalog from the real MRC Marquee controller (mrc-marquee-controller/app.py
 * SHOW_CATEGORIES + shows.py SHOW_ORDER).  Each show entry mirrors what
 * appears on the operator's tablet UI so visitors see the exact same
 * categorized button grid.
 *
 * `implemented: true` means the simulator can actually animate it.
 * Unimplemented shows fall back to a sensible default but still display
 * in the grid so the UI looks complete.
 */

export type ShowCategory = "Essentials" | "Waves & Motion" | "2D Effects" | "Audio Reactive";

export interface ShowDef {
  id: string;
  label: string;
  category: ShowCategory;
  implemented: boolean;
}

export const SHOWS: ShowDef[] = [
  // ── Essentials ──────────────────────────────────────────────────────────
  { id: "solid",          label: "Solid",         category: "Essentials", implemented: true },
  { id: "letter_colors",  label: "Letter Colors", category: "Essentials", implemented: true },
  { id: "letter_chase",   label: "Letter Chase",  category: "Essentials", implemented: false },
  { id: "letter_swap",    label: "Letter Swap",   category: "Essentials", implemented: false },
  { id: "fly_in",         label: "Fly In",        category: "Essentials", implemented: false },
  { id: "reading",        label: "Reading",       category: "Essentials", implemented: false },
  { id: "camera_flash",   label: "Camera Flash",  category: "Essentials", implemented: false },
  { id: "pulse",          label: "Pulse",         category: "Essentials", implemented: false },
  { id: "breathe",        label: "Breathe",       category: "Essentials", implemented: true },
  { id: "sparkle",        label: "Sparkle",       category: "Essentials", implemented: true },
  { id: "shimmer",        label: "Shimmer",       category: "Essentials", implemented: false },
  { id: "twinkle",        label: "Twinkle",       category: "Essentials", implemented: false },
  { id: "fairy_dust",     label: "Fairy Dust",    category: "Essentials", implemented: false },

  // ── Waves & Motion ──────────────────────────────────────────────────────
  { id: "wave",           label: "Wave",          category: "Waves & Motion", implemented: true },
  { id: "rainbow",        label: "Rainbow",       category: "Waves & Motion", implemented: true },
  { id: "gradient",       label: "Gradient",      category: "Waves & Motion", implemented: false },
  { id: "color_wash",     label: "Color Wash",    category: "Waves & Motion", implemented: false },
  { id: "spirals",        label: "Spirals",       category: "Waves & Motion", implemented: false },
  { id: "curtain",        label: "Curtain",       category: "Waves & Motion", implemented: false },
  { id: "scanner",        label: "Scanner",       category: "Waves & Motion", implemented: false },
  { id: "heartbeat",      label: "Heartbeat",     category: "Waves & Motion", implemented: false },

  // ── 2D Effects ──────────────────────────────────────────────────────────
  { id: "fire",           label: "Fire",          category: "2D Effects", implemented: false },
  { id: "fireworks_xl",   label: "Fireworks",     category: "2D Effects", implemented: false },
  { id: "meteors",        label: "Meteors",       category: "2D Effects", implemented: false },
  { id: "snowflakes",     label: "Snowflakes",    category: "2D Effects", implemented: false },
  { id: "shockwave",      label: "Shockwave",     category: "2D Effects", implemented: false },
  { id: "circles",        label: "Circles",       category: "2D Effects", implemented: false },
  { id: "galaxy",         label: "Galaxy",        category: "2D Effects", implemented: false },
  { id: "butterfly",      label: "Butterfly",     category: "2D Effects", implemented: false },
  { id: "shape",          label: "Shapes",        category: "2D Effects", implemented: false },
  { id: "candle_xl",      label: "Candle",        category: "2D Effects", implemented: false },
  { id: "strobe",         label: "Strobe",        category: "2D Effects", implemented: false },
  { id: "marquee",        label: "Marquee",       category: "2D Effects", implemented: false },

  // ── Audio Reactive ──────────────────────────────────────────────────────
  // Real controller drives these from a microphone → FFT.  Marketing simulator
  // can't do that meaningfully, so we list them but don't animate them.
  { id: "eq_bars",        label: "EQ Bars",       category: "Audio Reactive", implemented: false },
  { id: "beat_strobe",    label: "Beat Strobe",   category: "Audio Reactive", implemented: false },
  { id: "spectrum_wash",  label: "Spectrum Wash", category: "Audio Reactive", implemented: false },
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
