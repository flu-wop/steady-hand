"use client";

import { useSyncExternalStore } from "react";
import { dispatch, getSnapshot, subscribe } from "@/lib/gameState";

export default function GameUI() {
  const { state, score } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return (
    <div className="ui">
      <div className="hud">
        <div>
          Score <strong>{score}</strong>
        </div>
        <div className="state">state: {state}</div>
        <button type="button" onClick={() => dispatch("RESET")}>
          Reset
        </button>
      </div>
      <p className="instruction">Grab the piece. Lift it out. Don&apos;t touch the rim.</p>
      {state === "success" && <div className="clear">Clear.</div>}
    </div>
  );
}
