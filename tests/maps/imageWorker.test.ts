import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  extractImageMetadata,
  extractImageMetadataFromUrl,
} from '@/maps/utils/imageWorker';

class WorkerMock {
  static instances: WorkerMock[] = [];
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();

  constructor(
    public url: URL,
    public options: WorkerOptions,
  ) {
    WorkerMock.instances.push(this);
  }
}

const metadata = {
  width: 100,
  height: 50,
  aspectRatio: 2,
};

describe('map image worker helpers', () => {
  beforeEach(() => {
    WorkerMock.instances = [];
    vi.stubGlobal('Worker', WorkerMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('extracts metadata from a File through the worker', async () => {
    const file = new File(['image'], 'map.png', { type: 'image/png' });
    const promise = extractImageMetadata(file);
    const worker = WorkerMock.instances[0];

    expect(worker.options).toEqual({ type: 'module' });
    expect(worker.postMessage).toHaveBeenCalledWith(file);

    worker.onmessage?.({ data: { type: 'success', metadata } } as MessageEvent);
    await expect(promise).resolves.toEqual(metadata);
    expect(worker.terminate).toHaveBeenCalled();
  });

  it('extracts metadata from a URL through the worker', async () => {
    const promise = extractImageMetadataFromUrl('https://example.com/map.png');
    const worker = WorkerMock.instances[0];

    expect(worker.postMessage).toHaveBeenCalledWith(
      'https://example.com/map.png',
    );
    worker.onmessage?.({ data: { type: 'success', metadata } } as MessageEvent);

    await expect(promise).resolves.toEqual(metadata);
  });

  it('rejects worker errors and load failures', async () => {
    const first = extractImageMetadata(new File(['x'], 'bad.png'));
    WorkerMock.instances[0].onmessage?.({
      data: { type: 'error', error: 'bad image' },
    } as MessageEvent);
    await expect(first).rejects.toThrow('bad image');

    const second = extractImageMetadataFromUrl('https://bad');
    WorkerMock.instances[1].onerror?.(
      new ErrorEvent('error', { message: 'worker failed' }),
    );
    await expect(second).rejects.toBeInstanceOf(ErrorEvent);
  });
});
