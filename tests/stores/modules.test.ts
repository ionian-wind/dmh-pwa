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

  it('adds and removes nested notes and manages filters', async () => {
    const store = useModuleStore();
    const created = await store.create({
      name: 'Tree',
      noteTree: [
        {
          noteId: 'n1',
          children: [{ noteId: 'n2', children: [] }],
        },
      ],
    } as any);

    await store.addNoteToTree(created.id, 'n1');
    await store.addNoteToTree(created.id, 'n3');
    expect(store.getById(created.id)?.noteTree).toEqual([
      expect.objectContaining({ noteId: 'n1' }),
      expect.objectContaining({ noteId: 'n3' }),
    ]);
    await store.removeNoteFromTree(created.id, 'n2');
    expect(store.getById(created.id)?.noteTree).toEqual([
      expect.objectContaining({
        noteId: 'n1',
        children: [],
      }),
      expect.objectContaining({ noteId: 'n3' }),
    ]);
    await expect(store.addNoteToTree('missing', 'n1')).resolves.toBeNull();
    await expect(store.removeNoteFromTree('missing', 'n1')).resolves.toBeNull();

    store.setFilter('tree');
    expect(store.filtered).toHaveLength(1);
    store.clearFilter();
    expect(store.filtered).toHaveLength(1);
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
