import type { Migration, MigrationTransaction } from '@/types/migration';
import type { MapArea, MapEntity, MapMarker } from '../maps/types';
import { MAP_BASE_LAYER_ID } from '../maps/utils/mapLayers';

const migration: Migration = {
  version: 7,
  name: 'add_map_layers',
  affectedStores: ['maps'],
  async go(transaction: MigrationTransaction) {
    const tx = transaction;
    const mapsStore = tx.objectStore('maps');
    const maps = (await mapsStore.getAll()) as Array<
      MapEntity & {
        layers?: Array<{ id: string; title: string }>;
        markers?: MapMarker[];
        areas?: MapArea[];
      }
    >;

    for (const map of maps) {
      const layers = Array.isArray(map.layers) ? [...map.layers] : [];
      if (!layers.some((layer) => layer.id === MAP_BASE_LAYER_ID)) {
        layers.unshift({ id: MAP_BASE_LAYER_ID, title: 'Base' });
      }
      const layerIds = new Set(layers.map((layer) => layer.id));
      const layerIdFor = (value: string | undefined) =>
        value && layerIds.has(value) ? value : MAP_BASE_LAYER_ID;

      await mapsStore.put({
        ...map,
        layers,
        markers: (map.markers ?? []).map((marker) => ({
          ...marker,
          layerId: layerIdFor(marker.layerId),
        })),
        areas: (map.areas ?? []).map((area) => ({
          ...area,
          layerId: layerIdFor(area.layerId),
        })),
      });
    }
  },
};

export default migration;
