import { generateId } from '@/utils/storage';
import {
  BASE_PIXELS_PER_CELL,
  STUDIO_SCHEMA_VERSION,
  type BackgroundLayer,
  type DungeonLayer,
  type ExportSettings,
  type GridSettings,
  type ImagesLayer,
  type StudioMap,
  type StudioProject,
} from './types';

export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  format: 'png',
  pixelsPerCell: BASE_PIXELS_PER_CELL,
  filename: 'map',
};

export function createGridSettings(
  overrides: Partial<GridSettings> = {},
): GridSettings {
  return {
    type: 'square',
    color: '#00000022',
    width: 1,
    cellDiameter: 1,
    offsetX: 0,
    offsetY: 0,
    ...overrides,
  };
}

export function createDungeonStyle() {
  return {
    floor: {
      visible: true,
      color: '#f4efe4',
    },
    walls: {
      visible: true,
      color: '#1f2933',
      width: 0.08,
      blocksLight: true,
      dash: false,
    },
    grid: {
      visible: true,
      color: '#00000018',
      width: 1,
    },
  };
}

export function createDungeonLayer(
  overrides: Partial<DungeonLayer> = {},
): DungeonLayer {
  return {
    id: generateId(),
    type: 'dungeon',
    name: 'Dungeon',
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: 'normal',
    parentId: null,
    order: 1,
    style: createDungeonStyle(),
    shapes: [],
    ...overrides,
  };
}

export function createBackgroundLayer(
  overrides: Partial<BackgroundLayer> = {},
): BackgroundLayer {
  return {
    id: generateId(),
    type: 'background',
    name: 'Background',
    visible: true,
    locked: true,
    opacity: 1,
    blendMode: 'normal',
    parentId: null,
    order: 0,
    style: {
      color: '#fbf8f1',
      opacity: 1,
      isometric: false,
    },
    ...overrides,
  };
}

export function createImagesLayer(
  overrides: Partial<ImagesLayer> = {},
): ImagesLayer {
  return {
    id: generateId(),
    type: 'images',
    name: 'Images',
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: 'normal',
    parentId: null,
    order: 2,
    objects: [],
    ...overrides,
  };
}

export function createMap(
  projectId: string,
  overrides: Partial<StudioMap> = {},
): StudioMap {
  const now = Date.now();
  const background = createBackgroundLayer();
  return {
    id: generateId(),
    projectId,
    name: 'New map',
    schemaVersion: STUDIO_SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
    width: 30,
    height: 30,
    grid: createGridSettings(),
    background,
    layers: [background, createDungeonLayer(), createImagesLayer()],
    settings: {
      isometric: false,
      showGrid: true,
      snapToGrid: true,
      snapDivision: 1,
      lightingEnabled: false,
    },
    metadata: { generator: 'manual' },
    ...overrides,
  };
}

export function createProject(
  overrides: Partial<StudioProject> = {},
): StudioProject {
  const now = Date.now();
  return {
    id: generateId(),
    name: 'Untitled map',
    schemaVersion: STUDIO_SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
    mapOrder: [],
    settings: { exportDefaults: { ...DEFAULT_EXPORT_SETTINGS } },
    locationId: null,
    ...overrides,
  };
}
