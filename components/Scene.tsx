"use client";

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { Object3D } from "three";
import { CAVITY_CENTER, geo } from "@/lib/gameState";
import Patient from "./Patient";
import Drape from "./Drape";
import Cavity from "./Cavity";
import Tweezers from "./Tweezers";

// Steep enough that the line of sight reaches the floor of the deepest
// cavity (Deep, depthScale 1.6) through the opening.
const CAMERA_POSITION: [number, number, number] = [-0.25, 5.2, 1.6];
const CAMERA_TARGET: [number, number, number] = [-0.25, 0.7, 0.1];

export default function Scene() {
  const lampTarget = useMemo(() => {
    // Aim between the sites so one lamp covers them all.
    const o = new Object3D();
    o.position.copy(CAVITY_CENTER);
    o.position.x = geo.sites.reduce((x, s) => x + s.center.x, 0) / geo.sites.length;
    return o;
  }, []);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: CAMERA_POSITION, fov: 36 }}
      onCreated={({ camera }) => camera.lookAt(...CAMERA_TARGET)}
      style={{ position: "fixed", inset: 0, cursor: "none", touchAction: "none" }}
    >
      <color attach="background" args={["#0b0b0d"]} />
      <fog attach="fog" args={["#0b0b0d", 7, 13]} />

      {/* Dim room fill */}
      <hemisphereLight args={["#8a93a6", "#1a1418", 0.55]} />

      {/* Overhead surgical lamp, aimed at the cavity */}
      <primitive object={lampTarget} />
      <spotLight
        position={[lampTarget.position.x + 0.3, 4.6, 0.9]}
        target={lampTarget}
        angle={0.42}
        penumbra={0.6}
        decay={0}
        intensity={3.2}
        color="#fff4e2"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
      />

      {/* Table */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[8, 0.1, 5]} />
        <meshStandardMaterial color="#1c1a1f" roughness={0.85} />
      </mesh>

      <Patient />
      <Drape />
      {geo.sites.map((_, i) => (
        <Cavity key={i} index={i} />
      ))}
      <Tweezers />
    </Canvas>
  );
}
