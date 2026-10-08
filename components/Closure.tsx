"use client";

import { useSyncExternalStore } from "react";
import { activeCase, geo, getSnapshot, subscribe } from "@/lib/gameState";

const STITCHES = 7;

/** After Close: each opening is covered and a stitched strip runs across it. */
export default function Closure() {
  const { step } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  if (step !== "closed") return null;

  const skin = activeCase().skin;
  const r = geo.rimRadius;
  const len = r * 2.2;

  return (
    <>
      {geo.sites.map((site, i) => (
        <group key={i} position={site.center}>
          {/* Cover over the opening */}
          <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <circleGeometry args={[r + geo.rimTube, 40]} />
            <meshStandardMaterial color={skin} roughness={0.8} />
          </mesh>
          {/* Strip along the body */}
          <mesh position={[0, 0.02, 0]} receiveShadow>
            <boxGeometry args={[len, 0.008, 0.05]} />
            <meshStandardMaterial color="#e9dcc8" roughness={0.9} />
          </mesh>
          {/* Cross stitches */}
          {Array.from({ length: STITCHES }, (_, n) => (
            <mesh key={n} position={[-len / 2 + (len * (n + 0.5)) / STITCHES, 0.026, 0]}>
              <boxGeometry args={[0.008, 0.006, 0.1]} />
              <meshStandardMaterial color="#2b2230" roughness={0.6} />
            </mesh>
          ))}
        </group>
      ))}
    </>
  );
}
