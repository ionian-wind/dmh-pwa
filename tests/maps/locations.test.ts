import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { useMapStore } from '@/maps/maps';
import { deleteMapLocation, useMapLocationStore } from '@/maps/locations';
import { resetStoreCache } from '@/utils/storage';

async function deleteDatabase() {
  resetStoreCache();
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase('dmh-db');
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}

describe('map location store', () => {
  beforeEach(async () => {
    await deleteDatabase();
    setActivePinia(createPinia());
  });

  it('creates, filters and updates global locations', async () => {
    const store = useMapLocationStore();
    const location = await store.create({
      name: 'Town',
      description: 'Starting town',
      color: '#336699',
      entities: [],
    });

    expect(store.getById(location.id)?.name).toBe('Town');
    expect(store.getById(location.id)?.createdAt).toBeTypeOf('number');

    store.setFilter('town');
    expect(store.filtered).toHaveLength(1);
    store.setFilter('nothing');
    expect(store.filtered).toHaveLength(0);
    store.clearFilter();

    await store.update(location.id, { name: 'Capital' });
    expect(store.getById(location.id)?.name).toBe('Capital');

    await store.remove(location.id);
    expect(store.getById(location.id)).toBeNull();
  });

  it('removes a deleted location from maps and markers', async () => {
    const locationStore = useMapLocationStore();
    const mapStore = useMapStore();
    const location = await locationStore.create({
      name: 'Town',
      description: '',
      color: '#336699',
      entities: [],
    });
    const map = await mapStore.create({
      title: 'World',
      description: '',
      fileId: 'file1',
      locationId: location.id,
      layers: [{ id: 'base', title: 'Base' }],
      markers: [
        {
          id: 'm1',
          title: 'Castle',
          x: 10,
          y: 20,
          locationId: location.id,
          layerId: 'base',
          entities: [],
          icon: 'ra-castle',
          color: '#cc3333',
        },
      ],
      areas: [
        {
          id: 'a1',
          title: 'Forest',
          shape: 'polygon',
          points: [
            [0, 0],
            [10, 0],
            [10, 10],
          ],
          locationId: location.id,
          layerId: 'base',
          entities: [],
          icon: '',
          color: '#336699',
        },
      ],
    });

    await deleteMapLocation(location.id);

    expect(locationStore.getById(location.id)).toBeNull();
    expect(mapStore.getById(map.id)?.locationId).toBeNull();
    expect(mapStore.getById(map.id)?.markers[0].locationId).toBeNull();
    expect(mapStore.getById(map.id)?.areas[0].locationId).toBeNull();
  });
});
