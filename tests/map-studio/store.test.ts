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

describe('map studio presets and layer actions', () => {
  it('applies presets, adds, renames, moves and removes layers', () => {
    const store = useMapStudioStore();
    const map = createMap(createProject().id);
    store.setMap(map);
    const dungeon = store.activeLayer!;

    store.applyPreset(dungeon.id, 'blueprint');
    expect(store.activeLayer?.style.floor.color).toBe('#0b3a5b');

    store.addDungeonLayer('minimal');
    expect(
      store.map?.layers.filter((layer) => layer.type === 'dungeon'),
    ).toHaveLength(2);
    const added = store.activeLayer!;
    expect(added.id).not.toBe(dungeon.id);

    store.renameLayer(added.id, 'Upper level');
    expect(store.activeLayer?.name).toBe('Upper level');

    store.setLayerOpacity(added.id, 0.5);
    expect(store.activeLayer?.opacity).toBe(0.5);

    const beforeOrder = store.activeLayer?.order;
    store.moveLayer(added.id, -1);
    expect(store.activeLayer?.order).not.toBe(beforeOrder);

    store.removeLayer(added.id);
    expect(store.map?.layers.some((layer) => layer.id === added.id)).toBe(
      false,
    );
    expect(
      store.map?.layers.filter((layer) => layer.type === 'dungeon'),
    ).toHaveLength(1);
  });

  it('does not remove the last dungeon layer or background', () => {
    const store = useMapStudioStore();
    const map = createMap(createProject().id);
    store.setMap(map);
    const dungeon = store.activeLayer!;
    const background = map.layers.find((layer) => layer.type === 'background')!;
    store.removeLayer(dungeon.id);
    expect(store.map?.layers.some((layer) => layer.id === dungeon.id)).toBe(
      true,
    );
    store.removeLayer(background.id);
    expect(store.map?.layers.some((layer) => layer.id === background.id)).toBe(
      true,
    );
  });
});

describe('map studio layer no-ops', () => {
  it('ignores layer actions without a map or valid target', () => {
    const store = useMapStudioStore();
    store.applyPreset('missing', 'classic');
    store.addDungeonLayer('classic');
    store.renameLayer('missing', 'x');
    store.removeLayer('missing');
    store.moveLayer('missing', 1);
    store.setLayerStyle('missing', {
      floor: { visible: true, color: '#fff' },
      walls: {
        visible: true,
        color: '#000',
        width: 0.1,
        blocksLight: true,
        dash: false,
      },
      grid: { visible: true, color: '#000', width: 1 },
    });
    store.setLayerOpacity('missing', 0.5);
    expect(store.map).toBeNull();

    const map = createMap(createProject().id);
    store.setMap(map);
    const dungeon = store.activeLayer!;
    store.applyPreset(dungeon.id, 'missing');
    store.renameLayer(dungeon.id, '   ');
    store.moveLayer(dungeon.id, -10);
    store.setLayerStyle('missing', dungeon.style);
    expect(store.activeLayer?.name).toBe(dungeon.name);
  });
});

describe('map studio object actions', () => {
  it('adds, moves, selects and removes objects', () => {
    const store = useMapStudioStore();
    const map = createMap(createProject().id);
    store.setMap(map);
    store.addText('Hall', [1, 1]);
    store.addDoor([0, 0], [1, 0]);
    store.addStairs([
      [0, 0],
      [1, 0],
      [1, 1],
    ]);
    expect(store.imagesLayer?.objects).toHaveLength(3);
    const text = store.imagesLayer?.objects.find(
      (object) => object.type === 'text',
    )!;
    store.selectObject(text.id);
    expect(store.selectedObjectId).toBe(text.id);
    store.moveSelectedObject(1, 1);
    expect(
      store.selectedObject && store.selectedObject.type === 'text'
        ? store.selectedObject.transform.x
        : 0,
    ).toBe(2);
    store.removeSelectedObject();
    expect(store.imagesLayer?.objects).toHaveLength(2);
    expect(store.selectedObjectId).toBeNull();
    store.addText('   ', [0, 0]);
    store.addDoor([0, 0], [0, 0]);
    store.addStairs([[0, 0]]);
    expect(store.imagesLayer?.objects).toHaveLength(2);
  });
});

describe('map studio object guards', () => {
  it('ignores object actions without a map, images layer or selection', () => {
    const store = useMapStudioStore();
    store.addText('x', [0, 0]);
    store.addDoor([0, 0], [1, 0]);
    store.addStairs([
      [0, 0],
      [1, 0],
      [1, 1],
    ]);
    store.selectObject(null);
    store.moveSelectedObject(1, 1);
    store.removeSelectedObject();
    expect(store.map).toBeNull();

    const map = createMap(createProject().id);
    store.setMap({
      ...map,
      layers: map.layers.filter((layer) => layer.type !== 'images'),
    });
    store.addText('x', [0, 0]);
    expect(store.imagesLayer).toBeNull();
  });
});

