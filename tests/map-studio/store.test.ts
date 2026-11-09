import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import {
  createMap,
  createProject,
} from '@/map-studio/domain/document/factories';
import { useMapStudioStore } from '@/map-studio/stores/mapStudioStore';

describe('map studio store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('adds rectangles and supports undo/redo', () => {
    const store = useMapStudioStore();
    const project = createProject({ name: 'Store' });
    const map = createMap(project.id);
    store.setMap(map);

    store.addRectangle({ x: 1, y: 2, width: 3, height: 4 });
    const dungeon = store.map?.layers.find((layer) => layer.type === 'dungeon');
    expect(dungeon && 'shapes' in dungeon ? dungeon.shapes : []).toHaveLength(
      1,
    );
    expect(store.canUndo).toBe(true);
    expect(store.dirty).toBe(true);

    store.undo();
    const afterUndo = store.map?.layers.find(
      (layer) => layer.type === 'dungeon',
    );
    expect(
      afterUndo && 'shapes' in afterUndo ? afterUndo.shapes : [],
    ).toHaveLength(0);
    expect(store.canRedo).toBe(true);

    store.redo();
    const afterRedo = store.map?.layers.find(
      (layer) => layer.type === 'dungeon',
    );
    expect(
      afterRedo && 'shapes' in afterRedo ? afterRedo.shapes : [],
    ).toHaveLength(1);
  });

  it('toggles layer visibility and lock without mutating others', () => {
    const store = useMapStudioStore();
    const project = createProject();
    const map = createMap(project.id);
    store.setMap(map);
    const dungeon = map.layers.find((layer) => layer.type === 'dungeon')!;

    store.toggleLayerVisibility(dungeon.id);
    expect(
      store.map?.layers.find((layer) => layer.id === dungeon.id)?.visible,
    ).toBe(false);

    store.toggleLayerLock(dungeon.id);
    expect(
      store.map?.layers.find((layer) => layer.id === dungeon.id)?.locked,
    ).toBe(true);
  });
});

describe('map studio store workflows', () => {
  it('opens a project from the repository and saves changes', async () => {
    const { createProjectWithMap } =
      await import('@/map-studio/persistence/repository');
    const { project, map } = await createProjectWithMap('Workflow');
    const store = useMapStudioStore();

    await store.loadLibrary();
    await store.openProject(project.id);
    expect(store.map?.id).toBe(map.id);
    expect(store.activeLayerId).toBeTruthy();

    store.addRectangle({ x: 0, y: 0, width: 2, height: 2 });
    await store.save();
    expect(store.dirty).toBe(false);
    expect(store.autosave).toBe('saved');
  });

  it('handles empty projects, missing maps and inactive layers', async () => {
    const store = useMapStudioStore();
    await store.loadLibrary();
    await store.openProject('missing');
    expect(store.map).toBeNull();
    await store.openMap('missing');
    expect(store.map).toBeNull();

    const project = createProject();
    const map = createMap(project.id);
    store.setMap(map);
    store.setActiveLayer('missing');
    expect(store.activeLayer?.type).toBe('dungeon');
    store.setTool('pan');
    expect(store.tool).toBe('pan');
    store.undo();
    store.redo();
    expect(store.map?.id).toBe(map.id);

    const noDungeon = {
      ...map,
      layers: map.layers.filter((layer) => layer.type !== 'dungeon'),
    };
    store.setMap(noDungeon);
    store.setActiveLayer('missing');
    store.addRectangle({ x: 0, y: 0, width: 1, height: 1 });
    expect(store.map?.layers).toHaveLength(noDungeon.layers.length);
  });

  it('does nothing when there is no current map or project', async () => {
    const store = useMapStudioStore();
    store.addRectangle({ x: 0, y: 0, width: 1, height: 1 });
    store.undo();
    store.redo();
    await store.save();
    expect(store.map).toBeNull();
  });
});

describe('map studio shape helpers', () => {
  it('adds circles and polygons in draw and erase modes', () => {
    const store = useMapStudioStore();
    const project = createProject();
    const map = createMap(project.id);
    store.setMap(map);

    store.addCircle({ cx: 2, cy: 2, radius: 1 });
    store.addPolygon([
      [0, 0],
      [2, 0],
      [2, 2],
    ]);
    store.addPolygon([[0, 0]]);
    expect(
      (store.activeLayer?.shapes ?? []).map((shape) => shape.shape.kind),
    ).toEqual(['circle', 'polygon']);

    store.toolSettings.mode = 'erase';
    store.addCircle({ cx: 4, cy: 4, radius: 1 });
    expect(store.activeLayer?.shapes.at(-1)?.operation).toBe('subtract');
  });
});

describe('map studio path and wall helpers', () => {
  it('adds paths and walls from tool settings', () => {
    const store = useMapStudioStore();
    const map = createMap(createProject().id);
    store.setMap(map);
    store.toolSettings.pathRadius = 0.4;
    store.toolSettings.wallWidth = 0.2;
    store.addPath([
      [0, 0],
      [1, 1],
    ]);
    store.addWall([
      [0, 0],
      [2, 2],
    ]);
    const shapes = store.activeLayer?.shapes ?? [];
    expect(shapes.map((shape) => shape.shape.kind)).toEqual(['path', 'wall']);
    expect(shapes[0].shape).toMatchObject({ radius: 0.4 });
    expect(shapes[1].shape).toMatchObject({ width: 0.2 });
  });
});
