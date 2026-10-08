"use client";

import type { ReactNode } from "react";
import type { PieceId } from "@/lib/cases";

/**
 * What sits in a cavity, drawn from primitives. Look only: the grab point,
 * rest height and rim tests live in code and are the same for every piece.
 *
 * Local origin is the piece origin; the cavity floor is at y = FLOOR. Each
 * piece reports its top so the grab stem can run from it up to the nub.
 * Sizes keep clear air inside the smallest rim each piece is used with
 * (Narrow 0.158, others 0.22, Walk-in 0.297).
 */
const FLOOR = -0.045;

type Shape = { top: number; body: ReactNode };

const brass = { color: "#c9a24a", metalness: 0.7, roughness: 0.35 };

const SHAPES: Record<PieceId, () => Shape> = {
  // Lost button: short disc with a raised rim and four thread holes. Radius 0.11.
  button: () => {
    const h = 0.03;
    const y = FLOOR + h / 2;
    return {
      top: FLOOR + h + 0.008,
      body: (
        <>
          <mesh position={[0, y, 0]} castShadow>
            <cylinderGeometry args={[0.11, 0.11, h, 28]} />
            <meshStandardMaterial color="#d9a441" roughness={0.5} />
          </mesh>
          <mesh position={[0, FLOOR + h, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <torusGeometry args={[0.1, 0.009, 8, 32]} />
            <meshStandardMaterial color="#e6b85a" roughness={0.45} />
          </mesh>
          {[
            [-0.025, -0.025],
            [0.025, -0.025],
            [-0.025, 0.025],
            [0.025, 0.025],
          ].map(([x, z]) => (
            <mesh key={`${x}${z}`} position={[x, FLOOR + h + 0.001, z]}>
              <cylinderGeometry args={[0.009, 0.009, 0.004, 10]} />
              <meshStandardMaterial color="#5b3f17" roughness={0.8} />
            </mesh>
          ))}
        </>
      ),
    };
  },

  // House key: long thin shaft lying flat, small ring bow at one end, two teeth.
  // Half-length about 0.15.
  key: () => {
    const r = 0.012;
    const y = FLOOR + r + 0.006;
    return {
      top: y + r,
      body: (
        <>
          <mesh position={[0.02, y, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[r, r, 0.2, 10]} />
            <meshStandardMaterial {...brass} />
          </mesh>
          <mesh position={[-0.105, y, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <torusGeometry args={[0.035, 0.012, 8, 24]} />
            <meshStandardMaterial {...brass} />
          </mesh>
          {[0.08, 0.105].map((x) => (
            <mesh key={x} position={[x, y, 0.018]} castShadow>
              <boxGeometry args={[0.014, 0.016, 0.03]} />
              <meshStandardMaterial {...brass} />
            </mesh>
          ))}
        </>
      ),
    };
  },

  // Bent pin: tiny vertical peg, kinked over at the top so it reads from above.
  // Footprint about 0.07 across, inside Narrow's 0.158 rim with air around it.
  pin: () => {
    const h = 0.07;
    const bend = 0.045;
    const tilt = Math.PI / 3; // top segment leans 60 degrees off vertical
    const tipX = Math.sin(tilt) * bend;
    const tipY = FLOOR + h + Math.cos(tilt) * bend;
    const steel = { color: "#dfe4ea", metalness: 0.3, roughness: 0.3 };
    return {
      // Stem rises from the straight shaft, which is right under the nub.
      top: FLOOR + h,
      body: (
        <>
          <mesh position={[0, FLOOR + h / 2, 0]} castShadow>
            <cylinderGeometry args={[0.006, 0.003, h, 8]} />
            <meshStandardMaterial {...steel} />
          </mesh>
          <mesh position={[tipX / 2, FLOOR + h + (tipY - FLOOR - h) / 2, 0]} rotation={[0, 0, -tilt]} castShadow>
            <cylinderGeometry args={[0.006, 0.006, bend, 8]} />
            <meshStandardMaterial {...steel} />
          </mesh>
          <mesh position={[tipX, tipY, 0]} castShadow>
            <sphereGeometry args={[0.014, 12, 10]} />
            <meshStandardMaterial color="#c7ced8" metalness={0.3} roughness={0.25} />
          </mesh>
        </>
      ),
    };
  },

  // Marble: glassy sphere resting on the floor. Radius 0.045.
  marble: () => {
    const r = 0.045;
    return {
      top: FLOOR + 2 * r,
      body: (
        <mesh position={[0, FLOOR + r, 0]} castShadow>
          <sphereGeometry args={[r, 20, 14]} />
          <meshPhysicalMaterial color="#4f86c6" roughness={0.08} clearcoat={1} transmission={0} />
        </mesh>
      ),
    };
  },

  // Cork: short tapered cylinder, wide end up. Radius 0.06.
  cork: () => {
    const h = 0.075;
    return {
      top: FLOOR + h,
      body: (
        <mesh position={[0, FLOOR + h / 2, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.05, h, 18]} />
          <meshStandardMaterial color="#b98a57" roughness={0.95} />
        </mesh>
      ),
    };
  },

  // June bug: small oval body, little head, two short antennae. Half-length ~0.13.
  bug: () => {
    const bodyY = FLOOR + 0.035;
    const shell = { color: "#3f6b2e", roughness: 0.35, metalness: 0.3 };
    return {
      top: bodyY + 0.035,
      body: (
        <>
          <mesh position={[0, bodyY, 0]} scale={[0.09, 0.035, 0.06]} castShadow>
            <sphereGeometry args={[1, 18, 12]} />
            <meshStandardMaterial {...shell} />
          </mesh>
          {/* Seam down the shell */}
          <mesh position={[0, bodyY + 0.034, 0]}>
            <boxGeometry args={[0.15, 0.003, 0.004]} />
            <meshStandardMaterial color="#22391a" roughness={0.6} />
          </mesh>
          <mesh position={[0.095, bodyY - 0.005, 0]} castShadow>
            <sphereGeometry args={[0.026, 12, 10]} />
            <meshStandardMaterial color="#2a3a20" roughness={0.5} />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh
              key={side}
              position={[0.125, bodyY + 0.008, side * 0.015]}
              rotation={[side * 0.6, 0, -Math.PI / 2.6]}
              castShadow
            >
              <cylinderGeometry args={[0.003, 0.003, 0.045, 6]} />
              <meshStandardMaterial color="#1e2a17" roughness={0.6} />
            </mesh>
          ))}
        </>
      ),
    };
  },
};

const GRIP = "#4fc3d9";

/** One piece with its grab stem and nub on top (nub at `grab`). */
export default function Piece({ id, grab }: { id: PieceId; grab: number }) {
  const { top, body } = SHAPES[id]();
  const stem = Math.max(0.005, grab - top);
  return (
    <>
      {body}
      <mesh position={[0, top + stem / 2, 0]}>
        <cylinderGeometry args={[0.008, 0.008, stem, 6]} />
        <meshStandardMaterial color={GRIP} roughness={0.4} />
      </mesh>
      <mesh position={[0, grab, 0]}>
        <sphereGeometry args={[0.022, 8, 6]} />
        <meshStandardMaterial color={GRIP} roughness={0.4} emissive="#1b6f80" emissiveIntensity={0.5} />
      </mesh>
    </>
  );
}
