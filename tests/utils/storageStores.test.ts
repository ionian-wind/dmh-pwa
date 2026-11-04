import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import {
  clearStore,
  idbDeleteItem,
  idbGetAllItems,
  idbGetItem,
  idbPutItem,
  initializeDatabase,
  openDB,
  resetStoreCache,
  restoreAllStores,
  backupAllStores,
  useMentionsStore,
  useStore,
} from '@/utils/storage';
import { registerValidationSchema, canValidate } from '@/utils/schemaValidator';
import JSZip from 'jszip';

async function deleteDatabase() {
  await resetStoreCache();
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase('dmh-db');
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}

function memoryBlob(text: string) {
  return new Blob([text], { type: 'audio/mp3' });
}

describe('IndexedDB storage', () => {
  beforeEach(async () => {
    await deleteDatabase();
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  afterEach(async () => {
    try {
      const db = await openDB();
      db.close();
    } catch {
      // ignore cleanup failures
    }
    await resetStoreCache();
  });

  it('performs item CRUD operations', async () => {
    const item = { id: 'm1', version: 1, name: 'test', appliedAt: 1 };
    await idbPutItem('migrations', item);

    await expect(idbGetItem('migrations', 'm1')).resolves.toEqual(item);
    await expect(idbGetAllItems('migrations')).resolves.toEqual(
      expect.arrayContaining([item]),
    );

    await idbDeleteItem('migrations', 'm1');
    await expect(idbGetItem('migrations', 'm1')).resolves.toBeUndefined();
  });

  it('validates items before writing when a schema is registered', async () => {
    if (!canValidate('validated-store')) {
      registerValidationSchema('validated-store', {
        type: 'object',
        required: ['name'],
        properties: { name: { type: 'string' } },
      });
    }

    await expect(
      idbPutItem('validated-store' as any, { id: 'x' } as any),
    ).rejects.toThrow("Validation failed for store 'validated-store'");
  });

  it('creates, loads, updates and removes base store items', async () => {
    const store = useStore<any>({ storeName: 'bookmarks' });
    const created = await store.create({ title: 'First' } as any);
    expect(store.getById(created.id)).toEqual(created);
    expect(store.isLoaded.value).toBe(false);

    store.setCurrentId(created.id);
    expect(store.current.value?.id).toBe(created.id);
    store.clearCurrent();
    expect(store.current.value).toBeNull();

    const updated = await store.update(created.id, { title: 'Updated' });
    expect(updated.title).toBe('Updated');
    expect(store.sortedItems.value[0].id).toBe(created.id);

    const second = await store.create({ title: 'Second' } as any);
    expect(store.items.value).toHaveLength(2);

    await store.load();
    expect(store.isLoaded.value).toBe(true);
    expect(store.items.value).toHaveLength(2);

    await store.remove(second.id);
    expect(store.getById(second.id)).toBeNull();

    await expect(store.update('missing', { title: 'x' })).rejects.toThrow(
      'Item not found',
    );
  });

  it('manages mention links and backlinks', async () => {
    const store = useMentionsStore();
    const from = { kind: 'note', id: 'n1' };
    const to = { kind: 'monster', id: 'm1' };

    await store.load();
    await store.addLink(from, to);
    await store.addLink(from, to);
    expect(store.getLinks(from)).toEqual([to]);
    expect(store.getBacklinks(to)).toEqual([from]);

    await store.setLinks(from, [
      to,
      { kind: 'party', id: 'p1' },
      { kind: 'monster', id: 'm1' },
    ]);
    expect(store.getLinks(from)).toEqual([
      { kind: 'monster', id: 'm1' },
      { kind: 'party', id: 'p1' },
    ]);

    await store.removeLink(from, to);
    expect(store.getLinks(from)).toEqual([{ kind: 'party', id: 'p1' }]);

    await store.clearLinks(from);
    expect(store.getLinks(from)).toEqual([]);

    await store.addLink(from, to);
    await store.clearAll();
    expect(store.links).toEqual({});

    await store.load();
    expect(store.loaded).toBe(true);
  });

  it('backs up and restores stores, including jukebox file blobs', async () => {
    await idbPutItem('notes', {
      id: 'n1',
      title: 'Note',
      createdAt: 1,
      updatedAt: 1,
    } as any);
    const blob = memoryBlob('audio-data');
    await idbPutItem('jukebox_files', {
      id: 'f1',
      name: 'song.mp3',
      source: { kind: 'blob', blob },
      createdAt: 1,
      updatedAt: 1,
    } as any);

    const backup = await backupAllStores();
    expect(backup).toBeInstanceOf(Blob);

    await clearStore('notes');
    await clearStore('jukebox_files');
    await restoreAllStores(backup);

    const notes = await idbGetAllItems<any>('notes');
    expect(notes).toEqual([
      expect.objectContaining({ id: 'n1', title: 'Note' }),
    ]);

    const files = await idbGetAllItems<any>('jukebox_files');
    expect(files[0].source.kind).toBe('blob');
    expect(files[0].source.blob).toBeDefined();
  });

  it('skips invalid JSON while restoring and clears existing stores', async () => {
    await idbPutItem('notes', {
      id: 'old',
      title: 'Old',
      createdAt: 1,
      updatedAt: 1,
    } as any);

    const zip = new JSZip();
    zip.file('notes.json', '{broken');
    const blob = await zip.generateAsync({ type: 'blob' });

    await expect(restoreAllStores(blob)).resolves.toBeUndefined();
    await expect(idbGetAllItems<any>('notes')).resolves.toEqual([
      expect.objectContaining({ id: 'old', title: 'Old' }),
    ]);
  });

  it('initializes the database once', async () => {
    await expect(initializeDatabase()).resolves.toBeUndefined();
    await expect(initializeDatabase()).resolves.toBeUndefined();
    expect(await openDB()).toBeTruthy();
  });
});
