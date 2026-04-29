/**
 * pixelLayout.ts
 *
 * Builds a normalized pixel layout for the full MR & MRS sign.
 * Letter order (left → right): M  R  &  M  R  S
 * Pixel data comes from the JSON files in app/data/pixels/.
 *
 * Coordinate strategy
 * -------------------
 * Each letter has its own local x/y origin.  We place letters side-by-side
 * with a fixed gap, then normalize the whole assembly so that:
 *   nx ∈ [0, 1]   (0 = leftmost LED, 1 = rightmost LED)
 *   ny ∈ [0, 1]   (0 = topmost LED of tallest letter, 1 = shared bottom baseline)
 *
 * Letters are BOTTOM-ALIGNED — they all share a common floor (ny = 1),
 * matching how the physical letters stand side-by-side on a surface.
 * S is the tallest letter (~4032 units) so its top reaches ny = 0;
 * shorter letters (M, R at ~3024 units) start at ny ≈ 0.25.
 *
 * The sign's natural aspect ratio (~4.57:1) is exported so the canvas
 * can match real proportions and avoid distorting letter shapes.
 */

import mData from "@/app/data/pixels/M.json";
import rData from "@/app/data/pixels/R.json";
import ampData from "@/app/data/pixels/Amp.json";
import sData from "@/app/data/pixels/S.json";

type RawPixel = { index: number; row: number; col: number; x: number; y: number };
type LetterData = { letter: string; total_leds: number; pixels: RawPixel[] };

export interface NormalizedPixel {
  /** Normalized x position in [0, 1] across the full sign */
  nx: number;
  /** Normalized y position in [0, 1] across the full sign */
  ny: number;
  /** Local x within this letter [0, 1] (0 = letter's leftmost LED) */
  lnx: number;
  /** Local y within this letter [0, 1] (0 = letter's topmost LED) */
  lny: number;
  /** Letter index: 0=M, 1=R, 2=&, 3=M, 4=R, 5=S */
  li: number;
  /** Global LED index across all letters */
  gi: number;
  /** Grid row within letter (from JSON; used for perimeter detection) */
  row: number;
  /** Grid col within letter (from JSON; used for perimeter detection) */
  col: number;
}

// MR & MRS letter order: M, R, &, M, R, S
const LETTER_DATA: LetterData[] = [
  mData as LetterData,
  rData as LetterData,
  ampData as LetterData,
  mData as LetterData,
  rData as LetterData,
  sData as LetterData,
];

// Gap between letters in the same physical units as the pixel coordinates
const LETTER_GAP = 450;

function getBounds(pixels: RawPixel[]) {
  const xs = pixels.map((p) => p.x);
  const ys = pixels.map((p) => p.y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

function buildLayout(): NormalizedPixel[] {
  // 1. Compute per-letter bounds
  const bounds = LETTER_DATA.map((ld) => getBounds(ld.pixels));

  // 2. Compute letter widths (for placement)
  const letterWidths = bounds.map((b) => b.maxX - b.minX);

  // 3. Compute x offsets so letters are placed left-to-right
  const xOffsets: number[] = [];
  let cursor = 0;
  for (let i = 0; i < LETTER_DATA.length; i++) {
    xOffsets.push(cursor - bounds[i].minX);
    cursor += letterWidths[i] + LETTER_GAP;
  }

  // 4. Tallest letter height = vertical scale reference
  const maxHeight = Math.max(...bounds.map((b) => b.maxY - b.minY));

  // 5. Total sign width
  const totalWidth = cursor - LETTER_GAP; // subtract trailing gap

  // 6. Assemble normalized pixels — top-aligned
  const result: NormalizedPixel[] = [];
  let gi = 0;

  for (let li = 0; li < LETTER_DATA.length; li++) {
    const ld = LETTER_DATA[li];
    const b = bounds[li];
    const lw = Math.max(1e-6, b.maxX - b.minX);
    const lh = Math.max(1e-6, b.maxY - b.minY);

    for (const p of ld.pixels) {
      const absX = p.x + xOffsets[li];
      const absY = p.y - b.minY;

      result.push({
        nx: absX / totalWidth,
        ny: absY / maxHeight,
        lnx: (p.x - b.minX) / lw,
        lny: (p.y - b.minY) / lh,
        li,
        gi: gi++,
        row: p.row,
        col: p.col,
      });
    }
  }

  return result;
}

// Build once and export — imported by the canvas component
export const PIXEL_LAYOUT: NormalizedPixel[] = buildLayout();
export const TOTAL_LEDS = PIXEL_LAYOUT.length;

/**
 * Natural aspect ratio of the full sign in physical units.
 * Use this to size the canvas so letter shapes aren't distorted.
 *   canvas.height = Math.floor(canvas.width / SIGN_ASPECT_RATIO)
 */
export const SIGN_ASPECT_RATIO = 4.57; // totalWidth / maxHeight ≈ 18415 / 4032

/**
 * Perimeter pixels per letter, ordered for chase animations (Marquee).
 *
 * The real controller loads explicit perimeter walk-order from JSON
 * files (mrc-marquee-controller/config.json `perimeter_files`).  Those
 * files use the controller's original LED indexing, which doesn't match
 * my PDF-extracted pixel maps, so we compute perimeter ourselves:
 *
 *   1. For each letter, build a set of grid cells (row, col).
 *   2. A pixel is on the perimeter if at least one of its 4-connected
 *      grid neighbors is absent (boundary detection).
 *   3. Sort by clockwise angle from the letter's center, starting at
 *      12 o'clock.  Approximate but visually correct for chase effects.
 */
function computePerimeters(): number[][] {
  const numLetters = LETTER_DATA.length;
  const out: number[][] = [];
  for (let li = 0; li < numLetters; li++) {
    const letterPixels = PIXEL_LAYOUT.filter((p) => p.li === li);
    const cellSet = new Set<string>();
    for (const p of letterPixels) cellSet.add(`${p.row},${p.col}`);

    const perim: NormalizedPixel[] = [];
    for (const p of letterPixels) {
      const ns = [
        `${p.row - 1},${p.col}`,
        `${p.row + 1},${p.col}`,
        `${p.row},${p.col - 1}`,
        `${p.row},${p.col + 1}`,
      ];
      if (ns.some((k) => !cellSet.has(k))) perim.push(p);
    }

    // Sort clockwise from 12 o'clock (top-center).
    // atan2(x, y) gives angle measured clockwise from +Y axis.
    perim.sort((a, b) => {
      const ax = a.lnx - 0.5;
      const ay = 0.5 - a.lny; // flip Y so up = positive (toward top of letter)
      const bx = b.lnx - 0.5;
      const by = 0.5 - b.lny;
      const aa = (Math.atan2(ax, ay) + 2 * Math.PI) % (2 * Math.PI);
      const bb = (Math.atan2(bx, by) + 2 * Math.PI) % (2 * Math.PI);
      return aa - bb;
    });

    out.push(perim.map((p) => p.gi));
  }
  return out;
}

export const PERIMETER_BY_LETTER: number[][] = computePerimeters();
