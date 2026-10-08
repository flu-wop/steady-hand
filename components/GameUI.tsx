"use client";

import { useSyncExternalStore } from "react";
import HeartRate from "./HeartRate";
import ToolTray from "./ToolTray";
import { activeCase, dispatch, exitToCases, geo, getSnapshot, sitesLeft, subscribe } from "@/lib/gameState";

export default function GameUI() {
  const { state, score } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

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
        <button type="button" onClick={() => dispatch("RESET")}>
          Reset
        </button>
        <button type="button" onClick={exitToCases}>
          Cases
        </button>
        <div className="case-label">
          {activeCase().name} · {activeCase().rule}
        </div>
      </div>
      <HeartRate />
      <ToolTray />
      <p className="instruction">Grab the piece. Lift it out. Don&apos;t touch the rim.</p>
      {state === "success" && <div className="clear">Clear.</div>}
    </div>
  );
}
