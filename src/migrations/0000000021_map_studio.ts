import type { Migration } from '@/types/migration';

/** Adds the Map Studio stores. The schema itself creates the tables. */
const migration: Migration = {
  version: 21,
  name: 'map_studio_stores',
  affectedStores: [
    'map_studio_projects',
    'map_studio_maps',
    'map_studio_snapshots',
    'map_studio_settings',
  ],
  async go() {
    // Store creation is handled by the Dexie schema declaration.
  },
};

export default migration;
