"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Group, Plane, Raycaster, Vector3 } from "three";
import { CAVITY_CENTER, SWAB_PER_UNIT, addSwab, getSnapshot } from "@/lib/gameState";
import { INTERIOR_ORDER } from "./Cavity";
import { inWindow } from "./Drape";

/** Height of the skin around the openings, where the swab drags. */
const SKIN_Y = CAVITY_CENTER.y + 0.03;
const STICK = 0.7;
const LIFT_UP = 0.12;

/** Swab in hand while the swab tool is picked. Drag inside a window to fill. */
export default function Swab() {
  const { camera, gl, pointer } = useThree();
  const group = useRef<Group>(null);
  const pressed = useRef(false);
  const last = useRef<Vector3 | null>(null);

  const tmp = useMemo(
    () => ({ ray: new Raycaster(), plane: new Plane(new Vector3(0, 1, 0), -SKIN_Y), hit: new Vector3() }),
    [],
  );

  useEffect(() => {
    const el = gl.domElement;
    const down = (e: PointerEvent) => {
      if (getSnapshot().tool !== "swab") return;
      // Touch: start the stroke where the finger lands, not where the pointer last was.
      const r = el.getBoundingClientRect();
      pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      last.current = null;
      pressed.current = true;
    };
    const up = () => {
      pressed.current = false;
      last.current = null;
    };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [gl, pointer]);

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const active = getSnapshot().tool === "swab";
    g.visible = active;
    if (!active) {
      pressed.current = false;
      last.current = null;
      return;
    }

    tmp.ray.setFromCamera(pointer, camera);
    if (!tmp.ray.ray.intersectPlane(tmp.plane, tmp.hit)) return;
    const { hit } = tmp;
    g.position.set(hit.x, SKIN_Y + (pressed.current ? 0 : LIFT_UP), hit.z);

    // Only strokes inside a window count. Missing it does nothing.
    if (pressed.current && inWindow(hit.x, hit.z)) {
      if (last.current) addSwab(last.current.distanceTo(hit) * SWAB_PER_UNIT);
      last.current = (last.current ?? new Vector3()).copy(hit);
    } else {
      last.current = null;
    }
  });

  // Tip at the group origin; the stick leans back toward the camera.
  return (
    <group ref={group} visible={false} renderOrder={INTERIOR_ORDER}>
      <mesh position={[0, 0.05, 0]} castShadow>
        <sphereGeometry args={[0.05, 10, 8]} />
        <meshStandardMaterial color="#f4f1ea" roughness={1} />
      </mesh>
      <mesh position={[0, 0.05 + STICK / 2, STICK * 0.15]} rotation={[0.3, 0, 0]} castShadow>
        <cylinderGeometry args={[0.012, 0.012, STICK, 6]} />
        <meshStandardMaterial color="#d9c7a3" roughness={0.8} />
      </mesh>
    </group>
  );
}
