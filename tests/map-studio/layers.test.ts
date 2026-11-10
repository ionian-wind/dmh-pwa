import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import {
  createDungeonLayer,
  createFolderLayer,
  createMap,
  createProject,
} from '@/map-studio/domain/document/factories';
import {
  reorderLayers,
  resolveLayerDropMode,
} from '@/map-studio/domain/layers';
import { useMapStudioStore } from '@/map-studio/stores/mapStudioStore';

function ids(layers: { id: string }[]): string[] {
  return layers.map((layer) => layer.id);
}

describe('map studio layer sorting', () => {
  it('resolves before, after and inside drop modes', () => {
    expect(resolveLayerDropMode(false, { top: 10, height: 40 }, 12)).toBe(
      'before',
    );
    expect(resolveLayerDropMode(false, { top: 10, height: 40 }, 45)).toBe(
      'after',
    );
    expect(resolveLayerDropMode(true, { top: 10, height: 40 }, 30)).toBe(
      'inside',
    );
    expect(resolveLayerDropMode(true, { top: 10, height: 40 }, 12)).toBe(
      'before',
    );
    expect(resolveLayerDropMode(true, { top: 10, height: 40 }, 48)).toBe(
      'after',
    );
    expect(resolveLayerDropMode(false, { top: 0, height: 0 }, 0)).toBe('after');
  });

  it('reorders root layers before and after a target', () => {
    const layers = [
      createDungeonLayer({ id: 'a', order: 0 }),
      createDungeonLayer({ id: 'b', order: 1 }),
      createDungeonLayer({ id: 'c', order: 2 }),
    ];
    const after = reorderLayers(layers, 'a', 'c', 'after')!;
    expect(ids(after)).toEqual(['b', 'c', 'a']);
    expect(after.map((layer) => layer.order)).toEqual([0, 1, 2]);
    const before = reorderLayers(layers, 'c', 'a', 'before')!;
    expect(ids(before)).toEqual(['c', 'a', 'b']);
  });

  it('moves layers into and out of folders', () => {
    const layers = [
      createDungeonLayer({ id: 'a', order: 0 }),
      createFolderLayer({ id: 'f', order: 1 }),
      createDungeonLayer({ id: 'b', order: 2 }),
    ];
    const nested = reorderLayers(layers, 'b', 'f', 'inside')!;
    expect(ids(nested)).toEqual(['a', 'f', 'b']);
    expect(nested.find((layer) => layer.id === 'b')?.parentId).toBe('f');
    expect(
      (nested.find((layer) => layer.id === 'f') as { expanded: boolean })
        .expanded,
    ).toBe(true);

    const movedOut = reorderLayers(nested, 'b', 'a', 'before')!;
    expect(ids(movedOut)).toEqual(['b', 'a', 'f']);
    expect(movedOut.find((layer) => layer.id === 'b')?.parentId).toBeNull();
  });

  it('keeps folder children with their folder', () => {
    const layers = [
      createDungeonLayer({ id: 'a', order: 0 }),
      createFolderLayer({ id: 'f', order: 1 }),
      createDungeonLayer({ id: 'b', order: 2, parentId: 'f' }),
      createFolderLayer({ id: 'g', order: 3 }),
    ];
    const moved = reorderLayers(layers, 'f', 'g', 'after')!;
    expect(ids(moved)).toEqual(['a', 'g', 'f', 'b']);
  });

  it('rejects invalid moves', () => {
    const layers = [
      createDungeonLayer({ id: 'a', order: 0 }),
      createDungeonLayer({ id: 'b', order: 1 }),
      createFolderLayer({ id: 'f', order: 2 }),
      createFolderLayer({ id: 'g', order: 3, parentId: 'f' }),
    ];
    expect(reorderLayers(layers, 'a', 'a', 'after')).toBeNull();
    expect(reorderLayers(layers, 'a', 'f', 'inside')!.length).toBe(4);
    expect(reorderLayers(layers, 'f', 'g', 'inside')).toBeNull();
    expect(reorderLayers(layers, 'a', 'b', 'inside')).toBeNull();
    expect(reorderLayers(layers, 'missing', 'a', 'after')).toBeNull();
    expect(reorderLayers(layers, 'a', 'missing', 'after')).toBeNull();

    const map = createMap(createProject().id);
    const background = map.layers.find((layer) => layer.type === 'background')!;
    expect(reorderLayers(map.layers, 'a', background.id, 'after')).toBeNull();
    expect(reorderLayers(map.layers, background.id, 'a', 'after')).toBeNull();
  });

  it('moves layers through the store with undo', () => {
    setActivePinia(createPinia());
    const store = useMapStudioStore();
    const project = createProject();
    store.setMap(createMap(project.id));
    store.addFolder('Folder');
    const folder = store.map!.layers.find((layer) => layer.type === 'folder')!;
    const dungeon = store.map!.layers.find(
      (layer) => layer.type === 'dungeon',
    )!;
    store.moveLayerRelative(dungeon.id, folder.id, 'inside');
    expect(
      store.map!.layers.find((layer) => layer.id === dungeon.id)?.parentId,
    ).toBe(folder.id);
    store.undo();
    expect(
      store.map!.layers.find((layer) => layer.id === dungeon.id)?.parentId,
    ).toBeNull();
  });
});
