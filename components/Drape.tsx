"use client";

import { useMemo } from "react";
import { BufferGeometry, DoubleSide, Float32BufferAttribute } from "three";
import { CAVITY_CENTER, activeCase } from "@/lib/gameState";

// Torso it covers (matches Patient.tsx): capsule along X, radius 0.6,
// straight section x ∈ [-0.6, 0.8], center y 0.6, flattened 1.3× in Z.
const TORSO_Y = 0.6;
const TORSO_R = 0.6;
const TORSO_Z_SCALE = 1.3;
const STRAIGHT_MIN_X = -0.6;
const STRAIGHT_MAX_X = 0.8;

/** Sheet sits this much proud of the skin. */
const LIFT = 1.04;
/** Sheet extent along the body. Left edge stops short of the head. */
const X_MIN = -0.95;
const X_MAX = 1.45;
/** Hem height above the table. */
const HEM_Y = 0.02;

/** Oval window around the cavity, in sheet space (x, arc angle). */
const WINDOW = { x: CAVITY_CENTER.x, v: 0, ax: 0.46, av: 0.52 };

const NU = 140;
const NV = 170;
const HANG = (TORSO_Y - HEM_Y) / (TORSO_R * LIFT);
const V_MAX = Math.PI / 2 + HANG;

/** Sheet surface. u = world x, v = angle over the torso, past ±π/2 it hangs. */
function surface(u: number, v: number): [number, number, number] {
  // Past the straight section the sheet rolls over the capsule's end.
  const d = u < STRAIGHT_MIN_X ? STRAIGHT_MIN_X - u : u > STRAIGHT_MAX_X ? u - STRAIGHT_MAX_X : 0;
  const k = Math.max(0.05, Math.sqrt(Math.max(0, 1 - (d / (TORSO_R * 1.1)) ** 2)));
  const r = TORSO_R * LIFT * k;
  const top = Math.min(Math.abs(v), Math.PI / 2);
  const side = Math.sign(v);
  let y = TORSO_Y + r * Math.cos(top);
  let z = side * r * TORSO_Z_SCALE * Math.sin(top);
  const hang = Math.abs(v) - Math.PI / 2;
  if (hang > 0) {
    const drop = hang * TORSO_R * LIFT;
    y = Math.max(HEM_Y, TORSO_Y - drop);
    z += side * drop * 0.12; // slight flare toward the hem
  }
  return [u, y, z];
}

/** Grid sheet with the window cut out; edge vertices snapped onto the oval. */
function buildDrape() {
  const cols = NU + 1;
  const pos: number[] = [];
  const params: [number, number][] = [];

  for (let j = 0; j <= NV; j++) {
    for (let i = 0; i <= NU; i++) {
      params.push([X_MIN + ((X_MAX - X_MIN) * i) / NU, -V_MAX + (2 * V_MAX * j) / NV]);
    }
  }
  const e = params.map(([u, v]) => Math.hypot((u - WINDOW.x) / WINDOW.ax, (v - WINDOW.v) / WINDOW.av));

  const outside = e.map((x) => x >= 1);
  const near = (i: number, j: number) => {
    for (let b = j - 1; b <= j + 1; b++)
      for (let a = i - 1; a <= i + 1; a++)
        if (a >= 0 && a <= NU && b >= 0 && b <= NV && outside[b * cols + a]) return true;
    return false;
  };

  for (let j = 0; j <= NV; j++) {
    for (let i = 0; i <= NU; i++) {
      const n = j * cols + i;
      let [u, v] = params[n];
      // Inside vertices next to the sheet (incl. diagonals) move onto the oval.
      if (!outside[n] && near(i, j)) {
        u = WINDOW.x + (u - WINDOW.x) / e[n];
        v = WINDOW.v + (v - WINDOW.v) / e[n];
      }
      pos.push(...surface(u, v));
    }
  }

  // Keep a triangle if any corner was on the sheet; its inside corners
  // are already on the oval, so the window edge comes out smooth.
  const index: number[] = [];
  for (let j = 0; j < NV; j++) {
    for (let i = 0; i < NU; i++) {
      const a = j * cols + i;
      const b = a + 1;
      const c = a + cols;
      const d = c + 1;
      if (outside[a] || outside[b] || outside[c]) index.push(a, c, b);
      if (outside[b] || outside[c] || outside[d]) index.push(b, c, d);
    }
  }

  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

/** Surgical sheet over the torso, open at the cavity. */
export default function Drape() {
  const geometry = useMemo(buildDrape, []);
  // Read once at mount; the scene remounts when the case changes.
  const color = activeCase().drape;

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color={color} roughness={0.92} side={DoubleSide} />
    </mesh>
  );
}
