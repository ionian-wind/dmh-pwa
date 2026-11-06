import { beforeEach, describe, expect, it } from 'vitest';

import {
  deleteMapFile,
  getAllMapFiles,
  getMapFile,
  putMapFile,
  putMapImageMetadata,
} from '@/maps/maps';
import { registerFileReferenceProvider } from '@/utils/files/fileReferences';
import { resetStoreCache } from '@/utils/storage';
import { OPFS_THRESHOLD_BYTES, readOpfsFile } from '@/utils/files/opfs';
import { installFakeOpfs } from '../helpers/fakeOpfs';

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
  signature: '["world.png",10,1,"image/png"]',
  source: { kind: 'blob' as const, blob: new Blob(['image']) },
  imageMetadata: {
    width: 1,
    height: 1,
    aspectRatio: 1,
    fileSize: 10,
    mimeType: 'image/png',
  },
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

  it('handles metadata without a file and files without metadata', async () => {
    await putMapImageMetadata({
      id: 'missing',
      imageMetadata: {
        width: 1,
        height: 1,
        aspectRatio: 1,
      },
      createdAt: 1,
      updatedAt: 1,
    });
    expect(await getAllMapFiles()).toEqual([]);

    await putMapFile({ ...file, id: 'file2', imageMetadata: undefined });
    const loaded = await getMapFile('file2');
    expect(loaded?.imageMetadata).toBeUndefined();
  });

  it('promotes large fallback map images to OPFS', async () => {
    const opfs = installFakeOpfs();
    try {
      await putMapFile({
        ...file,
        id: 'big-map',
        size: OPFS_THRESHOLD_BYTES,
        source: { kind: 'blob', blob: new Blob(['big-map']) },
      });

      const loaded = await getMapFile('big-map');
      expect(loaded?.source.kind).toBe('opfs');
      if (loaded?.source.kind !== 'opfs') throw new Error('expected OPFS');
      await expect(readOpfsFile(loaded.source.path)).resolves.toBeInstanceOf(
        File,
      );
    } finally {
      opfs.restore();
    }
  });

  it('keeps shared map files and metadata while referenced', async () => {
    await putMapFile(file);
    const unregister = registerFileReferenceProvider({
      id: 'map-test',
      isReferenced: (id) => id === 'file1',
    });

    await deleteMapFile('file1');
    expect(await getMapFile('file1')).toMatchObject({ id: 'file1' });

    unregister();
    await deleteMapFile('file1');
    expect(await getMapFile('file1')).toBeUndefined();
  });
});
