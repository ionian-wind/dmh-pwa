import { describe, expect, it, vi } from 'vitest';

import migration from '@/migrations/0000000010_module_many_to_many';

function transactionFor(notes: any[], encounters: any[]) {
  const stores: Record<string, any> = {
    notes: {
      getAll: vi.fn().mockResolvedValue(notes),
      put: vi.fn().mockResolvedValue(undefined),
    },
    encounters: {
      getAll: vi.fn().mockResolvedValue(encounters),
      put: vi.fn().mockResolvedValue(undefined),
    },
  };
  return {
    stores,
    transaction: { objectStore: (name: string) => stores[name] } as any,
  };
}

describe('module many-to-many migration', () => {
  it('converts single module links on notes and encounters', async () => {
    const { stores, transaction } = transactionFor(
      [
        { id: 'n1', title: 'One', moduleId: 'm1' },
        { id: 'n2', title: 'Two', moduleId: null },
      ],
      [
        { id: 'e1', name: 'Encounter', moduleId: 'm2' },
        { id: 'e2', name: 'Empty', moduleId: '' },
      ],
    );

    await migration.go(transaction);

    expect(stores.notes.put).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'n1', moduleIds: ['m1'] }),
    );
    expect(stores.notes.put).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'n2', moduleIds: [] }),
    );
    expect(stores.encounters.put).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'e1', moduleIds: ['m2'] }),
    );
    expect(stores.encounters.put).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'e2', moduleIds: [] }),
    );

    const note = stores.notes.put.mock.calls[0][0];
    expect(note).not.toHaveProperty('moduleId');
    const encounter = stores.encounters.put.mock.calls[0][0];
    expect(encounter).not.toHaveProperty('moduleId');
  });

  it('preserves existing module arrays', async () => {
    const { stores, transaction } = transactionFor(
      [{ id: 'n1', moduleIds: ['m1', 'm2'] }],
      [{ id: 'e1', moduleIds: ['m3'] }],
    );

    await migration.go(transaction);

    expect(stores.notes.put).toHaveBeenCalledWith(
      expect.objectContaining({ moduleIds: ['m1', 'm2'] }),
    );
    expect(stores.encounters.put).toHaveBeenCalledWith(
      expect.objectContaining({ moduleIds: ['m3'] }),
    );
  });
});
