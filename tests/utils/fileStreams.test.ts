import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { copyBlob } from '@/utils/files/streams';
import { createObjectUrlHandle } from '@/utils/files/objectUrls';

describe('file stream helpers', () => {
  beforeEach(() => {
    (URL as any).createObjectURL = vi.fn(() => 'blob:handle');
    (URL as any).revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('copies a blob in chunks and reports progress', async () => {
    const parts: string[] = [];
    const percentages: number[] = [];

    await copyBlob(
      new Blob(['abcdef']),
      async (chunk) => {
        parts.push(await new Blob([chunk]).text());
      },
      {
        chunkSize: 2,
        onProgress: (progress) => percentages.push(progress.percent),
      },
    );

    expect(parts.join('')).toBe('abcdef');
    expect(percentages.at(-1)).toBe(100);
  });

  it('supports a blob without a stream method', async () => {
    const blob = new Blob(['abcd']);
    Object.defineProperty(blob, 'stream', { value: undefined });
    const parts: string[] = [];

    await copyBlob(
      blob,
      async (chunk) => {
        parts.push(await new Blob([chunk]).text());
      },
      { chunkSize: 2 },
    );

    expect(parts.join('')).toBe('abcd');
  });

  it('streams a blob with a ReadableStream', async () => {
    const blob = {
      size: 4,
      stream: () =>
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('ab'));
            controller.enqueue(new TextEncoder().encode('cd'));
            controller.close();
          },
        }),
    } as unknown as Blob;
    const parts: string[] = [];
    const percentages: number[] = [];

    await copyBlob(
      blob,
      async (chunk) => {
        parts.push(new TextDecoder().decode(chunk));
      },
      { onProgress: (progress) => percentages.push(progress.percent) },
    );

    expect(parts.join('')).toBe('abcd');
    expect(percentages).toEqual([50, 100]);
  });

  it('reports 100% for an empty streamed chunk', async () => {
    const blob = {
      size: 0,
      stream: () =>
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(new Uint8Array(0));
            controller.close();
          },
        }),
    } as unknown as Blob;
    const percentages: number[] = [];

    await copyBlob(blob, () => undefined, {
      onProgress: (progress) => percentages.push(progress.percent),
    });

    expect(percentages).toEqual([100]);
  });

  it('aborts the array-buffer fallback mid-copy', async () => {
    const blob = new Blob(['abcdef']);
    Object.defineProperty(blob, 'stream', { value: undefined });
    const controller = new AbortController();

    await expect(
      copyBlob(
        blob,
        () => {
          controller.abort();
        },
        { chunkSize: 2, signal: controller.signal },
      ),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('aborts before and during a copy', async () => {
    const before = new AbortController();
    before.abort();
    await expect(
      copyBlob(new Blob(['x']), () => undefined, { signal: before.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });

    const during = new AbortController();
    const sink = vi.fn(async () => during.abort());
    await expect(
      copyBlob(new Blob(['abcdef']), sink, {
        chunkSize: 2,
        signal: during.signal,
      }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(sink).toHaveBeenCalled();
  });

  it('revokes an object URL only once', () => {
    const blob = new Blob(['x']);
    const handle = createObjectUrlHandle(blob);

    expect(handle.url).toBe('blob:handle');
    handle.revoke();
    handle.revoke();
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
  });
});
