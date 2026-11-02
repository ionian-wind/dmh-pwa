import type { IDBPTransaction } from 'idb';
import type { Migration } from '@/types/migration';
import type { MapEntity, MapLocation } from '../maps/types';

function asLocation(location: MapLocation): MapLocation {
  return {
    id: location.id,
    name: location.name || '',
    description: location.description || '',
    color: location.color || undefined,
    entities: Array.isArray(location.entities) ? location.entities : [],
    createdAt: Number(location.createdAt) || Date.now(),
    updatedAt: Number(location.updatedAt) || Date.now(),
  };
}

const migration: Migration = {
  version: 5,
  name: 'extract_map_locations',
  affectedStores: ['map_locations', 'maps'],
  async go(transaction: IDBPTransaction<unknown, string[], 'versionchange'>) {
    const tx = transaction as unknown as IDBPTransaction<
      any,
      string[],
      'readwrite'
    >;
    const mapsStore = tx.objectStore('maps');
    const locationsStore = tx.objectStore('map_locations');
    const maps = (await mapsStore.getAll()) as Array<
      MapEntity & { locations?: MapLocation[]; locationIds?: string[] }
    >;
    const extracted = new Map<string, MapLocation>();

    for (const map of maps) {
      const embedded = Array.isArray(map.locations) ? map.locations : [];
      const locationIds = Array.isArray(map.locationIds)
        ? [...map.locationIds]
        : [];

      for (const location of embedded) {
        if (!location?.id) continue;
        const normalized = asLocation(location);
        if (!extracted.has(normalized.id))
          extracted.set(normalized.id, normalized);
        if (!locationIds.includes(normalized.id))
          locationIds.push(normalized.id);
      }

      const { locations: _locations, ...rest } = map;
      await mapsStore.put({ ...rest, locationIds });
    }

    for (const location of extracted.values()) {
      await locationsStore.put(location);
    }
  },
};

export default migration;
