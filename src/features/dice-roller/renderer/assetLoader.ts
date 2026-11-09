import * as THREE from 'three';
import type { DieKind } from './DiceRenderer';

export interface BabylonMeshData {
  name: string;
  id?: string;
  positions: number[];
  normals?: number[];
  tangents?: number[];
  uvs?: number[];
  indices: number[];
  position?: [number, number, number];
  rotationQuaternion?: [number, number, number, number];
  scaling?: [number, number, number];
}

export interface BabylonSceneFile {
  meshes: BabylonMeshData[];
  colliderFaceMap: Record<string, Record<string, number>>;
  gravity?: [number, number, number];
}

export interface DiceAsset {
  kind: DieKind;
  geometry: THREE.BufferGeometry;
  /** Unique-ish collider points in Three.js coordinates. */
  colliderPoints: Float32Array;
  /** Face value -> outward normal in local space. */
  faceNormals: Map<number, THREE.Vector3>;
  /** Lowest local Y, used to rest the die on the floor. */
  restHeight: number;
}

export interface DiceAssetSet {
  assets: Map<DieKind, DiceAsset>;
  source: BabylonSceneFile;
}

const SUPPORTED: readonly DieKind[] = [
  'd2',
  'd4',
  'd6',
  'd8',
  'd10',
  'd12',
  'd20',
  'd100',
];

/** Babylon is left-handed; Three.js is right-handed. */
export function toThreePosition(
  x: number,
  y: number,
  z: number,
): THREE.Vector3 {
  return new THREE.Vector3(x, y, -z);
}

export function convertPositions(positions: readonly number[]): Float32Array {
  const result = new Float32Array(positions.length);
  for (let index = 0; index + 2 < positions.length; index += 3) {
    result[index] = positions[index];
    result[index + 1] = positions[index + 1];
    result[index + 2] = -positions[index + 2];
  }
  return result;
}

export function convertNormals(normals: readonly number[]): Float32Array {
  return convertPositions(normals);
}

export function convertTangents(tangents: readonly number[]): Float32Array {
  const result = new Float32Array(tangents.length);
  for (let index = 0; index + 3 < tangents.length; index += 4) {
    result[index] = tangents[index];
    result[index + 1] = tangents[index + 1];
    result[index + 2] = -tangents[index + 2];
    result[index + 3] = tangents[index + 3];
  }
  return result;
}

/** Mirroring Z reverses triangle winding; restore counter-clockwise order. */
export function flipWinding(indices: readonly number[]): number[] {
  const result: number[] = [];
  for (let index = 0; index + 2 < indices.length; index += 3) {
    result.push(indices[index], indices[index + 2], indices[index + 1]);
  }
  return result;
}

export function buildGeometry(mesh: BabylonMeshData): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(convertPositions(mesh.positions), 3),
  );
  if (mesh.normals?.length) {
    geometry.setAttribute(
      'normal',
      new THREE.BufferAttribute(convertNormals(mesh.normals), 3),
    );
  } else {
    geometry.computeVertexNormals();
  }
  if (mesh.uvs?.length) {
    geometry.setAttribute(
      'uv',
      new THREE.BufferAttribute(new Float32Array(mesh.uvs), 2),
    );
  }
  if (mesh.tangents?.length) {
    geometry.setAttribute(
      'tangent',
      new THREE.BufferAttribute(convertTangents(mesh.tangents), 4),
    );
  }
  geometry.setIndex(flipWinding(mesh.indices));
  geometry.computeBoundingSphere();
  geometry.computeBoundingBox();
  return geometry;
}

export function colliderPoints(mesh: BabylonMeshData): Float32Array {
  return convertPositions(mesh.positions);
}

/**
 * `colliderFaceMap` is keyed by triangle index, not vertex index. Averaging
 * the normals of all triangles that map to the same face gives a stable
 * outward normal for that number.
 */
