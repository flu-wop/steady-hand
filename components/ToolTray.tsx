"use client";

const TOOLS = [
  { id: "swab", label: "Swab", active: false },
  { id: "forceps", label: "Forceps", active: true },
  { id: "needle", label: "Needle", active: false },
  { id: "close", label: "Close", active: false },
];

/** Right-edge tray. Only forceps (the tweezers) is live; the rest are placeholders. */
export default function ToolTray() {
  return (
    <div className="tray" role="toolbar" aria-label="Tools">
      {TOOLS.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`tool${t.active ? " tool-active" : ""}`}
          aria-pressed={t.active}
          disabled={!t.active}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
