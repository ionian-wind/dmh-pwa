import type { Migration, MigrationTransaction } from '@/types/migration';

const migration: Migration = {
  version: 20,
  name: 'remove_timer_description',
  affectedStores: ['timers'],
  async go(transaction: MigrationTransaction) {
    const store = transaction.objectStore('timers');
    const timers = (await store.getAll()) as Array<Record<string, any>>;
    for (const timer of timers) {
      if (!('description' in timer)) continue;
      const { description: _description, ...rest } = timer;
      await store.put(rest);
    }
  },
};

export default migration;
