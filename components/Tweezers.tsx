"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Mesh, Plane, Quaternion, Raycaster, Vector3 } from "three";
import {
  CAVITY_CENTER,
  GRAB_OFFSET,
  GRAB_RADIUS,
  HOVER_HEIGHT,
  LATERAL_SCALE,
  LIFT_SCALE,
  LIFT_START,
  TIP_LENGTH,
  TIP_RADIUS,
  dispatch,
  geo,
  getSnapshot,
  isHeld,
  sim,
  unlockAudio,
} from "@/lib/gameState";
import { INTERIOR_ORDER } from "./Cavity";

const ARM_LENGTH = 1.1;
const ARM_THICK = 0.022;
const ARM_DEPTH = 0.035;
const OPEN_HALF_GAP = 0.06;
const CLOSED_HALF_GAP = 0.034;
const UP = new Vector3(0, 1, 0);

/** Distance from point p to the rim's core circle. */
function distToRim(p: Vector3) {
  const dx = p.x - CAVITY_CENTER.x;
  const dz = p.z - CAVITY_CENTER.z;
  const radial = Math.hypot(dx, dz) - geo.rimRadius;
  return Math.hypot(radial, p.y - CAVITY_CENTER.y);
}

export default function Tweezers() {
  const { camera, gl, pointer } = useThree();
  const arms = [useRef<Mesh>(null), useRef<Mesh>(null)];
  const halfGap = useRef(OPEN_HALF_GAP);

  const tmp = useMemo(
    () => ({
      ray: new Raycaster(),
      plane: new Plane(new Vector3(0, 1, 0), -HOVER_HEIGHT),
      hit: new Vector3(),
      target: new Vector3(),
      base: new Vector3(),
      dir: new Vector3(),
      sample: new Vector3(),
      q: new Quaternion(),
    }),
    [],
  );

  // Pointer down grabs, pointer up anywhere drops.
  useEffect(() => {
    const el = gl.domElement;
    const down = () => {
      unlockAudio();
      if (getSnapshot().state !== "hover") return;
      sim.grabNdc.x = pointer.x;
      sim.grabNdc.y = pointer.y;
      // Small assist: center the tips on the grab point.
      sim.grabTip.copy(sim.piece).add(GRAB_OFFSET);
      sim.tip.copy(sim.grabTip);
      dispatch("POINTER_DOWN");
    };
    const up = () => dispatch("RELEASE");
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
    };
  }, [gl, pointer]);

  useFrame((_, dt) => {
    const { state } = getSnapshot();
    const { ray, plane, hit, target, base, dir, sample, q } = tmp;

    if (isHeld(state)) {
      // Vertical pointer travel lifts; horizontal still moves (the risk).
      const dy = pointer.y - sim.grabNdc.y;
      if (state === "grabbed" && Math.abs(dy) > LIFT_START) dispatch("LIFT_START");

      const lifting = getSnapshot().state === "lifting";
      const lift = lifting ? Math.max(0, dy * LIFT_SCALE) : 0;
      target.copy(sim.grabTip);
      if (lifting) target.x += (pointer.x - sim.grabNdc.x) * LATERAL_SCALE;
      target.y += lift;

      sim.tip.lerp(target, Math.min(1, dt * 18));
      halfGap.current += (CLOSED_HALF_GAP - halfGap.current) * Math.min(1, dt * 25);

      // The piece is parented to the tips: it follows them rigidly.
      sim.piece.copy(sim.tip).sub(GRAB_OFFSET);
    } else {
      // Free hand: tips follow the pointer on a plane just above the body.
      ray.setFromCamera(pointer, camera);
      if (ray.ray.intersectPlane(plane, hit)) {
        hit.x = Math.max(-2.2, Math.min(2.2, hit.x));
        hit.z = Math.max(-1.2, Math.min(1.6, hit.z));
        sim.tip.lerp(hit, Math.min(1, dt * 20));
      }
      halfGap.current += (OPEN_HALF_GAP - halfGap.current) * Math.min(1, dt * 15);
    }

    // Place the two arms and, while held, test their tips against the rim.
    const held = isHeld(getSnapshot().state);
    let rimHit = false;
    arms.forEach((ref, i) => {
      const side = i === 0 ? -1 : 1;
      base.set(sim.tip.x + side * halfGap.current, sim.tip.y, sim.tip.z);
      dir.set(side * 0.1, 1, 0.3).normalize();

      const mesh = ref.current;
      if (mesh) {
        mesh.position.copy(base).addScaledVector(dir, ARM_LENGTH / 2);
        mesh.quaternion.copy(q.setFromUnitVectors(UP, dir));
      }

      if (held) {
        for (let s = 0; s <= 3; s++) {
          sample.copy(base).addScaledVector(dir, (TIP_LENGTH * s) / 3);
          if (distToRim(sample) < geo.rimTriggerTube + TIP_RADIUS) rimHit = true;
        }
      }
    });

    // Rules that depend on positions.
    const now = getSnapshot().state;
    if (now === "lifting") {
      if (rimHit) dispatch("RIM_HIT");
      else if (sim.piece.y > geo.clearHeight) dispatch("CLEARED");
    } else if (now === "idle" || now === "hover") {
      const grab = sample.copy(sim.piece).add(GRAB_OFFSET);
      const over =
        sim.pieceVisible &&
        sim.piece.y <= geo.pieceRest.y + 0.001 &&
        Math.hypot(sim.tip.x - grab.x, sim.tip.z - grab.z) < GRAB_RADIUS;
      if (over && now === "idle") dispatch("TIPS_OVER");
      if (!over && now === "hover") dispatch("TIPS_LEFT");
    }
  });

  return (
    <group renderOrder={INTERIOR_ORDER}>
      {arms.map((ref, i) => (
        <mesh key={i} ref={ref} castShadow>
          <boxGeometry args={[ARM_THICK, ARM_LENGTH, ARM_DEPTH]} />
          <meshStandardMaterial color="#d4d8de" metalness={0.35} roughness={0.35} />
        </mesh>
      ))}
    </group>
  );
}
