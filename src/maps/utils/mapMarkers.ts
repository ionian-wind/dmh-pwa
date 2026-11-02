import { generateId } from '@/utils/storage';
import { DEFAULT_MARKER_COLOR, DEFAULT_MARKER_ICON } from '../icons';
import { MAP_BASE_LAYER_ID } from './mapLayers';
import type { MapMarker } from '../types';

export function createMarkerDraft(
  x: number,
  y: number,
  overrides: Partial<MapMarker> = {},
): MapMarker {
  return {
    id: generateId(),
    title: '',
    description: '',
    x,
    y,
    locationId: null,
    layerId: MAP_BASE_LAYER_ID,
    entities: [],
    icon: DEFAULT_MARKER_ICON,
    color: DEFAULT_MARKER_COLOR,
    ...overrides,
  };
}

export function upsertMarker(
  markers: MapMarker[],
  marker: MapMarker,
): MapMarker[] {
  const index = markers.findIndex((entry) => entry.id === marker.id);
  if (index === -1) return [...markers, marker];
  return markers.map((entry) => (entry.id === marker.id ? marker : entry));
}

export function removeMarker(
  markers: MapMarker[],
  markerId: string,
): MapMarker[] {
  return markers.filter((marker) => marker.id !== markerId);
}

export function markersForLocation(
  markers: MapMarker[],
  locationId: string | null | undefined,
): MapMarker[] {
  if (!locationId) return [];
  return markers.filter((marker) => marker.locationId === locationId);
}

export function markerCenter(
  markers: MapMarker[],
  fallback: [number, number] = [0, 0],
): [number, number] {
  if (markers.length === 0) return fallback;
  const sum = markers.reduce(
    (acc, marker) => [acc[0] + marker.x, acc[1] + marker.y],
    [0, 0],
  );
  return [sum[0] / markers.length, sum[1] / markers.length];
}
