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
 *   4. Color / Palette / Custom Mix tabs
 *   5. Speed / Intensity / Brightness sliders
 *   6. Per-effect param sliders (only shown if the active show has any)
 *
 * State lives here; child components are pure presentational.
 *
 * Per-show params are kept in a Record<showId, Record<key, value>> so
 * that switching shows preserves what you set on each one (matching the
 * controller's behavior — its `_show_params` dict is per-show too).
 */

import { useEffect, useMemo, useState } from "react";
import LetterCanvas from "./components/LetterCanvas";
import ShowGrid from "./components/ShowGrid";
import ColorTabs, { type ColorMode } from "./components/ColorTabs";
import Sliders from "./components/Sliders";
import EffectParamsPanel from "./components/EffectParamsPanel";
import { type Palette, type RGB, COLOR_PRESETS, PALETTES } from "./palettes";
import { getShow, defaultParamValues, type ShowParamValue } from "./shows";

const DEFAULT_COLOR: RGB = COLOR_PRESETS[0].rgb;
const DEFAULT_PALETTE: Palette = PALETTES[0];

type ShowParamMap = Record<string, ShowParamValue>;
type AllShowParams = Record<string, ShowParamMap>;

export default function ControllerSimulator() {
  const [activeShow, setActiveShow] = useState<string>("breathe");
  const [colorMode, setColorMode] = useState<ColorMode>("single");
  const [color, setColor] = useState<RGB>(DEFAULT_COLOR);
  const [palette, setPalette] = useState<Palette>(DEFAULT_PALETTE);

  const [speed, setSpeed] = useState(50);
  const [intensity, setIntensity] = useState(70);
  const [brightness, setBrightness] = useState(100);

  // Per-show param values, initialized lazily on first activation
  const [allParams, setAllParams] = useState<AllShowParams>({});

  // Ensure the active show has its default params populated
  useEffect(() => {
    setAllParams((prev) => {
      if (prev[activeShow]) return prev;
      return { ...prev, [activeShow]: defaultParamValues(activeShow) };
    });
  }, [activeShow]);

  const showParams: ShowParamMap = allParams[activeShow] ?? defaultParamValues(activeShow);

  const params = useMemo(() => ({
    color,
    paletteColors: palette.colors,
    // Both palette and custom modes use palette colors — only "single" uses
    // the primary color picker
    usePalette: colorMode === "palette" || colorMode === "custom",
    speed: speed / 100,
    intensity: intensity / 100,
    brightness: brightness / 100,
    showParams,
  }), [color, palette, colorMode, speed, intensity, brightness, showParams]);

  const handleSlider = (k: "speed" | "intensity" | "brightness", v: number) => {
    if (k === "speed") setSpeed(v);
    if (k === "intensity") setIntensity(v);
    if (k === "brightness") setBrightness(v);
  };

  const handleParamChange = (key: string, value: ShowParamValue) => {
    setAllParams((prev) => ({
      ...prev,
      [activeShow]: { ...(prev[activeShow] ?? {}), [key]: value },
    }));
  };

  const show = getShow(activeShow);
  const showLabel = show?.label ?? "Solid";
  const isAudioReactive = show?.category === "Audio Reactive";

  return (
    <div className="ll-controller">
      {/* Status bar */}
      <div className="ll-status-bar">
        <span className="ll-status-logo">LETTERLIGHT MARQUEE</span>
        <div className="ll-status-letters">
          {["M", "R", "&", "M", "R", "S"].map((l, i) => (
            <span key={i} className="ll-status-letter">
              <span className="ll-status-dot" />
              <span className="ll-status-letter-label">{l}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Live preview — sticky.  Audio-reactive note lives INSIDE this card
       *  so it scrolls with the preview when an audio show is active. */}
      <div className="ll-card ll-preview-card">
        <div className="ll-preview-header">
          <span className="ll-section-label">Live Preview</span>
          <span className="ll-preview-show-name">{showLabel}</span>
        </div>
        <LetterCanvas showId={activeShow} params={params} />

        {isAudioReactive && (
          <div className="ll-audio-note">
            <span className="ll-audio-note-icon">🎤</span>
            <span>
              <strong>Audio-reactive demo.</strong>{" "}
              At your event, this effect responds to your DJ&apos;s music in real
              time through a microphone we plug into the controller.  Here, you&apos;re
              seeing a synthetic preview so you can get a feel for how it moves.
            </span>
          </div>
        )}
      </div>

      {/* Show grid */}
      <ShowGrid activeShow={activeShow} onSelectShow={setActiveShow} />

      {/* Colors / Palettes / Custom Mix */}
      <ColorTabs
        mode={colorMode}
        color={color}
        paletteName={palette.name}
        onChangeMode={setColorMode}
        onChangeColor={setColor}
        onChangePalette={setPalette}
      />

      {/* Universal sliders */}
      <Sliders
        speed={speed}
        intensity={intensity}
        brightness={brightness}
        onChange={handleSlider}
      />

      {/* Per-effect params (only renders if show has any) */}
      <EffectParamsPanel
        show={show}
        values={showParams}
        onChange={handleParamChange}
      />

      <p className="ll-footer-note">
        This is a live preview of the actual controller you&apos;ll operate at
        your event.  Every effect, color, and slider here matches what you&apos;ll
        tap on the tablet on the night of.
      </p>
      <p className="ll-footer-note ll-footer-disclaimer">
        Note: real LEDs in your venue&apos;s ambient lighting will look different
        than your screen — colors, glow, and brightness all shift in person.
        Use this preview as a design guide; we&apos;ll dial in the exact look
        with you at setup.
      </p>
    </div>
  );
}
