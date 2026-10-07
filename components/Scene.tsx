"use client";

import { Canvas } from "@react-three/fiber";
import Patient from "./Patient";
import Cavity from "./Cavity";
import Tweezers from "./Tweezers";

export default function Scene() {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 4.3, 2.7], fov: 36 }}
      onCreated={({ camera }) => camera.lookAt(0, 0.85, 0)}
      style={{ position: "fixed", inset: 0, cursor: "none", touchAction: "none" }}
    >
      <color attach="background" args={["#0b0b0d"]} />
      <fog attach="fog" args={["#0b0b0d", 6, 12]} />

      <ambientLight intensity={0.15} />
      {/* Warm key, above and in front */}
      <directionalLight
        position={[-2.5, 5, 3]}
        intensity={2.4}
        color="#ffd2a1"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={3}
        shadow-camera-bottom={-3}
        shadow-bias={-0.0005}
      />
      {/* Dim cool rim from behind */}
      <directionalLight position={[2, 2.5, -4]} intensity={0.6} color="#8fb4ff" />

      {/* Table */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[8, 0.1, 5]} />
        <meshStandardMaterial color="#1c1a1f" roughness={0.85} />
      </mesh>

      <Patient />
      <Cavity />
      <Tweezers />
    </Canvas>
  );
}
