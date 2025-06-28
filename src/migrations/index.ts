import type { Migration } from '@/types/migration';

import { initialSchemaMigration } from './0000000001_initial_schema';

export const migrations: Migration[] = [
  initialSchemaMigration,
];

// Sort migrations by version to ensure they run in order
export const sortedMigrations = migrations.sort((a, b) => a.version - b.version); 
