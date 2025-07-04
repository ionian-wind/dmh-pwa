import type { IDBPTransaction } from 'idb';
import type { Migration } from '@/types/migration';

const migration: Migration = {
  version: 3,
  name: 'add timers store',
  affectedStores: ['timers'],
  async go(
    _transaction: IDBPTransaction<unknown, string[], 'versionchange'>,
  ) {},
};

export default migration;
