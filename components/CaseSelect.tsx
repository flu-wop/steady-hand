"use client";

import { CASES, pieceLabels } from "@/lib/cases";
import { goToTitle, selectCase } from "@/lib/gameState";

export default function CaseSelect() {
  return (
    <div className="select">
      <button type="button" className="wordmark" onClick={goToTitle}>
        Steady Hand
      </button>
      <h1>Pick a case.</h1>
      <div className="cards">
        {CASES.map((c) => (
          <button key={c.id} type="button" className="card" onClick={() => selectCase(c.id)}>
            <span className="swatch" style={{ background: c.skin }} />
            <span className="card-name">{c.name}</span>
            <span className="card-complaint">&ldquo;{c.complaint}&rdquo;</span>
            <span className="card-piece">{pieceLabels(c)}</span>
            <span className="card-rule">{c.rule}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
