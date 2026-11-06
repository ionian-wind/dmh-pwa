import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  formatBytes,
  getStorageEstimate,
  isStoragePersisted,
  requestPersistentStorage,
} from '@/utils/files/persist';
import { getFileStorageDiagnostics } from '@/utils/files/diagnostics';
import { putStoredFile } from '@/utils/files/fileStorage';
import type { StoredFile } from '@/utils/files/types';
import { installFakeOpfs, type FakeOpfs } from '../helpers/fakeOpfs';

function record(
  id: string,
  source: StoredFile['source'],
  size = 10,
): StoredFile {
  return {
    id,
    name: `${id}.bin`,
    size,
    type: 'application/octet-stream',
    lastModified: 1,
    signature: id,
    source,
    createdAt: 1,
    updatedAt: 1,
  };
}

describe('storage diagnostics', () => {
  let opfs: FakeOpfs | null = null;

  afterEach(() => {
    opfs?.restore();
    opfs = null;
    vi.restoreAllMocks();
  });

  it('formats byte sizes', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1023)).toBe('1023 B');
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(10 * 1024 * 1024)).toBe('10 MB');
    expect(formatBytes(null)).toBe('—');
    expect(formatBytes(Number.NaN)).toBe('—');
  });

  it('handles an unavailable StorageManager', async () => {
    expect(await getStorageEstimate()).toEqual({
      supported: false,
      usage: null,
      quota: null,
    });
    expect(await isStoragePersisted()).toBe(false);
    expect(await requestPersistentStorage()).toBe(false);
  });

  it('reads estimates and requests persistence', async () => {
    opfs = installFakeOpfs();
    expect(await getStorageEstimate()).toEqual({
      supported: true,
      usage: 1024,
      quota: 10 * 1024,
    });
    expect(await isStoragePersisted()).toBe(false);
    expect(await requestPersistentStorage()).toBe(true);
  });

  it('summarises files by source kind', async () => {
    opfs = installFakeOpfs();
    await putStoredFile(
      record('blob', { kind: 'blob', blob: new Blob(['a']) }, 4),
    );
    await putStoredFile(
      record(
        'handle',
        { kind: 'handle', handle: {} as FileSystemFileHandle },
        6,
      ),
    );
    await putStoredFile(
      record('opfs', { kind: 'opfs', path: 'files/opfs' }, 8),
    );
    await putStoredFile(
      record('unavailable', { kind: 'unavailable' } as any, 2),
    );

    const diagnostics = await getFileStorageDiagnostics();

    expect(diagnostics.fileCount).toBe(4);
    expect(diagnostics.totalFileBytes).toBe(20);
    expect(diagnostics.byKind).toEqual({ blob: 1, handle: 1, opfs: 1 });
    expect(diagnostics.unavailableCount).toBe(1);
    expect(diagnostics.persisted).toBe(false);
    expect(diagnostics.supported).toBe(true);
  });

  it('handles a failing estimate call', async () => {
    opfs = installFakeOpfs();
    opfs.storage.estimate = vi.fn().mockRejectedValue(new Error('nope'));

    expect(await getStorageEstimate()).toEqual({
      supported: false,
      usage: null,
      quota: null,
    });
  });

  it('handles failing persistence calls', async () => {
    opfs = installFakeOpfs();
    opfs.storage.persisted = vi.fn().mockRejectedValue(new Error('nope'));
    opfs.storage.persist = vi.fn().mockRejectedValue(new Error('nope'));

    expect(await isStoragePersisted()).toBe(false);
    expect(await requestPersistentStorage()).toBe(false);
  });

  it('defaults missing estimate fields', async () => {
    opfs = installFakeOpfs();
    opfs.storage.estimate = vi.fn().mockResolvedValue({ quota: 100 } as any);
    expect(await getStorageEstimate()).toEqual({
      supported: true,
      usage: 0,
      quota: 100,
    });

    opfs.storage.estimate = vi.fn().mockResolvedValue({ usage: 5 } as any);
    expect(await getStorageEstimate()).toEqual({
      supported: true,
      usage: 5,
      quota: null,
    });
  });

  it('handles a missing navigator', async () => {
    vi.stubGlobal('navigator', undefined);
    try {
      expect(await getStorageEstimate()).toEqual({
        supported: false,
        usage: null,
        quota: null,
      });
      expect(await isStoragePersisted()).toBe(false);
      expect(await requestPersistentStorage()).toBe(false);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('treats zero-sized files as zero bytes', async () => {
    opfs = installFakeOpfs();
    await putStoredFile(
      record('zero', { kind: 'opfs', path: 'files/zero' }, 0),
    );

    const diagnostics = await getFileStorageDiagnostics();
    expect(diagnostics.totalFileBytes).toBe(0);
    expect(diagnostics.byKind.opfs).toBe(1);
  });
});
