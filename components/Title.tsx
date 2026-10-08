"use client";

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Group, Mesh, MeshStandardMaterial, Object3D } from "three";
import { leaveTitle } from "@/lib/gameState";
import { PATIENT_URL } from "@/lib/patientFit";

/** The file stands Y-up, facing +Z, feet at y = -0.95, about 1.9 tall. */
const FEET_Y = -0.95;

/** Full body in frame, leaving room for the title above and Play below. */
const CAMERA_POSITION: [number, number, number] = [0, 0.07, 5.4];
const CAMERA_TARGET: [number, number, number] = [0, 0.07, 0];

/** Idle: no skeleton in the file, so the whole figure turns and sways a
 *  degree or two on slow sines, pivoting at the feet. */
const TURN_DEG = 1.5;
const SWAY_DEG = 0.6;

function StandingPatient() {
  const { scene } = useGLTF(PATIENT_URL);
  const pivot = useRef<Group>(null);

  const model = useMemo(() => {
    const copy = scene.clone(true);
    copy.traverse((o) => {
      if (!(o instanceof Mesh)) return;
      o.castShadow = true;
      o.receiveShadow = true;
      const mat = (o.material as MeshStandardMaterial).clone();
      mat.metalness = 0;
      o.material = mat;
    });
    return copy;
  }, [scene]);

  useFrame(({ clock }) => {
    const g = pivot.current;
    if (!g) return;
    const t = clock.elapsedTime;
    g.rotation.y = ((TURN_DEG * Math.PI) / 180) * Math.sin(t * 0.45);
    g.rotation.z = ((SWAY_DEG * Math.PI) / 180) * Math.sin(t * 0.3 + 1.1);
  });

  return (
    <group ref={pivot} position={[0, FEET_Y, 0]}>
      <primitive object={model} position={[0, -FEET_Y, 0]} />
    </group>
  );
}

export default function Title() {
  const lampTarget = useMemo(() => {
    const o = new Object3D();
    o.position.set(0, 0, 0);
    return o;
  }, []);

  return (
    <main>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: CAMERA_POSITION, fov: 36 }}
        onCreated={({ camera }) => camera.lookAt(...CAMERA_TARGET)}
        style={{ position: "fixed", inset: 0 }}
      >
        <color attach="background" args={["#0b0b0d"]} />
        {/* Floor fades into the dark room instead of ending at a horizon */}
        <fog attach="fog" args={["#0b0b0d", 5.5, 9]} />
        {/* Barely-there fill so the figure is not a silhouette */}
        <ambientLight intensity={0.1} />
        {/* One warm overhead light */}
        <primitive object={lampTarget} />
        <spotLight
          position={[0.3, 4.5, 2.2]}
          target={lampTarget}
          angle={0.5}
          penumbra={0.7}
          decay={0}
          intensity={3.4}
          color="#ffd9a8"
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-bias={-0.0004}
        />
        {/* Dark floor to catch his shadow */}
        <mesh position={[0, FEET_Y, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[20, 20]} />
          <meshStandardMaterial color="#121014" roughness={1} />
        </mesh>
        <Suspense fallback={null}>
          <StandingPatient />
        </Suspense>
      </Canvas>

      <div className="title-screen">
        <div className="title-head">
          <h1>Steady Hand</h1>
          <p className="title-line">Lift it out. Don&apos;t touch the rim.</p>
        </div>
        <button type="button" className="title-play" onClick={leaveTitle}>
          Play
        </button>
      </div>
    </main>
  );
}

useGLTF.preload(PATIENT_URL);
