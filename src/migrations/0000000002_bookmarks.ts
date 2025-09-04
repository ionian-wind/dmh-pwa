import type { Migration } from '@/types/migration';

export const bookmarksMigration: Migration = {
  version: 2,
  name: 'add_bookmarks_store',
  affectedStores: ['bookmarks'],
  go: async () => {},
};
