/** What sits in a cavity. Drawn in components/Piece.tsx; the collider and
 *  grab point are the same for every piece. */
export type PieceId = "button" | "key" | "pin" | "marble" | "cork" | "bug";

export const PIECE_LABELS: Record<PieceId, string> = {
  button: "Lost button",
  key: "House key",
  pin: "Bent pin",
  marble: "Marble",
  cork: "Cork",
  bug: "June bug",
};

/** A case is data only. The scene reads the active case through gameState. */
export type Case = {
  id: string;
  name: string;
  complaint: string;
  /** The one rule that changes, shown on the select card. */
  rule: string;
  /** Body tint. */
  skin: string;
  /** Drape color. */
  drape: string;
  /** Multiplies RIM_RADIUS and the rim tubes. */
  rimScale: number;
  /** Multiplies cavity depth and the lift above the rim needed to clear. */
  depthScale: number;
  /** Shake multiplier from pointer speed while lifting. */
  drift: number;
  /** Number of cavities. */
  cavityCount: number;
  /** One piece per cavity, left to right. */
  pieces: PieceId[];
};

export const CASES: Case[] = [
  {
    id: "walk-in",
    name: "Walk-in",
    complaint: "Something in my side.",
    rule: "wide rim",
    skin: "#d9a184",
    drape: "#3f6f6a",
    rimScale: 1.35,
    depthScale: 1,
    drift: 0,
    cavityCount: 1,
    pieces: ["button"],
  },
  {
    id: "deep",
    name: "Deep",
    complaint: "It feels buried.",
    rule: "deeper",
    skin: "#b77b5a",
    drape: "#4a5a7a",
    rimScale: 1,
    depthScale: 1.6,
    drift: 0,
    cavityCount: 1,
    pieces: ["key"],
  },
  {
    id: "narrow",
    name: "Narrow",
    complaint: "Don't nick me.",
    rule: "tight rim",
    skin: "#e8b99a",
    drape: "#6a4a6f",
    rimScale: 0.72,
    depthScale: 1,
    drift: 0,
    cavityCount: 1,
    pieces: ["pin"],
  },
  {
    id: "double",
    name: "Double",
    complaint: "Both sides.",
    rule: "two sites",
    skin: "#8d5a3f",
    drape: "#5f6f3a",
    rimScale: 1,
    depthScale: 1,
    drift: 0,
    cavityCount: 2,
    pieces: ["marble", "cork"],
  },
  {
    id: "nervous",
    name: "Nervous",
    complaint: "I can't hold still.",
    rule: "shaky",
    skin: "#c99a7c",
    drape: "#7a4a3a",
    rimScale: 1,
    depthScale: 1,
    drift: 0.12,
    cavityCount: 1,
    pieces: ["bug"],
  },
];

export const pieceLabels = (c: Case) => c.pieces.map((id) => PIECE_LABELS[id]).join(" and ");

export const getCase = (id: string) => CASES.find((c) => c.id === id) ?? CASES[0];
