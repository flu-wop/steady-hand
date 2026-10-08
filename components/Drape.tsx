"use client";

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { BufferGeometry, DoubleSide, Float32BufferAttribute, Mesh, Object3D, Vector3 } from "three";
import { activeCase, geo } from "@/lib/gameState";
import { PATIENT_URL, TABLE_TOP_Y, patientMatrix } from "@/lib/patientFit";

/** Sheet extent along the body: from the shoulders (head stays out) past the feet. */
const X_MIN = -0.4;
const X_MAX = 2.6;
/** Sheet sits this far proud of the body. */
const CLEAR = 0.04;
/** Hem height above the table. */
const HEM_Y = TABLE_TOP_Y + 0.02;
/** Only the torso and legs shape the sheet; the arms lie outside it. */
const BODY_HALF_WIDTH = 0.6;

/** Oval window around each cavity, in world x / z. The z radius is the swab
 *  area the game has always used (the old capsule drape's window). */
const WINDOW_AX = 0.46;
const WINDOW_AZ = 0.6 * 1.04 * 1.3 * Math.sin(0.52);
/** Keep a strip of sheet between neighbouring windows. */
const WINDOW_GAP = 0.1;

type Window = { x: number; ax: number; az: number };

function windowsForSites(): Window[] {
  const xs = geo.sites.map((s) => s.center.x);
  let ax = WINDOW_AX;
  for (let i = 1; i < xs.length; i++) ax = Math.min(ax, (xs[i] - xs[i - 1] - WINDOW_GAP) / 2);
  return xs.map((x) => ({ x, ax, az: WINDOW_AZ }));
}

/** World-space test for the swab: is (x, z) inside any window's oval? */
export function inWindow(x: number, z: number) {
  return windowsForSites().some((w) => ((x - w.x) / w.ax) ** 2 + (z / w.az) ** 2 < 1);
}

const NU = 160;
const NV = 170;
/** v runs over the top arc (|v| ≤ π/2), then down the hanging sides. */
const HANG = 1;
const V_MAX = Math.PI / 2 + HANG;

/** Per-column sheet shape: top height H, half-width W, side height C. */
type Profile = { H: Float32Array; W: Float32Array; C: Float32Array };

const colX = (i: number) => X_MIN + ((X_MAX - X_MIN) * i) / NU;

function smooth(a: Float32Array, reach: number) {
  // Running max keeps the sheet outside the body; a box blur then rounds it.
  const m = a.map((_, i) => {
    let v = -Infinity;
    for (let k = Math.max(0, i - reach); k <= Math.min(a.length - 1, i + reach); k++) v = Math.max(v, a[k]);
    return v;
  });
  return m.map((_, i) => {
    let s = 0;
    let n = 0;
    for (let k = Math.max(0, i - reach); k <= Math.min(m.length - 1, i + reach); k++) (s += m[k]), n++;
    return s / n;
  });
}

/** Measure the placed body column by column and fit an arc that clears it. */
function measureBody(points: Float32Array): Profile {
  const H = new Float32Array(NU + 1).fill(HEM_Y);
  const W = new Float32Array(NU + 1).fill(0.05);
  const step = (X_MAX - X_MIN) / NU;
  const col = (x: number) => Math.round((x - X_MIN) / step);

  for (let p = 0; p < points.length; p += 3) {
    const i = col(points[p]);
    if (i < 0 || i > NU || Math.abs(points[p + 2]) > BODY_HALF_WIDTH) continue;
    H[i] = Math.max(H[i], points[p + 1] + CLEAR);
    W[i] = Math.max(W[i], Math.abs(points[p + 2]) + CLEAR);
  }
  const Hs = smooth(H, 3);
  // Width changes sharply at the shoulders; a wider pass keeps the edge from finning.
  const Ws = smooth(W, 8);

  // Lowest side height that still keeps every vertex under the arc.
  const C = new Float32Array(NU + 1).fill(TABLE_TOP_Y);
  for (let p = 0; p < points.length; p += 3) {
    const i = col(points[p]);
    if (i < 0 || i > NU || Math.abs(points[p + 2]) > BODY_HALF_WIDTH) continue;
    const k = Math.sqrt(Math.max(0, 1 - (points[p + 2] / Ws[i]) ** 2));
    if (k < 0.999) C[i] = Math.max(C[i], (points[p + 1] + CLEAR - Hs[i] * k) / (1 - k));
  }
  const Cs = smooth(C.map((c, i) => Math.min(c, Hs[i])), 8);
  return { H: Hs, W: Ws, C: Cs };
}

