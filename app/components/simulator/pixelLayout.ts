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
 *   ny ∈ [0, 1]   (0 = topmost LED, 1 = bottommost LED)
 *
 * Because S is the tallest letter (y range ~4032 units) all letters use that
 * same scale so they render at consistent physical proportions.
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
  /** Letter index: 0=M, 1=R, 2=&, 3=M, 4=R, 5=S */
  li: number;
  /** Global LED index across all letters */
  gi: number;
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

  // 4. Find the tallest letter's y range (for uniform vertical scale)
  //    All letters are top-aligned (minY → 0)
  const maxHeight = Math.max(...bounds.map((b) => b.maxY - b.minY));

  // 5. Total sign width
  const totalWidth = cursor - LETTER_GAP; // subtract trailing gap

  // 6. Assemble normalized pixels
  const result: NormalizedPixel[] = [];
  let gi = 0;

  for (let li = 0; li < LETTER_DATA.length; li++) {
    const ld = LETTER_DATA[li];
    const b = bounds[li];

    for (const p of ld.pixels) {
      const absX = p.x + xOffsets[li];
      const absY = p.y - b.minY; // top-align each letter

      result.push({
        nx: absX / totalWidth,
        ny: absY / maxHeight,
        li,
        gi: gi++,
      });
    }
  }

  return result;
}

// Build once and export — imported by the canvas component
export const PIXEL_LAYOUT: NormalizedPixel[] = buildLayout();
export const TOTAL_LEDS = PIXEL_LAYOUT.length;
