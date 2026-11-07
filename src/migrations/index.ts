import type { Migration } from '@/types/migration';

import { initialSchemaMigration } from './0000000001_initial_schema';
import { bookmarksMigration } from './0000000002_bookmarks';
import migration3 from './0000000003_timers';
import migration4 from './0000000004_maps';
import migration5 from './0000000005_map_locations';
import migration6 from './0000000006_map_location_one_to_one';
import migration7 from './0000000007_map_layers';
import migration8 from './0000000008_note_content_type';
import migration9 from './0000000009_merge_maps_into_locations';
import migration11 from './0000000011_generic_files';
import migration12 from './0000000012_remove_module_data';
import migration13 from './0000000013_remove_note_hidden';
import migration14 from './0000000014_drawings';
import migration15 from './0000000015_remove_note_content_type';

export const migrations: Migration[] = [
  initialSchemaMigration,
  bookmarksMigration,
  migration3,
  migration4,
  migration5,
  migration6,
  migration7,
  migration8,
  migration9,
  migration11,
  migration12,
  migration13,
  migration14,
  migration15,
];

// Sort migrations by version to ensure they run in order
export const sortedMigrations = migrations.sort(
  (a, b) => a.version - b.version,
);
