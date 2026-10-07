"use client";

import { activeCase } from "@/lib/gameState";

/** Low-poly body from primitives. The cavity lives in Cavity.tsx. */
export default function Patient() {
  // Read once at mount; the scene remounts when the case changes.
  const skin = activeCase().skin;

  return (
    <group>
      {/* Torso: capsule lying along X, a little flattened front-to-back.
          Top surface at y = 1.2, flush with the cavity rim. */}
      <mesh position={[0.1, 0.6, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 1.3]} castShadow receiveShadow>
        <capsuleGeometry args={[0.6, 1.4, 4, 12]} />
        <meshStandardMaterial color={skin} roughness={0.75} flatShading />
      </mesh>
      {/* Head: center y = 0.6, radius 0.5 */}
      <mesh position={[-1.55, 0.6, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.5, 12, 9]} />
        <meshStandardMaterial color={skin} roughness={0.75} flatShading />
      </mesh>
      {/* Nose on the face, toward the camera: on the head's surface along
          (0, 0.45, 0.89) from its center. */}
      <mesh position={[-1.55, 0.6 + 0.48 * 0.45, 0.48 * 0.89]} castShadow>
        <sphereGeometry args={[0.07, 8, 6]} />
        <meshStandardMaterial color={skin} roughness={0.8} flatShading />
      </mesh>
    </group>
  );
}
