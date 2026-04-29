"use client";

import { SHOW_CATEGORIES, SHOWS_BY_CATEGORY } from "../shows";

interface Props {
  activeShow: string;
  onSelectShow: (id: string) => void;
}

export default function ShowGrid({ activeShow, onSelectShow }: Props) {
  return (
    <div className="ll-card" id="ll-shows-section">
      <div className="ll-section-label" style={{ marginBottom: 10 }}>Shows</div>
      {SHOW_CATEGORIES.map((cat) => (
        <div key={cat} className="ll-show-category">
          <div className="ll-show-category-label">{cat}</div>
          <div className="ll-shows-grid">
            {SHOWS_BY_CATEGORY[cat].map((s) => (
              <button
                key={s.id}
                className={`ll-show-btn ${activeShow === s.id ? "active" : ""} ${s.implemented ? "" : "soon"}`}
                onClick={() => onSelectShow(s.id)}
                title={s.implemented ? s.label : `${s.label} — coming soon to the live preview`}
              >
                {s.label}
                {!s.implemented && <span className="ll-soon-tag">SOON</span>}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
