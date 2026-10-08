"use client";

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { Color, Mesh, MeshStandardMaterial } from "three";
import { activeCase } from "@/lib/gameState";
import { CASES } from "@/lib/cases";
import { PATIENT_URL, patientTransform } from "@/lib/patientFit";

/** The texture already carries Walk-in's skin; other cases tint relative to it. */
const REFERENCE_SKIN = new Color(CASES[0].skin);

function skinTint(skin: string) {
  const c = new Color(skin);
  return new Color(
    Math.min(1, c.r / REFERENCE_SKIN.r),
    Math.min(1, c.g / REFERENCE_SKIN.g),
    Math.min(1, c.b / REFERENCE_SKIN.b),
  );
}

/** The patient: public/patient.glb, laid on the table. Cavities live in Cavity.tsx. */
export default function Patient() {
  const { scene } = useGLTF(PATIENT_URL);
  // Read once at mount; the scene remounts when the case changes.
  const skin = activeCase().skin;

  const model = useMemo(() => {
    const copy = scene.clone(true);
    const tint = skinTint(skin);
    copy.traverse((o) => {
      if (!(o instanceof Mesh)) return;
      o.castShadow = true;
      o.receiveShadow = true;
      const mat = (o.material as MeshStandardMaterial).clone();
      mat.color.copy(tint);
      // Meshy exports metalness 1; a person is not chrome.
      mat.metalness = 0;
      o.material = mat;
    });
    return copy;
  }, [scene, skin]);

  const { position, quaternion, scale } = useMemo(patientTransform, []);

  return <primitive object={model} position={position} quaternion={quaternion} scale={scale} />;
}

useGLTF.preload(PATIENT_URL);
