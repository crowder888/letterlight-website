"use client";

interface Props {
  speed: number;       // 0-100
  intensity: number;   // 0-100
  brightness: number;  // 0-100
  onChange: (k: "speed" | "intensity" | "brightness", v: number) => void;
}

const ROWS: Array<{
  key: "speed" | "intensity" | "brightness";
  name: string;
  left: string;
  right: string;
}> = [
  { key: "speed",      name: "Speed",      left: "Slower", right: "Faster" },
  { key: "intensity",  name: "Intensity",  left: "Subtle", right: "Bold" },
  { key: "brightness", name: "Brightness", left: "Dim",    right: "Full" },
];

export default function Sliders({ speed, intensity, brightness, onChange }: Props) {
  const values = { speed, intensity, brightness };
  return (
    <div className="ll-card" id="ll-sliders">
      {ROWS.map((row) => (
        <div key={row.key} className="ll-slider-group">
          <label>
            <span className="ll-slider-label-left">{row.left}</span>
            <span className="ll-slider-name">{row.name}</span>
            <span className="ll-slider-label-right">{row.right}</span>
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={values[row.key]}
            onChange={(e) => onChange(row.key, Number(e.target.value))}
          />
        </div>
      ))}
    </div>
  );
}
