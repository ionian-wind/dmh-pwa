import { generateId } from '@/utils/storage';
import {
  STUDIO_SCHEMA_VERSION,
  type DungeonLayer,
  type DungeonShape,
  type GridSettings,
  type StudioLayer,
  type StudioMap,
  type StudioProject,
} from './types';
import {
  createBackgroundLayer,
  createDungeonLayer,
  createGridSettings,
  createImagesLayer,
  createMap,
  createProject,
  DEFAULT_EXPORT_SETTINGS,
} from './factories';

function number(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function normalizeGrid(value: unknown): GridSettings {
  const grid =
    value && typeof value === 'object' ? (value as Partial<GridSettings>) : {};
  return createGridSettings({
    type: ['square', 'hex', 'dot', 'none'].includes(String(grid.type))
      ? (grid.type as GridSettings['type'])
      : 'square',
    color: typeof grid.color === 'string' ? grid.color : '#00000022',
    width: Math.max(0, number(grid.width, 1)),
    radius: Number.isFinite(Number(grid.radius))
      ? number(grid.radius, 2)
      : undefined,
    cellDiameter: Math.max(0.01, number(grid.cellDiameter, 1)),
    offsetX: number(grid.offsetX, 0),
    offsetY: number(grid.offsetY, 0),
  });
}

function normalizePoint(value: unknown): [number, number] | null {
  if (!Array.isArray(value) || value.length < 2) return null;
  const x = Number(value[0]);
  const y = Number(value[1]);
  return Number.isFinite(x) && Number.isFinite(y) ? [x, y] : null;
}

function normalizeShape(value: unknown): DungeonShape | null {
  if (!value || typeof value !== 'object') return null;
  const shape = value as Partial<DungeonShape> & Record<string, any>;
  const data = (shape.shape ?? {}) as Record<string, any>;
  const kind = data.kind;
  const base = {
    id: typeof shape.id === 'string' && shape.id ? shape.id : generateId(),
    operation:
      shape.operation === 'subtract' ? ('subtract' as const) : ('add' as const),
    ...(Number.isFinite(Number(shape.seed))
      ? { seed: number(shape.seed, 0) }
      : {}),
  };
  if (kind === 'circle') {
    const radius = number(data.radius, 0);
    if (radius <= 0) return null;
    return {
      ...base,
      shape: {
        kind: 'circle',
        cx: number(data.cx, 0),
        cy: number(data.cy, 0),
        radius,
        rough: ([0, 1, 2, 3] as const).includes(data.rough) ? data.rough : 0,
        smooth: data.smooth === true,
      },
    };
  }
  if (kind === 'polygon') {
    const points = Array.isArray(data.points)
      ? data.points
          .map(normalizePoint)
          .filter((point): point is [number, number] => point !== null)
      : [];
    if (points.length < 3) return null;
    return {
      ...base,
      shape: {
        kind: 'polygon',
        points,
        rough: ([0, 1, 2, 3] as const).includes(data.rough) ? data.rough : 0,
        smooth: data.smooth === true,
      },
    };
  }
  if (kind !== 'rectangle') return null;
  const rect = data;
  const width = number(rect.width, 0);
  const height = number(rect.height, 0);
  if (width <= 0 || height <= 0) return null;
  return {
    ...base,
    shape: {
      kind: 'rectangle',
      x: number(rect.x, 0),
      y: number(rect.y, 0),
      width,
      height,
      cornerRadius: Math.max(0, number(rect.cornerRadius, 0)),
      rough: ([0, 1, 2, 3] as const).includes(rect.rough) ? rect.rough : 0,
      smooth: rect.smooth === true,
    },
  };
}

function normalizeLayer(value: unknown, order: number): StudioLayer | null {
  if (!value || typeof value !== 'object') return null;
  const layer = value as Partial<StudioLayer> & Record<string, any>;
  const base = {
    id: typeof layer.id === 'string' && layer.id ? layer.id : generateId(),
    name: typeof layer.name === 'string' && layer.name ? layer.name : 'Layer',
    visible: layer.visible !== false,
    locked: layer.locked === true,
    opacity: clamp(number(layer.opacity, 1), 0, 1),
    blendMode: ['normal', 'add', 'multiply', 'screen'].includes(
      String(layer.blendMode),
    )
      ? (layer.blendMode as StudioLayer['blendMode'])
      : 'normal',
    parentId: typeof layer.parentId === 'string' ? layer.parentId : null,
    order: number(layer.order, order),
  };
  if (layer.type === 'background') {
    return {
      ...createBackgroundLayer(),
      ...base,
      type: 'background',
      style: {
        color: layer.style?.color ?? '#fbf8f1',
        opacity: clamp(number(layer.style?.opacity, 1), 0, 1),
        isometric: layer.style?.isometric === true,
      },
    };
  }
  if (layer.type === 'images') {
    return {
      ...createImagesLayer(),
      ...base,
      type: 'images',
      objects: Array.isArray(layer.objects) ? layer.objects : [],
    };
  }
  if (layer.type === 'dungeon') {
    const shapes = Array.isArray(layer.shapes)
      ? layer.shapes.map(normalizeShape).filter(Boolean)
      : [];
    return {
      ...createDungeonLayer(),
      ...base,
      type: 'dungeon',
      shapes: shapes as DungeonShape[],
      style: {
        floor: {
          visible: layer.style?.floor?.visible !== false,
          color: layer.style?.floor?.color ?? '#f4efe4',
        },
        walls: {
          visible: layer.style?.walls?.visible !== false,
          color: layer.style?.walls?.color ?? '#1f2933',
          width: Math.max(0.001, number(layer.style?.walls?.width, 0.08)),
          blocksLight: layer.style?.walls?.blocksLight !== false,
          dash: layer.style?.walls?.dash === true,
        },
        grid: {
          visible: layer.style?.grid?.visible !== false,
          color: layer.style?.grid?.color ?? '#00000018',
          width: Math.max(0, number(layer.style?.grid?.width, 1)),
        },
      },
    };
  }
  return null;
}

export function normalizeMap(value: unknown, projectId?: string): StudioMap {
  if (!value || typeof value !== 'object') {
    return createMap(projectId ?? '');
  }
  const map = value as Partial<StudioMap> & Record<string, any>;
  const fallback = createMap(projectId ?? String(map.projectId ?? ''));
  const layers = Array.isArray(map.layers)
    ? (
        map.layers
          .map((layer, index) => normalizeLayer(layer, index))
          .filter(Boolean) as StudioLayer[]
      ).sort((a, b) => a.order - b.order)
    : fallback.layers;
  if (!layers.some((layer) => layer.type === 'background')) {
    layers.unshift(createBackgroundLayer());
  }
  if (!layers.some((layer) => layer.type === 'dungeon')) {
    layers.push(createDungeonLayer({ order: layers.length }));
  }
  const background = layers.find(
    (layer) => layer.type === 'background',
  ) as StudioMap['background'];
  return {
    ...fallback,
    id: typeof map.id === 'string' && map.id ? map.id : fallback.id,
    projectId: String(map.projectId ?? projectId ?? fallback.projectId),
    name: typeof map.name === 'string' && map.name ? map.name : fallback.name,
    schemaVersion: STUDIO_SCHEMA_VERSION,
    createdAt: number(map.createdAt, fallback.createdAt),
    updatedAt: number(map.updatedAt, fallback.updatedAt),
    width: Math.max(1, number(map.width, fallback.width)),
    height: Math.max(1, number(map.height, fallback.height)),
    grid: normalizeGrid(map.grid),
    background,
    layers,
    settings: {
      isometric: map.settings?.isometric === true,
      showGrid: map.settings?.showGrid !== false,
      snapToGrid: map.settings?.snapToGrid !== false,
      snapDivision: clamp(number(map.settings?.snapDivision, 1), 1, 9),
      lightingEnabled: map.settings?.lightingEnabled === true,
    },
    metadata:
      map.metadata && typeof map.metadata === 'object' ? map.metadata : {},
  };
}

export function normalizeProject(value: unknown): StudioProject {
  if (!value || typeof value !== 'object') return createProject();
  const project = value as Partial<StudioProject> & Record<string, any>;
  const fallback = createProject();
  return {
    ...fallback,
    id: typeof project.id === 'string' && project.id ? project.id : fallback.id,
    name:
      typeof project.name === 'string' && project.name
        ? project.name
        : fallback.name,
    description:
      typeof project.description === 'string' ? project.description : '',
    schemaVersion: STUDIO_SCHEMA_VERSION,
    createdAt: number(project.createdAt, fallback.createdAt),
    updatedAt: number(project.updatedAt, fallback.updatedAt),
    mapOrder: Array.isArray(project.mapOrder)
      ? project.mapOrder.filter((id): id is string => typeof id === 'string')
      : [],
    locationId:
      typeof project.locationId === 'string' ? project.locationId : null,
    settings: {
      exportDefaults: {
        ...DEFAULT_EXPORT_SETTINGS,
        ...(project.settings?.exportDefaults ?? {}),
      },
      theme: project.settings?.theme,
    },
  };
}