describe('map studio object editing', () => {
  it('updates, duplicates and reorders objects', () => {
    const store = useMapStudioStore();
    const map = createMap(createProject().id);
    store.setMap(map);
    store.addText('A', [0, 0]);
    store.addText('B', [1, 1]);
    const first = store.imagesLayer!.objects[0];
    const second = store.imagesLayer!.objects[1];

    store.updateObject(first.id, { opacity: 0.5 });
    expect(store.imagesLayer?.objects[0].opacity).toBe(0.5);

    store.selectObject(first.id);
    store.duplicateObject(first.id);
    expect(store.imagesLayer?.objects).toHaveLength(3);
    expect(
      store.imagesLayer?.objects.some(
        (object) => object.id === store.selectedObjectId,
      ),
    ).toBe(true);

    store.reorderObject(second.id, 1);
    const ordered = [...store.imagesLayer!.objects].sort(
      (a, b) => a.order - b.order,
    );
    expect(ordered.at(-1)?.id).toBe(second.id);

    store.updateObject('missing', { opacity: 0.1 });
    store.duplicateObject('missing');
    store.reorderObject(second.id, 10);
    expect(store.imagesLayer?.objects).toHaveLength(3);
  });
});

describe('map studio object flipping', () => {
  it('flips text transforms and door/stairs points', () => {
    const store = useMapStudioStore();
    store.setMap(createMap(createProject().id));
    store.addText('A', [1, 1]);
    const text = store.imagesLayer!.objects[0];
    store.flipObject(text.id, 'x');
    expect(store.selectedObjectId).toBeNull();
    const flippedText = store.imagesLayer!.objects[0];
    expect(flippedText.type === 'text' && flippedText.transform.flipX).toBe(
      true,
    );

    store.addDoor([0, 0], [2, 0]);
    const door = store.imagesLayer!.objects[1];
    store.flipObject(door.id, 'x');
    const flippedDoor = store.imagesLayer!.objects[1];
    expect(flippedDoor.type === 'door' && flippedDoor.a).toEqual([2, 0]);

    store.addStairs([
      [0, 0],
      [2, 0],
      [2, 2],
    ]);
    const stairs = store.imagesLayer!.objects[2];
    store.flipObject(stairs.id, 'y');
    const flippedStairs = store.imagesLayer!.objects[2];
    expect(flippedStairs.type === 'stairs' && flippedStairs.points[0]).toEqual([
      0, 2,
    ]);
    store.flipObject('missing', 'x');
  });
});

describe('map studio image objects and live drag', () => {
  it('adds images and moves the selected object with one history entry', () => {
    const store = useMapStudioStore();
    store.setMap(createMap(createProject().id));
    store.addImage('data:image/png;base64,abc', [1, 1], 2, 2);
    const image = store.imagesLayer!.objects[0];
    expect(image.type).toBe('image');
    store.selectObject(image.id);
    store.beginObjectDrag();
    store.moveSelectedObjectLive(1, 1);
    const live = store.imagesLayer!.objects[0];
    expect(live.type === 'image' && live.transform.x).toBe(2);
    store.endObjectDrag();
    expect(store.canUndo).toBe(true);
    store.undo();
    const undone = store.imagesLayer!.objects[0];
    expect(undone.type === 'image' && undone.transform.x).toBe(1);
  });
});

describe('map studio live object patching', () => {
  it('patches selected object fields without history and ignores missing selection', () => {
    const store = useMapStudioStore();
    store.setMap(createMap(createProject().id));
    store.addText('A', [1, 1]);
    const text = store.imagesLayer!.objects[0];
    store.selectObject(text.id);
    store.patchSelectedObjectLive({ opacity: 0.4 });
    expect(store.imagesLayer?.objects[0].opacity).toBe(0.4);
    store.selectObject(null);
    store.patchSelectedObjectLive({ opacity: 0.1 });
    expect(store.imagesLayer?.objects[0].opacity).toBe(0.4);
  });
});

