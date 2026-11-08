import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { deleteMapLocation, useMapLocationStore } from '@/maps/locations';
import { idbPutItem, resetStoreCache } from '@/utils/storage';

async function deleteDatabase() {
  await resetStoreCache();
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase('dmh-db');
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}

function marker(locationId: string | null = null) {
  return {
    id: 'm1',
    title: 'Castle',
    x: 10,
    y: 20,
    locationId,
    layerId: 'base',
    entities: [],
    icon: 'ra-castle',
    color: '#cc3333',
  };
}

function area(locationId: string | null = null) {
  return {
    id: 'a1',
    title: 'Forest',
    shape: 'polygon' as const,
    points: [
      [0, 0],
      [10, 0],
      [10, 10],
    ] as Array<[number, number]>,
    locationId,
    layerId: 'base',
    entities: [],
    icon: '',
    color: '#336699',
  };
}

function mapData(overrides: Record<string, unknown> = {}) {
  return {
    fileId: '',
    layers: [{ id: 'base', title: 'Base' }],
    markers: [],
    areas: [],
    ...overrides,
  };
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
      entities: [],
      map: mapData(),
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

  it('detaches a deleted location from markers and areas in other maps', async () => {
    const locationStore = useMapLocationStore();
    const target = await locationStore.create({
      name: 'Town',
      description: '',
      entities: [],
      map: mapData(),
    });
    const other = await locationStore.create({
      name: 'Region',
      description: '',
      entities: [],
      map: mapData({
        markers: [marker(target.id), marker('other')],
        areas: [area(target.id), area('other')],
      }),
    });

    await deleteMapLocation(target.id);

    expect(locationStore.getById(target.id)).toBeNull();
    const updated = locationStore.getById(other.id);
    expect(updated?.map.markers[0].locationId).toBeNull();
    expect(updated?.map.markers[1].locationId).toBe('other');
    expect(updated?.map.areas[0].locationId).toBeNull();
    expect(updated?.map.areas[1].locationId).toBe('other');
  });

  it('preserves unrelated links when detaching', async () => {
    const locationStore = useMapLocationStore();
    const target = await locationStore.create({
      name: 'Target',
      description: '',
      entities: [],
      map: mapData(),
    });
    const other = await locationStore.create({
      name: 'Other',
      description: '',
      entities: [],
      map: mapData({
        markers: [marker('other')],
        areas: [area('other')],
      }),
    });

    await deleteMapLocation(target.id);

    const updated = locationStore.getById(other.id);
    expect(updated?.map.markers[0].locationId).toBe('other');
    expect(updated?.map.areas[0].locationId).toBe('other');
  });

  it('normalizes legacy locations without map data on load', async () => {
    await idbPutItem('map_locations', {
      id: 'legacy',
      name: 'Legacy',
      description: 'Old record',
      entities: [],
      createdAt: 1,
      updatedAt: 1,
    });
    const store = useMapLocationStore();
    await store.load();

    expect(store.getById('legacy')?.map).toEqual({
      fileId: '',
      layers: [{ id: 'base', title: 'Base' }],
      markers: [],
      areas: [],
    });
  });
});
