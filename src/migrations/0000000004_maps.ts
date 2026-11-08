import type { Migration, MigrationTransaction } from '@/types/migration';

const migration: Migration = {
  version: 4,
  name: 'add_maps_store',
  affectedStores: ['maps', 'map_files'],
  async go(_transaction: MigrationTransaction) {},
};

export default migration;
