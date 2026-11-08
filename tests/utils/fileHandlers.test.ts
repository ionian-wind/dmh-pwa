import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  canUseDirectoryPicker,
  canUseFileSystemAccess,
  getFileFromSource,
  getPickedFileFromDataTransferItem,
  getUrlFromSource,
  pickDirectory,
  pickFiles,
  revokeSourceUrl,
  verifySourcePermission,
} from '@/utils/files';

const originalCreateElement = document.createElement.bind(document);

function fakeInput() {
  return {
    type: '',
    multiple: false,
    accept: '',
    files: null as FileList | null,
    click: vi.fn(),
    addEventListener: vi.fn(),
    onchange: null as null | (() => void),
  };
}

describe('generic file API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (window as any).showOpenFilePicker;
    delete (window as any).showDirectoryPicker;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (window as any).showOpenFilePicker;
    delete (window as any).showDirectoryPicker;
  });

  it('picks handles when the File System Access API is available', async () => {
    const file = new File(['x'], 'song.mp3', { type: 'audio/mpeg' });
    const handle = {
      kind: 'file',
      getFile: vi.fn().mockResolvedValue(file),
    } as unknown as FileSystemFileHandle;
    (window as any).showOpenFilePicker = vi.fn().mockResolvedValue([handle]);

    await expect(
      pickFiles({
        multiple: true,
        description: 'Audio Files',
        accept: { 'audio/*': ['.mp3'] },
        acceptAttribute: 'audio/*,.mp3',
      }),
    ).resolves.toEqual([{ file, source: { kind: 'handle', handle } }]);
    expect((window as any).showOpenFilePicker).toHaveBeenCalledWith({
      multiple: true,
      types: [{ description: 'Audio Files', accept: { 'audio/*': ['.mp3'] } }],
      excludeAcceptAllOption: true,
    });
  });

  it('falls back to the input picker when the API is unavailable', async () => {
    const input = fakeInput();
    vi.spyOn(document, 'createElement').mockImplementation((tag) =>
      tag === 'input' ? (input as any) : originalCreateElement(tag),
    );
    const promise = pickFiles({
      multiple: true,
      acceptAttribute: 'audio/*',
    });
    const file = new File(['x'], 'song.mp3', { type: 'audio/mpeg' });
    input.files = [file] as unknown as FileList;
    input.onchange?.();

    await expect(promise).resolves.toEqual([
      { file, source: { kind: 'blob', blob: file } },
    ]);
    expect(input.click).toHaveBeenCalled();
    expect(input.accept).toBe('audio/*');
  });

  it('returns empty when the picker is aborted', async () => {
    (window as any).showOpenFilePicker = vi
      .fn()
      .mockRejectedValueOnce({ name: 'AbortError' });
    await expect(pickFiles()).resolves.toEqual([]);
  });

  it('falls back to the input picker when the API fails', async () => {
    (window as any).showOpenFilePicker = vi
      .fn()
      .mockRejectedValueOnce(new Error('unsupported'));
    const input = fakeInput();
    vi.spyOn(document, 'createElement').mockImplementation((tag) =>
      tag === 'input' ? (input as any) : originalCreateElement(tag),
    );
    const promise = pickFiles();
    await new Promise((resolve) => setTimeout(resolve, 0));
    input.files = [] as unknown as FileList;
    input.onchange?.();
    await expect(promise).resolves.toEqual([]);
  });

  it('builds the accept attribute and resolves cancelled inputs', async () => {
    const input = fakeInput();
    vi.spyOn(document, 'createElement').mockImplementation((tag) =>
      tag === 'input' ? (input as any) : originalCreateElement(tag),
    );
    const promise = pickFiles({ accept: { 'audio/*': ['.mp3'] } });
    expect(input.accept).toContain('audio/*');
    expect(input.accept).toContain('.mp3');
    input.files = null;
    input.onchange?.();
    await expect(promise).resolves.toEqual([]);
  });

  it('resolves empty when focus returns without a selection', async () => {
    vi.useFakeTimers();
    const input = fakeInput();
    vi.spyOn(document, 'createElement').mockImplementation((tag) =>
      tag === 'input' ? (input as any) : originalCreateElement(tag),
    );
    const promise = pickFiles();
    window.dispatchEvent(new Event('focus'));
    await vi.advanceTimersByTimeAsync(500);
    await expect(promise).resolves.toEqual([]);
    vi.useRealTimers();
  });

  it('reports API support and resolves data-transfer items', async () => {
    expect(canUseFileSystemAccess()).toBe(false);
    (window as any).showOpenFilePicker = vi.fn();
    expect(canUseFileSystemAccess()).toBe(true);

    const file = new File(['x'], 'song.mp3');
    const handle = {
      kind: 'file',
      getFile: vi.fn().mockResolvedValue(file),
    };
    await expect(
      getPickedFileFromDataTransferItem({
        kind: 'file',
        getAsFileSystemHandle: vi.fn().mockResolvedValue(handle),
        getAsFile: vi.fn(),
      } as any),
    ).resolves.toEqual({ file, source: { kind: 'handle', handle } });

    await expect(
      getPickedFileFromDataTransferItem({
        kind: 'file',
        getAsFileSystemHandle: vi.fn().mockResolvedValue(null),
        getAsFile: () => file,
      } as any),
    ).resolves.toEqual({ file, source: { kind: 'blob', blob: file } });

    await expect(
      getPickedFileFromDataTransferItem({
        kind: 'file',
        getAsFileSystemHandle: vi.fn().mockRejectedValue(new Error('no')),
        getAsFile: () => null,
      } as any),
    ).resolves.toBeNull();
  });

  it('picks directory files recursively as handles', async () => {
    const image = new File(['x'], 'map.png', { type: 'image/png' });
    const untypedImage = new File(['x'], 'photo.png');
    const text = new File(['x'], 'notes.txt', { type: 'text/plain' });
    const imageHandle = {
      kind: 'file',
      getFile: vi.fn().mockResolvedValue(image),
    };
    const untypedImageHandle = {
      kind: 'file',
      getFile: vi.fn().mockResolvedValue(untypedImage),
    };
    const textHandle = {
      kind: 'file',
      getFile: vi.fn().mockResolvedValue(text),
    };
    const nestedDirectory = {
      kind: 'directory',
      async *values() {
        yield imageHandle;
        yield untypedImageHandle;
      },
    };
    const root = {
      kind: 'directory',
      async *values() {
        yield textHandle;
        yield nestedDirectory;
      },
    };
    (window as any).showDirectoryPicker = vi.fn().mockResolvedValue(root);
    const onProgress = vi.fn();

    expect(canUseDirectoryPicker()).toBe(true);
    await expect(
      pickDirectory({
        accept: { 'image/*': ['.png'] },
        recursive: true,
        onProgress,
      }),
    ).resolves.toEqual([
      { file: image, source: { kind: 'handle', handle: imageHandle } },
      {
        file: untypedImage,
        source: { kind: 'handle', handle: untypedImageHandle },
      },
    ]);
    expect(onProgress).toHaveBeenCalledWith(image, 1, 2);
    expect(onProgress).toHaveBeenLastCalledWith(untypedImage, 2, 2);
  });

  it('stops collecting when the directory signal is aborted', async () => {
    const root = {
      kind: 'directory',
      async *values() {
        yield {
          kind: 'file',
          getFile: vi.fn(),
        };
      },
    };
    (window as any).showDirectoryPicker = vi.fn().mockResolvedValue(root);
    const controller = new AbortController();
    controller.abort();

    await expect(pickDirectory({ signal: controller.signal })).resolves.toEqual(
      [],
    );
  });

  it('matches exact MIME types and skips nested folders without recursion', async () => {
    const text = new File(['x'], 'note.txt', { type: 'text/plain' });
    const textHandle = {
      kind: 'file',
      getFile: vi.fn().mockResolvedValue(text),
    };
    const nestedFile = new File(['x'], 'nested.png', { type: 'image/png' });
    const nestedDirectory = {
      kind: 'directory',
      async *values() {
        yield {
          kind: 'file',
          getFile: vi.fn().mockResolvedValue(nestedFile),
        };
      },
    };
    const root = {
      kind: 'directory',
      async *values() {
        yield textHandle;
        yield nestedDirectory;
      },
    };
    (window as any).showDirectoryPicker = vi.fn().mockResolvedValue(root);

    await expect(
      pickDirectory({ accept: { 'text/plain': [] } }),
    ).resolves.toEqual([
      { file: text, source: { kind: 'handle', handle: textHandle } },
    ]);

    await expect(pickDirectory()).resolves.toEqual([
      { file: text, source: { kind: 'handle', handle: textHandle } },
    ]);
  });

  it('returns empty when the directory picker is aborted', async () => {
    (window as any).showDirectoryPicker = vi
      .fn()
      .mockRejectedValue({ name: 'AbortError' });

    await expect(pickDirectory()).resolves.toEqual([]);
  });

  it('falls back to a webkitdirectory input', async () => {
    const input = { ...fakeInput(), webkitdirectory: false };
    vi.spyOn(document, 'createElement').mockImplementation((tag) =>
      tag === 'input' ? (input as any) : originalCreateElement(tag),
    );
    const promise = pickDirectory({ acceptAttribute: 'image/*' });
    const file = new File(['x'], 'map.png', { type: 'image/png' });
    input.files = [file] as unknown as FileList;
    input.onchange?.();

    await expect(promise).resolves.toEqual([
      { file, source: { kind: 'blob', blob: file } },
    ]);
    expect(input.webkitdirectory).toBe(true);
    expect(input.multiple).toBe(true);
  });

  it('reads sources and checks handle permissions', async () => {
    const file = new File(['x'], 'song.mp3');
    const handle = {
      kind: 'file',
      getFile: vi.fn().mockResolvedValue(file),
      queryPermission: vi.fn().mockResolvedValue('granted'),
    } as any;

    await expect(getFileFromSource({ kind: 'handle', handle })).resolves.toBe(
      file,
    );
    const blob = new Blob(['blob'], { type: 'text/plain' });
    const reconstructed = await getFileFromSource({ kind: 'blob', blob });
    expect(reconstructed.name).toBe('unnamed');
    (URL as any).createObjectURL = vi.fn(() => 'blob:source');
    (URL as any).revokeObjectURL = vi.fn();
    await expect(getUrlFromSource({ kind: 'blob', blob })).resolves.toBe(
      'blob:source',
    );
    revokeSourceUrl('blob:source');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:source');
    await expect(
      verifySourcePermission({ kind: 'handle', handle }),
    ).resolves.toBe(true);
    await expect(
      verifySourcePermission({ kind: 'blob', blob: new Blob() }),
    ).resolves.toBe(true);

    const promptHandle = {
      queryPermission: vi.fn().mockResolvedValue('prompt'),
      requestPermission: vi.fn().mockResolvedValue('granted'),
    } as any;
    await expect(
      verifySourcePermission({ kind: 'handle', handle: promptHandle }),
    ).resolves.toBe(true);

    const deniedHandle = {
      queryPermission: vi.fn().mockResolvedValue('prompt'),
      requestPermission: vi.fn().mockResolvedValue('denied'),
    } as any;
    await expect(
      verifySourcePermission({ kind: 'handle', handle: deniedHandle }),
    ).resolves.toBe(false);

    const throwingHandle = {
      queryPermission: vi.fn().mockResolvedValue('prompt'),
      requestPermission: vi.fn().mockRejectedValue(new Error('nope')),
    } as any;
    await expect(
      verifySourcePermission({ kind: 'handle', handle: throwingHandle }),
    ).resolves.toBe(false);
  });
});
