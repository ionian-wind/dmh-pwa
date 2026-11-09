import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import JSZip from 'jszip';

import {
  backupAllStores,
  idbGetAllItems,
  idbPutItem,
  idbPutItems,
  resetStoreCache,
  restoreAllStores,
  useMentionsStore,
  useStore,
} from '@/utils/storage';
import { registerValidationSchema } from '@/utils/schemaValidator';
import { installFakeOpfs } from '../helpers/fakeOpfs';

async function deleteDatabase() {
  await resetStoreCache();
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase('dmh-db');
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}

function fileRecord(id: string, overrides: Record<string, any> = {}) {
  return {
    id,
    name: `${id}.bin`,
    size: 1,
    type: 'application/octet-stream',
    lastModified: 1,
    signature: id,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

async function jsonEntry(zip: JSZip, name: string) {
  return JSON.parse(await zip.file(name)!.async('string'));
}

describe('storage branch coverage', () => {
  beforeEach(async () => {
    await deleteDatabase();
    setActivePinia(createPinia());
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('validates bulk writes, including empty and non-validated stores', async () => {
    await expect(
      idbPutItems('bookmarks', [{ id: 'raw' } as any]),
    ).resolves.toBeUndefined();

    registerValidationSchema('bookmarks', {
      type: 'object',
      required: ['name'],
      properties: { name: { type: 'string' } },
    });

    await expect(idbPutItems('bookmarks', [])).resolves.toBeUndefined();
    await expect(
      idbPutItems('bookmarks', [
        { id: 'a', name: 'one' },
        { id: 'b', name: 'two' },
      ]),
    ).resolves.toBeUndefined();
    await expect(idbPutItems('bookmarks', [{ id: 'bad' }])).rejects.toThrow(
      "Validation failed for store 'bookmarks'",
    );
  });

  it('captures load errors and keeps the store unloaded', async () => {
    const store = useStore<any>({ storeName: 'coverage-not-in-schema' });

    await expect(store.load()).rejects.toBeInstanceOf(Error);
    expect(store.error.value).toBeInstanceOf(Error);
    expect(store.isLoaded.value).toBe(false);
  });

  it('registers a supplied validation schema and reuses cached stores', async () => {
    const options = {
      storeName: 'noteTypes',
      validationSchema: {
        type: 'object',
        required: ['name'],
        properties: { name: { type: 'string' } },
      },
    };
    const store = useStore<any>(options);
    expect(useStore<any>(options)).toBe(store);

    await expect(store.create({ name: 'valid' } as any)).resolves.toMatchObject(
      { name: 'valid' },
    );
    await expect(store.create({} as any)).rejects.toThrow(
      "Validation failed for store 'noteTypes'",
    );
  });

  it('clears the current item when it is removed', async () => {
    const store = useStore<any>({ storeName: 'timers' });
    const first = await store.create({ title: 'First' } as any);
    const second = await store.create({ title: 'Second' } as any);

    expect(store.current.value).toBeNull();
    store.setCurrentId('missing');
    expect(store.current.value).toBeNull();

    store.setCurrentId(first.id);
    await store.remove(second.id);
    expect(store.current.value?.id).toBe(first.id);

    await store.remove(first.id);
    expect(store.current.value).toBeNull();
    expect(store.error.value).toBeNull();
  });

  it('reports no backlinks for unrelated targets', async () => {
    const mentions = useMentionsStore();
    await mentions.load();
    await mentions.addLink(
      { kind: 'note', id: 'n1' },
      { kind: 'party', id: 'p1' },
    );

    expect(mentions.getBacklinks({ kind: 'note', id: 'other' })).toEqual([]);
    expect(mentions.getBacklinks({ kind: 'party', id: 'p1' })).toEqual([
      { kind: 'note', id: 'n1' },
    ]);
  });

  it('serializes files with missing, invalid, denied and unreadable sources', async () => {
    const originalStructuredClone = globalThis.structuredClone;
    globalThis.structuredClone = (value: any) => value;

    try {
      const handle = {
        getFile: vi.fn().mockRejectedValue(new Error('permission denied')),
      };
      await idbPutItem('files', fileRecord('no-source', { source: undefined }));
      await idbPutItem(
        'files',
        fileRecord('invalid-blob', {
          source: { kind: 'blob', blob: { not: 'a blob' } },
        }),
      );
      await idbPutItem(
        'files',
        fileRecord('missing-opfs', {
          source: { kind: 'opfs', path: 'files/missing' },
        }),
      );
      await idbPutItem(
        'files',
        fileRecord('denied-handle', {
          source: { kind: 'handle', handle },
        }),
      );

      const withoutExternal = await JSZip.loadAsync(await backupAllStores());
      const plain = await jsonEntry(withoutExternal, 'files.json');
      const byId = Object.fromEntries(
        plain.map((item: any) => [item.id, item]),
      );

      expect(byId['no-source'].source).toBeUndefined();
      expect(byId['invalid-blob'].source).toEqual({
        kind: 'blob',
        blob: { not: 'a blob' },
      });
      expect(byId['missing-opfs'].source).toEqual({
        kind: 'unavailable',
        reason: 'OPFS file is missing',
      });
      expect(byId['denied-handle'].source).toEqual({
        kind: 'unavailable',
        reason: 'FileSystemFileHandle cannot be serialized',
      });
      expect(handle.getFile).not.toHaveBeenCalled();

      const withExternal = await JSZip.loadAsync(
        await backupAllStores({ includeExternalFiles: true }),
      );
      const external = await jsonEntry(withExternal, 'files.json');
      const denied = external.find((item: any) => item.id === 'denied-handle');
      expect(denied.source).toEqual({
        kind: 'unavailable',
        reason: 'FileSystemFileHandle cannot be serialized',
      });
      expect(handle.getFile).toHaveBeenCalled();
    } finally {
      globalThis.structuredClone = originalStructuredClone;
    }
  });

  it('deserializes files.json blob-data and binary entries', async () => {
    const originalStructuredClone = globalThis.structuredClone;
    globalThis.structuredClone = (value: any) => value;

    try {
      const zip = new JSZip();
      zip.file('files/existing', 'payload');
      zip.file(
        'files.json',
        JSON.stringify([
          fileRecord('typed', {
            source: {
              kind: 'blob-data',
              type: 'text/plain',
              data: btoa('hello'),
            },
          }),
          fileRecord('untyped', {
            source: { kind: 'blob-data', data: btoa('world') },
          }),
          fileRecord('missing-entry', {
            source: { kind: 'binary', entry: 'files/nope', type: 'text/plain' },
          }),
          fileRecord('no-entry', { source: { kind: 'binary' } }),
          fileRecord('existing-entry', {
            source: {
              kind: 'binary',
              entry: 'files/existing',
              type: 'text/plain',
            },
          }),
          fileRecord('unknown-source', { source: { kind: 'weird' } }),
        ]),
      );

      await restoreAllStores(await zip.generateAsync({ type: 'blob' }));

      const files = await idbGetAllItems<any>('files');
      const byId = Object.fromEntries(files.map((item) => [item.id, item]));

      expect(byId.typed.source.kind).toBe('blob');
      expect(byId.typed.source.blob.type).toBe('text/plain');
      expect(await byId.typed.source.blob.text()).toBe('hello');
      expect(byId.untyped.source.blob.type).toBe('application/octet-stream');
      expect(byId.untyped.source.blob.size).toBeGreaterThan(0);
      expect(byId['missing-entry'].source).toEqual({
        kind: 'unavailable',
        reason: 'Backup file entry is missing',
      });
      expect(byId['no-entry'].source).toEqual({ kind: 'binary' });
      expect(byId['existing-entry'].source.kind).toBe('blob');
      expect(await byId['existing-entry'].source.blob.text()).toBe('payload');
      expect(byId['unknown-source'].source).toEqual({ kind: 'weird' });
    } finally {
      globalThis.structuredClone = originalStructuredClone;
    }
  });

  it('falls back to a blob when OPFS restore fails', async () => {
    const opfs = installFakeOpfs();
    const originalStructuredClone = globalThis.structuredClone;
    globalThis.structuredClone = (value: any) => value;

    try {
      const zip = new JSZip();
      zip.file('files/restore-me', 'bytes');
      zip.file(
        'files.json',
        JSON.stringify([
          fileRecord('restore-me', {
            source: {
              kind: 'binary',
              entry: 'files/restore-me',
              type: 'text/plain',
            },
          }),
        ]),
      );
      const originalGetDirectory = opfs.root.getDirectoryHandle.bind(opfs.root);
      opfs.root.getDirectoryHandle = vi.fn(
        async (name: string, options?: { create?: boolean }) => {
          const directory = await originalGetDirectory(name, options);
          if (name === 'files') {
            directory.getFileHandle = vi
              .fn()
              .mockRejectedValue(new Error('write failed'));
          }
          return directory;
        },
      );

      await restoreAllStores(await zip.generateAsync({ type: 'blob' }));

      const files = await idbGetAllItems<any>('files');
      expect(files[0].source.kind).toBe('blob');
      expect(await files[0].source.blob.text()).toBe('bytes');
    } finally {
      globalThis.structuredClone = originalStructuredClone;
      opfs.restore();
    }
  });

  it('restores legacy files while skipping unreadable records', async () => {
    const originalStructuredClone = globalThis.structuredClone;
    globalThis.structuredClone = (value: any) => value;
    const zip = new JSZip();
    zip.file(
      'jukebox_files.json',
      JSON.stringify([
        { name: 'missing-id', source: { kind: 'opfs', path: 'files/a' } },
        { id: 'no-source', name: 'no-source' },
        {
          id: 'invalid-blob',
          name: 'invalid-blob',
          source: { kind: 'blob', blob: {} },
        },
        {
          id: 'unknown-source',
          name: 'unknown-source',
          source: { kind: 'weird' },
        },
        {
          id: 'handle-legacy',
          source: { kind: 'handle' },
        },
        {
          id: 'opfs-legacy',
          source: { kind: 'opfs', path: 'files/opfs-legacy' },
          imageMetadata: { width: 10, height: 20 },
        },
        {
          id: 'legacy-no-type',
          source: { kind: 'blob-data', data: btoa('typed later') },
        },
      ]),
    );
    zip.file('map_files.json', '{broken');

    try {
      await restoreAllStores(await zip.generateAsync({ type: 'blob' }));

      const files = await idbGetAllItems<any>('files');
      const byId = Object.fromEntries(files.map((item) => [item.id, item]));

      expect(Object.keys(byId).sort()).toEqual([
        'handle-legacy',
        'legacy-no-type',
        'opfs-legacy',
      ]);
      expect(byId['handle-legacy']).toMatchObject({
        name: '',
        size: 0,
        type: '',
        lastModified: 0,
      });
      expect(typeof byId['handle-legacy'].signature).toBe('string');
      expect(byId['legacy-no-type'].source.blob.type).toBe(
        'application/octet-stream',
      );

      const metadata = await idbGetAllItems<any>('map_image_metadata');
      expect(metadata).toEqual([
        expect.objectContaining({
          id: 'opfs-legacy',
          imageMetadata: { width: 10, height: 20 },
        }),
      ]);
    } finally {
      globalThis.structuredClone = originalStructuredClone;
    }
  });

  it('rejects invalid and newer backup manifests', async () => {
    const invalid = new JSZip();
    invalid.file('manifest.json', '{broken');
    await expect(
      restoreAllStores(await invalid.generateAsync({ type: 'blob' })),
    ).rejects.toThrow('Invalid backup manifest');

    const unsupported = new JSZip();
    unsupported.file(
      'manifest.json',
      JSON.stringify({ format: 'other', version: 1 }),
    );
    await expect(
      restoreAllStores(await unsupported.generateAsync({ type: 'blob' })),
    ).rejects.toThrow('Unsupported backup format');

    const newer = new JSZip();
    newer.file(
      'manifest.json',
      JSON.stringify({ format: 'dmh.backup', version: 999 }),
    );
    await expect(
      restoreAllStores(await newer.generateAsync({ type: 'blob' })),
    ).rejects.toThrow('Backup was created by a newer app version');

    const valid = new JSZip();
    valid.file(
      'manifest.json',
      JSON.stringify({
        format: 'dmh.backup',
        version: 1,
        createdAt: new Date().toISOString(),
      }),
    );
    await expect(
      restoreAllStores(await valid.generateAsync({ type: 'blob' })),
    ).resolves.toBeUndefined();
  });
});
