"use client";

import { useSyncExternalStore } from "react";
import HeartRate from "./HeartRate";
import ToolTray from "./ToolTray";
import { activeCase, dispatch, exitToCases, geo, getSnapshot, sitesLeft, subscribe } from "@/lib/gameState";

export default function GameUI() {
  const { state, score, step, tool, swab } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const c = activeCase();

  const instruction =
    step === "swab"
      ? tool === "swab"
        ? "Drag the swab across the window."
        : "Pick up the swab."
      : step === "extract"
        ? tool === "forceps"
          ? "Grab the piece. Lift it out. Don't touch the rim."
          : "Swabbed. Pick up the forceps."
        : step === "close"
          ? "All out. Press and hold Close."
          : "";

  return (
    <div className="ui">
      <div className="hud">
        <div>
          Score <strong>{score}</strong>
        </div>
        <div className="state">state: {state}</div>
        {geo.sites.length > 1 && (
          <div className="sites">
            Out {geo.sites.length - sitesLeft()}/{geo.sites.length}
          </div>
        )}
        {step !== "closed" && (
          <button type="button" onClick={() => dispatch("RESET")}>
            Reset
          </button>
        )}
        <button type="button" onClick={exitToCases}>
          Cases
        </button>
        <div className="case-label">
          {c.name} · {c.rule}
        </div>
      </div>

      <div className={`meter${step === "swab" ? "" : " meter-done"}`} aria-label={`Swab ${Math.floor(swab)} percent`}>
        <span className="meter-label">Swab</span>
        <span className="meter-track">
          <span className="meter-fill" style={{ transform: `scaleX(${swab / 100})` }} />
        </span>
        <span className="meter-value">{Math.floor(swab)}</span>
      </div>

      <HeartRate />
      <ToolTray />
      {instruction && <p className="instruction">{instruction}</p>}
      {state === "success" && step === "close" && <div className="clear">Clear.</div>}

      {step === "closed" && (
        <div className="summary" role="dialog" aria-label="Case closed">
          <div className="summary-kicker">Closed</div>
          <div className="summary-name">{c.name}</div>
          <div className="summary-score">
            Score <strong>{score}</strong>
          </div>
          <button type="button" className="summary-next" onClick={exitToCases}>
            Next case
          </button>
        </div>
      )}
    </div>
  );
}
