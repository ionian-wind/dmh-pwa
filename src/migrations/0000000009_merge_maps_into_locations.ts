import type { Migration, MigrationTransaction } from '@/types/migration';
import type { MapEntity, MapLocation } from '../maps/types';
import { normalizeLocationMap } from '../maps/utils/normalize';

const migration: Migration = {
  version: 9,
  name: 'merge_maps_into_locations',
  affectedStores: ['maps', 'map_locations'],
  async go(transaction: MigrationTransaction) {
    const tx = transaction;
    const mapsStore = tx.objectStore('maps');
    const locationsStore = tx.objectStore('map_locations');
    const maps = (await mapsStore.getAll()) as MapEntity[];
    const locations = (await locationsStore.getAll()) as MapLocation[];
    const locationsById = new Map(
      locations.map((location) => [location.id, location]),
    );

    for (const map of maps) {
      const locationId = map.locationId || map.id;
      const existing = locationsById.get(locationId);
      const mapEntities = Array.isArray(map.entities) ? map.entities : [];
      const entities = [...(existing?.entities ?? [])];
      for (const ref of mapEntities) {
        if (
          !entities.some(
            (entry) => entry.kind === ref.kind && entry.id === ref.id,
          )
        ) {
          entities.push(ref);
        }
      }

      const location: MapLocation = {
        id: locationId,
        name: existing?.name || map.title || '',
        description: existing?.description || map.description || '',
        entities,
        map: normalizeLocationMap({
          fileId: map.fileId,
          layers: map.layers,
          markers: map.markers,
          areas: map.areas,
        }),
        createdAt: Number(existing?.createdAt ?? map.createdAt) || Date.now(),
        updatedAt: Date.now(),
      };

      await locationsStore.put(location);
      locationsById.set(location.id, location);
    }
  },
};

export default migration;
