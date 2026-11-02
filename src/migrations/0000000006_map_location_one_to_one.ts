import type { IDBPTransaction } from 'idb';
import type { Migration } from '@/types/migration';
import type { MapEntity } from '../maps/types';

const migration: Migration = {
  version: 6,
  name: 'map_location_one_to_one',
  affectedStores: ['maps'],
  async go(transaction: IDBPTransaction<unknown, string[], 'versionchange'>) {
    const tx = transaction as unknown as IDBPTransaction<
      any,
      string[],
      'readwrite'
    >;
    const mapsStore = tx.objectStore('maps');
    const maps = (await mapsStore.getAll()) as Array<
      MapEntity & { locationIds?: string[] }
    >;
    const usedLocations = new Set<string>();

    for (const map of maps) {
      const legacyId = Array.isArray(map.locationIds)
        ? map.locationIds[0]
        : null;
      const candidate = map.locationId || legacyId || null;
      const locationId =
        candidate && !usedLocations.has(candidate) ? candidate : null;
      if (locationId) usedLocations.add(locationId);

      const { locationIds: _locationIds, ...rest } = map;
      await mapsStore.put({ ...rest, locationId });
    }
  },
};

export default migration;
