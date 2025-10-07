import type { Migration } from '@/types/migration';

import { initialSchemaMigration } from './0000000001_initial_schema';
import { bookmarksMigration } from './0000000002_bookmarks';
import migration3 from './0000000003_timers';
import migration4 from './0000000004_maps';

export const migrations: Migration[] = [
  initialSchemaMigration,
  bookmarksMigration,
  migration3,
  migration4,
];

// Sort migrations by version to ensure they run in order
export const sortedMigrations = migrations.sort(
  (a, b) => a.version - b.version,
);