describe('map studio folders', () => {
  it('adds folders and reassigns layer parents', () => {
    const store = useMapStudioStore();
    store.setMap(createMap(createProject().id));
    store.addFolder('Level 1');
    const folder = store.map!.layers.find((layer) => layer.type === 'folder')!;
    expect(folder.name).toBe('Level 1');
    const dungeon = store.activeLayer!;
    store.setLayerParent(dungeon.id, folder.id);
    expect(
      store.map!.layers.find((layer) => layer.id === dungeon.id)?.parentId,
    ).toBe(folder.id);
    store.setLayerParent(dungeon.id, null);
    expect(
      store.map!.layers.find((layer) => layer.id === dungeon.id)?.parentId,
    ).toBeNull();
  });
});

describe('map studio folder hierarchy', () => {
  it('toggles folders and supports nested parents', () => {
    const store = useMapStudioStore();
    store.setMap(createMap(createProject().id));
    store.addFolder('Outer');
    const outer = store.map!.layers.find((layer) => layer.type === 'folder')!;
    store.addFolder('Inner');
    const inner = store.map!.layers.filter(
      (layer) => layer.type === 'folder',
    )[1];
    store.setLayerParent(inner.id, outer.id);
    expect(
      store.map!.layers.find((layer) => layer.id === inner.id)?.parentId,
    ).toBe(outer.id);
    store.toggleFolder(outer.id);
    expect(
      store.map!.layers.find((layer) => layer.id === outer.id),
    ).toMatchObject({ expanded: false });
    store.toggleFolder('missing');
    store.setLayerParent('missing', outer.id);
  });
});

describe('map studio folder guards', () => {
  it('ignores folder toggles on non-folders and without a map', () => {
    const store = useMapStudioStore();
    store.addFolder('X');
    store.toggleFolder('missing');
    store.setMap(createMap(createProject().id));
    const dungeon = store.activeLayer!;
    store.toggleFolder(dungeon.id);
    expect(
      store.map!.layers.find((layer) => layer.id === dungeon.id)?.type,
    ).toBe('dungeon');
  });
});

describe('map studio object rotation', () => {
  it('rotates text, door and stairs objects', () => {
    const store = useMapStudioStore();
    store.setMap(createMap(createProject().id));
    store.addText('A', [1, 1]);
    store.addDoor([0, 0], [2, 0]);
    store.addStairs([
      [0, 0],
      [2, 0],
      [2, 2],
    ]);
    const [text, door, stairs] = store.imagesLayer!.objects;
    store.selectObject(text.id);
    store.rotateSelectedObject(Math.PI / 2);
    expect(store.selectedObject?.transform.rotation).toBeCloseTo(Math.PI / 2);
    store.selectObject(door.id);
    store.rotateSelectedObject(Math.PI / 2);
    const rotatedDoor = store.imagesLayer!.objects.find(
      (o) => o.id === door.id,
    )!;
    expect(rotatedDoor.type === 'door' && rotatedDoor.a[0]).toBeCloseTo(1.1);
    store.selectObject(stairs.id);
    store.rotateSelectedObject(Math.PI / 2);
    const rotatedStairs = store.imagesLayer!.objects.find(
      (o) => o.id === stairs.id,
    )!;
    expect(
      rotatedStairs.type === 'stairs' && rotatedStairs.transform.rotation,
    ).toBeCloseTo(Math.PI / 2);
    store.selectObject(null);
    store.rotateSelectedObject(1);
  });
});

describe('map studio shape selection', () => {
  it('selects one shape or object at a time', () => {
    const store = useMapStudioStore();
    store.setMap(createMap(createProject().id));
    store.addRectangle({ x: 0, y: 0, width: 2, height: 2 });
    const shape = store.activeLayer!.shapes[0];
    store.selectShape(shape.id);
    expect(store.selectedShape?.id).toBe(shape.id);
    store.addText('A', [1, 1]);
    const object = store.imagesLayer!.objects[0];
    store.selectObject(object.id);
    expect(store.selectedShapeId).toBeNull();
    store.selectShape(shape.id);
    expect(store.selectedObjectId).toBeNull();
    store.selectShape(null);
    expect(store.selectedShape).toBeNull();
  });
});

describe('map studio multi-object drag', () => {
  it('selects multiple objects and moves them together', () => {
    const store = useMapStudioStore();
    store.setMap(createMap(createProject().id));
    store.addText('A', [1, 1]);
    store.addText('B', [3, 3]);
    const ids = store.imagesLayer!.objects.map((object) => object.id);
    store.selectObjects(ids);
    expect(store.selectedObjects).toHaveLength(2);
    store.beginObjectDrag();
    store.moveSelectedObjectLive(1, 1);
    store.endObjectDrag();
    const moved = store.imagesLayer!.objects;
    expect(moved[0].transform.x).toBe(2);
    expect(moved[1].transform.x).toBe(4);
  });
});

