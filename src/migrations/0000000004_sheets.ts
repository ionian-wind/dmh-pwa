import type { Migration } from '@/types/migration';

export const sheetsMigration: Migration = {
  version: 4,
  name: 'sheets',
  affectedStores: ['sheets', 'sheetTemplates'],
  go: async () => {},
};
