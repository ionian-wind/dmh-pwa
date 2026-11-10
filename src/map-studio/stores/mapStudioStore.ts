import { defineStore } from 'pinia';
import { intersection, type Polygon } from 'polygon-clipping';
import { computed, ref, shallowRef } from 'vue';
import { generateId } from '@/utils/storage';
import type {
  DungeonLayer,
  DungeonShape,
  DungeonLayerStyle,
  ImagesLayer,
  StudioLayer,
  Point,
  StudioObject,
  StudioMap,
  StudioProject,
  StudioTool,
  ToolSettings,
} from '@/map-studio/domain/document/types';
import {
  createDungeonLayer,
  createFolderLayer,
} from '@/map-studio/domain/document/factories';
import { getDungeonPreset } from '@/map-studio/domain/presets';
import { compileDungeonLayer } from '@/map-studio/domain/geometry/compile';
import {
  reorderLayers,
  type LayerDropPlacement,
} from '@/map-studio/domain/layers';
import {
  buildLayerTree,
  flattenLayerTree,
  type LayerTreeNode,
} from '@/map-studio/domain/layerTree';
import {
  createDoorObject,
  createStairsObject,
  createTextObject,
  createImageObject,
  moveObject,
  objectBounds,
  unionBounds,
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
  const settingsLayerId = ref<string | null>(null);
  const selectedLayerIds = ref<string[]>([]);
  const selectedObjectId = ref<string | null>(null);
  const selectedShapeId = ref<string | null>(null);
  const selectedObjectIds = ref<string[]>([]);
  const tool = ref<StudioTool>('rectangle');
  const toolSettings = ref<ToolSettings>({
    snap: true,
    division: 1,
    mode: 'draw',
    cornerRadius: 0,
    rough: 0,
    roughMode: false,
    pathRadius: 0.25,
    wallWidth: 0.08,
    wallDash: false,
    wallDashSize: 0.4,
    doorVariant: 0,
    doorFill: '#f4efe4',
    doorStroke: '#1f2933',
    doorRough: 0,
    stairsSteps: 3,
    stairsStroke: '#1f2933',
    stairsRough: 0,
    sides: 1,
    drawTo: 'point',
    smooth: false,
    text: {
      fontFamily: 'Georgia, serif',
      fontSize: 0.32,
      color: '#1f2933',
      align: 'left',
      shadow: {
        enabled: false,
        color: '#000000',
        offsetX: 0.04,
        offsetY: 0.04,
        opacity: 0.5,
      },
    },
  });
  const undoStack = shallowRef<StudioMap[]>([]);
  const redoStack = shallowRef<StudioMap[]>([]);
  const dirty = ref(false);
  const autosave = ref<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const loading = ref(false);
  let objectDragSnapshot: StudioMap | null = null;

  const settingsLayer = computed<StudioLayer | null>(() => {
    const current = map.value;
    if (!current) return null;
    return (
      current.layers.find((layer) => layer.id === settingsLayerId.value) ??
      current.layers.find((layer) => layer.type === 'dungeon') ??
      null
    );
  });

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
  const selectedObjects = computed<StudioObject[]>(() =>
    (imagesLayer.value?.objects ?? []).filter((object) =>
      selectedObjectIds.value.includes(object.id),
    ),
  );
  const selectedObject = computed(
    () =>
      imagesLayer.value?.objects.find(
        (object) => object.id === selectedObjectId.value,
      ) ?? null,
  );

  const selectedShape = computed(() => {
    const id = selectedShapeId.value;
    if (!id) return null;
    for (const layer of map.value?.layers ?? []) {
      if (layer.type !== 'dungeon') continue;
      const shape = layer.shapes.find((entry) => entry.id === id);
      if (shape) return shape;
    }
    return null;
  });

  const canUndo = computed(() => undoStack.value.length > 0);
  const canRedo = computed(() => redoStack.value.length > 0);

  function setMap(next: StudioMap, resetHistory = true): void {
    map.value = next;
    dirty.value = false;
    activeLayerId.value =
      next.layers.find((layer) => layer.type === 'dungeon')?.id ?? null;
    settingsLayerId.value = activeLayerId.value;
    selectedLayerIds.value = activeLayerId.value ? [activeLayerId.value] : [];
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
        sides: Math.max(1, Math.min(24, Math.round(toolSettings.value.sides))),
        drawTo: toolSettings.value.drawTo,
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
        smooth: toolSettings.value.smooth,
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
        smooth: toolSettings.value.smooth,
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
        dash: toolSettings.value.wallDash,
        dashSize: toolSettings.value.wallDashSize,
        rough: toolSettings.value.rough,
        smooth: toolSettings.value.smooth,
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
    settingsLayerId.value = layer.id;
    commit({ ...current, layers: [...current.layers, layer] });
  }

  function addFolder(name = 'Folder'): void {
    const current = map.value;
    if (!current) return;
    const maxOrder = Math.max(
      -1,
      ...current.layers.map((layer) => layer.order),
    );
    commit({
      ...current,
      layers: [
        ...current.layers,
        createFolderLayer({ name, order: maxOrder + 1 }),
      ],
    });
  }

  function layerDisplayOrder(): string[] {
    const current = map.value;
    if (!current) return [];
    return flattenLayerTree(buildLayerTree(current.layers)).map(
      (layer) => layer.id,
    );
  }

  function applyLayerSelection(
    ids: string[],
    primaryId = ids.at(-1) ?? null,
  ): void {
    selectedLayerIds.value = [...new Set(ids)];
    settingsLayerId.value = primaryId;
    if (primaryId) {
      const layer = map.value?.layers.find((entry) => entry.id === primaryId);
      if (layer?.type === 'dungeon') activeLayerId.value = primaryId;
    }
  }

  function setSettingsLayer(layerId: string): void {
    applyLayerSelection([layerId], layerId);
  }

  function toggleLayerSelection(layerId: string): void {
    const ids = new Set(selectedLayerIds.value);
    if (ids.has(layerId)) {
      if (ids.size > 1) ids.delete(layerId);
    } else {
      ids.add(layerId);
    }
    applyLayerSelection([...ids], layerId);
  }

  function selectLayerRange(layerId: string): void {
    const order = layerDisplayOrder();
    const from = order.indexOf(settingsLayerId.value ?? layerId);
    const to = order.indexOf(layerId);
    if (from === -1 || to === -1) return setSettingsLayer(layerId);
    const [start, end] = from < to ? [from, to] : [to, from];
    applyLayerSelection(order.slice(start, end + 1), layerId);
  }

  function toggleFolder(layerId: string): void {
    const current = map.value;
    if (!current) return;
    commit({
      ...current,
      layers: current.layers.map((layer) =>
        layer.id === layerId && layer.type === 'folder'
          ? { ...layer, expanded: !layer.expanded }
          : layer,
      ),
    });
  }

  function setLayerParent(layerId: string, parentId: string | null): void {
    const current = map.value;
    if (!current) return;
    commit({
      ...current,
      layers: current.layers.map((layer) =>
        layer.id === layerId ? { ...layer, parentId } : layer,
      ),
    });
  }

  function setLayerStructure(
    layers: StudioLayer[],
    expandedFolderId: string | null = null,
  ): void {
    const current = map.value;
    if (!current) return;
    commit({
      ...current,
      layers: layers.map((layer) =>
        expandedFolderId &&
        layer.id === expandedFolderId &&
        layer.type === 'folder'
          ? { ...layer, expanded: true }
          : layer,
      ),
    });
  }

  function moveLayerRelative(
    layerId: string,
    targetId: string,
    placement: LayerDropPlacement,
  ): void {
    const current = map.value;
    if (!current) return;
    const layers = reorderLayers(
      current.layers as StudioLayer[],
      layerId,
      targetId,
      placement,
    );
    if (!layers) return;
    commit({ ...current, layers });
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
    if (layer.type === 'dungeon' && dungeons.length <= 1) return;
    commit({
      ...current,
      layers: current.layers
        .filter((entry) => entry.id !== layerId)
        .map((entry) =>
          layer.type === 'folder' && entry.parentId === layerId
            ? { ...entry, parentId: layer.parentId }
            : entry,
        ),
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
    const layer = current.layers.find((entry) => entry.id === layerId);
    if (!layer) return;
    const siblings = current.layers
      .filter((entry) => entry.parentId === layer.parentId)
      .sort((a, b) => a.order - b.order);
    const index = siblings.findIndex((entry) => entry.id === layerId);
    const target = siblings[index + direction];
    if (!target) return;
    moveLayerRelative(layerId, target.id, direction < 0 ? 'before' : 'after');
  }

  function selectedRoots(): StudioLayer[] {
    const ids = new Set(selectedLayerIds.value);
    const byId = new Map(
      (map.value?.layers ?? []).map((layer) => [layer.id, layer]),
    );
    return [...ids]
      .map((id) => byId.get(id))
      .filter((layer): layer is StudioLayer => !!layer)
      .filter((layer) => {
        let parentId = layer.parentId;
        while (parentId) {
          if (ids.has(parentId)) return false;
          parentId = byId.get(parentId)?.parentId ?? null;
        }
        return true;
      });
  }

  function bulkDuplicateLayers(): void {
    const current = map.value;
    if (!current) return;
    const roots = selectedRoots();
    if (!roots.length) return;
    const maxOrder = Math.max(
      -1,
      ...current.layers.map((layer) => layer.order),
    );
    const copies: StudioLayer[] = [];
    const newIds: string[] = [];
    const appendSubtree = (source: StudioLayer, parentId: string | null) => {
      const copy = {
        ...(JSON.parse(JSON.stringify(source)) as StudioLayer),
        id: generateId(),
        parentId,
        name: `${source.name} copy`,
        order: maxOrder + copies.length + 1,
      };
      copies.push(copy);
      newIds.push(copy.id);
      for (const child of current.layers.filter(
        (layer) => layer.parentId === source.id,
      )) {
        appendSubtree(child, copy.id);
      }
    };
    for (const root of roots) appendSubtree(root, root.parentId);
    commit({ ...current, layers: [...current.layers, ...copies] });
    applyLayerSelection(newIds, newIds.at(-1) ?? null);
  }

  function bulkRemoveLayers(): void {
    const current = map.value;
    if (!current) return;
    const ids = new Set(selectedLayerIds.value);
    if (!ids.size) return;
    const removable = current.layers.filter(
      (layer) =>
        ids.has(layer.id) &&
        layer.type !== 'background' &&
        layer.type !== 'images',
    );
    const removableIds = new Set(removable.map((layer) => layer.id));
    const remainingDungeons = current.layers.filter(
      (layer) => layer.type === 'dungeon' && !removableIds.has(layer.id),
    );
    if (!remainingDungeons.length) {
      const last = removable.find((layer) => layer.type === 'dungeon');
      if (last) removableIds.delete(last.id);
    }
    const nextLayers = current.layers
      .filter((layer) => !removableIds.has(layer.id))
      .map((layer) => {
        if (!layer.parentId || !removableIds.has(layer.parentId)) return layer;
        const parent = current.layers.find(
          (entry) => entry.id === layer.parentId,
        );
        return { ...layer, parentId: parent?.parentId ?? null };
      });
    commit({ ...current, layers: nextLayers });
    const fallback = nextLayers.find((layer) => layer.type === 'dungeon');
    applyLayerSelection(fallback ? [fallback.id] : [], fallback?.id ?? null);
    activeLayerId.value = fallback?.id ?? null;
  }

  function bulkToggleLayerLock(): void {
    const current = map.value;
    if (!current) return;
    const ids = new Set(selectedLayerIds.value);
    if (!ids.size) return;
    const locked = !current.layers
      .filter((layer) => ids.has(layer.id))
      .every((layer) => layer.locked);
    commit({
      ...current,
      layers: current.layers.map((layer) =>
        ids.has(layer.id) ? { ...layer, locked } : layer,
      ),
    });
  }

  function bulkGroupIntoFolder(): void {
    const current = map.value;
    if (!current || selectedLayerIds.value.length < 2) return;
    const folder = createFolderLayer({
      name: 'Folder',
      order: Math.max(-1, ...current.layers.map((layer) => layer.order)) + 1,
    });
    const ids = new Set(selectedLayerIds.value);
    commit({
      ...current,
      layers: [
        ...current.layers.map((layer) =>
          ids.has(layer.id) ? { ...layer, parentId: folder.id } : layer,
        ),
        folder,
      ],
    });
    applyLayerSelection([folder.id], folder.id);
  }

  function duplicateLayer(layerId: string): string | null {
    const current = map.value;
    if (!current) return null;
    const source = current.layers.find((layer) => layer.id === layerId);
    if (!source) return null;
    const descendants: StudioLayer[] = [];
    const collect = (id: string) => {
      for (const layer of current.layers) {
        if (layer.parentId === id) {
          descendants.push(layer);
          collect(layer.id);
        }
      }
    };
    collect(layerId);
    const idMap = new Map<string, string>();
    const maxOrder = Math.max(
      -1,
      ...current.layers.map((layer) => layer.order),
    );
    const copies = [source, ...descendants].map((layer, index) => {
      const id = generateId();
      idMap.set(layer.id, id);
      return {
        ...(JSON.parse(JSON.stringify(layer)) as StudioLayer),
        id,
        name: index === 0 ? `${layer.name} copy` : layer.name,
        order: maxOrder + index + 1,
      };
    });
    const next = copies.map((layer) => ({
      ...layer,
      parentId: layer.parentId ? (idMap.get(layer.parentId) ?? null) : null,
    }));
    settingsLayerId.value = idMap.get(layerId) ?? settingsLayerId.value;
    commit({ ...current, layers: [...current.layers, ...next] });
    return idMap.get(layerId) ?? null;
  }

  function removeTreeNode(
    nodes: LayerTreeNode[],
    layerId: string,
  ): LayerTreeNode | null {
    for (let index = 0; index < nodes.length; index += 1) {
      if (nodes[index].id === layerId) return nodes.splice(index, 1)[0];
      const found = removeTreeNode(nodes[index].children ?? [], layerId);
      if (found) return found;
    }
    return null;
  }

  function reorderLayerToEdge(layerId: string, edge: 'front' | 'back'): void {
    const current = map.value;
    if (!current) return;
    const tree = buildLayerTree(current.layers);
    const node = removeTreeNode(tree, layerId);
    if (!node) return;
    if (edge === 'front') tree.unshift(node);
    else tree.push(node);
    commit({ ...current, layers: flattenLayerTree(tree) });
  }

  function setLayerBlendMode(
    layerId: string,
    blendMode: StudioLayer['blendMode'],
  ): void {
    const current = map.value;
    if (!current) return;
    commit({
      ...current,
      layers: current.layers.map((layer) =>
        layer.id === layerId ? { ...layer, blendMode } : layer,
      ),
    });
  }

  function setBackgroundColor(color: string): void {
    const current = map.value;
    if (!current) return;
    commit({
      ...current,
      background: {
        ...current.background,
        style: { ...current.background.style, color },
      },
      layers: current.layers.map((layer) =>
        layer.type === 'background'
          ? { ...layer, style: { ...layer.style, color } }
          : layer,
      ),
    });
  }

  function setBackgroundOpacity(opacity: number): void {
    const current = map.value;
    if (!current) return;
    commit({
      ...current,
      background: {
        ...current.background,
        style: {
          ...current.background.style,
          opacity: Math.min(1, Math.max(0, opacity)),
        },
      },
    });
  }

  function setGridColor(color: string): void {
    const current = map.value;
    if (!current) return;
    commit({ ...current, grid: { ...current.grid, color } });
  }

  function setGridWidth(width: number): void {
    const current = map.value;
    if (!current) return;
    commit({
      ...current,
      grid: { ...current.grid, width: Math.max(0.5, width) },
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

  function closedRegion(points: Point[]): Polygon {
    const ring = points.map(([x, y]) => [x, y] as [number, number]);
    ring.push([...ring[0]]);
    return [ring];
  }

  function copyGeometrySelection(points: Point[]): void {
    const current = map.value;
    if (!current || points.length < 3) return;
    const region = closedRegion(points);
    const rings: Point[][] = [];
    for (const layer of current.layers) {
      if (layer.type !== 'dungeon' || !layer.visible) continue;
      const compiled = compileDungeonLayer(layer);
      if (!compiled.polygons.length) continue;
      try {
        const result = intersection(compiled.polygons, region);
        for (const polygon of result) {
          const outer = polygon[0];
          if (outer && outer.length >= 4) {
            rings.push(outer.map(([x, y]) => [x, y] as Point).slice(0, -1));
          }
        }
      } catch {
        // Keep the previous clipboard if the boolean operation fails.
      }
    }
    geometryClipboard.value = rings;
  }

  function cutGeometrySelection(points: Point[]): void {
    const current = map.value;
    if (!current || points.length < 3) return;
    commit({
      ...current,
      layers: current.layers.map((layer) =>
        layer.type === 'dungeon'
          ? {
              ...layer,
              shapes: [
                ...layer.shapes,
                {
                  id: generateId(),
                  operation: 'subtract' as const,
                  shape: {
                    kind: 'polygon' as const,
                    points,
                    rough: 0 as const,
                    smooth: false,
                  },
                },
              ],
            }
          : layer,
      ),
    });
  }

  function pasteGeometryPolygons(polygons: Point[][]): void {
    const current = map.value;
    const layer = activeLayer.value;
    if (!current || !layer || !polygons.length) return;
    const operation = toolSettings.value.mode === 'erase' ? 'subtract' : 'add';
    const shapes = polygons.map((points) => ({
      id: generateId(),
      operation: operation as 'add' | 'subtract',
      shape: {
        kind: 'polygon' as const,
        points: points.map(([x, y]) => [x, y] as Point),
        rough: toolSettings.value.rough,
        smooth: toolSettings.value.smooth,
      },
    }));
    commit({
      ...current,
      layers: current.layers.map((entry) =>
        entry.id === layer.id
          ? { ...layer, shapes: [...layer.shapes, ...shapes] }
          : entry,
      ),
    });
  }

  function pasteGeometryClipboard(): void {
    pasteGeometryPolygons(
      geometryClipboard.value.map((points) =>
        points.map(([x, y]) => [x + 0.5, y + 0.5] as Point),
      ),
    );
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
      createTextObject(
        trimmed,
        point,
        nextObjectOrder(),
        toolSettings.value.text,
      ),
    ]);
  }

  function addTextObject(point: [number, number]): string | null {
    const object = createTextObject(
      '',
      point,
      nextObjectOrder(),
      toolSettings.value.text,
    );
    setObjects([...(imagesLayer.value?.objects ?? []), object]);
    selectObjects([object.id]);
    return object.id;
  }

  function addImage(
    src: string,
    point: [number, number],
    width: number,
    height: number,
  ): void {
    setObjects([
      ...(imagesLayer.value?.objects ?? []),
      createImageObject(src, point, width, height, nextObjectOrder()),
    ]);
  }

  function addDoor(a: [number, number], b: [number, number]): void {
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 0.1) return;
    setObjects([
      ...(imagesLayer.value?.objects ?? []),
      createDoorObject(a, b, nextObjectOrder(), {
        variant: toolSettings.value.doorVariant,
        fill: toolSettings.value.doorFill,
        stroke: toolSettings.value.doorStroke,
        rough: toolSettings.value.doorRough,
      }),
    ]);
  }

  function addStairs(points: Array<[number, number]>): void {
    if (points.length < 3) return;
    setObjects([
      ...(imagesLayer.value?.objects ?? []),
      createStairsObject(points, nextObjectOrder(), {
        stepsPerCell: toolSettings.value.stairsSteps,
        stroke: toolSettings.value.stairsStroke,
        rough: toolSettings.value.stairsRough,
      }),
    ]);
  }

  const geometryClipboard = shallowRef<Point[][]>([]);
  const geometryClips = shallowRef<
    Array<{ id: string; name: string; polygons: Point[][] }>
  >([]);

  const selectedGroupId = computed(() => {
    const objects = selectedObjects.value;
    if (!objects.length) return null;
    const groupId = objects[0].groupId ?? null;
    return groupId && objects.every((object) => object.groupId === groupId)
      ? groupId
      : null;
  });

  function expandGroupIds(ids: string[]): string[] {
    const selected = new Set(ids);
    for (const object of imagesLayer.value?.objects ?? []) {
      if (object.groupId && selected.has(object.id)) selected.add(object.id);
      if (!object.groupId) continue;
    }
    const groups = new Set(
      (imagesLayer.value?.objects ?? [])
        .filter((object) => selected.has(object.id) && object.groupId)
        .map((object) => object.groupId as string),
    );
    for (const object of imagesLayer.value?.objects ?? []) {
      if (object.groupId && groups.has(object.groupId)) selected.add(object.id);
    }
    return [...selected];
  }

  function selectObject(id: string | null): void {
    if (!id) {
      selectedObjectId.value = null;
      selectedObjectIds.value = [];
      return;
    }
    selectObjects([id]);
  }

  function selectObjects(ids: string[]): void {
    selectedObjectIds.value = [...new Set(expandGroupIds(ids))];
    selectedObjectId.value = selectedObjectIds.value.at(-1) ?? null;
    if (selectedObjectIds.value.length) {
      selectedShapeId.value = null;
      const images = imagesLayer.value;
      if (images) {
        settingsLayerId.value = images.id;
        selectedLayerIds.value = [images.id];
      }
    }
  }

  function toggleObjectSelection(id: string): void {
    const ids = new Set(selectedObjectIds.value);
    if (!ids.has(id)) {
      for (const objectId of expandGroupIds([id])) ids.add(objectId);
    }
    selectObjects([...ids]);
  }

  function selectShape(id: string | null): void {
    selectedShapeId.value = id;
    if (id) selectedObjectId.value = null;
  }

  function beginObjectDrag(): void {
    objectDragSnapshot = map.value ? cloneMap(map.value) : null;
  }

  function moveSelectedObjectLive(dx: number, dy: number): void {
    const current = map.value;
    const layer = imagesLayer.value;
    const ids = new Set(selectedObjectIds.value);
    if (!current || !layer || ids.size === 0) return;
    map.value = {
      ...current,
      updatedAt: Date.now(),
      layers: current.layers.map((entry) =>
        entry.id === layer.id
          ? {
              ...layer,
              objects: layer.objects.map((object) =>
                ids.has(object.id) ? moveObject(object, dx, dy) : object,
              ),
            }
          : entry,
      ),
    };
    dirty.value = true;
  }

  function updateDoorEndpointLive(
    id: string,
    endpoint: 'a' | 'b',
    point: Point,
  ): void {
    const current = map.value;
    const layer = imagesLayer.value;
    if (!current || !layer) return;
    map.value = {
      ...current,
      updatedAt: Date.now(),
      layers: current.layers.map((entry) =>
        entry.id === layer.id
          ? {
              ...layer,
              objects: layer.objects.map((object) => {
                if (object.id !== id || object.type !== 'door') return object;
                const next = { ...object, [endpoint]: point };
                const width = Math.max(
                  0.2,
                  Math.hypot(next.b[0] - next.a[0], next.b[1] - next.a[1]),
                );
                return {
                  ...next,
                  transform: {
                    ...next.transform,
                    x: Math.min(next.a[0], next.b[0]),
                    y: Math.min(next.a[1], next.b[1]),
                    width,
                  },
                };
              }),
            }
          : entry,
      ),
    };
    dirty.value = true;
  }

  function rotateSelectedObject(rotation: number): void {
    const object = selectedObject.value;
    if (!object) return;
    if (object.type === 'text' || object.type === 'image') {
      patchSelectedObjectLive({
        transform: { ...object.transform, rotation },
      });
      return;
    }
    const bounds = objectBounds(object);
    const cx = bounds.x + bounds.width / 2;
    const cy = bounds.y + bounds.height / 2;
    const delta = rotation - object.transform.rotation;
    const cos = Math.cos(delta);
    const sin = Math.sin(delta);
    const rotate = ([x, y]: [number, number]): [number, number] => [
      cx + (x - cx) * cos - (y - cy) * sin,
      cy + (x - cx) * sin + (y - cy) * cos,
    ];
    if (object.type === 'door') {
      patchSelectedObjectLive({
        a: rotate(object.a),
        b: rotate(object.b),
        transform: { ...object.transform, rotation },
      });
    } else if (object.type === 'stairs') {
      patchSelectedObjectLive({
        points: object.points.map(rotate),
        transform: { ...object.transform, rotation },
      });
    }
  }

  function selectedSnapshotObjects(): StudioObject[] {
    const source = objectDragSnapshot ?? map.value;
    if (!source) return [];
    const ids = new Set(selectedObjectIds.value);
    return source.layers
      .filter((layer) => layer.type === 'images')
      .flatMap((layer) => (layer.type === 'images' ? layer.objects : []))
      .filter((object) => ids.has(object.id));
  }

  function applyGroupTransform(
    transform: (object: StudioObject) => StudioObject,
  ): void {
    const current = map.value;
    const layer = imagesLayer.value;
    const ids = new Set(selectedObjectIds.value);
    const originals = new Map(
      selectedSnapshotObjects().map((object) => [object.id, object]),
    );
    if (!current || !layer || !ids.size || !originals.size) return;
    map.value = {
      ...current,
      updatedAt: Date.now(),
      layers: current.layers.map((entry) =>
        entry.id === layer.id
          ? {
              ...layer,
              objects: layer.objects.map((object) => {
                if (!ids.has(object.id)) return object;
                const original = originals.get(object.id);
                return original ? transform(original) : object;
              }),
            }
          : entry,
      ),
    };
    dirty.value = true;
  }

  function resizeSelectedObjectsLive(bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  }): void {
    const originals = selectedSnapshotObjects();
    const origin = unionBounds(originals);
    if (!origin) return;
    const sx = Math.max(0.01, bounds.width) / Math.max(0.2, origin.width);
    const sy = Math.max(0.01, bounds.height) / Math.max(0.2, origin.height);
    applyGroupTransform((object) => {
      const objectBox = objectBounds(object);
      const x = bounds.x + (objectBox.x - origin.x) * sx;
      const y = bounds.y + (objectBox.y - origin.y) * sy;
      if (object.type === 'text' || object.type === 'image') {
        return {
          ...object,
          transform: {
            ...object.transform,
            x,
            y,
            width: Math.max(0.2, object.transform.width * sx),
            height: Math.max(0.2, object.transform.height * sy),
          },
        };
      }
      if (object.type === 'door') {
        return {
          ...object,
          a: [
            x + (object.a[0] - objectBox.x) * sx,
            y + (object.a[1] - objectBox.y) * sy,
          ],
          b: [
            x + (object.b[0] - objectBox.x) * sx,
            y + (object.b[1] - objectBox.y) * sy,
          ],
          transform: {
            ...object.transform,
            x,
            y,
            width: Math.max(0.2, object.transform.width * sx),
            height: Math.max(0.2, object.transform.height * sy),
          },
        };
      }
      return {
        ...object,
        points: object.points.map(([px, py]) => [
          x + (px - objectBox.x) * sx,
          y + (py - objectBox.y) * sy,
        ]),
        transform: {
          ...object.transform,
          x,
          y,
          width: Math.max(0.2, object.transform.width * sx),
          height: Math.max(0.2, object.transform.height * sy),
        },
      };
    });
  }

  function rotateSelectedObjectsLive(delta: number): void {
    const originals = selectedSnapshotObjects();
    const origin = unionBounds(originals);
    if (!origin || !Number.isFinite(delta)) return;
    const cx = origin.x + origin.width / 2;
    const cy = origin.y + origin.height / 2;
    const cos = Math.cos(delta);
    const sin = Math.sin(delta);
    const rotatePoint = ([x, y]: [number, number]): [number, number] => [
      cx + (x - cx) * cos - (y - cy) * sin,
      cy + (x - cx) * sin + (y - cy) * cos,
    ];
    applyGroupTransform((object) => {
      const rotation = object.transform.rotation + delta;
      if (object.type === 'text' || object.type === 'image') {
        const center = rotatePoint([
          object.transform.x + object.transform.width / 2,
          object.transform.y + object.transform.height / 2,
        ]);
        return {
          ...object,
          transform: {
            ...object.transform,
            x: center[0] - object.transform.width / 2,
            y: center[1] - object.transform.height / 2,
            rotation,
          },
        };
      }
      if (object.type === 'door') {
        return {
          ...object,
          a: rotatePoint(object.a),
          b: rotatePoint(object.b),
          transform: { ...object.transform, rotation },
        };
      }
      return {
        ...object,
        points: object.points.map(rotatePoint),
        transform: { ...object.transform, rotation },
      };
    });
  }

  function patchSelectedObjectLive(patch: Record<string, any>): void {
    const current = map.value;
    const layer = imagesLayer.value;
    const id = selectedObjectId.value;
    if (!current || !layer || !id) return;
    map.value = {
      ...current,
      updatedAt: Date.now(),
      layers: current.layers.map((entry) =>
        entry.id === layer.id
          ? {
              ...layer,
              objects: layer.objects.map((object) =>
                object.id === id
                  ? ({ ...object, ...patch } as StudioObject)
                  : object,
              ),
            }
          : entry,
      ),
    };
    dirty.value = true;
  }

  function endObjectDrag(): void {
    if (objectDragSnapshot && map.value && dirty.value) {
      undoStack.value = [
        ...undoStack.value.slice(-(MAX_HISTORY - 1)),
        objectDragSnapshot,
      ];
      redoStack.value = [];
    }
    objectDragSnapshot = null;
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
    if (copy.type === 'text' || copy.type === 'image') {
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

  function flipObjectValue(
    object: StudioObject,
    axis: 'x' | 'y',
  ): StudioObject {
    if (object.type === 'text' || object.type === 'image') {
      return {
        ...object,
        transform: {
          ...object.transform,
          flipX:
            axis === 'x' ? !object.transform.flipX : object.transform.flipX,
          flipY:
            axis === 'y' ? !object.transform.flipY : object.transform.flipY,
        },
      };
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
      return { ...object, a: mirror(object.a), b: mirror(object.b) };
    }
    return { ...object, points: object.points.map(mirror) };
  }

  function flipObject(id: string, axis: 'x' | 'y'): void {
    setObjects(
      (imagesLayer.value?.objects ?? []).map((object) =>
        object.id === id ? flipObjectValue(object, axis) : object,
      ),
    );
  }

  function flipSelectedObjects(axis: 'x' | 'y'): void {
    const ids = new Set(selectedObjectIds.value);
    if (!ids.size) return;
    setObjects(
      (imagesLayer.value?.objects ?? []).map((object) =>
        ids.has(object.id) ? flipObjectValue(object, axis) : object,
      ),
    );
  }

  function updateSelectedObjects(patch: Record<string, unknown>): void {
    const ids = new Set(selectedObjectIds.value);
    if (!ids.size) return;
    setObjects(
      (imagesLayer.value?.objects ?? []).map((object) =>
        ids.has(object.id) ? ({ ...object, ...patch } as StudioObject) : object,
      ),
    );
  }

  function setSelectedObjectsRotation(rotation: number): void {
    if (!Number.isFinite(rotation)) return;
    const ids = new Set(selectedObjectIds.value);
    if (!ids.size) return;
    setObjects(
      (imagesLayer.value?.objects ?? []).map((object) => {
        if (!ids.has(object.id)) return object;
        if (object.type === 'text' || object.type === 'image') {
          return {
            ...object,
            transform: { ...object.transform, rotation },
          };
        }
        const bounds = objectBounds(object);
        const cx = bounds.x + bounds.width / 2;
        const cy = bounds.y + bounds.height / 2;
        const delta = rotation - object.transform.rotation;
        const cos = Math.cos(delta);
        const sin = Math.sin(delta);
        const rotate = ([x, y]: [number, number]): [number, number] => [
          cx + (x - cx) * cos - (y - cy) * sin,
          cy + (x - cx) * sin + (y - cy) * cos,
        ];
        if (object.type === 'door') {
          return {
            ...object,
            a: rotate(object.a),
            b: rotate(object.b),
            transform: { ...object.transform, rotation },
          };
        }
        return {
          ...object,
          points: object.points.map(rotate),
          transform: { ...object.transform, rotation },
        };
      }),
    );
  }

  function duplicateSelectedObjects(): void {
    const ids = new Set(selectedObjectIds.value);
    const objects = imagesLayer.value?.objects ?? [];
    if (!ids.size) return;
    const copies = objects
      .filter((object) => ids.has(object.id))
      .map((source) => {
        const copy = JSON.parse(JSON.stringify(source)) as StudioObject;
        if (copy.type === 'text' || copy.type === 'image') {
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
        return { ...copy, id: generateId(), order: 0 };
      });
    const start = nextObjectOrder();
    setObjects([
      ...objects,
      ...copies.map((copy, index) => ({ ...copy, order: start + index })),
    ]);
    selectObjects(copies.map((copy) => copy.id));
  }

  function reorderSelectedObjects(direction: -1 | 1): void {
    const ids = new Set(selectedObjectIds.value);
    const objects = [...(imagesLayer.value?.objects ?? [])].sort(
      (a, b) => a.order - b.order,
    );
    if (!ids.size || objects.length < 2) return;
    if (direction > 0) {
      for (let index = objects.length - 2; index >= 0; index -= 1) {
        if (ids.has(objects[index].id) && !ids.has(objects[index + 1].id)) {
          [objects[index], objects[index + 1]] = [
            objects[index + 1],
            objects[index],
          ];
        }
      }
    } else {
      for (let index = 1; index < objects.length; index += 1) {
        if (ids.has(objects[index].id) && !ids.has(objects[index - 1].id)) {
          [objects[index], objects[index - 1]] = [
            objects[index - 1],
            objects[index],
          ];
        }
      }
    }
    setObjects(
      objects.map((object, order) => ({ ...object, order: order + 1 })),
    );
  }

  function groupSelectedObjects(): string | null {
    const ids = new Set(selectedObjectIds.value);
    if (ids.size < 2) return null;
    const groupId = generateId();
    setObjects(
      (imagesLayer.value?.objects ?? []).map((object) =>
        ids.has(object.id) ? { ...object, groupId } : object,
      ),
    );
    return groupId;
  }

  function ungroupSelectedObjects(): void {
    const ids = new Set(selectedObjectIds.value);
    if (!ids.size) return;
    setObjects(
      (imagesLayer.value?.objects ?? []).map((object) =>
        ids.has(object.id) ? { ...object, groupId: null } : object,
      ),
    );
  }

  function toggleGroupSelection(): void {
    if (selectedGroupId.value) ungroupSelectedObjects();
    else groupSelectedObjects();
  }

  function nudgeSelectedObjects(dx: number, dy: number): void {
    const ids = new Set(selectedObjectIds.value);
    if (!ids.size) return;
    setObjects(
      (imagesLayer.value?.objects ?? []).map((object) =>
        ids.has(object.id) ? moveObject(object, dx, dy) : object,
      ),
    );
  }

  function copySelectedObjects(): StudioObject[] {
    const ids = new Set(selectedObjectIds.value);
    return (imagesLayer.value?.objects ?? [])
      .filter((object) => ids.has(object.id))
      .map((object) => JSON.parse(JSON.stringify(object)) as StudioObject);
  }

  function pasteObjects(clones: StudioObject[]): void {
    if (!clones.length) return;
    const objects = imagesLayer.value?.objects ?? [];
    const start = nextObjectOrder();
    const copies = clones.map((source, index) => {
      const copy = JSON.parse(JSON.stringify(source)) as StudioObject;
      if (copy.type === 'text' || copy.type === 'image') {
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
      return {
        ...copy,
        id: generateId(),
        groupId: null,
        order: start + index,
      } as StudioObject;
    });
    setObjects([...objects, ...copies]);
    selectObjects(copies.map((copy) => copy.id));
  }

  function saveGeometryClipboard(name?: string): string | null {
    if (!geometryClipboard.value.length) return null;
    const id = generateId();
    geometryClips.value = [
      ...geometryClips.value,
      {
        id,
        name: name?.trim() || `Clipboard ${geometryClips.value.length + 1}`,
        polygons: geometryClipboard.value.map((points) =>
          points.map(([x, y]) => [x, y] as Point),
        ),
      },
    ];
    return id;
  }

  function loadGeometryClipboard(id: string): Point[][] | null {
    const clip = geometryClips.value.find((entry) => entry.id === id);
    if (!clip) return null;
    geometryClipboard.value = clip.polygons.map((points) =>
      points.map(([x, y]) => [x, y] as Point),
    );
    return geometryClipboard.value;
  }

  function removeGeometryClip(id: string): void {
    geometryClips.value = geometryClips.value.filter(
      (entry) => entry.id !== id,
    );
  }

  function renameGeometryClip(id: string, name: string): void {
    const next = name.trim();
    if (!next) return;
    geometryClips.value = geometryClips.value.map((entry) =>
      entry.id === id ? { ...entry, name: next } : entry,
    );
  }

  function reorderSelectedToEdge(direction: 'front' | 'back'): void {
    const ids = new Set(selectedObjectIds.value);
    const objects = [...(imagesLayer.value?.objects ?? [])].sort(
      (a, b) => a.order - b.order,
    );
    if (!ids.size) return;
    const selected = objects.filter((object) => ids.has(object.id));
    const rest = objects.filter((object) => !ids.has(object.id));
    const next =
      direction === 'front' ? [...rest, ...selected] : [...selected, ...rest];
    setObjects(next.map((object, order) => ({ ...object, order: order + 1 })));
  }

  function removeSelectedObjects(): void {
    const ids = new Set(selectedObjectIds.value);
    if (!ids.size) return;
    setObjects(
      (imagesLayer.value?.objects ?? []).filter(
        (object) => !ids.has(object.id),
      ),
    );
    selectedObjectId.value = null;
    selectedObjectIds.value = [];
  }

  function removeSelectedObject(): void {
    removeSelectedObjects();
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
    settingsLayerId,
    settingsLayer,
    activeLayer,
    imagesLayer,
    selectedObjectId,
    selectedObject,
    selectedObjectIds,
    selectedGroupId,
    selectedLayerIds,
    geometryClipboard,
    geometryClips,
    selectedObjects,
    selectedShapeId,
    selectedShape,
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
    addTextObject,
    addImage,
    addDoor,
    addStairs,
    selectObject,
    selectObjects,
    toggleObjectSelection,
    selectShape,
    moveSelectedObject,
    beginObjectDrag,
    moveSelectedObjectLive,
    patchSelectedObjectLive,
    rotateSelectedObject,
    updateDoorEndpointLive,
    resizeSelectedObjectsLive,
    rotateSelectedObjectsLive,
    endObjectDrag,
    removeSelectedObject,
    removeSelectedObjects,
    duplicateSelectedObjects,
    flipSelectedObjects,
    updateSelectedObjects,
    setSelectedObjectsRotation,
    reorderSelectedObjects,
    updateObject,
    duplicateObject,
    reorderObject,
    flipObject,
    applyPreset,
    addDungeonLayer,
    addFolder,
    toggleFolder,
    setLayerParent,
    moveLayerRelative,
    setLayerStructure,
    groupSelectedObjects,
    ungroupSelectedObjects,
    toggleGroupSelection,
    nudgeSelectedObjects,
    copySelectedObjects,
    pasteObjects,
    reorderSelectedToEdge,
    copyGeometrySelection,
    cutGeometrySelection,
    pasteGeometryClipboard,
    pasteGeometryPolygons,
    saveGeometryClipboard,
    loadGeometryClipboard,
    removeGeometryClip,
    renameGeometryClip,
    renameLayer,
    removeLayer,
    moveLayer,
    duplicateLayer,
    reorderLayerToEdge,
    setLayerBlendMode,
    setBackgroundColor,
    setBackgroundOpacity,
    setGridColor,
    setGridWidth,
    setLayerStyle,
    setLayerOpacity,
    undo,
    redo,
    setActiveLayer,
    setSettingsLayer,
    toggleLayerSelection,
    selectLayerRange,
    bulkDuplicateLayers,
    bulkRemoveLayers,
    bulkToggleLayerLock,
    bulkGroupIntoFolder,
    setTool,
    toggleLayerVisibility,
    toggleLayerLock,
    save,
  };
});
