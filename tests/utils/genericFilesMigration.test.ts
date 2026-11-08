import { describe, expect, it, vi } from 'vitest';
import genericFilesMigration from '@/migrations/0000000011_generic_files';

function store(rows: any[] = []) {
  return {
    rows,
    put: vi.fn().mockResolvedValue(undefined),
    getAll: vi.fn().mockResolvedValue(rows),
    getAllKeys: vi.fn().mockResolvedValue(rows.map((row) => row.id)),
    delete: vi.fn().mockResolvedValue(undefined),
  };
}

describe('generic files migration', () => {
  it('copies legacy files, lifts map metadata and clears old stores', async () => {
    const files = store();
    const metadata = store();
    const jukeboxFiles = store([
      { id: 'j1', source: { kind: 'blob', blob: new Blob(['a']) } },
      { id: '', source: { kind: 'blob', blob: new Blob(['skip']) } },
      { id: 'j2' },
    ]);
    const mapFiles = store([
      {
        id: 'm1',
        source: { kind: 'blob', blob: new Blob(['m']) },
        imageMetadata: { width: 10, height: 20 },
        createdAt: 1,
        updatedAt: 2,
      },
      { id: 'm2', source: { kind: 'blob', blob: new Blob(['m2']) } },
      { id: 'm3', imageMetadata: { width: 1, height: 1 } },
      { id: '', source: { kind: 'blob', blob: new Blob(['skip']) } },
    ]);
    const stores: Record<string, any> = {
      files,
      map_image_metadata: metadata,
      jukebox_files: jukeboxFiles,
      map_files: mapFiles,
    };

    await genericFilesMigration.go({
      objectStore: (name: string) => stores[name],
    } as any);

    const copiedFiles = files.put.mock.calls.map(([value]) => value);
    expect(copiedFiles.map((file) => file.id).sort()).toEqual([
      'j1',
      'm1',
      'm2',
    ]);
    expect(copiedFiles[0]).toMatchObject({
      name: '',
      size: 0,
      type: '',
      lastModified: 0,
      signature: expect.any(String),
    });

    const copiedMetadata = metadata.put.mock.calls.map(([value]) => value);
    expect(copiedMetadata.map((entry) => entry.id).sort()).toEqual([
      'm1',
      'm3',
    ]);
    expect(copiedMetadata.find((entry) => entry.id === 'm3')).toMatchObject({
      createdAt: expect.any(Number),
      updatedAt: expect.any(Number),
    });

    expect(jukeboxFiles.getAllKeys).toHaveBeenCalled();
    expect(jukeboxFiles.delete).toHaveBeenCalledTimes(3);
    expect(mapFiles.delete).toHaveBeenCalledTimes(4);
  });
});
