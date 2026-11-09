import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);
const DOWN = new THREE.Vector3(0, -1, 0);

/**
 * Rotate a local outward face normal onto world up. `spin` rotates the die
 * around the vertical axis after alignment so adjacent dice do not look
 * identical.
 */
export function faceUpQuaternion(
  normal: THREE.Vector3,
  spin = 0,
  faceDown = false,
): THREE.Quaternion {
  if (normal.lengthSq() === 0) return new THREE.Quaternion();
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    normal.clone().normalize(),
    faceDown ? DOWN : UP,
  );
  if (spin !== 0) {
    quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(UP, spin));
  }
  return quaternion;
}

export function faceNormal(
  faceNormals: Map<number, THREE.Vector3>,
  faceValue: number,
): THREE.Vector3 | undefined {
  return faceNormals.get(faceValue)?.clone();
}

export function targetQuaternion(
  faceNormals: Map<number, THREE.Vector3>,
  faceValue: number,
  spin = 0,
  faceDown = false,
): THREE.Quaternion {
  const normal = faceNormal(faceNormals, faceValue);
  if (!normal) {
    throw new Error(`no face normal for value ${faceValue}`);
  }
  return faceUpQuaternion(normal, spin, faceDown);
}

/** Smoothly move a quaternion toward a target over one physics step. */
export function stepQuaternion(
  current: THREE.Quaternion,
  target: THREE.Quaternion,
  deltaSeconds: number,
  rate = 12,
): THREE.Quaternion {
  const factor = 1 - Math.exp(-Math.max(0, deltaSeconds) * rate);
  return current.clone().slerp(target, factor);
}

/** Deterministic cosmetic spin in `[0, 2π)` derived from an id/value. */
export function cosmeticSpin(id: string, value: number): number {
  let hash = 2166136261;
  const source = `${id}:${value}`;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) / 0xffffffff) * Math.PI * 2;
}
