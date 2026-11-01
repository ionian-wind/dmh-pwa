import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  extractTrackMetadata,
  getFileFromHandle,
  pickAudioFiles,
} from '@/utils/files/FileSystemUtils';

const originalCreateElement = document.createElement.bind(document);

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

function fakeAudio(duration = 123) {
  return {
    preload: '',
    src: '',
    duration,
    onloadedmetadata: null as null | (() => void),
    onerror: null as null | ((event: Event) => void),
  };
}

describe('FileSystemUtils', () => {
  beforeEach(() => {
    WorkerMock.instances = [];
    vi.stubGlobal('Worker', WorkerMock);
    (URL as any).createObjectURL = vi.fn(() => 'blob:mock-audio');
    (URL as any).revokeObjectURL = vi.fn();
    delete (window as any).showOpenFilePicker;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('opens the browser file picker and returns handles', async () => {
    const handle = { kind: 'file' };
    (window as any).showOpenFilePicker = vi.fn().mockResolvedValue([handle]);

    await expect(pickAudioFiles()).resolves.toEqual([handle]);
    expect((window as any).showOpenFilePicker).toHaveBeenCalledWith({
      multiple: true,
      types: [
        {
          description: 'Audio Files',
          accept: {
            'audio/*': ['.mp3', '.wav', '.ogg', '.flac', '.aac'],
          },
        },
      ],
      excludeAcceptAllOption: true,
    });
  });

  it('reads a file from a handle', async () => {
    const file = new File(['x'], 'song.mp3');
    const handle = {
      getFile: vi.fn().mockResolvedValue(file),
    } as unknown as FileSystemFileHandle;

    await expect(getFileFromHandle(handle)).resolves.toBe(file);
    expect(handle.getFile).toHaveBeenCalled();
  });

  it('extracts audio duration and worker metadata', async () => {
    const audio = fakeAudio(42);
    vi.spyOn(document, 'createElement').mockImplementation((tag) =>
      tag === 'audio' ? (audio as any) : originalCreateElement(tag),
    );

    const file = new File(['x'], 'song.mp3', { type: 'audio/mp3' });
    const promise = extractTrackMetadata(file);
    audio.onloadedmetadata?.();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(WorkerMock.instances).toHaveLength(1);
    const worker = WorkerMock.instances[0];
    expect(worker.postMessage).toHaveBeenCalledWith(file);
    expect(worker.options).toEqual({ type: 'module' });

    worker.onmessage?.({
      data: { type: 'success', metadata: { title: 'Song' } },
    } as MessageEvent);

    await expect(promise).resolves.toEqual({ title: 'Song', duration: 42 });
    expect(worker.terminate).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-audio');
  });

  it('rejects when audio metadata cannot be read', async () => {
    const audio = fakeAudio();
    vi.spyOn(document, 'createElement').mockImplementation((tag) =>
      tag === 'audio' ? (audio as any) : originalCreateElement(tag),
    );

    const promise = extractTrackMetadata(new File(['x'], 'bad.mp3'));
    const error = new Event('error');
    audio.onerror?.(error);

    await expect(promise).rejects.toBe(error);
  });

  it('resolves an empty object when the worker reports an error', async () => {
    const audio = fakeAudio();
    vi.spyOn(document, 'createElement').mockImplementation((tag) =>
      tag === 'audio' ? (audio as any) : originalCreateElement(tag),
    );

    const promise = extractTrackMetadata(new File(['x'], 'song.mp3'));
    audio.onloadedmetadata?.();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const worker = WorkerMock.instances[0];
    worker.onmessage?.({
      data: { type: 'error', error: 'invalid file' },
    } as MessageEvent);

    await expect(promise).resolves.toEqual({});
    expect(worker.terminate).toHaveBeenCalled();
  });

  it('resolves an empty object when the worker fails to load', async () => {
    const audio = fakeAudio();
    vi.spyOn(document, 'createElement').mockImplementation((tag) =>
      tag === 'audio' ? (audio as any) : originalCreateElement(tag),
    );

    const promise = extractTrackMetadata(new File(['x'], 'song.mp3'));
    audio.onloadedmetadata?.();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const worker = WorkerMock.instances[0];
    worker.onerror?.(new ErrorEvent('error', { message: 'worker failed' }));

    await expect(promise).resolves.toEqual({});
    expect(worker.terminate).toHaveBeenCalled();
  });
});
