"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AlwaysDepth, BackSide, Color, Group, MeshStandardMaterial } from "three";
import { GRAB_OFFSET, activeCase, geo, getSnapshot, isHeld, sim } from "@/lib/gameState";
import Piece from "./Piece";

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

/** One site: recessed hole with a metal rim, plus the piece that sits in it. */
export default function Cavity({ index }: { index: number }) {
  // Read once at mount; the scene remounts when the case changes.
  const site = geo.sites[index];
  const pieces = activeCase().pieces;
  const pieceId = pieces[index] ?? pieces[0];
  const rimMat = useRef<MeshStandardMaterial>(null);
  const piece = useRef<Group>(null);
  const fallSpeed = useRef(0);

  useFrame((_, dt) => {
    const { state } = getSnapshot();
    // Only the rim that was hit flashes red.
    const buzzing = state === "buzz" && sim.hitSite === index;

    if (rimMat.current) {
      rimMat.current.color.lerp(buzzing ? BUZZ_RED : METAL, Math.min(1, dt * 25));
      rimMat.current.emissive.set(buzzing ? BUZZ_RED : "#000000").multiplyScalar(0.6);
    }

    // When the tweezers aren't holding this piece, it falls back into the cavity.
    const inHand = isHeld(state) && sim.active === index;
    if (!inHand && !site.out) {
      const p = site.piece;
      const rest = site.rest;
      p.x += (rest.x - p.x) * Math.min(1, dt * 10);
      p.z += (rest.z - p.z) * Math.min(1, dt * 10);
      if (p.y > rest.y) {
        fallSpeed.current += 9.8 * dt;
        p.y = Math.max(rest.y, p.y - fallSpeed.current * dt);
      } else {
        fallSpeed.current = 0;
      }
    } else {
      fallSpeed.current = 0;
    }

    if (piece.current) {
      piece.current.position.copy(site.piece);
      piece.current.visible = !site.out;
    }
  });

  const { rimRadius, rimTube, rimTriggerTube } = geo;
  const depth = site.center.y - geo.floorY;

  return (
    <group>
      <group position={site.center}>
        {/* Hole interior */}
        <group renderOrder={INTERIOR_ORDER}>
          <mesh position={[0, -depth / 2, 0]}>
            <cylinderGeometry args={[rimRadius, rimRadius, depth, 40, 1, true]} />
            <meshStandardMaterial color="#3a1c22" roughness={0.9} side={BackSide} />
          </mesh>
          <mesh position={[0, -depth, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[rimRadius, 40]} />
            <meshStandardMaterial color="#5a2630" roughness={0.9} />
          </mesh>
        </group>

        {/* Depth mask over the opening */}
        <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={MASK_ORDER}>
          <circleGeometry args={[rimRadius, 40]} />
          <meshBasicMaterial colorWrite={false} depthFunc={AlwaysDepth} />
        </mesh>

        {/* Visible metal rim */}
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[rimRadius, rimTube, 10, 48]} />
          <meshStandardMaterial ref={rimMat} color={METAL} metalness={0.9} roughness={0.25} />
        </mesh>

        {/* Invisible trigger. Tweezers.tsx tests the tips against these same
            dimensions analytically; this mesh is the reference shape. */}
        <mesh rotation={[Math.PI / 2, 0, 0]} visible={false}>
          <torusGeometry args={[rimRadius, rimTriggerTube, 8, 48]} />
          <meshBasicMaterial wireframe />
        </mesh>
      </group>

      {/* The piece for this site. Look only; grab point and rim tests are in code. */}
      <group ref={piece} position={site.rest} renderOrder={INTERIOR_ORDER}>
        <Piece id={pieceId} grab={GRAB_OFFSET.y} />
      </group>
    </group>
  );
}
