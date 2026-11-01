import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useMonsterStore } from '@/stores/monsters';
import { resetMockStores } from '../helpers/mock-storage';

vi.mock('@/utils/storage', () => import('../helpers/mock-storage'));

describe('monster store', () => {
  beforeEach(() => {
    resetMockStores();
    setActivePinia(createPinia());
  });

  it('creates and searches monsters', async () => {
    const store = useMonsterStore();
    await store.create({ name: 'Goblin', moduleIds: [] });
    await store.create({ name: 'Dragon', moduleIds: ['m1'] });

    store.setSearchQuery('drag');
    expect(store.filtered.map((m) => m.name)).toEqual(['Dragon']);

    store.clearFilter();
    expect(store.filtered).toHaveLength(2);
  });

  it('updates and removes a monster', async () => {
    const store = useMonsterStore();
    const created = await store.create({ name: 'Goblin' });
    const updated = await store.update(created.id, { notes: 'Sneaky' });
    expect(updated.notes).toBe('Sneaky');

    await store.remove(created.id);
    expect(store.getById(created.id)).toBeNull();
  });
});
