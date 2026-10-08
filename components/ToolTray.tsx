"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CLOSE_HOLD_MS, closeCase, getSnapshot, setTool, subscribe } from "@/lib/gameState";

/** Right-edge tray: swab → forceps → close. Needle stays a placeholder. */
export default function ToolTray() {
  const { step, tool } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const [hold, setHold] = useState(0);
  const holdStart = useRef<number | null>(null);
  const raf = useRef(0);

  const stopHold = () => {
    holdStart.current = null;
    cancelAnimationFrame(raf.current);
    setHold(0);
  };

  const startHold = () => {
    if (step !== "close") return;
    holdStart.current = performance.now();
    const tick = () => {
      if (holdStart.current === null) return;
      const p = Math.min(1, (performance.now() - holdStart.current) / CLOSE_HOLD_MS);
      setHold(p);
      if (p >= 1) {
        holdStart.current = null;
        closeCase();
        return;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const swabDone = step !== "swab";
  const extractDone = step === "close" || step === "closed";

  return (
    <div className="tray" role="toolbar" aria-label="Tools">
      <button
        type="button"
        className={`tool${tool === "swab" ? " tool-active" : ""}${step === "swab" && tool !== "swab" ? " tool-next" : ""}${swabDone ? " tool-done" : ""}`}
        aria-pressed={tool === "swab"}
        disabled={step !== "swab"}
        onClick={() => setTool("swab")}
      >
        Swab{swabDone && " ✓"}
      </button>
      <button
        type="button"
        className={`tool${tool === "forceps" ? " tool-active" : ""}${step === "extract" && tool !== "forceps" ? " tool-next" : ""}${extractDone ? " tool-done" : ""}`}
        aria-pressed={tool === "forceps"}
        disabled={step !== "extract"}
        onClick={() => setTool("forceps")}
      >
        Forceps{extractDone && " ✓"}
      </button>
      <button type="button" className="tool" disabled>
        Needle
      </button>
      <button
        type="button"
        className={`tool tool-hold${step === "close" ? " tool-next" : ""}${step === "closed" ? " tool-done" : ""}`}
        disabled={step !== "close"}
        onPointerDown={startHold}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        onPointerCancel={stopHold}
        aria-label={step === "close" ? "Close: press and hold" : "Close"}
      >
        <span className="tool-hold-fill" style={{ transform: `scaleX(${hold})` }} />
        <span className="tool-hold-label">Close{step === "closed" && " ✓"}</span>
      </button>
    </div>
  );
}
