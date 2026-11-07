import { nanoid } from 'nanoid';
import type { Migration, MigrationTransaction } from '@/types/migration';

const migration: Migration = {
  version: 15,
  name: 'remove_note_content_type',
  affectedStores: ['notes', 'drawings'],
  async go(transaction: MigrationTransaction) {
    const notesStore = transaction.objectStore('notes');
    const drawingsStore = transaction.objectStore('drawings');
    const notes = (await notesStore.getAll()) as Array<Record<string, any>>;

    for (const note of notes) {
      const { contentType, preview, ...rest } = note;
      if (contentType !== 'draw') {
        if ('contentType' in note || 'preview' in note) {
          await notesStore.put(rest);
        }
        continue;
      }

      const drawingId = nanoid(10);
      await drawingsStore.put({
        id: drawingId,
        snapshot: typeof rest.content === 'string' ? rest.content : '',
        preview: typeof preview === 'string' ? preview : '',
        createdAt: rest.createdAt ?? Date.now(),
        updatedAt: rest.updatedAt ?? Date.now(),
      });
      rest.content = `![drawing](drawing://${drawingId})`;
      await notesStore.put(rest);
    }
  },
};

export default migration;
