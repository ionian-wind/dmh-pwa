import type { Migration, MigrationTransaction } from '@/types/migration';

const migration: Migration = {
  version: 3,
  name: 'add timers store',
  affectedStores: ['timers'],
  async go(_transaction: MigrationTransaction) {},
};

export default migration;