function sample(a: Float32Array, x: number) {
  const f = Math.max(0, Math.min(NU, ((x - X_MIN) / (X_MAX - X_MIN)) * NU));
  const i = Math.min(NU - 1, Math.floor(f));
  return a[i] + (a[i + 1] - a[i]) * (f - i);
}

/** Sheet surface at body position x and arc parameter v. */
function surface(prof: Profile, x: number, v: number): [number, number, number] {
  const H = sample(prof.H, x);
  const W = sample(prof.W, x);
  const C = sample(prof.C, x);
  const top = Math.min(Math.abs(v), Math.PI / 2);
  const side = Math.sign(v);
  let y = C + (H - C) * Math.cos(top);
  let z = side * W * Math.sin(top);
  const hang = Math.abs(v) - Math.PI / 2;
  if (hang > 0) {
    const t = hang / HANG;
    y = C + (HEM_Y - C) * t;
    z += side * t * 0.08; // slight flare toward the hem
  }
  return [x, y, z];
}

/** Grid sheet with the windows cut out; edge vertices snapped onto the ovals. */
function buildDrape(prof: Profile) {
  const windows = windowsForSites();
  const cols = NU + 1;

  // Each grid vertex in world (x, z) on the sheet top, for the window test.
  const grid: { u: number; v: number; z: number }[] = [];
  for (let j = 0; j <= NV; j++) {
    for (let i = 0; i <= NU; i++) {
      const u = colX(i);
      const v = -V_MAX + (2 * V_MAX * j) / NV;
      grid.push({ u, v, z: surface(prof, u, v)[2] });
    }
  }
  const nearest = grid.map(({ u, z }) =>
    windows.reduce((best, w) =>
      Math.hypot((u - w.x) / w.ax, z / w.az) < Math.hypot((u - best.x) / best.ax, z / best.az) ? w : best,
    ),
  );
  const e = grid.map(({ u, v, z }, n) =>
    Math.abs(v) > Math.PI / 2 ? Infinity : Math.hypot((u - nearest[n].x) / nearest[n].ax, z / nearest[n].az),
  );
  const outside = e.map((x) => x >= 1);
  const near = (i: number, j: number) => {
    for (let b = j - 1; b <= j + 1; b++)
      for (let a = i - 1; a <= i + 1; a++)
        if (a >= 0 && a <= NU && b >= 0 && b <= NV && outside[b * cols + a]) return true;
    return false;
  };

  const pos: number[] = [];
  for (let j = 0; j <= NV; j++) {
    for (let i = 0; i <= NU; i++) {
      const n = j * cols + i;
      let { u, v } = grid[n];
      // Inside vertices next to the sheet (incl. diagonals) move onto the oval.
      if (!outside[n] && near(i, j)) {
        const w = nearest[n];
        u = w.x + (u - w.x) / e[n];
        const z = grid[n].z / e[n];
        v = Math.asin(Math.max(-1, Math.min(1, z / sample(prof.W, u))));
      }
      pos.push(...surface(prof, u, v));
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

/** Every vertex of the patient model, placed in the world as Patient.tsx places it. */
function placedVertices(root: Object3D) {
  const m = patientMatrix();
  const out: number[] = [];
  const v = new Vector3();
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (!(o instanceof Mesh)) return;
    const pos = o.geometry.attributes.position;
    for (let k = 0; k < pos.count; k++) {
      v.fromBufferAttribute(pos, k).applyMatrix4(o.matrixWorld).applyMatrix4(m);
      out.push(v.x, v.y, v.z);
    }
  });
  return new Float32Array(out);
}

/** Surgical sheet over the patient, open at each cavity. */
export default function Drape() {
  const { scene } = useGLTF(PATIENT_URL);
  const geometry = useMemo(() => buildDrape(measureBody(placedVertices(scene))), [scene]);
  // Read once at mount; the scene remounts when the case changes.
  const color = activeCase().drape;

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color={color} roughness={0.92} side={DoubleSide} />
    </mesh>
  );
}
