import type { WithMetadata } from '@/types';
import type { ImageMetadata } from './utils/imageWorker';
import type { StoredFile, StoredFileSource } from '@/utils/files/types';

export type MapEntityKind =
  | 'note'
  | 'party'
  | 'pawn'
  | 'encounter'
  | 'character'
  | 'map'
  | 'location'
  | 'playlist';

export interface MapEntityRef {
  kind: MapEntityKind;
  id: string;
}

/** @deprecated Legacy point shape; normalized into MapMarker on read. */
export interface MapPoint {
  [key: string]: unknown;
}

export interface LocationMap {
  fileId: string;
  layers: MapLayer[];
  markers: MapMarker[];
  areas: MapArea[];
}

export interface MapLocation extends WithMetadata {
  name: string;
  description?: string;
  entities: MapEntityRef[];
  map: LocationMap;
}

export interface MapLayer {
  id: string;
  title: string;
}

export interface MapMarker {
  id: string;
  title: string;
  description?: string;
  x: number;
  y: number;
  locationId?: string | null;
  layerId: string;
  entities: MapEntityRef[];
  /** RPG Awesome class without the `ra` prefix, e.g. `ra-castle`. */
  icon: string;
  color: string;
  /** Optional badge colour behind the marker; empty means transparent. */
  backgroundColor?: string;
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
  locationId?: string | null;
  layerId: string;
  entities: MapEntityRef[];
  icon?: string;
  color: string;
}

export type MapFileSource = StoredFileSource;

export interface MapFile extends StoredFile {
  imageMetadata?: ImageMetadata;
}

export interface MapImageMetadata extends WithMetadata {
  id: string;
  imageMetadata: ImageMetadata;
}

/** Legacy persisted map shape; merged into `MapLocation.map`. */
export interface MapEntity extends WithMetadata {
  title: string;
  description?: string;
  fileId: string;
  locationId?: string | null;
  layers: MapLayer[];
  /** Entity links for the map itself. */
  entities: MapEntityRef[];
  /** @deprecated Embedded locations from older records; migrated to map_locations. */
  locations?: MapLocation[];
  markers: MapMarker[];
  areas: MapArea[];
  /** @deprecated Use markers. Converted by normalizeMapEntity. */
  points?: MapPoint[];
}
