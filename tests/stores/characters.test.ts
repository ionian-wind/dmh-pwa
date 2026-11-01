import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useCharacterStore } from '@/stores/characters';
import { resetMockStores } from '../helpers/mock-storage';

vi.mock('@/utils/storage', () => import('../helpers/mock-storage'));

describe('character store', () => {
  beforeEach(() => {
    resetMockStores();
    setActivePinia(createPinia());
  });

  it('creates, updates, and removes characters', async () => {
    const store = useCharacterStore();
    const created = await store.create({ name: 'Alice', notes: '' });
    expect(created.name).toBe('Alice');
    expect(store.getById(created.id)?.name).toBe('Alice');

    const updated = await store.update(created.id, { name: 'Alice the Bold' });
    expect(updated.name).toBe('Alice the Bold');

    await store.remove(created.id);
    expect(store.getById(created.id)).toBeNull();
  });

  it('filters by name and clears the filter', async () => {
    const store = useCharacterStore();
    await store.create({ name: 'Alice', notes: '' });
    await store.create({ name: 'Bob', notes: '' });

    store.setSearchQuery('ali');
    expect(store.filtered.map((c) => c.name)).toEqual(['Alice']);

    store.clearFilter();
    expect(store.filtered).toHaveLength(2);
  });
});
