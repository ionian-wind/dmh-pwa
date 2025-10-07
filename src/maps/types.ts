import type { WithMetadata } from '@/types';
import type { ImageMetadata } from './utils/imageWorker';

export type MapEntityKind =
  | 'note'
  | 'module'
  | 'party'
  | 'monster'
  | 'encounter'
  | 'character'
  | 'map';

export interface MapEntityRef {
  kind: MapEntityKind;
  id: string;
}

/** @deprecated Legacy point shape; normalized into MapMarker on read. */
export interface MapPoint {
  [key: string]: unknown;
}

export interface MapLocation {
  id: string;
  name: string;
  description?: string;
  color?: string;
  entities: MapEntityRef[];
}

export interface MapMarker {
  id: string;
  title: string;
  description?: string;
  x: number;
  y: number;
  locationId?: string | null;
  entities: MapEntityRef[];
  /** RPG Awesome class without the `ra` prefix, e.g. `ra-castle`. */
  icon: string;
  color: string;
}

export type MapAreaShape = 'polygon' | 'circle' | 'square' | 'freehand';

export interface MapArea {
  id: string;
  title: string;
  description?: string;
  shape: MapAreaShape;
  points: Array<[number, number]>;
  center?: [number, number];
  radius?: number;
  entities: MapEntityRef[];
  linkedAreaIds: string[];
  icon?: string;
  color: string;
}

export type MapFileSource =
  | { kind: 'handle'; handle: FileSystemFileHandle }
  | { kind: 'blob'; blob: Blob };

export interface MapFile extends WithMetadata {
  id: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  source: MapFileSource;
  imageMetadata?: ImageMetadata;
}

export interface MapEntity extends WithMetadata {
  title: string;
  description?: string;
  fileId: string;
  locations: MapLocation[];
  markers: MapMarker[];
  areas: MapArea[];
  /** @deprecated Use markers. Converted by normalizeMapEntity. */
  points?: MapPoint[];
}

export type MapEntityForm = Omit<
  MapEntity,
  'id' | 'createdAt' | 'updatedAt'
> & {
  id?: string;
};
