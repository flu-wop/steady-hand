import { Matrix4, Quaternion, Vector3 } from "three";

/**
 * Where public/patient.glb sits in the world. Look only: the cavities, rims
 * and colliders do not move; the body is placed so the openings land on it.
 *
 * The file stands Y-up, facing +Z, about 1.9 tall. Here he lies on his back,
 * head toward -X, scaled to the table, with the head end raised a little
 * (like a bed with the back up) so chest and belly sit level under the rims.
 */
export const PATIENT_URL = "/patient.glb";
const SCALE = 2.2;
const HEAD_UP_DEG = 8;
/** Puts the skin inside the Walk-in opening just under the rim plane (y 1.2). */
const OFFSET = new Vector3(0.25, 0.735, 0);

/** Table top; the lowest point of the body rests here. */
export const TABLE_TOP_Y = 0.1;

export function patientMatrix(): Matrix4 {
  // Lay down: model +X -> world -Z, model +Y (head) -> world -X, model +Z (front) -> world +Y.
  const layDown = new Matrix4().makeBasis(new Vector3(0, 0, -1), new Vector3(-1, 0, 0), new Vector3(0, 1, 0));
  const headUp = new Matrix4().makeRotationZ(-(HEAD_UP_DEG * Math.PI) / 180);
  return new Matrix4()
    .makeTranslation(OFFSET.x, OFFSET.y, OFFSET.z)
    .multiply(headUp)
    .multiply(new Matrix4().makeScale(SCALE, SCALE, SCALE))
    .multiply(layDown);
}

/** Same transform as position / quaternion / scale props. */
export function patientTransform() {
  const position = new Vector3();
  const quaternion = new Quaternion();
  const scale = new Vector3();
  patientMatrix().decompose(position, quaternion, scale);
  return { position, quaternion, scale };
}
