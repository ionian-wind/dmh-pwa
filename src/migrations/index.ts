import type { Migration } from '@/types/migration';

import { initialSchemaMigration } from './0000000001_initial_schema';
import { bookmarksMigration } from './0000000002_bookmarks';
import migration3 from './0000000003_timers';
import { sheetsMigration } from './0000000004_sheets';

export const migrations: Migration[] = [
  initialSchemaMigration,
  bookmarksMigration,
  migration3,
  sheetsMigration,
];

// Sort migrations by version to ensure they run in order
export const sortedMigrations = migrations.sort(
  (a, b) => a.version - b.version,
);
