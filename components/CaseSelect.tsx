"use client";

import { CASES } from "@/lib/cases";
import { selectCase } from "@/lib/gameState";

export default function CaseSelect() {
  return (
    <div className="select">
      <h1>Steady Hand</h1>
      <p className="select-sub">Pick a case.</p>
      <div className="cards">
        {CASES.map((c) => (
          <button key={c.id} type="button" className="card" onClick={() => selectCase(c.id)}>
            <span className="swatch" style={{ background: c.skin }} />
            <span className="card-name">{c.name}</span>
            <span className="card-complaint">&ldquo;{c.complaint}&rdquo;</span>
            <span className="card-rule">{c.rule}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
