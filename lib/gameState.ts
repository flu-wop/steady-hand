import { Vector3 } from "three";
import { CASES, getCase, type Case } from "./cases";

// ─── Tuning ─────────────────────────────────────────────────────────────────
// Feel lives here. Change these first; nothing else should need touching.

/** Tip wobble. 0 for now; shake will come from pointer speed, not a timer. */
export const DRIFT = 0;
/** Piece origin height (world Y) that counts as "out", at depthScale 1. */
export const CLEAR_HEIGHT = 1.5;
/** Major radius of the metal rim around the cavity opening, at rimScale 1. */
export const RIM_RADIUS = 0.22;

/** Visible rim tube radius, at rimScale 1. */
export const RIM_TUBE = 0.025;
/** Invisible trigger tube radius, at rimScale 1. Slightly larger than the visible rim. */
export const RIM_TRIGGER_TUBE = 0.04;
/** Collision radius of each tip sample point. */
export const TIP_RADIUS = 0.012;
/** Length of each arm, measured up from the end, that counts as "tip". */
export const TIP_LENGTH = 0.14;
/** World units of lift per unit of vertical pointer travel (NDC, screen = 2). */
export const LIFT_SCALE = 1.6;
/** World units of lateral travel per unit of horizontal pointer travel (NDC). */
export const LATERAL_SCALE = 2.0;
/** Vertical pointer travel (NDC) that starts a lift. */
export const LIFT_START = 0.01;
/** How close (XZ) the tips must be to the grab point to grab. */
export const GRAB_RADIUS = 0.08;
/** Height of the plane the tips float on when not holding anything. */
export const HOVER_HEIGHT = 1.35;
/** How long the buzz state lasts before the piece resets. */
export const BUZZ_MS = 700;

// ─── Layout (shared by the scene components) ────────────────────────────────

/** Center of the cavity opening; the rim sits here. */
export const CAVITY_CENTER = new Vector3(0.15, 1.2, 0);
/** Floor of the cavity, at depthScale 1. */
export const CAVITY_FLOOR_Y = 0.96;
/** Piece origin sits this far above the cavity floor. */
const PIECE_REST_LIFT = 0.045;

// ─── Active case geometry ───────────────────────────────────────────────────
// Base constants above scaled by the active case. Mutated in place by
// selectCase(); the scene mounts after a case is chosen and reads it then.

export const geo = {
  rimRadius: RIM_RADIUS,
  rimTube: RIM_TUBE,
  rimTriggerTube: RIM_TRIGGER_TUBE,
  floorY: CAVITY_FLOOR_Y,
  clearHeight: CLEAR_HEIGHT,
  pieceRest: new Vector3(CAVITY_CENTER.x, CAVITY_FLOOR_Y + PIECE_REST_LIFT, CAVITY_CENTER.z),
};

function applyCase(c: Case) {
  geo.rimRadius = RIM_RADIUS * c.rimScale;
  geo.rimTube = RIM_TUBE * c.rimScale;
  geo.rimTriggerTube = RIM_TRIGGER_TUBE * c.rimScale;
  geo.floorY = CAVITY_CENTER.y - (CAVITY_CENTER.y - CAVITY_FLOOR_Y) * c.depthScale;
  geo.clearHeight = CAVITY_CENTER.y + (CLEAR_HEIGHT - CAVITY_CENTER.y) * c.depthScale;
  geo.pieceRest.set(CAVITY_CENTER.x, geo.floorY + PIECE_REST_LIFT, CAVITY_CENTER.z);
}

/** Grab point, relative to the piece origin. */
export const GRAB_OFFSET = new Vector3(0, 0.05, 0);

// ─── State machine ──────────────────────────────────────────────────────────

export type GameState = "idle" | "hover" | "grabbed" | "lifting" | "success" | "buzz";

export type GameEvent =
  | "TIPS_OVER"
  | "TIPS_LEFT"
  | "POINTER_DOWN"
  | "LIFT_START"
  | "RIM_HIT"
  | "CLEARED"
  | "RELEASE"
  | "BUZZ_DONE"
  | "RESET";

const TRANSITIONS: Record<GameState, Partial<Record<GameEvent, GameState>>> = {
  idle: { TIPS_OVER: "hover" },
  hover: { TIPS_LEFT: "idle", POINTER_DOWN: "grabbed" },
  grabbed: { LIFT_START: "lifting", RELEASE: "idle" },
  lifting: { RIM_HIT: "buzz", CLEARED: "success", RELEASE: "idle" },
  success: {},
  buzz: { BUZZ_DONE: "idle" },
};

export const isHeld = (s: GameState) => s === "grabbed" || s === "lifting";

// ─── Mutable per-frame data (not React state) ───────────────────────────────

export const sim = {
  /** Midpoint between the two tip ends. */
  tip: new Vector3(CAVITY_CENTER.x, HOVER_HEIGHT, 0.6),
  /** Piece origin. */
  piece: geo.pieceRest.clone(),
  pieceVisible: true,
  /** Pointer NDC and tip position at the moment of the grab. */
  grabNdc: { x: 0, y: 0 },
  grabTip: new Vector3(),
};

// ─── Store ──────────────────────────────────────────────────────────────────

type Snapshot = { state: GameState; score: number; caseId: string | null };
let snapshot: Snapshot = { state: "idle", score: 0, caseId: null };
const listeners = new Set<() => void>();
let buzzTimer: ReturnType<typeof setTimeout> | null = null;

export const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
export const getSnapshot = () => snapshot;

const set = (next: Partial<Snapshot>) => {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((fn) => fn());
};

function resetPiece() {
  sim.piece.copy(geo.pieceRest);
  sim.pieceVisible = true;
}

function clearBuzz() {
  if (buzzTimer) clearTimeout(buzzTimer);
  buzzTimer = null;
}

export const activeCase = () => (snapshot.caseId ? getCase(snapshot.caseId) : CASES[0]);

/** Pick a case from the select screen; mounts the scene. */
export function selectCase(id: string) {
  clearBuzz();
  applyCase(getCase(id));
  resetPiece();
  set({ caseId: id, state: "idle" });
}

/** Back to the select screen. Score resets. */
export function exitToCases() {
  clearBuzz();
  resetPiece();
  set({ caseId: null, state: "idle", score: 0 });
}

export function dispatch(event: GameEvent) {
  const from = snapshot.state;

  if (event === "RESET") {
    clearBuzz();
    resetPiece();
    set({ state: "idle" });
    return;
  }

  const to = TRANSITIONS[from][event];
  if (!to) return;

  if (to === "success") {
    sim.pieceVisible = false;
    set({ state: to, score: snapshot.score + 1 });
    return;
  }

  if (to === "buzz") {
    playBuzz();
    buzzTimer = setTimeout(() => {
      buzzTimer = null;
      resetPiece();
      dispatch("BUZZ_DONE");
    }, BUZZ_MS);
  }

  set({ state: to });
}

// ─── Audio ──────────────────────────────────────────────────────────────────

let audio: AudioContext | null = null;

/** Call from a user gesture so the context is allowed to start. */
export function unlockAudio() {
  if (!audio) audio = new AudioContext();
  if (audio.state === "suspended") void audio.resume();
}

function playBuzz() {
  if (!audio) return;
  const t = audio.currentTime;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(110, t);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.18, t + 0.01);
  gain.gain.setValueAtTime(0.18, t + 0.3);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
  osc.connect(gain).connect(audio.destination);
  osc.start(t);
  osc.stop(t + 0.42);
}
