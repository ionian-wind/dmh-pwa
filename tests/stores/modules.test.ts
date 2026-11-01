import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useModuleStore } from '@/stores/modules';
import { resetMockStores } from '../helpers/mock-storage';

vi.mock('@/utils/storage', () => import('../helpers/mock-storage'));

describe('module store', () => {
  beforeEach(() => {
    resetMockStores();
    setActivePinia(createPinia());
  });

  it('resolves module names', async () => {
    const store = useModuleStore();
    const created = await store.create({ name: 'Curse of Strahd' });
    expect(store.getModuleName(created.id)).toBe('Curse of Strahd');
    expect(store.getModuleName(null)).toBe('No Module');
    expect(store.getModuleName('missing')).toBe('Unknown Module');
  });

  it('filters modules and keeps a sorted view', async () => {
    const store = useModuleStore();
    await store.create({ name: 'Alpha' });
    await store.create({ name: 'Beta' });

    store.setSearchQuery('bet');
    expect(store.filtered.map((m) => m.name)).toEqual(['Beta']);
    expect(store.sortedItems).toHaveLength(2);
  });
});
