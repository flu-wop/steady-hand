"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { getSnapshot, subscribe } from "@/lib/gameState";

const IDLE_MIN = 72;
const IDLE_MAX = 78;
const BUZZ_BPM = 120;
const TICK_MS = 250;

/** HUD heart rate. Idles 72–78, spikes to ~120 during buzz, then settles. */
export default function HeartRate() {
  const { state } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const [bpm, setBpm] = useState(75);
  const idleTarget = useRef(75);
  const buzzing = state === "buzz";

  useEffect(() => {
    if (buzzing) setBpm(BUZZ_BPM - 2 + Math.round(Math.random() * 4));
  }, [buzzing]);

  useEffect(() => {
    const id = setInterval(() => {
      if (getSnapshot().state === "buzz") return;
      // Wander inside the idle band; ease back down after a spike.
      if (Math.random() < 0.15) idleTarget.current = IDLE_MIN + Math.random() * (IDLE_MAX - IDLE_MIN);
      setBpm((b) => {
        const next = b + (idleTarget.current - b) * (b > IDLE_MAX ? 0.18 : 0.3);
        return Math.round(next);
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={`heart${buzzing ? " heart-alarm" : ""}`} aria-label={`Heart rate ${bpm} beats per minute`}>
      <span className="heart-icon" style={{ animationDuration: `${60 / bpm}s` }}>
        ♥
      </span>
      <span className="heart-bpm">{bpm}</span>
      <span className="heart-unit">bpm</span>
    </div>
  );
}
