"use client";

/**
 * ControllerSimulator
 *
 * The complete operator UI from the real MRC Marquee tablet, ported to
 * the public marketing site.  Layout (top → bottom):
 *
 *   1. Status bar (logo + letter status)
 *   2. Live LED preview (the canvas)
 *   3. Show grid (categorized buttons)
 *   4. Color / Palette tabs
 *   5. Speed / Intensity / Brightness sliders
 *
 * State lives here; child components are pure presentational.
 */

import { useMemo, useState } from "react";
import LetterCanvas from "./components/LetterCanvas";
import ShowGrid from "./components/ShowGrid";
import ColorTabs, { type ColorMode } from "./components/ColorTabs";
import Sliders from "./components/Sliders";
import { type Palette, type RGB, COLOR_PRESETS, PALETTES } from "./palettes";
import { getShow } from "./shows";

const DEFAULT_COLOR: RGB = COLOR_PRESETS[0].rgb;
const DEFAULT_PALETTE: Palette = PALETTES[0];

export default function ControllerSimulator() {
  const [activeShow, setActiveShow] = useState<string>("breathe");
  const [colorMode, setColorMode] = useState<ColorMode>("single");
  const [color, setColor] = useState<RGB>(DEFAULT_COLOR);
  const [palette, setPalette] = useState<Palette>(DEFAULT_PALETTE);

  const [speed, setSpeed] = useState(50);
  const [intensity, setIntensity] = useState(70);
  const [brightness, setBrightness] = useState(100);

  const params = useMemo(() => ({
    color,
    paletteColors: palette.colors,
    usePalette: colorMode === "palette",
    speed: speed / 100,
    intensity: intensity / 100,
    brightness: brightness / 100,
  }), [color, palette, colorMode, speed, intensity, brightness]);

  const handleSlider = (k: "speed" | "intensity" | "brightness", v: number) => {
    if (k === "speed") setSpeed(v);
    if (k === "intensity") setIntensity(v);
    if (k === "brightness") setBrightness(v);
  };

  const showLabel = getShow(activeShow)?.label ?? "Solid";

  return (
    <div className="ll-controller">
      {/* Status bar */}
      <div className="ll-status-bar">
        <span className="ll-status-logo">MRC MARQUEE</span>
        <div className="ll-status-letters">
          {["M", "R", "&", "M", "R", "S"].map((l, i) => (
            <span key={i} className="ll-status-letter">
              <span className="ll-status-dot" />
              <span className="ll-status-letter-label">{l}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Live preview */}
      <div className="ll-card ll-preview-card">
        <div className="ll-preview-header">
          <span className="ll-section-label">Live Preview</span>
          <span className="ll-preview-show-name">{showLabel}</span>
        </div>
        <LetterCanvas showId={activeShow} params={params} />
      </div>

      {/* Show grid */}
      <ShowGrid activeShow={activeShow} onSelectShow={setActiveShow} />

      {/* Colors / Palettes */}
      <ColorTabs
        mode={colorMode}
        color={color}
        paletteName={palette.name}
        onChangeMode={setColorMode}
        onChangeColor={setColor}
        onChangePalette={setPalette}
      />

      {/* Sliders */}
      <Sliders
        speed={speed}
        intensity={intensity}
        brightness={brightness}
        onChange={handleSlider}
      />

      <p className="ll-footer-note">
        This is a live preview of the actual controller our team operates at your
        event.  Every effect, color, and slider here matches what we tap on the tablet.
      </p>
    </div>
  );
}
