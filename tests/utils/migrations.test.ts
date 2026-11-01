import { describe, expect, it } from 'vitest';
import { openDB, resetStoreCache } from '@/utils/storage';
import { sortedMigrations } from '@/migrations';

async function deleteDatabase() {
  resetStoreCache();
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
    const first = await db.getAll('migrations');
    expect(first.map((m) => m.version).sort()).toEqual(
      sortedMigrations.map((m) => m.version).sort(),
    );

    await openDB();
    const second = await db.getAll('migrations');
    expect(second).toHaveLength(first.length);
    db.close();
  });

  it('shares one connection and applies migrations once under concurrency', async () => {
    await deleteDatabase();
    const [first, second] = await Promise.all([openDB(), openDB()]);
    expect(second).toBe(first);

    const records = await first.getAll('migrations');
    expect(records).toHaveLength(sortedMigrations.length);
    first.close();
  });

  it('creates the stores declared by migrations', async () => {
    await deleteDatabase();
    const db = await openDB();
    const names = Array.from(db.objectStoreNames);
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
});
