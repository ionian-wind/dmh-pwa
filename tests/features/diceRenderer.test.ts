import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import defaultScene from '../../public/assets/dice-box/themes/default/default.json';
import extrasScene from '../../public/assets/dice-box/themes/default-extras/default-extras.json';
import {
  buildAssetSet,
  buildGeometry,
  colliderPoints,
  computeFaceNormals,
  convertPositions,
  flipWinding,
  loadDiceAssets,
  mergeSceneFiles,
  type BabylonSceneFile,
} from '@/features/dice-roller/renderer/assetLoader';
import {
  dieKindForSides,
  normalizeValue,
  splitD100,
  visualDiceFor,
} from '@/features/dice-roller/renderer/diceValues';
import {
  cosmeticSpin,
  faceUpQuaternion,
  targetQuaternion,
} from '@/features/dice-roller/renderer/faceOrientation';
import { DiceBoxRenderer } from '@/features/dice-roller/renderer/DiceBoxRenderer';
import { createDiceRenderer } from '@/features/dice-roller/renderer/factory';
import { ThreeDiceRenderer } from '@/features/dice-roller/renderer/ThreeDiceRenderer';
import {
  hasSimulationTimedOut,
  MAX_SIMULATION_MS,
} from '@/features/dice-roller/renderer/timing';

const base = defaultScene as unknown as BabylonSceneFile;
const extras = extrasScene as unknown as BabylonSceneFile;
const merged = mergeSceneFiles(base, extras);

describe('dice value mapping', () => {
  it.each([
    [1, 0, 1],
    [7, 0, 7],
    [10, 10, 10],
    [42, 40, 2],
    [99, 90, 9],
    [100, 0, 10],
  ])('splits d100 %i into %i + %i', (value, tens, units) => {
    expect(splitD100(value)).toEqual({ tens, units });
  });

  it('creates one mesh for normal dice and two for d100', () => {
    expect(visualDiceFor({ id: 'a', sides: 6, value: 4 })).toHaveLength(1);
    const parts = visualDiceFor({ id: 'b', sides: 100, value: 100 });
    expect(parts.map((part) => part.kind)).toEqual(['d100', 'd10']);
    expect(parts.map((part) => part.faceValue)).toEqual([0, 10]);
  });

  it('normalizes values and rejects unsupported sides', () => {
    expect(normalizeValue(0, 6)).toBe(1);
    expect(normalizeValue(99, 6)).toBe(6);
    expect(dieKindForSides(20)).toBe('d20');
    expect(() => dieKindForSides(7)).toThrow('unsupported');
  });
});

describe('Babylon asset conversion', () => {
  it('mirrors Z and flips triangle winding', () => {
    expect(convertPositions([1, 2, 3])).toEqual(new Float32Array([1, 2, -3]));
    expect(flipWinding([0, 1, 2, 3, 4, 5])).toEqual([0, 2, 1, 3, 5, 4]);
  });

  it('builds geometry with converted attributes', () => {
    const mesh = base.meshes.find((entry) => entry.name === 'd6')!;
    const geometry = buildGeometry(mesh);
    expect(geometry.getAttribute('position').count).toBe(
      mesh.positions.length / 3,
    );
    expect(geometry.getIndex()?.count).toBe(mesh.indices.length);
    expect(geometry.getAttribute('position').getZ(0)).toBeCloseTo(
      -mesh.positions[2],
      6,
    );
    geometry.dispose();
  });

  it('derives six outward unit normals for a d6', () => {
    const mesh = merged.meshes.find((entry) => entry.name === 'd6_collider')!;
    const normals = computeFaceNormals(mesh, base.colliderFaceMap.d6);
    expect(normals.size).toBe(6);
    for (const normal of normals.values()) {
      expect(normal.length()).toBeCloseTo(1, 5);
    }
    const axes = [...normals.values()].map((normal) =>
      [normal.x, normal.y, normal.z].map((axis) => Math.abs(axis) > 0.85),
    );
    expect(axes.every((axis) => axis.filter(Boolean).length === 1)).toBe(true);
  });

  it('builds every supported die from the shipped assets', () => {
    const set = buildAssetSet(merged);
    expect([...set.assets.keys()].sort()).toEqual(
      ['d10', 'd100', 'd12', 'd2', 'd20', 'd4', 'd6', 'd8'].sort(),
    );
    expect(set.assets.get('d20')?.faceNormals.size).toBe(20);
    expect(set.assets.get('d100')?.faceNormals.size).toBe(10);
    expect(set.assets.get('d4')?.faceNormals.size).toBe(4);
    expect(set.assets.get('d6')?.colliderPoints.length).toBeGreaterThan(0);
  });

  it('keeps collider points aligned with the rendered mesh', () => {
    const mesh = base.meshes.find((entry) => entry.name === 'd8_collider')!;
    const points = colliderPoints(mesh);
    expect(points[2]).toBeCloseTo(-mesh.positions[2], 6);
  });

  it('loads theme inheritance through fetch', async () => {
    const files: Record<string, unknown> = {
      '/assets/themes/default-extras/theme.config.json': {
        extends: 'default',
        meshFile: 'default-extras.json',
      },
      '/assets/themes/default/theme.config.json': {
        meshFile: 'default.json',
      },
      '/assets/themes/default/default.json': base,
      '/assets/themes/default-extras/default-extras.json': extras,
    };
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      const key = String(url);
      if (!(key in files)) return { ok: false, status: 404 };
      return { ok: true, json: async () => files[key] };
    }) as unknown as typeof fetch;

    const set = await loadDiceAssets({
      assetPath: '/assets/',
      theme: 'default-extras',
      fetchImpl,
    });
    expect(set.assets.size).toBe(8);
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });
});