export function computeFaceNormals(
  collider: BabylonMeshData,
  faceMap: Record<string, number>,
): Map<number, THREE.Vector3> {
  const positions = convertPositions(collider.positions);
  const indices = flipWinding(collider.indices);
  const normals = collider.normals
    ? convertNormals(collider.normals)
    : undefined;
  const sums = new Map<number, THREE.Vector3>();

  for (let triangle = 0; triangle * 3 + 2 < indices.length; triangle += 1) {
    const faceValue = faceMap[String(triangle)];
    if (faceValue === undefined) continue;
    const ia = indices[triangle * 3] * 3;
    const ib = indices[triangle * 3 + 1] * 3;
    const ic = indices[triangle * 3 + 2] * 3;
    const a = new THREE.Vector3(
      positions[ia],
      positions[ia + 1],
      positions[ia + 2],
    );
    const b = new THREE.Vector3(
      positions[ib],
      positions[ib + 1],
      positions[ib + 2],
    );
    const c = new THREE.Vector3(
      positions[ic],
      positions[ic + 1],
      positions[ic + 2],
    );
    const normal = new THREE.Vector3()
      .subVectors(b, a)
      .cross(new THREE.Vector3().subVectors(c, a));
    if (normal.lengthSq() === 0) continue;
    normal.normalize();
    if (normals) {
      const provided = new THREE.Vector3(
        normals[ia],
        normals[ia + 1],
        normals[ia + 2],
      );
      if (normal.dot(provided) < 0) normal.negate();
    }
    const current = sums.get(faceValue) ?? new THREE.Vector3();
    current.add(normal);
    sums.set(faceValue, current);
  }

  const result = new Map<number, THREE.Vector3>();
  for (const [value, sum] of sums) {
    if (sum.lengthSq() === 0) continue;
    result.set(value, sum.normalize());
  }
  return result;
}

export function mergeSceneFiles(
  base: BabylonSceneFile,
  override: BabylonSceneFile,
): BabylonSceneFile {
  const meshes = new Map<string, BabylonMeshData>();
  for (const mesh of base.meshes) meshes.set(mesh.name, mesh);
  for (const mesh of override.meshes) meshes.set(mesh.name, mesh);
  return {
    meshes: [...meshes.values()],
    colliderFaceMap: {
      ...base.colliderFaceMap,
      ...override.colliderFaceMap,
    },
    gravity: override.gravity ?? base.gravity,
  };
}

export function buildAssetSet(scene: BabylonSceneFile): DiceAssetSet {
  const byName = new Map(scene.meshes.map((mesh) => [mesh.name, mesh]));
  const assets = new Map<DieKind, DiceAsset>();

  for (const kind of SUPPORTED) {
    const mesh = byName.get(kind);
    const collider = byName.get(`${kind}_collider`);
    if (!mesh || !collider) continue;
    const faceMap = scene.colliderFaceMap[kind];
    if (!faceMap) continue;

    const geometry = buildGeometry(mesh);
    const points = colliderPoints(collider);
    const boundingBox = new THREE.Box3().setFromArray(points);
    assets.set(kind, {
      kind,
      geometry,
      colliderPoints: points,
      faceNormals: computeFaceNormals(collider, faceMap),
      restHeight: Math.max(0, -boundingBox.min.y),
    });
  }

  return { assets, source: scene };
}

interface ThemeConfig {
  systemName?: string;
  extends?: string;
  meshFile?: string;
}

export interface LoadDiceAssetsOptions {
  assetPath: string;
  theme?: string;
  fetchImpl?: typeof fetch;
}

function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

async function fetchJson<T>(url: string, fetchImpl: typeof fetch): Promise<T> {
  const response = await fetchImpl(url);
  if (!response.ok) {
    throw new Error(`failed to load ${url}: ${response.status}`);
  }
  return (await response.json()) as T;
}

async function loadThemeScene(
  assetPath: string,
  theme: string,
  fetchImpl: typeof fetch,
  seen: Set<string> = new Set(),
): Promise<BabylonSceneFile> {
  if (seen.has(theme)) {
    throw new Error(`theme inheritance cycle: ${theme}`);
  }
  seen.add(theme);
  const themeUrl = joinUrl(assetPath, `themes/${theme}`);
  const config = await fetchJson<ThemeConfig>(
    joinUrl(themeUrl, 'theme.config.json'),
    fetchImpl,
  );
  const parent = config.extends
    ? await loadThemeScene(assetPath, config.extends, fetchImpl, seen)
    : undefined;
  if (!config.meshFile) {
    if (parent) return parent;
    throw new Error(`theme ${theme} does not declare a meshFile`);
  }
  const scene = await fetchJson<BabylonSceneFile>(
    joinUrl(themeUrl, config.meshFile),
    fetchImpl,
  );
  return parent ? mergeSceneFiles(parent, scene) : scene;
}

export async function loadDiceAssets(
  options: LoadDiceAssetsOptions,
): Promise<DiceAssetSet> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const scene = await loadThemeScene(
    options.assetPath,
    options.theme ?? 'default-extras',
    fetchImpl,
  );
  return buildAssetSet(scene);
}
