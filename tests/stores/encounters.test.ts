import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useEncounterStore } from '@/stores/encounters';
import { resetMockStores } from '../helpers/mock-storage';

vi.mock('@/utils/storage', () => import('../helpers/mock-storage'));

describe('encounter store', () => {
  beforeEach(() => {
    resetMockStores();
    setActivePinia(createPinia());
  });

  it('creates and filters encounters', async () => {
    const store = useEncounterStore();
    await store.create({
      name: 'Ambush',
      pawns: { m1: 2 },
      moduleIds: ['mod'],
    });
    await store.create({
      name: 'Boss Fight',
      pawns: { m2: 1 },
      moduleIds: ['mod'],
    });

    store.setSearchQuery('boss');
    expect(store.filtered.map((e) => e.name)).toEqual(['Boss Fight']);
    expect(store.sortedItems).toHaveLength(2);

    store.setFilter('amb');
    expect(store.filtered.map((e) => e.name)).toEqual(['Ambush']);

    store.clearFilter();
    expect(store.searchQuery).toBe('');
    expect(store.filtered).toHaveLength(2);
  });

  it('updates the monster roster', async () => {
    const store = useEncounterStore();
    const created = await store.create({
      name: 'Ambush',
      pawns: { m1: 2 },
      moduleIds: ['mod'],
    });
    const updated = await store.update(created.id, {
      pawns: { m1: 3, m2: 1 },
    });
    expect(updated.pawns).toEqual({ m1: 3, m2: 1 });
  });
});
