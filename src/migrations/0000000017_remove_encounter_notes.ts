import type { Migration, MigrationTransaction } from '@/types/migration';

const migration: Migration = {
  version: 17,
  name: 'remove_encounter_notes',
  affectedStores: ['encounters'],
  async go(transaction: MigrationTransaction) {
    const store = transaction.objectStore('encounters');
    const encounters = (await store.getAll()) as Array<Record<string, any>>;
    for (const encounter of encounters) {
      if (!('notes' in encounter)) continue;
      const { notes: _notes, ...rest } = encounter;
      await store.put(rest);
    }
  },
};

export default migration;
