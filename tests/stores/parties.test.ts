import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { usePartyStore } from '@/stores/parties';
import { resetMockStores } from '../helpers/mock-storage';

vi.mock('@/utils/storage', () => import('../helpers/mock-storage'));

describe('party store', () => {
  beforeEach(() => {
    resetMockStores();
    setActivePinia(createPinia());
  });

  it('supports the standard CRUD surface', async () => {
    const store = usePartyStore();
    const created = await store.create({
      name: 'The Heroes',
      characters: [],
      moduleIds: [],
    });
    expect(store.getById(created.id)?.name).toBe('The Heroes');

    const updated = await store.update(created.id, {
      characters: ['c1'],
    });
    expect(updated.characters).toEqual(['c1']);

    await store.remove(created.id);
    expect(store.items).toHaveLength(0);
  });

  it('filters parties by name', async () => {
    const store = usePartyStore();
    await store.create({ name: 'Heroes', characters: [], moduleIds: [] });
    await store.create({ name: 'Villains', characters: [], moduleIds: [] });

    store.setSearchQuery('hero');
    expect(store.filtered).toHaveLength(1);
    expect(store.filtered[0].name).toBe('Heroes');
  });
});
