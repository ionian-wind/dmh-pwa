import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useNoteStore } from '@/stores/notes';
import { mentionsMock, resetMockStores } from '../helpers/mock-storage';

vi.mock('@/utils/storage', () => import('../helpers/mock-storage'));

describe('note store', () => {
  beforeEach(() => {
    resetMockStores();
    setActivePinia(createPinia());
  });

  it('indexes mentions on create/update and clears them on remove', async () => {
    const store = useNoteStore();
    const created = await store.create({
      title: 'Session',
      content: 'See [Alice](monster://m1)',
      typeId: null,
      tags: ['session'],
      moduleIds: [],
      hidden: false,
    });

    expect(mentionsMock.setLinks).toHaveBeenCalledWith(
      { kind: 'note', id: created.id },
      [{ kind: 'monster', id: 'm1' }],
    );

    await store.update(created.id, {
      content: 'See [Bob](note://n2)',
    });
    expect(mentionsMock.setLinks).toHaveBeenLastCalledWith(
      { kind: 'note', id: created.id },
      [{ kind: 'note', id: 'n2' }],
    );

    await store.remove(created.id);
    expect(mentionsMock.clearLinks).toHaveBeenCalledWith({
      kind: 'note',
      id: created.id,
    });
  });

  it('never changes hidden after creation', async () => {
    const store = useNoteStore();
    const created = await store.create({
      title: 'Hidden doc',
      content: 'Body',
      typeId: null,
      tags: [],
      moduleIds: ['m1'],
      hidden: true,
    });

    const updated = await store.update(created.id, { hidden: false } as any);
    expect(updated.hidden).toBe(true);
  });

  it('filters by search and tag and exposes all tags', async () => {
    const store = useNoteStore();
    await store.create({
      title: 'Combat notes',
      content: 'Goblin ambush',
      typeId: null,
      tags: ['combat'],
      moduleIds: [],
      hidden: false,
    });
    await store.create({
      title: 'Roleplay',
      content: 'Tavern scene',
      typeId: null,
      tags: ['social'],
      moduleIds: [],
      hidden: false,
    });

    store.setSearchQuery('goblin');
    expect(store.filtered).toHaveLength(1);

    store.clearFilter();
    store.setTagFilter('social');
    expect(store.filtered.map((n) => n.title)).toEqual(['Roleplay']);
    expect(store.allTags.sort()).toEqual(['combat', 'social']);
  });

  it('adds hashtags from saved content to the note tag list', async () => {
    const store = useNoteStore();
    const created = await store.create({
      title: 'Travel',
      content: '# Heading\nVisit #harbor and #forest.',
      typeId: null,
      tags: ['session'],
      moduleIds: [],
      hidden: false,
    });

    expect(created.tags).toEqual(['session', 'harbor', 'forest']);

    const updated = await store.update(created.id, {
      content: 'Travel to #harbor and #mountains.',
    });
    expect(updated.tags).toEqual(['session', 'harbor', 'forest', 'mountains']);
    expect(store.allTags).toContain('mountains');

    const withoutTags = await store.update(created.id, { tags: ['session'] });
    expect(withoutTags.tags).toEqual(['session']);
  });
});
