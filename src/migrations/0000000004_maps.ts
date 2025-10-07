import type { IDBPTransaction } from 'idb';
import type { Migration } from '@/types/migration';

const migration: Migration = {
  version: 4,
  name: 'add_maps_store',
  affectedStores: ['maps', 'map_files'],
  async go(
    _transaction: IDBPTransaction<unknown, string[], 'versionchange'>,
  ) {},
};

export default migration;
