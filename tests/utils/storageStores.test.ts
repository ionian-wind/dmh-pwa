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
import { readOpfsFile, writeOpfsFile } from '@/utils/files/opfs';
import { installFakeOpfs } from '../helpers/fakeOpfs';
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

    await store.removeLink({ kind: 'note', id: 'missing' }, to);
    await store.removeLink(from, to);
    expect(store.getLinks(from)).toEqual([{ kind: 'party', id: 'p1' }]);
    await store.setLinks(from, [to]);
    await store.removeLink(from, to);
    expect(store.getLinks(from)).toEqual([]);

    await store.clearLinks(from);
    expect(store.getLinks(from)).toEqual([]);

    await store.addLink(from, to);
    await store.clearAll();
    expect(store.links).toEqual({});

    await store.load();
    expect(store.loaded).toBe(true);
  });

  it('backs up and restores stores, including generic file blobs', async () => {
    // jsdom's Blob is not recognised by Node's structuredClone, so keep the
    // same object through fake-indexeddb for this round-trip test.
    const originalStructuredClone = globalThis.structuredClone;
    globalThis.structuredClone = (value: any) => value;

    try {
      await idbPutItem('notes', {
        id: 'n1',
        title: 'Note',
        createdAt: 1,
        updatedAt: 1,
      } as any);
      const blob = memoryBlob('audio-data');
      await idbPutItem('files', {
        id: 'f1',
        name: 'song.mp3',
        size: blob.size,
        type: blob.type,
        lastModified: 1,
        signature: '["song.mp3",10,1,"audio/mpeg"]',
        source: { kind: 'blob', blob },
        createdAt: 1,
        updatedAt: 1,
      } as any);

      const backup = await backupAllStores();
      expect(backup).toBeInstanceOf(Blob);

      const zip = await JSZip.loadAsync(backup);
      expect(zip.file('manifest.json')).toBeTruthy();
      expect(zip.file('files/f1')).toBeTruthy();
      const filesJson = JSON.parse(
        (await zip.file('files.json')!.async('string')) ?? '[]',
      );
      expect(filesJson[0].source.kind).toBe('binary');
      expect(filesJson[0].source.entry).toBe('files/f1');

      await clearStore('notes');
      await clearStore('files');
      await restoreAllStores(backup);

      const notes = await idbGetAllItems<any>('notes');
      expect(notes).toEqual([
        expect.objectContaining({ id: 'n1', title: 'Note' }),
      ]);

      const files = await idbGetAllItems<any>('files');
      expect(files[0].source.kind).toBe('blob');
      expect(files[0].source.blob).toBeDefined();
    } finally {
      globalThis.structuredClone = originalStructuredClone;
    }
  });

  it('includes external handle files when requested', async () => {
    const originalStructuredClone = globalThis.structuredClone;
    globalThis.structuredClone = (value: any) => value;

    try {
      const linkedFile = new File(['linked bytes'], 'linked.mp3', {
        type: 'audio/mpeg',
      });
      const handle = {
        kind: 'file',
        name: 'linked.mp3',
        getFile: vi.fn().mockResolvedValue(linkedFile),
      };
      await idbPutItem('files', {
        id: 'h1',
        name: 'linked.mp3',
        size: linkedFile.size,
        type: linkedFile.type,
        lastModified: 1,
        signature: 'linked',
        source: { kind: 'handle', handle },
        createdAt: 1,
        updatedAt: 1,
      } as any);

      const backup = await backupAllStores({ includeExternalFiles: true });
      const zip = await JSZip.loadAsync(backup);
      expect(zip.file('files/h1')).toBeTruthy();
      const manifest = JSON.parse(
        (await zip.file('manifest.json')!.async('string')) ?? '{}',
      );
      expect(manifest.includesExternalFiles).toBe(true);
      const files = JSON.parse(
        (await zip.file('files.json')!.async('string')) ?? '[]',
      );
      expect(files[0].source.kind).toBe('binary');
      expect(files[0].source.external).toBe(true);
    } finally {
      globalThis.structuredClone = originalStructuredClone;
    }
  });

  it('backs up and restores OPFS file bytes as OPFS sources', async () => {
    const opfs = installFakeOpfs();
    try {
      const blob = memoryBlob('opfs-data');
      const path = 'files/f2';
      await writeOpfsFile(path, blob);
      await idbPutItem('files', {
        id: 'f2',
        name: 'opfs.mp3',
        size: blob.size,
        type: blob.type,
        lastModified: 1,
        signature: '["opfs.mp3",9,1,"audio/mp3"]',
        source: { kind: 'opfs', path },
        createdAt: 1,
        updatedAt: 1,
      } as any);

      const backup = await backupAllStores();
      const zip = await JSZip.loadAsync(backup);
      expect(zip.file('files/f2')).toBeTruthy();
      expect(
        JSON.parse((await zip.file('files.json')!.async('string')) ?? '[]')[0]
          .source.kind,
      ).toBe('binary');

      await clearStore('files');
      await restoreAllStores(backup);

      const files = await idbGetAllItems<any>('files');
      expect(files[0].source.kind).toBe('opfs');
      const restored = await readOpfsFile(files[0].source.path);
      expect(await restored.text()).toBe('opfs-data');
    } finally {
      opfs.restore();
    }
  });

  it('restores legacy file stores into generic files', async () => {
    const zip = new JSZip();
    zip.file(
      'jukebox_files.json',
      JSON.stringify([
        {
          id: 'legacy-audio',
          name: 'old.mp3',
          size: 5,
          type: 'audio/mpeg',
          lastModified: 1,
          source: {
            kind: 'blob-data',
            type: 'audio/mpeg',
            data: btoa('audio'),
          },
          createdAt: 1,
          updatedAt: 1,
        },
      ]),
    );
    zip.file(
      'map_files.json',
      JSON.stringify([
        {
          id: 'legacy-map',
          name: 'old.png',
          size: 3,
          type: 'image/png',
          lastModified: 2,
          source: {
            kind: 'blob-data',
            type: 'image/png',
            data: btoa('map'),
          },
          imageMetadata: { width: 1, height: 1, aspectRatio: 1 },
          createdAt: 2,
          updatedAt: 2,
        },
      ]),
    );

    await restoreAllStores(await zip.generateAsync({ type: 'blob' }));

    const files = await idbGetAllItems<any>('files');
    expect(files.map((file) => file.id).sort()).toEqual([
      'legacy-audio',
      'legacy-map',
    ]);
    expect(files.every((file) => file.source.kind === 'blob')).toBe(true);
    expect(files.every((file) => typeof file.signature === 'string')).toBe(
      true,
    );
    expect(await idbGetAllItems<any>('map_image_metadata')).toEqual([
      expect.objectContaining({ id: 'legacy-map' }),
    ]);
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