describe('map studio group resize and rotate', () => {
  it('scales and rotates selected text objects together', () => {
    const store = useMapStudioStore();
    store.setMap(createMap(createProject().id));
    store.addText('A', [1, 1]);
    store.addText('B', [3, 3]);
    const [a, b] = store.imagesLayer!.objects;
    store.selectObjects([a.id, b.id]);
    store.beginObjectDrag();
    store.resizeSelectedObjectsLive({
      x: 1,
      y: 1,
      width: 10,
      height: 4.896,
    });
    const resized = store.imagesLayer!.objects;
    expect(resized[0].transform.width).toBeCloseTo(6);
    expect(resized[1].transform.x).toBeCloseTo(5);
    store.rotateSelectedObjectsLive(Math.PI / 2);
    expect(store.imagesLayer!.objects[0].transform.rotation).toBeCloseTo(
      Math.PI / 2,
    );
    expect(store.imagesLayer!.objects[1].transform.rotation).toBeCloseTo(
      Math.PI / 2,
    );
    store.endObjectDrag();
    expect(store.canUndo).toBe(true);
  });

  it('scales door and stair geometry together', () => {
    const store = useMapStudioStore();
    store.setMap(createMap(createProject().id));
    store.addDoor([0, 0], [2, 0]);
    store.addStairs([
      [0, 2],
      [2, 2],
      [2, 4],
    ]);
    const [door, stairs] = store.imagesLayer!.objects;
    store.selectObjects([door.id, stairs.id]);
    store.beginObjectDrag();
    store.resizeSelectedObjectsLive({
      x: 0,
      y: 0,
      width: 4,
      height: 8,
    });
    const resizedDoor = store.imagesLayer!.objects.find(
      (object) => object.id === door.id,
    )!;
    expect(resizedDoor.type === 'door' && resizedDoor.b[0]).toBeCloseTo(4);
    const resizedStairs = store.imagesLayer!.objects.find(
      (object) => object.id === stairs.id,
    )!;
    expect(
      resizedStairs.type === 'stairs' && resizedStairs.points[2][1],
    ).toBeCloseTo(8);
    store.rotateSelectedObjectsLive(Math.PI / 2);
    expect(
      store.imagesLayer!.objects.find((object) => object.id === door.id),
    ).toBeTruthy();
    store.endObjectDrag();
  });
});

describe('map studio batch object actions', () => {
  it('updates, flips, duplicates and removes selected objects', () => {
    const store = useMapStudioStore();
    store.setMap(createMap(createProject().id));
    store.addText('A', [1, 1]);
    store.addText('B', [3, 3]);
    const ids = store.imagesLayer!.objects.map((object) => object.id);
    store.selectObjects(ids);
    store.updateSelectedObjects({ opacity: 0.5 });
    expect(store.imagesLayer!.objects.map((object) => object.opacity)).toEqual([
      0.5, 0.5,
    ]);
    store.setSelectedObjectsRotation(Math.PI / 2);
    expect(
      store.imagesLayer!.objects.map((object) => object.transform.rotation),
    ).toEqual([Math.PI / 2, Math.PI / 2]);
    store.flipSelectedObjects('x');
    expect(
      store.imagesLayer!.objects.every((object) => object.transform.flipX),
    ).toBe(true);
    store.duplicateSelectedObjects();
    expect(store.imagesLayer!.objects).toHaveLength(4);
    expect(store.selectedObjects).toHaveLength(2);
    const before = store.imagesLayer!.objects.map((object) => object.id);
    store.reorderSelectedObjects(-1);
    expect(store.imagesLayer!.objects.map((object) => object.id)).not.toEqual(
      before,
    );
    store.removeSelectedObjects();
    expect(store.imagesLayer!.objects).toHaveLength(2);
    expect(store.selectedObjectIds).toEqual([]);
    store.removeSelectedObjects();
    store.reorderSelectedObjects(1);
    store.updateSelectedObjects({ opacity: 0.2 });
  });

  it('applies type-specific properties only when they are common', () => {
    const store = useMapStudioStore();
    store.setMap(createMap(createProject().id));
    store.addDoor([0, 0], [1, 0]);
    store.addDoor([2, 0], [3, 0]);
    const doors = store.imagesLayer!.objects;
    store.selectObjects(doors.map((door) => door.id));
    store.updateSelectedObjects({ variant: 1 });
    expect(
      store.imagesLayer!.objects.every(
        (object) => object.type === 'door' && object.variant === 1,
      ),
    ).toBe(true);
    store.flipSelectedObjects('y');
    store.flipSelectedObjects('x');
    expect(store.selectedObjects).toHaveLength(2);
  });
});
