/**
 * userPalettes.ts
 *
 * localStorage-backed user palette storage for the simulator.  The real
 * controller writes saved palettes to config.json on the Pi, but the
 * marketing simulator runs entirely client-side, so we keep them per-
 * browser via localStorage.
 *
 * Recent colors and the in-progress custom-mix builder slot state are
 * also persisted here so a visitor doesn't lose their work on reload.
 */

import type { Palette, RGB } from "./palettes";

const KEY_PALETTES = "ll-sim:user-palettes:v1";
const KEY_RECENT = "ll-sim:recent-colors:v1";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWrite(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage might be disabled (private mode, quota) — fail quietly
  }
}

// ── User palettes ─────────────────────────────────────────────────────────

export function loadUserPalettes(): Palette[] {
  if (typeof window === "undefined") return [];
  return safeParse<Palette[]>(localStorage.getItem(KEY_PALETTES), []);
}

export function saveUserPalette(name: string, colors: RGB[]): Palette[] {
  const existing = loadUserPalettes();
  // Replace any palette with same name
  const filtered = existing.filter((p) => p.name !== name);
  const next: Palette[] = [...filtered, { name, colors }];
  safeWrite(KEY_PALETTES, next);
  return next;
}

export function deleteUserPalette(name: string): Palette[] {
  const existing = loadUserPalettes();
  const next = existing.filter((p) => p.name !== name);
  safeWrite(KEY_PALETTES, next);
  return next;
}

// ── Recent colors (rolling list of last picks) ────────────────────────────

const MAX_RECENT = 8;

export function loadRecentColors(): RGB[] {
  if (typeof window === "undefined") return [];
  return safeParse<RGB[]>(localStorage.getItem(KEY_RECENT), []);
}

export function pushRecentColor(rgb: RGB): RGB[] {
  const existing = loadRecentColors();
  const filtered = existing.filter(
    (c) => !(c[0] === rgb[0] && c[1] === rgb[1] && c[2] === rgb[2])
  );
  const next = [rgb, ...filtered].slice(0, MAX_RECENT);
  safeWrite(KEY_RECENT, next);
  return next;
}
