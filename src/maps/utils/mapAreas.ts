import { generateId } from '@/utils/storage';
import { DEFAULT_MARKER_COLOR } from '../icons';
import { contrastTextColor, parseHexColor } from './colors';
import { MAP_BASE_LAYER_ID } from './mapLayers';
import type { MapArea, MapAreaShape } from '../types';

export function createAreaDraft(
  shape: MapAreaShape,
  geometry: {
    points?: Array<[number, number]>;
    center?: [number, number];
    radius?: number;
  } = {},
  overrides: Partial<MapArea> = {},
): MapArea {
  return {
    id: generateId(),
    title: '',
    description: '',
    shape,
    points: geometry.points ?? [],
    center: geometry.center,
    radius: geometry.radius,
    locationId: null,
    layerId: MAP_BASE_LAYER_ID,
    entities: [],
    icon: '',
    color: DEFAULT_MARKER_COLOR,
    ...overrides,
  };
}

export function upsertArea(areas: MapArea[], area: MapArea): MapArea[] {
  const index = areas.findIndex((entry) => entry.id === area.id);
  if (index === -1) return [...areas, area];
  return areas.map((entry) => (entry.id === area.id ? area : entry));
}

export function removeArea(areas: MapArea[], areaId: string): MapArea[] {
  return areas.filter((area) => area.id !== areaId);
}

export function areaCenter(
  area: MapArea,
  fallback: [number, number] = [0, 0],
): [number, number] {
  if (area.shape === 'circle' && area.center) return area.center;
  if (area.points.length === 0) return fallback;
  const sum = area.points.reduce(
    (acc, point) => [acc[0] + point[0], acc[1] + point[1]],
    [0, 0],
  );
  return [sum[0] / area.points.length, sum[1] / area.points.length];
}

export function areaFillColor(color: string, alpha = 0.25): string {
  const rgb = parseHexColor(color);
  if (!rgb) return color;
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

export function areaTextColor(color: string): string {
  return contrastTextColor(color);
}
