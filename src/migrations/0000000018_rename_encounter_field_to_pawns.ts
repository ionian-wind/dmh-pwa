import type { Migration, MigrationTransaction } from '@/types/migration';

const migration: Migration = {
  version: 18,
  name: 'rename_encounter_monsters_to_pawns',
  affectedStores: ['encounters'],
  async go(transaction: MigrationTransaction) {
    const store = transaction.objectStore('encounters');
    const encounters = (await store.getAll()) as Array<Record<string, any>>;
    for (const encounter of encounters) {
      if (!('monsters' in encounter)) continue;
      const { monsters, ...rest } = encounter;
      await store.put({
        ...rest,
        pawns: encounter.pawns ?? monsters ?? {},
      });
    }
  },
};

export default migration;
