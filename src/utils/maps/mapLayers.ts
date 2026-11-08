import { generateId } from '@/utils/storage';
import type { MapLayer } from '@/maps/types';

export const MAP_BASE_LAYER_ID = 'base';

export function createBaseLayer(): MapLayer {
  return { id: MAP_BASE_LAYER_ID, title: 'Base' };
}

export function normalizeLayers(layers: unknown): MapLayer[] {
  const normalized = Array.isArray(layers)
    ? layers
        .filter(
          (layer): layer is Partial<MapLayer> =>
            !!layer && typeof layer === 'object',
        )
        .map((layer) => ({
          id:
            typeof layer.id === 'string' && layer.id ? layer.id : generateId(),
          title:
            typeof layer.title === 'string' && layer.title.trim()
              ? layer.title.trim()
              : 'Base',
        }))
    : [];

  if (!normalized.some((layer) => layer.id === MAP_BASE_LAYER_ID)) {
    normalized.unshift(createBaseLayer());
  }
  return normalized;
}

export function createLayer(title: string): MapLayer {
  return { id: generateId(), title: title.trim() || 'Layer' };
}
