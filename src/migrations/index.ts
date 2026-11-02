import type { Migration } from '@/types/migration';

import { initialSchemaMigration } from './0000000001_initial_schema';
import { bookmarksMigration } from './0000000002_bookmarks';
import migration3 from './0000000003_timers';
import migration4 from './0000000004_maps';
import migration5 from './0000000005_map_locations';
import migration6 from './0000000006_map_location_one_to_one';

export const migrations: Migration[] = [
  initialSchemaMigration,
  bookmarksMigration,
  migration3,
  migration4,
  migration5,
  migration6,
];

// Sort migrations by version to ensure they run in order
export const sortedMigrations = migrations.sort(
  (a, b) => a.version - b.version,
);
