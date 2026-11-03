import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useNoteTypeStore } from '@/stores/noteTypes';
import { resetMockStores } from '../helpers/mock-storage';

vi.mock('@/utils/storage', () => import('../helpers/mock-storage'));

describe('note type store', () => {
  beforeEach(() => {
    resetMockStores();
    setActivePinia(createPinia());
  });

  it('performs CRUD and filters by name', async () => {
    const store = useNoteTypeStore();
    const created = await store.create({
      name: 'NPC',
      description: 'Non-player character',
    });
    await store.create({ name: 'Location' });

    expect(store.getById(created.id)?.name).toBe('NPC');

    store.setSearchQuery('loc');
    expect(store.filtered.map((t) => t.name)).toEqual(['Location']);

    store.setFilter('npc');
    expect(store.filtered.map((t) => t.name)).toEqual(['NPC']);

    store.clearFilter();
    expect(store.searchQuery).toBe('');
    expect(store.filtered).toHaveLength(2);

    await store.remove(created.id);
    expect(store.getById(created.id)).toBeNull();
  });
});
