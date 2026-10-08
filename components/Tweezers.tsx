"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Group, Mesh, Plane, Quaternion, Raycaster, Vector3 } from "three";
import {
  GRAB_OFFSET,
  GRAB_RADIUS,
  HOVER_HEIGHT,
  LATERAL_SCALE,
  LIFT_SCALE,
  LIFT_START,
  SHAKE_GAIN,
  SHAKE_SPEED_CAP,
  TIP_LENGTH,
  TIP_RADIUS,
  activeSite,
  dispatch,
  geo,
  getSnapshot,
  isHeld,
  sim,
  sitesLeft,
  unlockAudio,
} from "@/lib/gameState";
import { INTERIOR_ORDER } from "./Cavity";

const ARM_LENGTH = 1.1;
const ARM_THICK = 0.022;
const ARM_DEPTH = 0.035;
const OPEN_HALF_GAP = 0.06;
const CLOSED_HALF_GAP = 0.034;
const UP = new Vector3(0, 1, 0);
/** Smoothing for pointer-speed samples, and how fast it falls to 0 when still. */
const SPEED_SMOOTH_S = 0.06;
const SPEED_DECAY_S = 0.12;

/** Distance from point p to a rim's core circle. */
function distToRim(p: Vector3, center: Vector3) {
  const radial = Math.hypot(p.x - center.x, p.z - center.z) - geo.rimRadius;
  return Math.hypot(radial, p.y - center.y);
}

/** How far past the wall a tip can be and still count as touching it. Keeps
 *  one site's wall from claiming tips that are down inside another site. */
const WALL_THICKNESS = 0.1;

/** True if p, inside the hole's depth, has reached the cavity wall. Walls
 *  count as rim: without this, tips deep in the hole pass through them. */
function touchesWall(p: Vector3, center: Vector3) {
  if (p.y >= center.y || p.y <= geo.floorY) return false;
  const r = Math.hypot(p.x - center.x, p.z - center.z);
  return r > geo.rimRadius - TIP_RADIUS && r < geo.rimRadius + WALL_THICKNESS;
}

