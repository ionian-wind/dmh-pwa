import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildFileSignature,
  deleteStoredFile,
  findStoredFileBySignature,
  getAllStoredFiles,
  getStoredFile,
  getStoredFileBlob,
  getStoredFileUrl,
  importFile,
  importStoredFile,
  putStoredFile,
  revokeStoredFileUrl,
} from '@/utils/files/fileStorage';
import { OPFS_THRESHOLD_BYTES, readOpfsFile } from '@/utils/files/opfs';
import { installFakeOpfs } from '../helpers/fakeOpfs';
import {
  deleteFileIfUnreferenced,
  registerFileReferenceProvider,
} from '@/utils/files/fileReferences';
import type { StoredFile } from '@/utils/files/types';

function file(name = 'song.mp3', size = 5, lastModified = 123) {
  return new File([new Uint8Array(size)], name, {
    type: 'audio/mpeg',
    lastModified,
  });
}

function record(overrides: Partial<StoredFile> = {}): StoredFile {
  return {
    id: 'f1',
    name: 'song.mp3',
    size: 5,
    type: 'audio/mpeg',
    lastModified: 123,
    signature: buildFileSignature({
      name: 'song.mp3',
      size: 5,
      type: 'audio/mpeg',
      lastModified: 123,
    }),
    source: { kind: 'blob', blob: file() },
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

describe('generic file storage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('deduplicates files by metadata signature', async () => {
    const first = await importStoredFile(file(), {
      kind: 'blob',
      blob: file(),
    });
    const second = await importStoredFile(file(), {
      kind: 'blob',
      blob: file(),
    });

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.file.id).toBe(first.file.id);
    expect(await getAllStoredFiles()).toHaveLength(1);
  });

  it('creates a distinct record when file metadata differs', async () => {
    const first = await importStoredFile(file('one.mp3'), {
      kind: 'blob',
      blob: file('one.mp3'),
    });
    const second = await importStoredFile(file('two.mp3'), {
      kind: 'blob',
      blob: file('two.mp3'),
    });

    expect(second.created).toBe(true);
    expect(second.file.id).not.toBe(first.file.id);
    expect(await findStoredFileBySignature(first.file.signature)).toMatchObject(
      { id: first.file.id },
    );
  });

  it('reads blobs and object URLs from stored records', async () => {
    const stored = record();
    await putStoredFile(stored);
    (URL as any).createObjectURL = vi.fn(() => 'blob:file');
    (URL as any).revokeObjectURL = vi.fn();

    await expect(getStoredFile('f1')).resolves.toMatchObject({ id: 'f1' });
    await expect(getStoredFileBlob(stored)).resolves.toBeInstanceOf(Blob);
    await expect(getStoredFileUrl(stored)).resolves.toBe('blob:file');
    revokeStoredFileUrl('blob:file');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:file');
  });

  it('deletes files only when no provider references them', async () => {
    await putStoredFile(record());
    const unregister = registerFileReferenceProvider({
      id: 'test',
      isReferenced: (fileId) => fileId === 'f1',
    });

    await expect(deleteFileIfUnreferenced('f1')).resolves.toBe(false);
    expect(await getStoredFile('f1')).toBeTruthy();

    unregister();
    await expect(deleteFileIfUnreferenced('f1')).resolves.toBe(true);
    expect(await getStoredFile('f1')).toBeUndefined();
  });

  it('supports direct deletion and creation helpers', async () => {
    await putStoredFile(record({ id: 'f2' }));
    await deleteStoredFile('f2');
    expect(await getStoredFile('f2')).toBeUndefined();
  });

  it('reads handle-backed files', async () => {
    const handle = {
      getFile: vi.fn().mockResolvedValue(file('handle.mp3')),
    } as unknown as FileSystemFileHandle;
    const stored = record({
      source: { kind: 'handle', handle },
    });

    await expect(getStoredFileBlob(stored)).resolves.toBeInstanceOf(File);
    expect(handle.getFile).toHaveBeenCalled();
  });

  it('stores large fallback files in OPFS and deletes them with the record', async () => {
    const opfs = installFakeOpfs();
    try {
      const sourceFile = new File(['opfs bytes'], 'song.mp3', {
        type: 'audio/mpeg',
      });
      const imported = await importStoredFile(
        sourceFile,
        { kind: 'blob', blob: sourceFile },
        { storage: 'opfs' },
      );

      expect(imported.file.source.kind).toBe('opfs');
      const source = imported.file.source;
      if (source.kind !== 'opfs') throw new Error('expected OPFS source');
      expect(source.path).toBe(`files/${imported.file.id}`);
      await expect(getStoredFileBlob(imported.file)).resolves.toBeInstanceOf(
        Blob,
      );
      await expect(readOpfsFile(source.path)).resolves.toBeInstanceOf(File);

      await deleteStoredFile(imported.file.id);
      await expect(readOpfsFile(source.path)).rejects.toMatchObject({
        name: 'NotFoundError',
      });
    } finally {
      opfs.restore();
    }
  });

  it('keeps small blobs in IndexedDB and preserves handles', async () => {
    const opfs = installFakeOpfs();
    try {
      const sourceFile = file('small.mp3', 4, 10);
      const imported = await importFile(sourceFile);
      expect(imported.file.source.kind).toBe('blob');

      const handleFile = file('handled.mp3', 4, 11);
      const handle = {
        kind: 'file',
        name: 'handled.mp3',
      } as unknown as FileSystemFileHandle;
      const fromHandle = await importFile(handleFile, {
        source: { kind: 'handle', handle },
      });
      expect(fromHandle.created).toBe(true);
      expect(fromHandle.file.source.kind).toBe('handle');
    } finally {
      opfs.restore();
    }
  });

  it('throws when OPFS is requested but unavailable', async () => {
    const sourceFile = file('fail.mp3');
    await expect(
      importStoredFile(
        sourceFile,
        { kind: 'blob', blob: sourceFile },
        { storage: 'opfs' },
      ),
    ).rejects.toThrow('OPFS is not supported');
  });

  it('falls back to a blob when an automatic OPFS write fails', async () => {
    const opfs = installFakeOpfs();
    try {
      const filesDir = await opfs.root.getDirectoryHandle('files', {
        create: true,
      });
      filesDir.getFileHandle = vi
        .fn()
        .mockRejectedValue(new Error('write failed'));
      const big = file('big.mp3');
      Object.defineProperty(big, 'size', { value: OPFS_THRESHOLD_BYTES });

      const imported = await importStoredFile(
        big,
        { kind: 'blob', blob: big },
        { storage: 'auto' },
      );

      expect(imported.file.source.kind).toBe('blob');
    } finally {
      opfs.restore();
    }
  });

  it('keeps the record when an OPFS delete fails', async () => {
    const opfs = installFakeOpfs();
    try {
      await putStoredFile(
        record({
          id: 'opfs-delete',
          source: { kind: 'opfs', path: 'files/opfs-delete' },
        }),
      );
      opfs.root.getDirectoryHandle = vi
        .fn()
        .mockRejectedValue(new Error('delete failed'));

      await expect(deleteStoredFile('opfs-delete')).resolves.toBeUndefined();
      await expect(getStoredFile('opfs-delete')).resolves.toBeUndefined();
    } finally {
      opfs.restore();
    }
  });

  it('removes the OPFS write when the metadata write fails', async () => {
    const opfs = installFakeOpfs();
    try {
      const bad = new File(['x'], 'bad.mp3', { type: 'audio/mpeg' });
      Object.defineProperty(bad, 'name', { value: () => 'bad.mp3' });

      await expect(
        importStoredFile(bad, { kind: 'blob', blob: bad }, { storage: 'opfs' }),
      ).rejects.toBeInstanceOf(Error);

      const filesDir = await opfs.root.getDirectoryHandle('files');
      expect(filesDir.children.size).toBe(0);
    } finally {
      opfs.restore();
    }
  });
});
