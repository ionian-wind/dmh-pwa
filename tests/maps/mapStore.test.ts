import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import {
  deleteMapFile,
  getMapFile,
  putMapFile,
  useMapStore,
} from '@/maps/maps';
import type { MapFile } from '@/maps/types';
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

const file: MapFile = {
  id: 'file1',
  name: 'map.png',
  size: 5,
  type: 'image/png',
  lastModified: 1,
  source: { kind: 'blob', blob: new Blob(['image']) },
  createdAt: 1,
  updatedAt: 1,
};

describe('map store', () => {
  beforeEach(async () => {
    await deleteDatabase();
    setActivePinia(createPinia());
  });

  it('creates, searches and updates maps', async () => {
    const store = useMapStore();
    const created = await store.create({
      title: 'World',
      description: 'Campaign',
      fileId: 'file1',
      locationIds: [],
      markers: [],
      areas: [],
    } as any);

    expect(store.getById(created.id)?.title).toBe('World');
    store.setFilter('campaign');
    expect(store.filtered).toHaveLength(1);
    store.setFilter('nothing');
    expect(store.filtered).toHaveLength(0);
    store.clearFilter();
    expect(store.filtered).toHaveLength(1);

    await store.update(created.id, { title: 'Updated' });
    expect(store.getById(created.id)?.title).toBe('Updated');
    expect(store.sortedItems[0].id).toBe(created.id);

    await store.remove(created.id);
    expect(store.getById(created.id)).toBeNull();
  });

  it('stores and deletes map image files', async () => {
    await putMapFile(file);
    const stored = await getMapFile(file.id);
    expect(stored).toMatchObject({
      id: file.id,
      name: file.name,
      source: { kind: 'blob' },
    });
    expect(stored?.source.kind).toBe('blob');

    await deleteMapFile(file.id);
    await expect(getMapFile(file.id)).resolves.toBeUndefined();
  });
});