export default function Tweezers() {
  const { camera, gl, pointer } = useThree();
  const hand = useRef<Group>(null);
  const arms = [useRef<Mesh>(null), useRef<Mesh>(null)];
  const halfGap = useRef(OPEN_HALF_GAP);
  const pointerSpeed = useRef(0);

  const tmp = useMemo(
    () => ({
      ray: new Raycaster(),
      plane: new Plane(new Vector3(0, 1, 0), -HOVER_HEIGHT),
      hit: new Vector3(),
      target: new Vector3(),
      base: new Vector3(),
      dir: new Vector3(),
      sample: new Vector3(),
      shake: new Vector3(),
      tipNow: new Vector3(),
      q: new Quaternion(),
    }),
    [],
  );

  // Pointer down grabs, pointer up anywhere drops.
  useEffect(() => {
    const el = gl.domElement;
    const down = () => {
      unlockAudio();
      const snap = getSnapshot();
      if (snap.tool !== "forceps" || snap.state !== "hover") return;
      sim.grabNdc.x = pointer.x;
      sim.grabNdc.y = pointer.y;
      // Small assist: center the tips on the grab point.
      sim.grabTip.copy(activeSite().piece).add(GRAB_OFFSET);
      sim.tip.copy(sim.grabTip);
      dispatch("POINTER_DOWN");
    };
    const up = () => dispatch("RELEASE");

    // Pointer speed in NDC/s, measured from move events so it does not
    // depend on frame rate. Feeds the Nervous shake.
    let last: { x: number; y: number; t: number } | null = null;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      // Browsers merge moves into one event per frame; walk the merged ones
      // so a quick back-and-forth still counts as fast.
      const coalesced = e.getCoalescedEvents?.() ?? [];
      for (const ev of coalesced.length ? coalesced : [e]) {
        const x = ((ev.clientX - r.left) / r.width) * 2;
        const y = ((ev.clientY - r.top) / r.height) * 2;
        if (last) {
          const dt = Math.max(1, ev.timeStamp - last.t) / 1000;
          const sample = Math.hypot(x - last.x, y - last.y) / dt;
          const k = 1 - Math.exp(-dt / SPEED_SMOOTH_S);
          pointerSpeed.current += (sample - pointerSpeed.current) * k;
        }
        last = { x, y, t: ev.timeStamp };
      }
    };

    el.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointermove", move);
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointermove", move);
    };
  }, [gl, pointer]);

  useFrame((_, dt) => {
    const { state } = getSnapshot();
    const { ray, plane, hit, target, base, dir, sample, shake, tipNow, q } = tmp;

    // No move events means the hand is still: speed decays to zero.
    pointerSpeed.current *= Math.exp(-dt / SPEED_DECAY_S);

    // Forceps only exist while picked from the tray.
    const inHand = getSnapshot().tool === "forceps";
    if (hand.current) hand.current.visible = inHand;
    if (!inHand) {
      if (state === "hover") dispatch("TIPS_LEFT");
      return;
    }

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

      // Shake from pointer speed: fast hand, more wobble; still hand, none.
      // Applied straight to the tips (not eased), so it is what you see,
      // what the rim test sees, and what the piece rides on.
      const amp = lifting ? geo.drift * SHAKE_GAIN * Math.min(pointerSpeed.current, SHAKE_SPEED_CAP) : 0;
      shake.set(amp * (Math.random() * 2 - 1), 0, amp * (Math.random() * 2 - 1));
      tipNow.copy(sim.tip).add(shake);

      // The piece is parented to the tips: it follows them rigidly.
      activeSite().piece.copy(tipNow).sub(GRAB_OFFSET);
    } else {
      // Free hand: tips follow the pointer on a plane just above the body.
      ray.setFromCamera(pointer, camera);
      if (ray.ray.intersectPlane(plane, hit)) {
        hit.x = Math.max(-2.2, Math.min(2.2, hit.x));
        hit.z = Math.max(-1.2, Math.min(1.6, hit.z));
        sim.tip.lerp(hit, Math.min(1, dt * 20));
      }
      tipNow.copy(sim.tip);
      halfGap.current += (OPEN_HALF_GAP - halfGap.current) * Math.min(1, dt * 15);
    }

    // Place the two arms and, while held, test their tips against every rim.
    const held = isHeld(getSnapshot().state);
    let rimHit = -1;
    arms.forEach((ref, i) => {
      const side = i === 0 ? -1 : 1;
      base.set(tipNow.x + side * halfGap.current, tipNow.y, tipNow.z);
      dir.set(side * 0.1, 1, 0.3).normalize();

      const mesh = ref.current;
      if (mesh) {
        mesh.position.copy(base).addScaledVector(dir, ARM_LENGTH / 2);
        mesh.quaternion.copy(q.setFromUnitVectors(UP, dir));
      }

      if (held) {
        for (let s = 0; s <= 3; s++) {
          sample.copy(base).addScaledVector(dir, (TIP_LENGTH * s) / 3);
          geo.sites.forEach((site, n) => {
            if (distToRim(sample, site.center) < geo.rimTriggerTube + TIP_RADIUS) rimHit = n;
            else if (touchesWall(sample, site.center)) rimHit = n;
          });
        }
      }
    });

    // Rules that depend on positions.
    const now = getSnapshot().state;
    if (now === "lifting") {
      if (rimHit >= 0) {
        sim.hitSite = rimHit;
        dispatch("RIM_HIT");
      } else if (activeSite().piece.y > geo.clearHeight) {
        dispatch(sitesLeft() === 1 ? "CLEARED" : "PIECE_OUT");
      }
    } else if (now === "idle" || now === "hover") {
      // Which resting piece, if any, is under the tips?
      let over = -1;
      geo.sites.forEach((site, n) => {
        if (site.out || site.piece.y > site.rest.y + 0.001) return;
        const gx = site.piece.x + GRAB_OFFSET.x;
        const gz = site.piece.z + GRAB_OFFSET.z;
        if (Math.hypot(sim.tip.x - gx, sim.tip.z - gz) < GRAB_RADIUS) over = n;
      });
      if (over >= 0) sim.active = over;
      if (over >= 0 && now === "idle") dispatch("TIPS_OVER");
      if (over < 0 && now === "hover") dispatch("TIPS_LEFT");
    }
  });

  return (
    <group ref={hand} visible={false} renderOrder={INTERIOR_ORDER}>
      {arms.map((ref, i) => (
        <mesh key={i} ref={ref} castShadow>
          <boxGeometry args={[ARM_THICK, ARM_LENGTH, ARM_DEPTH]} />
          <meshStandardMaterial color="#d4d8de" metalness={0.35} roughness={0.35} />
        </mesh>
      ))}
    </group>
  );
}
