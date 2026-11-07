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

    expect(store.isBookmarked('note-1', 'heading-1')).toBe(false);

    await store.addBookmark('note-1', 'heading-1', 'Heading');
    expect(store.isBookmarked('note-1', 'heading-1')).toBe(true);
    expect(store.findByNoteAndAnchor('note-1', 'heading-1')).toMatchObject({
      noteId: 'heading-1',
      ownerKind: 'note',
      ownerId: 'note-1',
      anchorId: 'heading-1',
      title: 'Heading',
    });

    await store.removeBookmark('note-1', 'heading-1');
    expect(store.isBookmarked('note-1', 'heading-1')).toBe(false);
    expect(store.findByNoteAndAnchor('note-1', 'heading-1')).toBeUndefined();
  });

  it('does not duplicate an existing bookmark', async () => {
    const store = useBookmarkStore();

    await store.addBookmark('note-1', 'heading-1', 'Heading');
    await store.addBookmark('note-1', 'heading-1', 'Another heading');

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

  it('keeps bookmarks separate by note', async () => {
    const store = useBookmarkStore();

    await store.addAnchorBookmark(
      'note',
      'note-1',
      'note-paragraph-1',
      'Paragraph',
    );
    await store.addAnchorBookmark('note', 'note-2', 'heading-1', 'Heading');

    expect(store.bookmarksFor('note', 'note-1')).toHaveLength(1);
    expect(store.bookmarksFor('note', 'note-2')).toHaveLength(1);
    expect(store.isAnchorBookmarked('note', 'note-1', 'note-paragraph-1')).toBe(
      true,
    );
    expect(store.isBookmarked('note-2', 'heading-1')).toBe(true);
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
