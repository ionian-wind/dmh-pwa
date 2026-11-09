import { defineStore } from 'pinia';
import { computed, ref, shallowRef } from 'vue';
import { generateId } from '@/utils/storage';
import type {
  DungeonLayer,
  DungeonShape,
  DungeonLayerStyle,
  ImagesLayer,
  StudioObject,
  StudioMap,
  StudioProject,
  StudioTool,
  ToolSettings,
} from '@/map-studio/domain/document/types';
import { createDungeonLayer } from '@/map-studio/domain/document/factories';
import { getDungeonPreset } from '@/map-studio/domain/presets';
import {
  createDoorObject,
  createStairsObject,
  createTextObject,
  moveObject,
} from '@/map-studio/domain/objects';
import {
  listMaps,
  listProjects,
  saveMap,
  saveProject,
} from '@/map-studio/persistence/repository';

const MAX_HISTORY = 80;

function cloneMap(map: StudioMap): StudioMap {
  // Documents are plain JSON. A JSON clone also strips Vue proxies passed
  // from reactive tool state before they reach history/structuredClone.
  return JSON.parse(JSON.stringify(map)) as StudioMap;
}

export const useMapStudioStore = defineStore('mapStudio', () => {
  const projects = shallowRef<StudioProject[]>([]);
  const project = shallowRef<StudioProject | null>(null);
  const map = shallowRef<StudioMap | null>(null);
  const maps = shallowRef<StudioMap[]>([]);
  const activeLayerId = ref<string | null>(null);
  const selectedObjectId = ref<string | null>(null);
  const tool = ref<StudioTool>('rectangle');
  const toolSettings = ref<ToolSettings>({
    snap: true,
    division: 1,
    mode: 'draw',
    cornerRadius: 0,
    rough: 0,
    pathRadius: 0.25,
    wallWidth: 0.08,
  });
  const undoStack = shallowRef<StudioMap[]>([]);
  const redoStack = shallowRef<StudioMap[]>([]);
  const dirty = ref(false);
  const autosave = ref<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const loading = ref(false);

  const activeLayer = computed<DungeonLayer | null>(() => {
    const current = map.value;
    if (!current) return null;
    const layer = current.layers.find(
      (entry) => entry.id === activeLayerId.value,
    );
    if (layer?.type === 'dungeon') return layer;
    return (
      (current.layers.find((entry) => entry.type === 'dungeon') as
        DungeonLayer | undefined) ?? null
    );
  });

  const imagesLayer = computed<ImagesLayer | null>(
    () =>
      (map.value?.layers.find((layer) => layer.type === 'images') as
        ImagesLayer | undefined) ?? null,
  );
  const selectedObject = computed(
    () =>
      imagesLayer.value?.objects.find(
        (object) => object.id === selectedObjectId.value,
      ) ?? null,
  );

  const canUndo = computed(() => undoStack.value.length > 0);
  const canRedo = computed(() => redoStack.value.length > 0);

  function setMap(next: StudioMap, resetHistory = true): void {
    map.value = next;
    dirty.value = false;
    activeLayerId.value =
      next.layers.find((layer) => layer.type === 'dungeon')?.id ?? null;
    if (resetHistory) {
      undoStack.value = [];
      redoStack.value = [];
    }
  }

  async function loadLibrary(): Promise<void> {
    loading.value = true;
    try {
      projects.value = await listProjects();
    } finally {
      loading.value = false;
    }
  }

  async function openProject(
    projectId: string,
    preferredMapId?: string,
  ): Promise<void> {
    loading.value = true;
    try {
      const entry = projects.value.find((item) => item.id === projectId);
      project.value = entry ?? null;
      maps.value = await listMaps(projectId);
      const selected =
        maps.value.find((item) => item.id === preferredMapId) ??
        maps.value[0] ??
        null;
      if (selected) setMap(selected);
      else {
        map.value = null;
        dirty.value = false;
      }
    } finally {
      loading.value = false;
    }
  }

  async function openMap(mapId: string): Promise<void> {
    const found = maps.value.find((item) => item.id === mapId);
    if (found) setMap(found);
  }

  function commit(next: StudioMap): void {
    if (map.value) {
      undoStack.value = [
        ...undoStack.value.slice(-(MAX_HISTORY - 1)),
        cloneMap(map.value),
      ];
      redoStack.value = [];
    }
    const updated = { ...next, updatedAt: Date.now() };
    map.value = updated;
    dirty.value = true;
    autosave.value = 'idle';
    const index = maps.value.findIndex((entry) => entry.id === updated.id);
    if (index === -1) maps.value = [...maps.value, updated];
    else
      maps.value = maps.value.map((entry) =>
        entry.id === updated.id ? updated : entry,
      );
  }

  function addRectangle(rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  }): void {
    const current = map.value;
    const layer = activeLayer.value;
    if (!current || !layer) return;
    const next: StudioMap = {
      ...current,
      layers: current.layers.map((entry) =>
        entry.id === layer.id
          ? {
              ...layer,
              shapes: [
                ...layer.shapes,
                {
                  id: generateId(),
                  operation:
                    toolSettings.value.mode === 'erase' ? 'subtract' : 'add',
                  shape: {
                    kind: 'rectangle',
                    x: rect.x,
                    y: rect.y,
                    width: rect.width,
                    height: rect.height,
                    cornerRadius: toolSettings.value.cornerRadius,
                    rough: toolSettings.value.rough,
                    smooth: false,
                  },
                },
              ],
            }
          : entry,
      ),
    };
    commit(next);
  }

  function addShape(shape: DungeonShape): void {
    const current = map.value;
    const layer = activeLayer.value;
    if (!current || !layer) return;
    commit({
      ...current,
      layers: current.layers.map((entry) =>
        entry.id === layer.id
          ? { ...layer, shapes: [...layer.shapes, shape] }
          : entry,
      ),
    });
  }

  function addCircle(circle: { cx: number; cy: number; radius: number }): void {
    addShape({
      id: generateId(),
      operation: toolSettings.value.mode === 'erase' ? 'subtract' : 'add',
      shape: {
        kind: 'circle',
        ...circle,
        rough: toolSettings.value.rough,
        smooth: false,
      },
    });
  }

  function addPolygon(points: Array<[number, number]>): void {
    if (points.length < 3) return;
    addShape({
      id: generateId(),
      operation: toolSettings.value.mode === 'erase' ? 'subtract' : 'add',
      shape: {
        kind: 'polygon',
        points,
        rough: toolSettings.value.rough,
        smooth: false,
      },
    });
  }

  function addPath(points: Array<[number, number]>): void {
    if (points.length < 2) return;
    addShape({
      id: generateId(),
      operation: toolSettings.value.mode === 'erase' ? 'subtract' : 'add',
      shape: {
        kind: 'path',
        points,
        radius: toolSettings.value.pathRadius,
        closed: false,
        rough: toolSettings.value.rough,
        smooth: false,
      },
    });
  }

  function addWall(points: Array<[number, number]>): void {
    if (points.length < 2) return;
    addShape({
      id: generateId(),
      operation: 'add',
      shape: {
        kind: 'wall',
        points,
        width: toolSettings.value.wallWidth,
        dash: false,
        rough: toolSettings.value.rough,
        smooth: false,
      },
    });
  }

  function applyPreset(layerId: string, presetId: string): void {
    const current = map.value;
    const preset = getDungeonPreset(presetId);
    if (!current || !preset) return;
    commit({
      ...current,
      layers: current.layers.map((layer) =>
        layer.id === layerId && layer.type === 'dungeon'
          ? { ...layer, style: structuredClone(preset.style) }
          : layer,
      ),
    });
  }

  function addDungeonLayer(presetId: string): void {
    const current = map.value;
    if (!current) return;
    const preset = getDungeonPreset(presetId);
    const maxOrder = Math.max(
      -1,
      ...current.layers.map((layer) => layer.order),
    );
    const layer = createDungeonLayer({
      name: preset?.nameKey
        ? `Dungeon ${current.layers.filter((entry) => entry.type === 'dungeon').length + 1}`
        : 'Dungeon',
      order: maxOrder + 1,
      ...(preset ? { style: structuredClone(preset.style) } : {}),
    });
    activeLayerId.value = layer.id;
    commit({ ...current, layers: [...current.layers, layer] });
  }

  function renameLayer(layerId: string, name: string): void {
    const current = map.value;
    if (!current) return;
    const next = name.trim();
    if (!next) return;
    commit({
      ...current,
      layers: current.layers.map((layer) =>
        layer.id === layerId ? { ...layer, name: next } : layer,
      ),
    });
  }

  function removeLayer(layerId: string): void {
    const current = map.value;
    if (!current) return;
    const layer = current.layers.find((entry) => entry.id === layerId);
    if (!layer || layer.type === 'background' || layer.type === 'images')
      return;
    const dungeons = current.layers.filter((entry) => entry.type === 'dungeon');
    if (dungeons.length <= 1) return;
    commit({
      ...current,
      layers: current.layers.filter((entry) => entry.id !== layerId),
    });
    if (activeLayerId.value === layerId) {
      activeLayerId.value =
        current.layers.find(
          (entry) => entry.type === 'dungeon' && entry.id !== layerId,
        )?.id ?? null;
    }
  }

  function moveLayer(layerId: string, direction: -1 | 1): void {
    const current = map.value;
    if (!current) return;
    const ordered = [...current.layers].sort((a, b) => a.order - b.order);
    const index = ordered.findIndex((layer) => layer.id === layerId);
    const target = index + direction;
    if (index === -1 || target < 0 || target >= ordered.length) return;
    const a = ordered[index];
    const b = ordered[target];
    if (a.type === 'background' || b.type === 'background') return;
    commit({
      ...current,
      layers: current.layers.map((layer) => {
        if (layer.id === a.id) return { ...layer, order: b.order };
        if (layer.id === b.id) return { ...layer, order: a.order };
        return layer;
      }),
    });
  }

  function setLayerStyle(layerId: string, style: DungeonLayerStyle): void {
    const current = map.value;
    if (!current) return;
    commit({
      ...current,
      layers: current.layers.map((layer) =>
        layer.id === layerId && layer.type === 'dungeon'
          ? { ...layer, style }
          : layer,
      ),
    });
  }

  function setLayerOpacity(layerId: string, opacity: number): void {
    const current = map.value;
    if (!current) return;
    commit({
      ...current,
      layers: current.layers.map((layer) =>
        layer.id === layerId
          ? { ...layer, opacity: Math.min(1, Math.max(0, opacity)) }
          : layer,
      ),
    });
  }

  function setObjects(objects: ImagesLayer['objects']): void {
    const current = map.value;
    const layer = imagesLayer.value;
    if (!current || !layer) return;
    commit({
      ...current,
      layers: current.layers.map((entry) =>
        entry.id === layer.id ? { ...layer, objects } : entry,
      ),
    });
  }

  function nextObjectOrder(): number {
    return (imagesLayer.value?.objects.length ?? 0) + 1;
  }

  function addText(text: string, point: [number, number]): void {
    const trimmed = text.trim();
    if (!trimmed) return;
    setObjects([
      ...(imagesLayer.value?.objects ?? []),
      createTextObject(trimmed, point, nextObjectOrder()),
    ]);
  }

  function addDoor(a: [number, number], b: [number, number]): void {
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 0.1) return;
    setObjects([
      ...(imagesLayer.value?.objects ?? []),
      createDoorObject(a, b, nextObjectOrder()),
    ]);
  }

  function addStairs(points: Array<[number, number]>): void {
    if (points.length < 3) return;
    setObjects([
      ...(imagesLayer.value?.objects ?? []),
      createStairsObject(points, nextObjectOrder()),
    ]);
  }

  function selectObject(id: string | null): void {
    selectedObjectId.value = id;
  }

  function moveSelectedObject(dx: number, dy: number): void {
    const id = selectedObjectId.value;
    if (!id) return;
    const objects = imagesLayer.value?.objects ?? [];
    setObjects(
      objects.map((object) =>
        object.id === id ? moveObject(object, dx, dy) : object,
      ),
    );
  }

  function updateObject(id: string, patch: Partial<StudioObject>): void {
    const objects = imagesLayer.value?.objects ?? [];
    setObjects(
      objects.map((object) =>
        object.id === id ? ({ ...object, ...patch } as StudioObject) : object,
      ),
    );
  }

  function duplicateObject(id: string): void {
    const objects = imagesLayer.value?.objects ?? [];
    const source = objects.find((object) => object.id === id);
    if (!source) return;
    const copy = JSON.parse(JSON.stringify(source)) as StudioObject;
    const order = nextObjectOrder();
    if (copy.type === 'text') {
      copy.transform.x += 0.5;
      copy.transform.y += 0.5;
    } else if (copy.type === 'door') {
      copy.a = [copy.a[0] + 0.5, copy.a[1] + 0.5];
      copy.b = [copy.b[0] + 0.5, copy.b[1] + 0.5];
      copy.transform.x += 0.5;
      copy.transform.y += 0.5;
    } else {
      copy.points = copy.points.map(([x, y]) => [x + 0.5, y + 0.5]);
      copy.transform.x += 0.5;
      copy.transform.y += 0.5;
    }
    setObjects([...objects, { ...copy, id: generateId(), order }]);
    selectedObjectId.value = copy.id;
  }

  function reorderObject(id: string, direction: -1 | 1): void {
    const objects = [...(imagesLayer.value?.objects ?? [])].sort(
      (a, b) => a.order - b.order,
    );
    const index = objects.findIndex((object) => object.id === id);
    const target = index + direction;
    if (index === -1 || target < 0 || target >= objects.length) return;
    const next = [...objects];
    [next[index], next[target]] = [next[target], next[index]];
    setObjects(next.map((object, order) => ({ ...object, order: order + 1 })));
  }

  function flipObject(id: string, axis: 'x' | 'y'): void {
    const objects = imagesLayer.value?.objects ?? [];
    const object = objects.find((entry) => entry.id === id);
    if (!object) return;
    if (object.type === 'text') {
      updateObject(id, {
        transform: {
          ...object.transform,
          flipX:
            axis === 'x' ? !object.transform.flipX : object.transform.flipX,
          flipY:
            axis === 'y' ? !object.transform.flipY : object.transform.flipY,
        },
      });
      return;
    }
    const points =
      object.type === 'door' ? [object.a, object.b] : object.points;
    const xs = points.map(([x]) => x);
    const ys = points.map(([, y]) => y);
    const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
    const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;
    const mirror = ([x, y]: [number, number]): [number, number] => [
      axis === 'x' ? centerX * 2 - x : x,
      axis === 'y' ? centerY * 2 - y : y,
    ];
    if (object.type === 'door') {
      updateObject(id, { a: mirror(object.a), b: mirror(object.b) });
    } else {
      updateObject(id, { points: object.points.map(mirror) });
    }
  }

  function removeSelectedObject(): void {
    const id = selectedObjectId.value;
    if (!id) return;
    setObjects(
      (imagesLayer.value?.objects ?? []).filter((object) => object.id !== id),
    );
    selectedObjectId.value = null;
  }

  function undo(): void {
    const previous = undoStack.value.at(-1);
    if (!previous || !map.value) return;
    redoStack.value = [...redoStack.value, cloneMap(map.value)];
    undoStack.value = undoStack.value.slice(0, -1);
    map.value = previous;
    dirty.value = true;
  }

  function redo(): void {
    const next = redoStack.value.at(-1);
    if (!next || !map.value) return;
    undoStack.value = [...undoStack.value, cloneMap(map.value)];
    redoStack.value = redoStack.value.slice(0, -1);
    map.value = next;
    dirty.value = true;
  }

  function setActiveLayer(id: string): void {
    activeLayerId.value = id;
  }

  function setTool(next: StudioTool): void {
    tool.value = next;
  }

  function toggleLayerVisibility(id: string): void {
    const current = map.value;
    if (!current) return;
    commit({
      ...current,
      layers: current.layers.map((layer) =>
        layer.id === id ? { ...layer, visible: !layer.visible } : layer,
      ),
    });
  }

  function toggleLayerLock(id: string): void {
    const current = map.value;
    if (!current) return;
    commit({
      ...current,
      layers: current.layers.map((layer) =>
        layer.id === id ? { ...layer, locked: !layer.locked } : layer,
      ),
    });
  }

  async function save(): Promise<void> {
    const current = map.value;
    const currentProject = project.value;
    if (!current || !currentProject) return;
    autosave.value = 'saving';
    try {
      await saveMap(current);
      await saveProject(currentProject);
      dirty.value = false;
      autosave.value = 'saved';
    } catch {
      autosave.value = 'error';
    }
  }

  return {
    projects,
    project,
    map,
    maps,
    activeLayerId,
    activeLayer,
    imagesLayer,
    selectedObjectId,
    selectedObject,
    tool,
    toolSettings,
    dirty,
    autosave,
    loading,
    canUndo,
    canRedo,
    loadLibrary,
    openProject,
    openMap,
    setMap,
    commit,
    addRectangle,
    addShape,
    addCircle,
    addPolygon,
    addPath,
    addWall,
    addText,
    addDoor,
    addStairs,
    selectObject,
    moveSelectedObject,
    removeSelectedObject,
    updateObject,
    duplicateObject,
    reorderObject,
    flipObject,
    applyPreset,
    addDungeonLayer,
    renameLayer,
    removeLayer,
    moveLayer,
    setLayerStyle,
    setLayerOpacity,
    undo,
    redo,
    setActiveLayer,
    setTool,
    toggleLayerVisibility,
    toggleLayerLock,
    save,
  };
});
