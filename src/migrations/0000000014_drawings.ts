import type { Migration } from '@/types/migration';

const migration: Migration = {
  version: 14,
  name: 'drawings',
  affectedStores: ['drawings'],
  async go() {
    // The drawings store is created by the Dexie schema version bump.
  },
};

export default migration;
