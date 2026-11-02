import type { IDBPTransaction } from 'idb';
import type { Migration } from '@/types/migration';
import type { Note } from '@/types';

const migration: Migration = {
  version: 8,
  name: 'add_note_content_type',
  affectedStores: ['notes'],
  async go(transaction: IDBPTransaction<unknown, string[], 'versionchange'>) {
    const tx = transaction as unknown as IDBPTransaction<
      any,
      string[],
      'readwrite'
    >;
    const notesStore = tx.objectStore('notes');
    const notes = (await notesStore.getAll()) as Array<
      Note & { contentType?: string }
    >;

    for (const note of notes) {
      if (note.contentType === 'text' || note.contentType === 'draw') {
        continue;
      }
      await notesStore.put({ ...note, contentType: 'text' });
    }
  },
};

export default migration;
