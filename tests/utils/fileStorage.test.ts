import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildFileSignature,
  deleteStoredFile,
  findStoredFileBySignature,
  getAllStoredFiles,
  getStoredFile,
  getStoredFileBlob,
  getStoredFileUrl,
  importStoredFile,
  putStoredFile,
  revokeStoredFileUrl,
} from '@/utils/files/fileStorage';
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
});
