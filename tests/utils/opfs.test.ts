import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  OPFS_THRESHOLD_BYTES,
  clearOpfsData,
  clearOpfsFiles,
  deleteOpfsFile,
  listOpfsFiles,
  readOpfsFile,
  supportsOpfs,
  writeOpfsFile,
} from '@/utils/files/opfs';
import { installFakeOpfs, type FakeOpfs } from '../helpers/fakeOpfs';

describe('OPFS adapter', () => {
  let opfs: FakeOpfs | null = null;

  beforeEach(() => {
    opfs = installFakeOpfs();
  });

  afterEach(() => {
    opfs?.restore();
    opfs = null;
    vi.restoreAllMocks();
  });

  it('detects support and writes/reads a nested file', async () => {
    expect(supportsOpfs()).toBe(true);
    const progress: number[] = [];
    const blob = new Blob(['hello opfs'], { type: 'text/plain' });

    await writeOpfsFile('files/f1', blob, {
      chunkSize: 3,
      onProgress: (value) => progress.push(value.percent),
    });

    const file = await readOpfsFile('files/f1');
    expect(await file.text()).toBe('hello opfs');
    expect(progress.at(-1)).toBe(100);
    expect(OPFS_THRESHOLD_BYTES).toBeGreaterThan(0);
  });

  it('lists and deletes files, and ignores missing entries', async () => {
    await writeOpfsFile('files/a', new Blob(['a']));
    await writeOpfsFile('files/b', new Blob(['bb'], { type: 'text/plain' }));
    const filesDir = await opfs!.root.getDirectoryHandle('files');
    await filesDir.getDirectoryHandle('nested', { create: true });

    const files = await listOpfsFiles('files');
    expect(files.map((file) => file.path).sort()).toEqual([
      'files/a',
      'files/b',
    ]);
    expect(files.find((file) => file.name === 'b')?.size).toBe(2);

    await deleteOpfsFile('files/a');
    await expect(readOpfsFile('files/a')).rejects.toMatchObject({
      name: 'NotFoundError',
    });
    await expect(deleteOpfsFile('files/a')).resolves.toBeUndefined();
  });

  it('rejects empty paths', async () => {
    await expect(writeOpfsFile('', new Blob(['x']))).rejects.toThrow(
      'Invalid OPFS path',
    );
  });

  it('aborts a write and clears app files/data', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      writeOpfsFile('files/aborted', new Blob(['x']), {
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: 'AbortError' });

    await writeOpfsFile('files/keep', new Blob(['keep']));
    await writeOpfsFile('other/data', new Blob(['other']));

    await clearOpfsFiles();
    await expect(readOpfsFile('files/keep')).rejects.toMatchObject({
      name: 'NotFoundError',
    });
    await expect(readOpfsFile('other/data')).resolves.toBeInstanceOf(File);

    await clearOpfsData();
    await expect(readOpfsFile('other/data')).rejects.toMatchObject({
      name: 'NotFoundError',
    });
  });

  it('is a no-op when OPFS is unavailable', async () => {
    opfs?.restore();
    opfs = null;

    expect(supportsOpfs()).toBe(false);
    await expect(clearOpfsFiles()).resolves.toBeUndefined();
    await expect(clearOpfsData()).resolves.toBeUndefined();
    await expect(writeOpfsFile('files/x', new Blob(['x']))).rejects.toThrow(
      'OPFS is not supported',
    );
  });

  it('surfaces non-not-found delete errors and swallows clear errors', async () => {
    await writeOpfsFile('files/x', new Blob(['x']));
    const filesDir = await opfs!.root.getDirectoryHandle('files');
    filesDir.removeEntry = vi
      .fn()
      .mockRejectedValue(new DOMException('nope', 'InvalidStateError'));

    await expect(deleteOpfsFile('files/x')).rejects.toMatchObject({
      name: 'InvalidStateError',
    });

    opfs!.root.removeEntry = vi
      .fn()
      .mockRejectedValue(new DOMException('nope', 'InvalidStateError'));
    await expect(clearOpfsFiles()).resolves.toBeUndefined();
    await expect(clearOpfsData()).resolves.toBeUndefined();

    opfs!.root.removeEntry = vi
      .fn()
      .mockRejectedValue(new DOMException('missing', 'NotFoundError'));
    await expect(clearOpfsFiles()).resolves.toBeUndefined();
  });
});
