"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AlwaysDepth, BackSide, Color, Group, MeshStandardMaterial } from "three";
import {
  CAVITY_CENTER,
  CAVITY_FLOOR_Y,
  GRAB_OFFSET,
  PIECE_REST,
  RIM_RADIUS,
  RIM_TRIGGER_TUBE,
  RIM_TUBE,
  getSnapshot,
  isHeld,
  sim,
} from "@/lib/gameState";

/**
 * Draw order that makes a hole in a solid capsule without CSG:
 * 1. INTERIOR_ORDER: hole wall, floor, piece and tweezers draw first.
 * 2. The mask disc at the opening writes depth only, unconditionally.
 * 3. Everything else (torso) draws normally and loses the depth test inside
 *    the opening, so the interior painted in step 1 shows through.
 */
export const INTERIOR_ORDER = -2;
const MASK_ORDER = -1;

const METAL = new Color("#b8bcc4");
const BUZZ_RED = new Color("#ff2a2a");
const BONE = "#efe6d2";
const GRIP = "#4fc3d9";

/** Recessed hole with a metal rim, plus the piece that sits in it. */
export default function Cavity() {
  const rimMat = useRef<MeshStandardMaterial>(null);
  const piece = useRef<Group>(null);
  const fallSpeed = useRef(0);

  useFrame((_, dt) => {
    const { state } = getSnapshot();
    const buzzing = state === "buzz";

    // Rim flashes red during buzz.
    if (rimMat.current) {
      rimMat.current.color.lerp(buzzing ? BUZZ_RED : METAL, Math.min(1, dt * 25));
      rimMat.current.emissive.set(buzzing ? BUZZ_RED : "#000000").multiplyScalar(0.6);
    }

    // When nothing holds the piece, it falls back into the cavity.
    if (!isHeld(state) && sim.pieceVisible) {
      const p = sim.piece;
      p.x += (PIECE_REST.x - p.x) * Math.min(1, dt * 10);
      p.z += (PIECE_REST.z - p.z) * Math.min(1, dt * 10);
      if (p.y > PIECE_REST.y) {
        fallSpeed.current += 9.8 * dt;
        p.y = Math.max(PIECE_REST.y, p.y - fallSpeed.current * dt);
      } else {
        fallSpeed.current = 0;
      }
    } else {
      fallSpeed.current = 0;
    }

    if (piece.current) {
      piece.current.position.copy(sim.piece);
      piece.current.visible = sim.pieceVisible;
    }
  });

  const depth = CAVITY_CENTER.y - CAVITY_FLOOR_Y;

  return (
    <group>
      <group position={CAVITY_CENTER}>
        {/* Hole interior */}
        <group renderOrder={INTERIOR_ORDER}>
          <mesh position={[0, -depth / 2, 0]}>
            <cylinderGeometry args={[RIM_RADIUS, RIM_RADIUS, depth, 40, 1, true]} />
            <meshStandardMaterial color="#3a1c22" roughness={0.9} side={BackSide} />
          </mesh>
          <mesh position={[0, -depth, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[RIM_RADIUS, 40]} />
            <meshStandardMaterial color="#5a2630" roughness={0.9} />
          </mesh>
        </group>

        {/* Depth mask over the opening */}
        <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={MASK_ORDER}>
          <circleGeometry args={[RIM_RADIUS, 40]} />
          <meshBasicMaterial colorWrite={false} depthFunc={AlwaysDepth} />
        </mesh>

        {/* Visible metal rim */}
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[RIM_RADIUS, RIM_TUBE, 10, 48]} />
          <meshStandardMaterial ref={rimMat} color={METAL} metalness={0.9} roughness={0.25} />
        </mesh>

        {/* Invisible trigger. Tweezers.tsx tests the tips against these same
            dimensions analytically; this mesh is the reference shape. */}
        <mesh rotation={[Math.PI / 2, 0, 0]} visible={false}>
          <torusGeometry args={[RIM_RADIUS, RIM_TRIGGER_TUBE, 8, 48]} />
          <meshBasicMaterial wireframe />
        </mesh>
      </group>

      {/* The piece: a stylized bone with a grab nub on top. */}
      <group ref={piece} position={PIECE_REST} renderOrder={INTERIOR_ORDER}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.028, 0.028, 0.2, 8]} />
          <meshStandardMaterial color={BONE} roughness={0.6} flatShading />
        </mesh>
        {[-0.1, 0.1].flatMap((x) =>
          [-0.03, 0.03].map((z) => (
            <mesh key={`${x}${z}`} position={[x, 0, z]} castShadow>
              <sphereGeometry args={[0.04, 8, 6]} />
              <meshStandardMaterial color={BONE} roughness={0.6} flatShading />
            </mesh>
          )),
        )}
        <mesh position={[0, GRAB_OFFSET.y / 2, 0]}>
          <cylinderGeometry args={[0.008, 0.008, GRAB_OFFSET.y, 6]} />
          <meshStandardMaterial color={GRIP} roughness={0.4} />
        </mesh>
        <mesh position={GRAB_OFFSET}>
          <sphereGeometry args={[0.022, 8, 6]} />
          <meshStandardMaterial color={GRIP} roughness={0.4} emissive="#1b6f80" emissiveIntensity={0.5} />
        </mesh>
      </group>
    </group>
  );
}
