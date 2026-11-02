import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createMapFileFromFile,
  createMapFileFromHandle,
  getMapFileBlob,
  getMapFileUrl,
  revokeMapFileUrl,
  updateMapFileMetadata,
} from '@/maps/utils/mapFileUtils';
import { extractImageMetadata } from '@/maps/utils/imageWorker';
import type { MapFile } from '@/maps/types';

vi.mock('@/maps/utils/imageWorker', () => ({
  extractImageMetadata: vi.fn(),
}));

const metadata = {
  width: 800,
  height: 600,
  aspectRatio: 800 / 600,
  color: '#112233',
  palette: ['#112233'],
};

function file(name = 'map.png', type = 'image/png') {
  return new File(['image'], name, { type, lastModified: 123 });
}

function mapFile(overrides: Partial<MapFile> = {}): MapFile {
  return {
    id: 'file1',
    name: 'map.png',
    size: 5,
    type: 'image/png',
    lastModified: 123,
    source: { kind: 'blob', blob: new Blob(['image'], { type: 'image/png' }) },
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

describe('map file utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(extractImageMetadata).mockResolvedValue(metadata);
    (URL as any).createObjectURL = vi.fn(() => 'blob:map');
    (URL as any).revokeObjectURL = vi.fn();
  });

  it('creates a blob-backed map file with image metadata', async () => {
    const image = file();
    const created = await createMapFileFromFile(image);

    expect(created).toMatchObject({
      name: 'map.png',
      size: 5,
      type: 'image/png',
      lastModified: 123,
      source: { kind: 'blob', blob: image },
      imageMetadata: metadata,
    });
    expect(created.id).toBeTruthy();
    expect(created.createdAt).toBeGreaterThan(0);
    expect(created.updatedAt).toBeGreaterThan(0);
  });

  it('does not extract metadata for non-image files', async () => {
    const created = await createMapFileFromFile(
      file('notes.txt', 'text/plain'),
    );

    expect(created.imageMetadata).toBeUndefined();
    expect(extractImageMetadata).not.toHaveBeenCalled();
  });

  it('creates a handle-backed map file', async () => {
    const image = file();
    const handle = {
      kind: 'file',
      name: 'map.png',
      getFile: vi.fn().mockResolvedValue(image),
    } as unknown as FileSystemFileHandle;

    const created = await createMapFileFromHandle(handle, 'Custom name');

    expect(created).toMatchObject({
      name: 'Custom name',
      source: { kind: 'handle', handle },
      imageMetadata: metadata,
    });
    expect(handle.getFile).toHaveBeenCalled();
  });

  it('resolves blobs for both source kinds', async () => {
    const blob = new Blob(['blob']);
    await expect(getMapFileBlob(mapFile({ source: { kind: 'blob', blob } })))
      .resolves.toBe(blob);

    const handleFile = file();
    const handle = {
      getFile: vi.fn().mockResolvedValue(handleFile),
    } as unknown as FileSystemFileHandle;
    await expect(
      getMapFileBlob(mapFile({ source: { kind: 'handle', handle } })),
    ).resolves.toBe(handleFile);

    const legacy = mapFile();
    delete (legacy as any).source;
    (legacy as any).handle = handle;
    await expect(getMapFileBlob(legacy)).resolves.toBe(handleFile);
  });

  it('falls back to createImageBitmap when metadata extraction fails', async () => {
    vi.mocked(extractImageMetadata).mockRejectedValueOnce(new Error('worker'));
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockResolvedValue({
        width: 640,
        height: 480,
        close: vi.fn(),
      }),
    );

    const created = await createMapFileFromFile(file());

    expect(created.imageMetadata).toMatchObject({
      width: 640,
      height: 480,
      aspectRatio: 640 / 480,
    });
    vi.unstubAllGlobals();
  });

  it('does not update metadata for non-image sources', async () => {
    const text = new File(['text'], 'notes.txt', { type: 'text/plain' });
    const handle = {
      getFile: vi.fn().mockResolvedValue(text),
    } as unknown as FileSystemFileHandle;
    const source = mapFile({ source: { kind: 'handle', handle } });

    await expect(updateMapFileMetadata(source)).resolves.toBe(source);
    expect(extractImageMetadata).not.toHaveBeenCalled();
  });

  it('creates and revokes object URLs', async () => {
    const url = await getMapFileUrl(mapFile());
    expect(url).toBe('blob:map');
    revokeMapFileUrl(url);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(url);
  });

  it('updates image metadata and keeps the file on failure', async () => {
    const image = file();
    const handle = {
      getFile: vi.fn().mockResolvedValue(image),
    } as unknown as FileSystemFileHandle;
    const source = mapFile({ source: { kind: 'handle', handle } });

    await expect(updateMapFileMetadata(source)).resolves.toMatchObject({
      imageMetadata: metadata,
    });

    vi.mocked(extractImageMetadata).mockRejectedValueOnce(new Error('bad'));
    await expect(updateMapFileMetadata(source)).resolves.toBe(source);
  });
});
