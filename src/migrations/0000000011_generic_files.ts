import type { Migration, MigrationTransaction } from '@/types/migration';
import type { StoredFile } from '@/utils/files/types';
import { buildFileSignature } from '@/utils/files/signature';

interface LegacyFileRecord {
  id: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  source: StoredFile['source'];
  createdAt: number;
  updatedAt: number;
  imageMetadata?: unknown;
}

async function clearStore(tx: MigrationTransaction, name: string) {
  const store = tx.objectStore(name);
  const keys = await store.getAllKeys();
  for (const key of keys) {
    await store.delete(key);
  }
}

const migration: Migration = {
  version: 11,
  name: 'generic_files_store',
  affectedStores: ['files', 'map_image_metadata', 'jukebox_files', 'map_files'],
  async go(transaction: MigrationTransaction) {
    const tx = transaction;
    const filesStore = tx.objectStore('files');
    const metadataStore = tx.objectStore('map_image_metadata');
    const jukeboxFilesStore = tx.objectStore('jukebox_files');
    const mapFilesStore = tx.objectStore('map_files');

    const jukeboxFiles =
      (await jukeboxFilesStore.getAll()) as LegacyFileRecord[];
    const mapFiles = (await mapFilesStore.getAll()) as LegacyFileRecord[];

    for (const file of jukeboxFiles) {
      if (!file?.id || !file.source) continue;
      await filesStore.put({
        ...file,
        name: file.name || '',
        size: Number(file.size) || 0,
        type: file.type || '',
        lastModified: Number(file.lastModified) || 0,
        signature: buildFileSignature({
          name: file.name || '',
          size: Number(file.size) || 0,
          type: file.type || '',
          lastModified: Number(file.lastModified) || 0,
        }),
      });
    }

    for (const file of mapFiles) {
      if (!file?.id) continue;
      if (file.source) {
        await filesStore.put({
          ...file,
          name: file.name || '',
          size: Number(file.size) || 0,
          type: file.type || '',
          lastModified: Number(file.lastModified) || 0,
          signature: buildFileSignature({
            name: file.name || '',
            size: Number(file.size) || 0,
            type: file.type || '',
            lastModified: Number(file.lastModified) || 0,
          }),
        });
      }
      if (file.imageMetadata) {
        await metadataStore.put({
          id: file.id,
          imageMetadata: file.imageMetadata,
          createdAt: Number(file.createdAt) || Date.now(),
          updatedAt: Number(file.updatedAt) || Date.now(),
        });
      }
    }

    await clearStore(tx, 'jukebox_files');
    await clearStore(tx, 'map_files');
  },
};

export default migration;
