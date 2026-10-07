"use client";

const SKIN = "#d9a184";

/** Low-poly body from primitives. The cavity housing lives in Cavity.tsx. */
export default function Patient() {
  return (
    <group>
      {/* Torso: capsule lying along X, a little flattened front-to-back.
          Top surface at y = 1.2, flush with the cavity rim. */}
      <mesh position={[0.1, 0.6, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 1.3]} castShadow receiveShadow>
        <capsuleGeometry args={[0.6, 1.4, 4, 12]} />
        <meshStandardMaterial color={SKIN} roughness={0.75} flatShading />
      </mesh>
      {/* Head */}
      <mesh position={[-1.55, 0.6, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.5, 12, 9]} />
        <meshStandardMaterial color={SKIN} roughness={0.75} flatShading />
      </mesh>
      {/* Nose, so the head reads as a head */}
      <mesh position={[-1.6, 1.1, 0]}>
        <sphereGeometry args={[0.07, 8, 6]} />
        <meshStandardMaterial color="#c9876a" roughness={0.8} flatShading />
      </mesh>
    </group>
  );
}
