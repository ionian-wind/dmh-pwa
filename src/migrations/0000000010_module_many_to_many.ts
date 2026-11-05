import type { IDBPTransaction } from 'idb';
import type { Migration } from '@/types/migration';

const migration: Migration = {
  version: 10,
  name: 'module_many_to_many',
  affectedStores: ['notes', 'encounters'],
  async go(transaction: IDBPTransaction<unknown, string[], 'versionchange'>) {
    const tx = transaction as unknown as IDBPTransaction<
      any,
      string[],
      'readwrite'
    >;

    const notesStore = tx.objectStore('notes');
    const notes = (await notesStore.getAll()) as Array<Record<string, any>>;
    for (const note of notes) {
      const legacyId = note.moduleId;
      const moduleIds = Array.isArray(note.moduleIds)
        ? note.moduleIds
        : legacyId
          ? [legacyId]
          : [];
      const { moduleId: _moduleId, ...rest } = note;
      await notesStore.put({ ...rest, moduleIds });
    }

    const encountersStore = tx.objectStore('encounters');
    const encounters = (await encountersStore.getAll()) as Array<
      Record<string, any>
    >;
    for (const encounter of encounters) {
      const legacyId = encounter.moduleId;
      const moduleIds = Array.isArray(encounter.moduleIds)
        ? encounter.moduleIds
        : legacyId
          ? [legacyId]
          : [];
      const { moduleId: _moduleId, ...rest } = encounter;
      await encountersStore.put({ ...rest, moduleIds });
    }
  },
};

export default migration;
