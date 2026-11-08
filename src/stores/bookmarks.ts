import { defineStore } from 'pinia';
import type { Bookmark, BookmarkOwnerKind } from '@/types';
import { useStore } from '@/utils/storage';
import bookmarkSchema from '@/schemas/bookmark.schema.json';

function ownerKind(bookmark: Bookmark): BookmarkOwnerKind {
  return bookmark.ownerKind ?? 'note';
}

function ownerId(bookmark: Bookmark) {
  return bookmark.ownerId ?? '';
}

function anchorId(bookmark: Bookmark) {
  return bookmark.anchorId ?? bookmark.noteId;
}

export const useBookmarkStore = defineStore('bookmarks', () => {
  const base = useStore<Bookmark>({
    storeName: 'bookmarks',
    validationSchema: bookmarkSchema,
  });

  function bookmarksFor(kind: BookmarkOwnerKind, id: string): Bookmark[] {
    return base.items.value.filter(
      (bookmark) => ownerKind(bookmark) === kind && ownerId(bookmark) === id,
    );
  }

  function findByOwnerAndAnchor(
    kind: BookmarkOwnerKind,
    id: string,
    anchor: string,
  ): Bookmark | undefined {
    return base.items.value.find(
      (bookmark) =>
        ownerKind(bookmark) === kind &&
        ownerId(bookmark) === id &&
        anchorId(bookmark) === anchor,
    );
  }

  function isAnchorBookmarked(
    kind: BookmarkOwnerKind,
    id: string,
    anchor: string,
  ): boolean {
    return !!findByOwnerAndAnchor(kind, id, anchor);
  }

  async function addAnchorBookmark(
    kind: BookmarkOwnerKind,
    id: string,
    anchor: string,
    title: string,
  ) {
    if (isAnchorBookmarked(kind, id, anchor)) return;
    await base.create({
      noteId: anchor,
      title,
      ownerKind: kind,
      ownerId: id,
      anchorId: anchor,
    });
  }

  async function removeAnchorBookmark(
    kind: BookmarkOwnerKind,
    id: string,
    anchor: string,
  ) {
    const bookmark = findByOwnerAndAnchor(kind, id, anchor);
    if (bookmark) {
      await base.remove(bookmark.id);
    }
  }

  async function toggleAnchorBookmark(
    kind: BookmarkOwnerKind,
    id: string,
    anchor: string,
    title: string,
  ) {
    if (isAnchorBookmarked(kind, id, anchor)) {
      await removeAnchorBookmark(kind, id, anchor);
    } else {
      await addAnchorBookmark(kind, id, anchor, title);
    }
  }

  // Legacy note helpers kept for callers that only know the anchor.
  function findByNoteAndAnchor(
    noteId: string,
    anchorId: string,
  ): Bookmark | undefined {
    return findByOwnerAndAnchor('note', noteId, anchorId);
  }

  function isBookmarked(noteId: string, anchorId: string): boolean {
    return isAnchorBookmarked('note', noteId, anchorId);
  }

  async function addBookmark(noteId: string, anchorId: string, title: string) {
    await addAnchorBookmark('note', noteId, anchorId, title);
  }

  async function removeBookmark(noteId: string, anchorId: string) {
    await removeAnchorBookmark('note', noteId, anchorId);
  }

  return {
    ...base,
    bookmarksFor,
    findByOwnerAndAnchor,
    isAnchorBookmarked,
    addAnchorBookmark,
    removeAnchorBookmark,
    toggleAnchorBookmark,
    findByNoteAndAnchor,
    isBookmarked,
    addBookmark,
    removeBookmark,
  };
});
