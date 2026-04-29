"use client";

import { useState } from "react";
import { COLOR_PRESETS, PALETTES, type RGB, type Palette } from "../palettes";

export type ColorMode = "single" | "palette";

interface Props {
  mode: ColorMode;
  color: RGB;
  paletteName: string | null;
  onChangeMode: (m: ColorMode) => void;
  onChangeColor: (c: RGB) => void;
  onChangePalette: (p: Palette) => void;
}

function rgbToCss(c: RGB): string {
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

function colorEquals(a: RGB, b: RGB): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}

export default function ColorTabs({
  mode, color, paletteName, onChangeMode, onChangeColor, onChangePalette,
}: Props) {
  const [recent, setRecent] = useState<RGB[]>([]);

  const pickPreset = (rgb: RGB) => {
    onChangeColor(rgb);
    onChangeMode("single");
    setRecent((prev) => {
      const without = prev.filter((c) => !colorEquals(c, rgb));
      return [rgb, ...without].slice(0, 8);
    });
  };

  return (
    <div className="ll-card" id="ll-colors-section">
      <div id="ll-color-mode-tabs">
        <button
          className={`ll-mode-tab ${mode === "single" ? "active" : ""}`}
          onClick={() => onChangeMode("single")}
        >
          Colors
        </button>
        <button
          className={`ll-mode-tab ${mode === "palette" ? "active" : ""}`}
          onClick={() => onChangeMode("palette")}
        >
          Palettes
        </button>
      </div>

      {mode === "single" && (
        <section className="ll-color-panel active">
          <div className="ll-color-row">
            {COLOR_PRESETS.map((p) => (
              <button
                key={p.name}
                className={`ll-color-swatch ${colorEquals(color, p.rgb) ? "active" : ""}`}
                style={{ background: rgbToCss(p.rgb) }}
                onClick={() => pickPreset(p.rgb)}
                title={p.name}
              />
            ))}
          </div>
          {recent.length > 0 && (
            <>
              <div className="ll-recent-label">Recent</div>
              <div className="ll-color-row ll-recent-row">
                {recent.map((c, i) => (
                  <button
                    key={i}
                    className={`ll-color-swatch ll-color-swatch-sm ${colorEquals(color, c) ? "active" : ""}`}
                    style={{ background: rgbToCss(c) }}
                    onClick={() => pickPreset(c)}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {mode === "palette" && (
        <section className="ll-color-panel active">
          <div className="ll-palette-grid">
            {PALETTES.map((p) => (
              <button
                key={p.name}
                className={`ll-palette-btn ${paletteName === p.name ? "active" : ""}`}
                onClick={() => { onChangePalette(p); onChangeMode("palette"); }}
              >
                <div className="ll-palette-preview">
                  {p.colors.map((c, i) => (
                    <div key={i} className="ll-palette-stripe" style={{ background: rgbToCss(c) }} />
                  ))}
                </div>
                <span className="ll-palette-name">{p.name}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
