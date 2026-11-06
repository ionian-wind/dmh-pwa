import type { FileProgress } from './types';

export interface CopyBlobOptions {
  chunkSize?: number;
  signal?: AbortSignal;
  onProgress?: (progress: FileProgress) => void;
}

function abortError(): DOMException {
  return new DOMException('Aborted', 'AbortError');
}

/**
 * Copy a Blob to a sink in chunks so large files never have to be fully
 * buffered. The sink is awaited before the next chunk is read.
 */
export async function copyBlob(
  blob: Blob,
  sink: (chunk: Uint8Array) => Promise<void> | void,
  options: CopyBlobOptions = {},
): Promise<void> {
  const chunkSize = options.chunkSize ?? 4 * 1024 * 1024;

  if (options.signal?.aborted) throw abortError();

  if (typeof blob.stream !== 'function') {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      if (options.signal?.aborted) throw abortError();
      const chunk = bytes.subarray(offset, offset + chunkSize);
      await sink(chunk);
      options.onProgress?.({
        loaded: Math.min(offset + chunk.byteLength, bytes.length),
        total: bytes.length,
        percent: Math.round(
          (Math.min(offset + chunk.byteLength, bytes.length) / bytes.length) *
            100,
        ),
      });
    }
    return;
  }

  const reader = blob.stream().getReader();
  let loaded = 0;

  try {
    for (;;) {
      if (options.signal?.aborted) throw abortError();
      const { done, value } = await reader.read();
      if (done) break;
      loaded += value.byteLength;
      await sink(value);
      options.onProgress?.({
        loaded,
        total: blob.size,
        percent: blob.size === 0 ? 100 : Math.round((loaded / blob.size) * 100),
      });
    }
  } finally {
    reader.releaseLock();
  }
}
