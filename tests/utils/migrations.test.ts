import { describe, expect, it } from 'vitest';
import { openDB, resetStoreCache } from '@/utils/storage';
import { sortedMigrations } from '@/migrations';

async function deleteDatabase() {
  await resetStoreCache();
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase('dmh-db');
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}

describe('database migrations', () => {
  it('records every migration exactly once', async () => {
    await deleteDatabase();
    const db = await openDB();
    const first = await db.migrations.toArray();
    expect(first.map((m) => m.version).sort()).toEqual(
      sortedMigrations.map((m) => m.version).sort(),
    );

    await openDB();
    const second = await db.migrations.toArray();
    expect(second).toHaveLength(first.length);
    db.close();
  });

  it('shares one connection and applies migrations once under concurrency', async () => {
    await deleteDatabase();
    const [first, second] = await Promise.all([openDB(), openDB()]);
    expect(second).toBe(first);

    const records = await first.migrations.toArray();
    expect(records).toHaveLength(sortedMigrations.length);
    first.close();
  });

  it('creates the stores declared by migrations', async () => {
    await deleteDatabase();
    const db = await openDB();
    const names = db.tables.map((table) => table.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'notes',
        'modules',
        'bookmarks',
        'timers',
        'jukebox_tracks',
        'indexations_mentions',
      ]),
    );
    db.close();
  });

  it('declares every migration store in the Dexie schema', async () => {
    await deleteDatabase();
    const db = await openDB();
    const names = new Set(db.tables.map((table) => table.name));

    for (const migration of sortedMigrations) {
      for (const storeName of migration.affectedStores) {
        expect(names).toContain(storeName);
      }
    }

    db.close();
  });

  it('adds a default text contentType to existing notes', async () => {
    await deleteDatabase();
    const db = await openDB();
    const now = Date.now();
    await db.notes.put({
      id: 'note1',
      title: 'Legacy',
      content: 'Body',
      typeId: null,
      tags: [],
      moduleId: null,
      hidden: false,
      createdAt: now,
      updatedAt: now,
    });
    const applied = await db.migrations.toArray();
    const migration8 = applied.find((entry) => entry.version === 8);
    expect(migration8).toBeTruthy();
    await db.migrations.delete(migration8!.id);
    db.close();

    await resetStoreCache();
    const reopened = await openDB();
    const note = await reopened.notes.get('note1');
    expect(note.contentType).toBe('text');
    reopened.close();
  });

  it('migrates legacy file stores into generic files and map metadata', async () => {
    await deleteDatabase();
    const db = await openDB();
    const now = Date.now();
    const blob = new Blob(['legacy-audio'], { type: 'audio/mpeg' });
    await db.jukebox_files.put({
      id: 'j1',
      name: 'song.mp3',
      size: 13,
      type: 'audio/mpeg',
      lastModified: 10,
      source: { kind: 'blob', blob },
      createdAt: now,
      updatedAt: now,
    });
    await db.map_files.put({
      id: 'm1',
      name: 'map.png',
      size: 13,
      type: 'image/png',
      lastModified: 20,
      source: { kind: 'blob', blob: new Blob(['legacy-map']) },
      imageMetadata: { width: 10, height: 20, aspectRatio: 0.5 },
      createdAt: now,
      updatedAt: now,
    });
    const applied = await db.migrations.toArray();
    const migration11 = applied.find((entry) => entry.version === 11);
    expect(migration11).toBeTruthy();
    await db.migrations.delete(migration11!.id);
    db.close();

    await resetStoreCache();
    const reopened = await openDB();
    const files = await reopened.files.toArray();
    expect(files).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'j1',
          signature: expect.any(String),
        }),
        expect.objectContaining({
          id: 'm1',
          signature: expect.any(String),
        }),
      ]),
    );
    expect(await reopened.map_image_metadata.toArray()).toEqual([
      expect.objectContaining({
        id: 'm1',
        imageMetadata: expect.objectContaining({ width: 10, height: 20 }),
      }),
    ]);
    expect(await reopened.jukebox_files.toArray()).toEqual([]);
    expect(await reopened.map_files.toArray()).toEqual([]);
    reopened.close();
  });

  it('extracts embedded map locations into the global store', async () => {
    await deleteDatabase();
    const db = await openDB();
    const now = Date.now();
    await db.maps.put({
      id: 'map1',
      title: 'World',
      fileId: 'file1',
      locations: [{ id: 'l1', name: 'Town', entities: [] }],
      markers: [],
      areas: [],
      createdAt: now,
      updatedAt: now,
    });
    const applied = await db.migrations.toArray();
    const migration5 = applied.find((entry) => entry.version === 5);
    const migration6 = applied.find((entry) => entry.version === 6);
    expect(migration5).toBeTruthy();
    expect(migration6).toBeTruthy();
    await db.migrations.delete(migration5!.id);
    await db.migrations.delete(migration6!.id);
    db.close();

    await resetStoreCache();
    const reopened = await openDB();
    const map = await reopened.maps.get('map1');
    const location = await reopened.map_locations.get('l1');

    expect(map.locationId).toEqual('l1');
    expect(map.locationIds).toBeUndefined();
    expect(map.locations).toBeUndefined();
    expect(location).toMatchObject({ id: 'l1', name: 'Town' });
    reopened.close();
  });
});
