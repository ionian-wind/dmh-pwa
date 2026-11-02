import { generateId } from '@/utils/storage';
import { DEFAULT_MARKER_COLOR } from '../icons';
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

function parseHex(color: string): [number, number, number] | null {
  const value = color.trim().replace(/^#/, '');
  if (!/^(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) return null;
  const full =
    value.length === 3
      ? value
          .split('')
          .map((part) => part + part)
          .join('')
      : value;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

export function areaFillColor(color: string, alpha = 0.25): string {
  const rgb = parseHex(color);
  if (!rgb) return color;
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

export function areaTextColor(color: string): string {
  const rgb = parseHex(color);
  if (!rgb) return '#111827';
  const luminance = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
  return luminance > 0.6 ? '#111827' : '#ffffff';
}
