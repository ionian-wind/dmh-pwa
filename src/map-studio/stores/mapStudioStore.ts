import { defineStore } from 'pinia';
import { computed, ref, shallowRef } from 'vue';
import { generateId } from '@/utils/storage';
import type {
  DungeonLayer,
  DungeonShape,
  StudioMap,
  StudioProject,
  StudioTool,
  ToolSettings,
} from '@/map-studio/domain/document/types';
import {
  listMaps,
  listProjects,
  saveMap,
  saveProject,
} from '@/map-studio/persistence/repository';

const MAX_HISTORY = 80;

function cloneMap(map: StudioMap): StudioMap {
  return structuredClone(map);
}

export const useMapStudioStore = defineStore('mapStudio', () => {
  const projects = shallowRef<StudioProject[]>([]);
  const project = shallowRef<StudioProject | null>(null);
  const map = shallowRef<StudioMap | null>(null);
  const maps = shallowRef<StudioMap[]>([]);
  const activeLayerId = ref<string | null>(null);
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
    undo,
    redo,
    setActiveLayer,
    setTool,
    toggleLayerVisibility,
    toggleLayerLock,
    save,
  };
});
