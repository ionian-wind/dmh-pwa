import type { Migration, MigrationTransaction } from '@/types/migration';

const ENTITY_STORES = [
  'characters',
  'encounters',
  'jukebox_playlists',
  'pawns',
  'notes',
  'parties',
];

const MAP_STORES = ['map_locations', 'maps'];

function stripModuleEntities(record: Record<string, any>) {
  const clone = { ...record };
  if (Array.isArray(clone.entities)) {
    clone.entities = clone.entities.filter(
      (entity: Record<string, any>) => entity?.kind !== 'module',
    );
  }
  for (const key of ['markers', 'areas']) {
    if (Array.isArray(clone[key])) {
      clone[key] = clone[key].map(stripModuleEntities);
    }
  }
  if (clone.map && typeof clone.map === 'object') {
    clone.map = stripModuleEntities(clone.map);
  }
  return clone;
}

const migration: Migration = {
  version: 12,
  name: 'remove_module_data',
  affectedStores: [
    ...ENTITY_STORES,
    ...MAP_STORES,
    'bookmarks',
    'indexations_mentions',
  ],
  async go(transaction: MigrationTransaction) {
    for (const storeName of ENTITY_STORES) {
      const store = transaction.objectStore(storeName);
      const records = (await store.getAll()) as Array<Record<string, any>>;
      for (const record of records) {
        if (!('moduleIds' in record)) continue;
        const { moduleIds: _moduleIds, ...rest } = record;
        await store.put(rest);
      }
    }

    for (const storeName of MAP_STORES) {
      const store = transaction.objectStore(storeName);
      const records = (await store.getAll()) as Array<Record<string, any>>;
      for (const record of records) {
        await store.put(stripModuleEntities(record));
      }
    }

    const mentions = transaction.objectStore('indexations_mentions');
    const mentionRecords = (await mentions.getAll()) as Array<
      Record<string, any>
    >;
    for (const record of mentionRecords) {
      if (!Array.isArray(record.links)) continue;
      const links = record.links.filter(
        (link: Record<string, any>) => link?.kind !== 'module',
      );
      if (links.length !== record.links.length) {
        await mentions.put({ ...record, links });
      }
    }

    const bookmarks = transaction.objectStore('bookmarks');
    const records = (await bookmarks.getAll()) as Array<Record<string, any>>;
    for (const bookmark of records) {
      if (
        bookmark.ownerKind === 'module' ||
        (!bookmark.ownerKind && bookmark.moduleId)
      ) {
        await bookmarks.delete(bookmark.id);
        continue;
      }
      if (!('moduleId' in bookmark)) continue;
      const { moduleId: _moduleId, ...rest } = bookmark;
      await bookmarks.put(rest);
    }
  },
};

export default migration;
