"use client";

/**
 * EffectParamsPanel
 *
 * Renders the per-show custom controls (sliders + color swatches) below
 * the universal Speed/Intensity/Brightness sliders.  Mirrors the
 * effect-params-sliders block from the operator tablet.
 */

import { useState } from "react";
import type { ShowDef, ShowParam, ShowParamValue } from "../shows";
import type { RGB } from "../palettes";
import ColorWheel from "./ColorWheel";

interface Props {
  show: ShowDef | undefined;
  values: Record<string, ShowParamValue>;
  onChange: (key: string, value: ShowParamValue) => void;
}

function rgbCss(c: RGB): string {
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

export default function EffectParamsPanel({ show, values, onChange }: Props) {
  const [editingColorKey, setEditingColorKey] = useState<string | null>(null);

  if (!show?.params || show.params.length === 0) return null;

  const editingParam = editingColorKey
    ? show.params.find((p) => p.key === editingColorKey)
    : null;
  const editingInitial = editingParam ? (values[editingParam.key] as RGB) : ([255, 255, 255] as RGB);

  return (
    <>
      <div className="ll-card ll-effect-params">
        <div className="ll-effect-params-header">
          <span className="ll-section-label">{show.label} Settings</span>
        </div>
        <div className="ll-effect-params-grid">
          {show.params.map((p) => (
            <ParamRow
              key={p.key}
              param={p}
              value={values[p.key] ?? p.default}
              onChange={(v) => onChange(p.key, v)}
              onOpenColorPicker={() => setEditingColorKey(p.key)}
            />
          ))}
        </div>
      </div>

      <ColorWheel
        open={editingColorKey !== null}
        initial={editingInitial}
        onConfirm={(rgb) => {
          if (editingColorKey) onChange(editingColorKey, rgb);
          setEditingColorKey(null);
        }}
        onCancel={() => setEditingColorKey(null)}
      />
    </>
  );
}

function ParamRow({
  param, value, onChange, onOpenColorPicker,
}: {
  param: ShowParam;
  value: ShowParamValue;
  onChange: (v: ShowParamValue) => void;
  onOpenColorPicker: () => void;
}) {
  if (param.type === "color") {
    const c = (value as RGB) ?? (param.default as RGB);
    return (
      <div className="ll-effect-param-group">
        <label>
          <span className="ll-effect-param-name">{param.label}</span>
        </label>
        <button
          type="button"
          className="ll-effect-param-color"
          style={{ background: rgbCss(c) }}
          onClick={onOpenColorPicker}
        >
          <span>Tap to change</span>
        </button>
      </div>
    );
  }

  const numericValue = typeof value === "number" ? value : (param.default as number);
  return (
    <div className="ll-effect-param-group">
      <label>
        <span className="ll-effect-param-name">{param.label}</span>
        <span className="ll-effect-param-value">{numericValue}</span>
      </label>
      <input
        type="range"
        min={param.min ?? 0}
        max={param.max ?? 100}
        value={numericValue}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
