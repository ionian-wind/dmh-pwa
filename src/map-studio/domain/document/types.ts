import type { UUID } from '@/types';

export const STUDIO_SCHEMA_VERSION = 1;
export const BASE_PIXELS_PER_CELL = 70;

export type BlendMode = 'normal' | 'add' | 'multiply' | 'screen';
export type Roughness = 0 | 1 | 2 | 3;
export type Point = [number, number];
export type ShapeOperation = 'add' | 'subtract';

export interface StudioProject {
  id: string;
  name: string;
  description?: string;
  schemaVersion: number;
  createdAt: number;
  updatedAt: number;
  mapOrder: string[];
  settings: ProjectSettings;
  locationId?: UUID | null;
}

export interface ProjectSettings {
  exportDefaults: ExportSettings;
  theme?: 'auto' | 'light' | 'dark';
}

export interface ExportSettings {
  format: 'png' | 'webp' | 'jpg';
  pixelsPerCell: number;
  filename: string;
}

export interface StudioMap {
  id: string;
  projectId: string;
  name: string;
  schemaVersion: number;
  createdAt: number;
  updatedAt: number;
  width: number;
  height: number;
  grid: GridSettings;
  background: BackgroundLayer;
  layers: StudioLayer[];
  settings: MapSettings;
  metadata: MapMetadata;
}

export interface MapSettings {
  isometric: boolean;
  showGrid: boolean;
  snapToGrid: boolean;
  snapDivision: number;
  lightingEnabled: boolean;
}

export interface MapMetadata {
  seed?: string;
  generator?: 'manual' | 'random' | 'watabou' | 'donjon' | 'ds';
  notes?: string;
}

export interface GridSettings {
  type: 'square' | 'hex' | 'dot' | 'none';
  color: string;
  width: number;
  radius?: number;
  cellDiameter: number;
  offsetX: number;
  offsetY: number;
}

export interface LayerBase {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: BlendMode;
  parentId: string | null;
  order: number;
}

export interface DungeonLayer extends LayerBase {
  type: 'dungeon';
  style: DungeonLayerStyle;
  shapes: DungeonShape[];
}

export interface BackgroundLayer extends LayerBase {
  type: 'background';
  style: BackgroundStyle;
}

export interface ImagesLayer extends LayerBase {
  type: 'images';
  objects: StudioObject[];
}

export interface FolderLayer extends LayerBase {
  type: 'folder';
  expanded: boolean;
}

export type StudioLayer =
  DungeonLayer | BackgroundLayer | ImagesLayer | FolderLayer;

export interface DungeonLayerStyle {
  floor: {
    visible: boolean;
    color: string;
  };
  walls: {
    visible: boolean;
    color: string;
    width: number;
    blocksLight: boolean;
    dash: boolean;
  };
  grid: {
    visible: boolean;
    color: string;
    width: number;
  };
}

export interface BackgroundStyle {
  color: string;
  opacity: number;
  isometric: boolean;
}

export interface DungeonShapeBase {
  id: string;
  operation: ShapeOperation;
  seed?: number;
}

export interface RectangleShape extends DungeonShapeBase {
  shape: {
    kind: 'rectangle';
    x: number;
    y: number;
    width: number;
    height: number;
    cornerRadius: number;
    rough: Roughness;
    smooth: boolean;
  };
}

export interface CircleShape extends DungeonShapeBase {
  shape: {
    kind: 'circle';
    cx: number;
    cy: number;
    radius: number;
    rough: Roughness;
    smooth: boolean;
  };
}

export interface PolygonShape extends DungeonShapeBase {
  shape: {
    kind: 'polygon';
    points: Point[];
    rough: Roughness;
    smooth: boolean;
  };
}

export interface PathShape extends DungeonShapeBase {
  shape: {
    kind: 'path';
    points: Point[];
    radius: number;
    closed: boolean;
    rough: Roughness;
    smooth: boolean;
  };
}

export interface WallShape extends DungeonShapeBase {
  shape: {
    kind: 'wall';
    points: Point[];
    width: number;
    dash: boolean;
    rough: Roughness;
    smooth: boolean;
  };
}

export type DungeonShape =
  RectangleShape | CircleShape | PolygonShape | PathShape | WallShape;

export interface ObjectBase {
  id: string;
  name?: string;
  parentId: string | null;
  order: number;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: BlendMode;
}

export interface Transform {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  flipX: boolean;
  flipY: boolean;
}

export interface TextObject extends ObjectBase {
  type: 'text';
  text: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  align: 'left' | 'center' | 'right';
  transform: Transform;
}

export interface DoorObject extends ObjectBase {
  type: 'door';
  a: Point;
  b: Point;
  variant: 0 | 1;
  fill: string;
  stroke: string;
  transform: Transform;
}

export interface StairsObject extends ObjectBase {
  type: 'stairs';
  points: Point[];
  stepsPerCell: number;
  stroke: string;
  transform: Transform;
}

export interface ImageObject extends ObjectBase {
  type: 'image';
  src: string;
  transform: Transform;
}

export type StudioObject = TextObject | DoorObject | StairsObject | ImageObject;

export interface ToolSettings {
  snap: boolean;
  division: number;
  mode: 'draw' | 'erase';
  cornerRadius: number;
  rough: Roughness;
  pathRadius: number;
  wallWidth: number;
}

export type StudioTool =
  | 'pan'
  | 'object'
  | 'text'
  | 'door'
  | 'stairs'
  | 'rectangle'
  | 'circle'
  | 'polygon'
  | 'path'
  | 'wall'
  | 'image';

export interface StudioSelection {
  layerIds: string[];
  shapeIds: string[];
  objectIds: string[];
}
