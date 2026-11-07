import type { Migration, MigrationTransaction } from '@/types/migration';

const migration: Migration = {
  version: 13,
  name: 'remove_note_hidden',
  affectedStores: ['notes'],
  async go(transaction: MigrationTransaction) {
    const store = transaction.objectStore('notes');
    const notes = (await store.getAll()) as Array<Record<string, any>>;
    for (const note of notes) {
      if (!('hidden' in note)) continue;
      const { hidden: _hidden, ...rest } = note;
      await store.put(rest);
    }
  },
};

export default migration;
