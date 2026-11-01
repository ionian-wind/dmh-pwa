import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BlobFileHandler } from '@/utils/files/BlobFileHandler';
import { FileSystemFileHandler } from '@/utils/files/FileSystemFileHandler';
import { createFileHandler } from '@/utils/files';
import { extractTrackMetadata as extractMetadata } from '@/utils/files/FileSystemUtils';
import type { JukeboxFileSource } from '@/jukebox/types';

vi.mock('@/utils/files/FileSystemUtils', () => ({
  extractTrackMetadata: vi.fn().mockResolvedValue({ title: 'Mock' }),
}));

const originalCreateElement = document.createElement.bind(document);

function fakeInput() {
  const input = {
    type: '',
    multiple: false,
    accept: '',
    files: null as FileList | null,
    click: vi.fn(),
    addEventListener: vi.fn(),
    onchange: null as null | (() => Promise<void>),
  };
  return input;
}

describe('file handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(extractMetadata).mockResolvedValue({ title: 'Mock' });
    delete (window as any).showOpenFilePicker;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (window as any).showOpenFilePicker;
  });

  describe('BlobFileHandler', () => {
    it('reports support and resolves selected blob files', async () => {
      const handler = new BlobFileHandler();
      expect(handler.isSupported()).toBe(true);
      await expect(
        handler.getAsFileSystemHandle({
          getAsFileSystemHandle: vi.fn().mockResolvedValue(null),
        } as any),
      ).resolves.toBeNull();

      const input = fakeInput();
      vi.spyOn(document, 'createElement').mockImplementation((tag) =>
        tag === 'input' ? (input as any) : originalCreateElement(tag),
      );

      const promise = handler.pickAudioFiles();
      const file = new File(['x'], 'song.mp3', { type: 'audio/mp3' });
      input.files = [file] as unknown as FileList;
      await input.onchange?.();

      await expect(promise).resolves.toEqual([
        { file, source: { kind: 'blob', blob: file } },
      ]);
      expect(input.click).toHaveBeenCalled();
      expect(input.accept).toContain('audio/*');
    });

    it('resolves empty when the picker is cancelled or has no files', async () => {
      const handler = new BlobFileHandler();
      const input = fakeInput();
      vi.spyOn(document, 'createElement').mockImplementation((tag) =>
        tag === 'input' ? (input as any) : originalCreateElement(tag),
      );

      const promise = handler.pickAudioFiles();
      const cancel = input.addEventListener.mock.calls.find(
        ([name]) => name === 'cancel',
      )?.[1] as () => void;
      cancel();

      await expect(promise).resolves.toEqual([]);

      const secondInput = fakeInput();
      vi.spyOn(document, 'createElement').mockImplementation((tag) =>
        tag === 'input' ? (secondInput as any) : originalCreateElement(tag),
      );
      const secondPromise = handler.pickAudioFiles();
      secondInput.files = null;
      await secondInput.onchange?.();
      await expect(secondPromise).resolves.toEqual([]);
    });

    it('creates a File from a blob source and rejects handle sources', async () => {
      const handler = new BlobFileHandler();
      const blob = new Blob(['audio'], { type: 'audio/mp3' });
      const file = await handler.getFile({ kind: 'blob', blob });

      expect(file.name).toBe('unnamed');
      expect(file.type).toBe('audio/mp3');

      await expect(
        handler.getFile({ kind: 'handle' } as JukeboxFileSource),
      ).rejects.toThrow('Invalid source type for BlobFileHandler');
    });

    it('delegates metadata extraction', async () => {
      const handler = new BlobFileHandler();
      const file = new File(['x'], 'song.mp3');

      await expect(handler.extractTrackMetadata(file)).resolves.toEqual({
        title: 'Mock',
      });
      expect(extractMetadata).toHaveBeenCalledWith(file);
    });
  });

  describe('FileSystemFileHandler', () => {
    it('reports support based on showOpenFilePicker', () => {
      const handler = new FileSystemFileHandler();
      expect(handler.isSupported()).toBe(false);

      (window as any).showOpenFilePicker = vi.fn();
      expect(handler.isSupported()).toBe(true);
    });

    it('picks files from handles and maps their sources', async () => {
      const file = new File(['x'], 'song.mp3');
      const handle = {
        kind: 'file',
        getFile: vi.fn().mockResolvedValue(file),
      } as unknown as FileSystemFileHandle;
      (window as any).showOpenFilePicker = vi.fn().mockResolvedValue([handle]);

      const handler = new FileSystemFileHandler();
      const result = await handler.pickAudioFiles();

      expect(result).toEqual([
        { file, source: { kind: 'handle', handle } },
      ]);
      expect((window as any).showOpenFilePicker).toHaveBeenCalledWith(
        expect.objectContaining({ multiple: true }),
      );
    });

    it('gets files from handles and rejects blob sources', async () => {
      const file = new File(['x'], 'song.mp3');
      const handle = {
        kind: 'file',
        getFile: vi.fn().mockResolvedValue(file),
      } as unknown as FileSystemFileHandle;
      const handler = new FileSystemFileHandler();

      await expect(
        handler.getFile({ kind: 'handle', handle }),
      ).resolves.toBe(file);
      await expect(
        handler.getFile({ kind: 'blob', blob: new Blob() }),
      ).rejects.toThrow('Invalid source type for FileSystemFileHandler');
    });

    it('returns file handles only from data transfer items', async () => {
      const handler = new FileSystemFileHandler();
      const fileHandle = { kind: 'file' };
      const directoryHandle = { kind: 'directory' };

      await expect(
        handler.getAsFileSystemHandle({
          getAsFileSystemHandle: vi.fn().mockResolvedValue(fileHandle),
        } as any),
      ).resolves.toBe(fileHandle);
      await expect(
        handler.getAsFileSystemHandle({
          getAsFileSystemHandle: vi.fn().mockResolvedValue(directoryHandle),
        } as any),
      ).resolves.toBeNull();
      await expect(
        handler.getAsFileSystemHandle({
          getAsFileSystemHandle: vi.fn().mockResolvedValue(null),
        } as any),
      ).resolves.toBeNull();
    });

    it('delegates metadata extraction', async () => {
      const handler = new FileSystemFileHandler();
      const file = new File(['x'], 'song.mp3');

      await expect(handler.extractTrackMetadata(file)).resolves.toEqual({
        title: 'Mock',
      });
    });
  });

  it('creates the handler matching the browser capabilities', () => {
    expect(createFileHandler()).toBeInstanceOf(BlobFileHandler);

    (window as any).showOpenFilePicker = vi.fn();
    expect(createFileHandler()).toBeInstanceOf(FileSystemFileHandler);
  });
});
