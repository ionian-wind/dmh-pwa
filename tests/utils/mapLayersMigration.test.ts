import { describe, expect, it, vi } from 'vitest';
import migration from '@/migrations/0000000007_map_layers';

function transactionFor(maps: any[]) {
  const store = {
    getAll: vi.fn().mockResolvedValue(maps),
    put: vi.fn().mockResolvedValue(undefined),
  };
  return { store, transaction: { objectStore: () => store } as any };
}

describe('map layers migration', () => {
  it('adds the base layer and repairs missing layer references', async () => {
    const { store, transaction } = transactionFor([
      {
        id: 'm1',
        title: 'World',
        fileId: 'f1',
        layers: [],
        markers: [{ id: 'mk1', layerId: 'missing' }],
        areas: [{ id: 'a1', layerId: undefined }],
      },
    ]);

    await migration.go(transaction);

    expect(store.put).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'm1',
        layers: [{ id: 'base', title: 'Base' }],
        markers: [expect.objectContaining({ layerId: 'base' })],
        areas: [expect.objectContaining({ layerId: 'base' })],
      }),
    );
  });

  it('keeps valid existing layers and references', async () => {
    const { store, transaction } = transactionFor([
      {
        id: 'm2',
        title: 'Dungeon',
        fileId: 'f2',
        layers: [
          { id: 'base', title: 'Base' },
          { id: 'upper', title: 'Upper' },
        ],
        markers: [{ id: 'mk2', layerId: 'upper' }],
        areas: [{ id: 'a2', layerId: 'base' }],
      },
    ]);

    await migration.go(transaction);

    const saved = store.put.mock.calls[0][0];
    expect(saved.layers).toEqual([
      { id: 'base', title: 'Base' },
      { id: 'upper', title: 'Upper' },
    ]);
    expect(saved.markers[0].layerId).toBe('upper');
    expect(saved.areas[0].layerId).toBe('base');
  });

  it('handles maps without markers or areas', async () => {
    const { store, transaction } = transactionFor([
      { id: 'm3', title: 'Empty', fileId: 'f3', layers: [] },
    ]);

    await migration.go(transaction);

    expect(store.put).toHaveBeenCalledWith(
      expect.objectContaining({ markers: [], areas: [] }),
    );
  });
});