describe('face orientation', () => {
  it('rotates a face normal onto world up', () => {
    const quaternion = faceUpQuaternion(new THREE.Vector3(0, 0, 1));
    const rotated = new THREE.Vector3(0, 0, 1).applyQuaternion(quaternion);
    expect(rotated.x).toBeCloseTo(0, 5);
    expect(rotated.y).toBeCloseTo(1, 5);
    expect(rotated.z).toBeCloseTo(0, 5);
  });

  it('applies spin around the vertical after alignment', () => {
    const quaternion = targetQuaternion(
      new Map([[1, new THREE.Vector3(0, 1, 0)]]),
      1,
      Math.PI / 2,
    );
    expect(quaternion.length()).toBeCloseTo(1, 5);
    expect(() => targetQuaternion(new Map(), 2)).toThrow('no face normal');
  });

  it('produces deterministic cosmetic spins', () => {
    const first = cosmeticSpin('die-1', 6);
    expect(cosmeticSpin('die-1', 6)).toBe(first);
    expect(first).toBeGreaterThanOrEqual(0);
    expect(first).toBeLessThan(Math.PI * 2);
  });
});

const diceBoxMock = vi.hoisted(() => {
  const box = {
    init: vi.fn().mockResolvedValue(undefined),
    add: vi.fn(),
    clear: vi.fn(),
  };
  return {
    box,
    DiceBox: vi.fn(function () {
      return box;
    }),
  };
});

vi.mock('@3d-dice/dice-box', () => ({ default: diceBoxMock.DiceBox }));

describe('DiceBox adapter', () => {
  it('maps visuals to notation and replaces atomically', async () => {
    const renderer = new DiceBoxRenderer();
    const container = document.createElement('div');
    container.id = 'dice-surface';
    await renderer.init(container, {
      assetPath: '/assets/',
      theme: 'default-extras',
      reducedMotion: true,
    });
    expect(diceBoxMock.DiceBox).toHaveBeenCalledWith(
      expect.objectContaining({
        container: '#dice-surface',
        offscreen: false,
      }),
    );

    renderer.add([
      { id: 'a', sides: 6, value: 3 },
      { id: 'b', sides: 100, value: 42 },
    ]);
    expect(diceBoxMock.box.add.mock.calls).toEqual([['1d6'], ['2d10']]);

    diceBoxMock.box.add.mockClear();
    renderer.replace([{ id: 'c', sides: 20, value: 19 }]);
    expect(diceBoxMock.box.clear).toHaveBeenCalled();
    expect(diceBoxMock.box.add).toHaveBeenCalledWith('1d20');

    renderer.resize(800, 600);
    expect(diceBoxMock.box.clear).toHaveBeenCalledTimes(1);
    renderer.dispose();
    expect(diceBoxMock.box.clear).toHaveBeenCalledTimes(2);
  });
});

describe('simulation timing', () => {
  it('forces settle after the timeout', () => {
    expect(hasSimulationTimedOut(0, MAX_SIMULATION_MS)).toBe(false);
    expect(hasSimulationTimedOut(0, MAX_SIMULATION_MS + 1)).toBe(true);
  });
});

describe('renderer factory', () => {
  it('selects the requested renderer', () => {
    expect(createDiceRenderer({ kind: 'dicebox' })).toBeInstanceOf(
      DiceBoxRenderer,
    );
    expect(createDiceRenderer({ kind: 'three' })).toBeInstanceOf(
      ThreeDiceRenderer,
    );
  });

  it('is inert before init and safe to dispose twice', () => {
    const renderer = new ThreeDiceRenderer();
    renderer.add([{ id: 'a', sides: 6, value: 1 }]);
    renderer.resize(100, 100);
    renderer.clear();
    renderer.dispose();
    renderer.dispose();
  });
});
