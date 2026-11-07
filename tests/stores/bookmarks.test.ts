import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { useBookmarkStore } from '@/stores/bookmarks';
import { resetMockStores } from '../helpers/mock-storage';

vi.mock('@/utils/storage', () => import('../helpers/mock-storage'));

describe('bookmark store', () => {
  beforeEach(() => {
    resetMockStores();
    setActivePinia(createPinia());
  });

  it('adds, finds and removes bookmarks for a heading', async () => {
    const store = useBookmarkStore();

    expect(store.isBookmarked('module-1', 'note-1')).toBe(false);

    await store.addBookmark('module-1', 'note-1', 'Heading');
    expect(store.isBookmarked('module-1', 'note-1')).toBe(true);
    expect(store.findByModuleAndAnchor('module-1', 'note-1')).toMatchObject({
      moduleId: 'module-1',
      noteId: 'note-1',
      title: 'Heading',
    });

    await store.removeBookmark('module-1', 'note-1');
    expect(store.isBookmarked('module-1', 'note-1')).toBe(false);
    expect(store.findByModuleAndAnchor('module-1', 'note-1')).toBeUndefined();
  });

  it('does not duplicate an existing bookmark', async () => {
    const store = useBookmarkStore();

    await store.addBookmark('module-1', 'note-1', 'Heading');
    await store.addBookmark('module-1', 'note-1', 'Another heading');

    expect(store.items).toHaveLength(1);
    expect(store.items[0].title).toBe('Heading');
  });

  it('ignores removal of a bookmark that does not exist', async () => {
    const store = useBookmarkStore();

    await expect(
      store.removeBookmark('missing', 'missing'),
    ).resolves.toBeUndefined();
    expect(store.items).toHaveLength(0);
  });

  it('keeps note bookmarks separate from module bookmarks', async () => {
    const store = useBookmarkStore();

    await store.addAnchorBookmark(
      'note',
      'note-1',
      'note-paragraph-1',
      'Paragraph',
    );
    await store.addAnchorBookmark('module', 'module-1', 'heading-1', 'Heading');

    expect(store.bookmarksFor('note', 'note-1')).toHaveLength(1);
    expect(store.bookmarksFor('module', 'module-1')).toHaveLength(1);
    expect(store.isAnchorBookmarked('note', 'note-1', 'note-paragraph-1')).toBe(
      true,
    );
    expect(store.isBookmarked('module-1', 'heading-1')).toBe(true);
    expect(store.isAnchorBookmarked('note', 'note-1', 'heading-1')).toBe(false);

    await store.toggleAnchorBookmark(
      'note',
      'note-1',
      'note-paragraph-1',
      'Paragraph',
    );
    expect(store.bookmarksFor('note', 'note-1')).toHaveLength(0);
    expect(store.items).toHaveLength(1);
  });
});
