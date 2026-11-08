import type { Migration, MigrationTransaction } from '@/types/migration';

const ESCAPED_ANCHOR_SPACE =
  /[ \t]*\\[ \t]*(?=<!--\s*dmh:block=[A-Za-z0-9_-]+\s*-->)/g;

const migration: Migration = {
  version: 16,
  name: 'strip_escaped_block_anchor_spaces',
  affectedStores: ['notes'],
  async go(transaction: MigrationTransaction) {
    const store = transaction.objectStore('notes');
    const notes = (await store.getAll()) as Array<Record<string, any>>;
    for (const note of notes) {
      if (typeof note.content !== 'string') continue;
      const content = note.content.replace(ESCAPED_ANCHOR_SPACE, ' ');
      if (content === note.content) continue;
      await store.put({ ...note, content });
    }
  },
};

export default migration;
