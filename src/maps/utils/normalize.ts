import { generateId } from '@/utils/storage';
import {
  DEFAULT_MARKER_COLOR,
  DEFAULT_MARKER_ICON,
  markerIconClass,
} from '../icons';
import { MAP_BASE_LAYER_ID, normalizeLayers } from './mapLayers';
import type {
  MapArea,
  MapAreaShape,
  MapEntity,
  MapEntityKind,
  MapEntityRef,
  MapLocation,
  MapMarker,
} from '../types';

export { DEFAULT_MARKER_COLOR, DEFAULT_MARKER_ICON };

function normalizeEntities(entities: unknown): MapEntityRef[] {
  if (!Array.isArray(entities)) return [];
  return entities
    .filter(
      (entity): entity is MapEntityRef =>
        !!entity &&
        typeof entity === 'object' &&
        typeof (entity as MapEntityRef).kind === 'string' &&
        typeof (entity as MapEntityRef).id === 'string',
    )
    .map((entity) => ({
      kind: entity.kind as MapEntityKind,
      id: entity.id,
    }));
}

export function normalizeLocation(
  location: Partial<MapLocation> & Record<string, any> = {},
): MapLocation {
  return {
    id: location.id || generateId(),
    name: location.name || '',
    description: location.description || '',
    entities: normalizeEntities(location.entities),
    createdAt: Number(location.createdAt) || Date.now(),
    updatedAt: Number(location.updatedAt) || Date.now(),
  };
}

export function normalizeMarker(
  marker: Partial<MapMarker> & Record<string, any> = {},
): MapMarker {
  return {
    id: marker.id || generateId(),
    title: marker.title || '',
    description: marker.description || '',
    x: Number.isFinite(Number(marker.x)) ? Number(marker.x) : 0,
    y: Number.isFinite(Number(marker.y)) ? Number(marker.y) : 0,
    locationId: marker.locationId || null,
    layerId: marker.layerId || MAP_BASE_LAYER_ID,
    entities: normalizeEntities(marker.entities),
    icon: markerIconClass(marker.icon || DEFAULT_MARKER_ICON),
    color: marker.color || DEFAULT_MARKER_COLOR,
    backgroundColor: marker.backgroundColor || '',
  };
}

const AREA_SHAPES: MapAreaShape[] = ['polygon', 'circle', 'square', 'freehand'];

function normalizePoints(points: unknown): Array<[number, number]> {
  if (!Array.isArray(points)) return [];
  return points
    .filter(
      (point): point is [number, number] =>
        Array.isArray(point) &&
        point.length >= 2 &&
        Number.isFinite(Number(point[0])) &&
        Number.isFinite(Number(point[1])),
    )
    .map((point) => [Number(point[0]), Number(point[1])]);
}

export function normalizeArea(
  area: Partial<MapArea> & Record<string, any> = {},
): MapArea {
  const shape: MapAreaShape = AREA_SHAPES.includes(area.shape as MapAreaShape)
    ? (area.shape as MapAreaShape)
    : 'polygon';
  return {
    id: area.id || generateId(),
    title: area.title || '',
    description: area.description || '',
    shape,
    points: normalizePoints(area.points),
    center: Array.isArray(area.center)
      ? [Number(area.center[0]), Number(area.center[1])]
      : undefined,
    radius: Number.isFinite(Number(area.radius))
      ? Number(area.radius)
      : undefined,
    locationId: area.locationId || null,
    layerId: area.layerId || MAP_BASE_LAYER_ID,
    entities: normalizeEntities(area.entities),
    icon: markerIconClass(area.icon || ''),
    color: area.color || DEFAULT_MARKER_COLOR,
  };
}

function legacyPointsToMarkers(points: unknown): MapMarker[] {
  if (!Array.isArray(points)) return [];
  return points
    .filter(
      (point) =>
        point &&
        Number.isFinite(Number((point as any).x)) &&
        Number.isFinite(Number((point as any).y)),
    )
    .map((point: any) =>
      normalizeMarker({
        x: Number(point.x),
        y: Number(point.y),
        title: point.title || point.label || '',
        description: point.description,
        locationId: point.locationId,
        entities: point.entities,
        icon: point.icon,
        color: point.color,
        backgroundColor: point.backgroundColor,
      }),
    );
}

export function normalizeMapEntity(
  map: Partial<MapEntity> & Record<string, any>,
): MapEntity {
  const layers = normalizeLayers(map.layers);
  const layerIds = new Set(layers.map((layer) => layer.id));
  const withValidLayer = <T extends { layerId: string }>(item: T): T =>
    layerIds.has(item.layerId) ? item : { ...item, layerId: MAP_BASE_LAYER_ID };

  const markers = (
    Array.isArray(map.markers)
      ? map.markers.map(normalizeMarker)
      : legacyPointsToMarkers(map.points)
  ).map(withValidLayer);

  const legacyLocationIds = Array.isArray(map.locationIds)
    ? map.locationIds.filter(
        (id: unknown): id is string => typeof id === 'string',
      )
    : Array.isArray(map.locations)
      ? map.locations
          .map((location: Partial<MapLocation>) => location.id)
          .filter((id): id is string => typeof id === 'string')
      : [];

  return {
    id: map.id || generateId(),
    title: map.title || '',
    description: map.description || '',
    fileId: map.fileId || '',
    locationId:
      typeof map.locationId === 'string' && map.locationId
        ? map.locationId
        : (legacyLocationIds[0] ?? null),
    layers,
    markers,
    areas: Array.isArray(map.areas)
      ? map.areas.map(normalizeArea).map(withValidLayer)
      : [],
    createdAt: Number(map.createdAt) || Date.now(),
    updatedAt: Number(map.updatedAt) || Date.now(),
  };
}
