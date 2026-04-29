/**
 * palettes.ts
 *
 * Palettes and color presets ported verbatim from
 * mrc-marquee-controller/config.json so the simulator's swatches and
 * palette grid match what the operator sees on the tablet.
 */

export type RGB = [number, number, number];

export interface Palette {
  name: string;
  colors: RGB[];
}

export interface ColorPreset {
  name: string;
  rgb: RGB;
}

export const COLOR_PRESETS: ColorPreset[] = [
  { name: "Warm White", rgb: [255, 200, 140] },
  { name: "Ivory",      rgb: [255, 245, 220] },
  { name: "Gold",       rgb: [255, 200,  50] },
  { name: "Blush",      rgb: [255, 180, 180] },
  { name: "Champagne",  rgb: [247, 231, 206] },
  { name: "Rose",       rgb: [255, 110, 130] },
  { name: "Lavender",   rgb: [180, 150, 255] },
  { name: "Soft Blue",  rgb: [150, 200, 255] },
];

export const PALETTES: Palette[] = [
  { name: "Wedding Classic",   colors: [[255,200,140],[255,245,220],[247,231,206]] },
  { name: "Sunset",            colors: [[255,100,50],[255,180,50],[255,50,80]] },
  { name: "Rose Gold",         colors: [[255,180,180],[255,200,140],[247,231,206]] },
  { name: "Ocean",             colors: [[50,150,255],[100,255,220],[150,200,255]] },
  { name: "Lavender Dream",    colors: [[180,150,255],[255,180,220],[220,200,255]] },
  { name: "Champagne Toast",   colors: [[247,231,206],[255,200,50],[255,245,220]] },
  { name: "Garden Party",      colors: [[100,200,100],[255,245,220],[255,180,180]] },
  { name: "Fire & Ice",        colors: [[255,80,30],[255,200,50],[100,180,255]] },
  { name: "Autumn",            colors: [[255,120,20],[200,60,10],[255,180,40],[180,40,10]] },
  { name: "Enchanted Forest",  colors: [[30,180,60],[80,220,120],[20,120,80],[150,255,100]] },
  { name: "Midnight",          colors: [[20,20,80],[60,40,150],[100,60,200],[40,80,180]] },
  { name: "Peachy Keen",       colors: [[255,180,130],[255,140,100],[255,200,160],[250,220,190]] },
  { name: "Candlelight",       colors: [[255,180,80],[255,150,50],[255,210,120],[200,120,40]] },
  { name: "Rustic Elegance",   colors: [[180,100,60],[255,200,140],[120,70,40],[220,180,140]] },
  { name: "Berry Bliss",       colors: [[150,30,80],[200,50,120],[100,20,60],[255,100,160]] },
  { name: "Tropical",          colors: [[255,100,50],[50,200,150],[255,200,0],[0,180,220]] },
  { name: "Winter Frost",      colors: [[200,220,255],[150,190,255],[240,248,255],[180,210,240]] },
  { name: "Dusty Rose",        colors: [[200,140,150],[180,120,130],[230,180,185],[160,100,110]] },
  { name: "Starlight",         colors: [[255,245,220],[200,200,255],[255,230,180],[180,180,240]] },
  { name: "Rainbow",           colors: [[255,0,0],[255,127,0],[255,255,0],[0,255,0],[0,0,255],[75,0,130],[148,0,211]] },
];
