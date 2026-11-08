import { describe, expect, it, vi } from 'vitest';

import migration from '@/migrations/0000000009_merge_maps_into_locations';

function transactionFor(maps: any[], locations: any[] = []) {
  const stores: Record<string, any> = {
    maps: {
      getAll: vi.fn().mockResolvedValue(maps),
      put: vi.fn().mockResolvedValue(undefined),
    },
    map_locations: {
      getAll: vi.fn().mockResolvedValue(locations),
      put: vi.fn().mockResolvedValue(undefined),
    },
  };
  return {
    stores,
    transaction: {
      objectStore: (name: string) => stores[name],
    } as any,
  };
}

describe('merge maps into locations migration', () => {
  it('moves an existing map into its linked location', async () => {
    const { stores, transaction } = transactionFor(
      [
        {
          id: 'map1',
          title: 'Ignored map title',
          description: 'Map description',
          fileId: 'file1',
          locationId: 'loc1',
          entities: [{ kind: 'module', id: 'mod1' }],
          layers: [{ id: 'base', title: 'Base' }],
          markers: [{ id: 'm1', layerId: 'base' }],
          areas: [],
          createdAt: 1,
          updatedAt: 1,
        },
      ],
      [
        {
          id: 'loc1',
          name: 'Town',
          description: 'Town description',
          entities: [{ kind: 'note', id: 'n1' }],
          createdAt: 10,
          updatedAt: 10,
        },
      ],
    );

    await migration.go(transaction);

    expect(stores.map_locations.put).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'loc1',
        name: 'Town',
        description: 'Town description',
        entities: [
          { kind: 'note', id: 'n1' },
          { kind: 'module', id: 'mod1' },
        ],
        map: expect.objectContaining({
          fileId: 'file1',
          layers: [{ id: 'base', title: 'Base' }],
        }),
      }),
    );
  });

  it('creates a location when the map has no linked location', async () => {
    const { stores, transaction } = transactionFor([
      {
        id: 'map2',
        title: 'Island',
        description: 'Remote',
        fileId: 'file2',
        locationId: null,
        entities: [{ kind: 'note', id: 'n2' }],
        layers: [{ id: 'base', title: 'Base' }],
        markers: [],
        areas: [],
        createdAt: 2,
        updatedAt: 2,
      },
    ]);

    await migration.go(transaction);

    expect(stores.map_locations.put).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'map2',
        name: 'Island',
        description: 'Remote',
        entities: [{ kind: 'note', id: 'n2' }],
        map: expect.objectContaining({ fileId: 'file2' }),
      }),
    );
  });

  it('skips duplicate entity links and handles empty arrays', async () => {
    const { stores, transaction } = transactionFor([
      {
        id: 'map3',
        title: '',
        locationId: 'loc3',
        fileId: '',
        entities: [{ kind: 'note', id: 'n1' }],
        createdAt: 0,
        updatedAt: 0,
      },
    ]);

    await migration.go(transaction);

    const saved = stores.map_locations.put.mock.calls[0][0];
    expect(saved.entities).toEqual([{ kind: 'note', id: 'n1' }]);
    expect(saved.map.markers).toEqual([]);
    expect(saved.map.areas).toEqual([]);
  });
});
