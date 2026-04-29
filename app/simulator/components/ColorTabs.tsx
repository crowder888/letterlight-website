"use client";

/**
 * ColorTabs — Colors / Palettes / Custom Mix tabbed UI matching the
 * operator tablet (mrc-marquee-controller/templates/index.html +
 * static/app.js).
 */

import { useEffect, useState } from "react";
import { COLOR_PRESETS, PALETTES, type RGB, type Palette } from "../palettes";
import {
  loadRecentColors, pushRecentColor,
  loadUserPalettes, saveUserPalette, deleteUserPalette,
} from "../userPalettes";
import ColorWheel from "./ColorWheel";

export type ColorMode = "single" | "palette" | "custom";

interface Props {
  mode: ColorMode;
  color: RGB;
  paletteName: string | null;
  onChangeMode: (m: ColorMode) => void;
  onChangeColor: (c: RGB) => void;
  onChangePalette: (p: Palette) => void;
}

function rgbCss(c: RGB): string {
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

function colorEq(a: RGB, b: RGB): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}

const CONIC_GRADIENT =
  "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)";

export default function ColorTabs({
  mode, color, paletteName, onChangeMode, onChangeColor, onChangePalette,
}: Props) {
  const [wheelOpen, setWheelOpen] = useState(false);
  const [recent, setRecent] = useState<RGB[]>([]);
  const [userPalettes, setUserPalettes] = useState<Palette[]>([]);

  // Custom palette builder state
  const [slotCount, setSlotCount] = useState(0);
  const [slots, setSlots] = useState<(RGB | null)[]>([]);
  const [editingSlot, setEditingSlot] = useState<number | null>(null);

  // Hydrate from localStorage after mount (avoid SSR mismatch)
  useEffect(() => {
    setRecent(loadRecentColors());
    setUserPalettes(loadUserPalettes());
  }, []);

  function pickColor(rgb: RGB) {
    onChangeColor(rgb);
    onChangeMode("single");
    setRecent(pushRecentColor(rgb));
  }

  function startCustom(n: number) {
    setSlotCount(n);
    setSlots(new Array(n).fill(null));
    setEditingSlot(0);
  }

  function resetCustom() {
    setSlotCount(0);
    setSlots([]);
    setEditingSlot(null);
  }

  function setSlotColor(idx: number, rgb: RGB) {
    const next = [...slots];
    next[idx] = rgb;
    setSlots(next);
    let nextEmpty = -1;
    for (let i = 1; i <= slotCount; i++) {
      const j = (idx + i) % slotCount;
      if (!next[j]) { nextEmpty = j; break; }
    }
    setEditingSlot(nextEmpty >= 0 ? nextEmpty : null);

    if (next.every((c) => c !== null)) {
      onChangePalette({ name: "Custom", colors: next as RGB[] });
      onChangeMode("palette");
    }
  }

  function saveCustomPalette() {
    if (!slots.every((c) => c !== null)) return;
    const name = window.prompt("Name this palette:");
    if (!name) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    const next = saveUserPalette(trimmed, slots as RGB[]);
    setUserPalettes(next);
    resetCustom();
    onChangePalette({ name: trimmed, colors: slots as RGB[] });
    onChangeMode("palette");
  }

  function removeUserPalette(name: string) {
    if (!window.confirm(`Delete palette "${name}"?`)) return;
    const next = deleteUserPalette(name);
    setUserPalettes(next);
  }

  return (
    <div className="ll-card" id="ll-colors-section">
      <div id="ll-color-mode-tabs">
        <button
          type="button"
          className={`ll-mode-tab ${mode === "single" ? "active" : ""}`}
          onClick={() => onChangeMode("single")}
        >
          Colors
        </button>
        <button
          type="button"
          className={`ll-mode-tab ${mode === "palette" ? "active" : ""}`}
          onClick={() => onChangeMode("palette")}
        >
          Palettes
        </button>
        <button
          type="button"
          className={`ll-mode-tab ${mode === "custom" ? "active" : ""}`}
          onClick={() => onChangeMode("custom")}
        >
          Custom Mix
        </button>
      </div>

      {/* ── Colors tab ─────────────────────────────────────────────── */}
      {mode === "single" && (
        <section className="ll-color-panel active">
          <div className="ll-color-picker-row">
            <button
              type="button"
              className="ll-pick-color-btn"
              onClick={() => setWheelOpen(true)}
            >
              <span className="ll-pick-color-wheel" style={{ background: CONIC_GRADIENT }} />
              <span className="ll-pick-color-text">Pick a Color</span>
            </button>
          </div>

          <div className="ll-recent-label">Presets</div>
          <div className="ll-color-row">
            {COLOR_PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                className={`ll-color-swatch ${colorEq(color, p.rgb) ? "active" : ""}`}
                style={{ background: rgbCss(p.rgb) }}
                onClick={() => pickColor(p.rgb)}
                title={p.name}
              />
            ))}
          </div>

          {recent.length > 0 && (
            <>
              <div className="ll-recent-label">Recent</div>
              <div className="ll-color-row">
                {recent.map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`ll-color-swatch ll-color-swatch-sm ${colorEq(color, c) ? "active" : ""}`}
                    style={{ background: rgbCss(c) }}
                    onClick={() => pickColor(c)}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {/* ── Palettes tab ───────────────────────────────────────────── */}
      {mode === "palette" && (
        <section className="ll-color-panel active">
          <div className="ll-palette-grid">
            {PALETTES.map((p) => (
              <PaletteButton
                key={p.name}
                palette={p}
                active={paletteName === p.name}
                onClick={() => { onChangePalette(p); onChangeMode("palette"); }}
              />
            ))}
          </div>

          {userPalettes.length > 0 && (
            <>
              <div className="ll-palette-section-divider">
                <span>My Palettes</span>
                <small>Right-click to delete</small>
              </div>
              <div className="ll-palette-grid">
                {userPalettes.map((p) => (
                  <PaletteButton
                    key={p.name}
                    palette={p}
                    active={paletteName === p.name}
                    user
                    onClick={() => { onChangePalette(p); onChangeMode("palette"); }}
                    onDelete={() => removeUserPalette(p.name)}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {/* ── Custom Mix tab ─────────────────────────────────────────── */}
      {mode === "custom" && (
        <section className="ll-color-panel active">
          {slotCount === 0 ? (
            <>
              <div className="ll-custom-info">How many colors?</div>
              <div className="ll-count-buttons">
                {[2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className="ll-count-btn"
                    onClick={() => startCustom(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="ll-custom-info">
                {slots.every((c) => c !== null)
                  ? "All set — save it or tap a slot to change a color."
                  : "Tap a slot to choose its color."}
              </div>
              <div className="ll-palette-slots">
                {slots.map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    className={[
                      "ll-palette-slot",
                      c ? "filled" : "",
                      editingSlot === i ? "selected" : "",
                    ].join(" ")}
                    style={c ? { background: rgbCss(c) } : undefined}
                    onClick={() => setEditingSlot(i)}
                  >
                    {!c && (i + 1)}
                  </button>
                ))}
              </div>
              <div className="ll-custom-actions">
                {slots.every((c) => c !== null) && (
                  <button
                    type="button"
                    className="ll-action-btn"
                    onClick={saveCustomPalette}
                  >
                    Save Palette
                  </button>
                )}
                <button
                  type="button"
                  className="ll-action-btn ll-action-secondary"
                  onClick={resetCustom}
                >
                  Start Over
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {/* ── Color wheel: shared by Colors tab + Custom slot editor ── */}
      <ColorWheel
        open={wheelOpen || editingSlot !== null}
        initial={
          editingSlot !== null && slots[editingSlot]
            ? (slots[editingSlot] as RGB)
            : color
        }
        onPreview={(rgb) => {
          if (wheelOpen) onChangeColor(rgb);
        }}
        onConfirm={(rgb) => {
          if (wheelOpen) {
            setWheelOpen(false);
            pickColor(rgb);
          } else if (editingSlot !== null) {
            setSlotColor(editingSlot, rgb);
          }
        }}
        onCancel={() => {
          setWheelOpen(false);
          setEditingSlot(null);
        }}
      />
    </div>
  );
}

function PaletteButton({
  palette, active, user, onClick, onDelete,
}: {
  palette: Palette;
  active: boolean;
  user?: boolean;
  onClick: () => void;
  onDelete?: () => void;
}) {
  return (
    <button
      type="button"
      className={`ll-palette-btn ${active ? "active" : ""} ${user ? "user" : ""}`}
      onClick={onClick}
      onContextMenu={(e) => {
        if (onDelete) { e.preventDefault(); onDelete(); }
      }}
    >
      <div className="ll-palette-preview">
        {palette.colors.map((c, i) => (
          <div key={i} className="ll-palette-stripe" style={{ background: rgbCss(c) }} />
        ))}
      </div>
      <span className="ll-palette-name">{palette.name}</span>
    </button>
  );
}
