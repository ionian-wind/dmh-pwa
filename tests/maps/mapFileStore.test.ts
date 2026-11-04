import { beforeEach, describe, expect, it } from 'vitest';

import {
  deleteMapFile,
  getAllMapFiles,
  getMapFile,
  putMapFile,
} from '@/maps/maps';
import { resetStoreCache } from '@/utils/storage';

async function deleteDatabase() {
  await resetStoreCache();
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase('dmh-db');
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}

const file = {
  id: 'file1',
  name: 'world.png',
  size: 10,
  type: 'image/png',
  lastModified: 1,
  source: { kind: 'blob' as const, blob: new Blob(['image']) },
  createdAt: 1,
  updatedAt: 1,
};

describe('map file storage', () => {
  beforeEach(deleteDatabase);

  it('puts, gets and lists map files', async () => {
    await putMapFile(file);

    expect(await getMapFile('file1')).toMatchObject({
      id: 'file1',
      name: 'world.png',
    });
    expect(await getMapFile('missing')).toBeUndefined();
    expect(await getAllMapFiles()).toHaveLength(1);
  });

  it('deletes map files', async () => {
    await putMapFile(file);

    await deleteMapFile('file1');

    expect(await getMapFile('file1')).toBeUndefined();
    expect(await getAllMapFiles()).toEqual([]);
  });
});
