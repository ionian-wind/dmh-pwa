import { defineStore } from 'pinia';
import type { Bookmark, BookmarkOwnerKind } from '@/types';
import { useStore } from '@/utils/storage';
import bookmarkSchema from '@/schemas/bookmark.schema.json';

function ownerKind(bookmark: Bookmark): BookmarkOwnerKind {
  return bookmark.ownerKind ?? 'module';
}

function ownerId(bookmark: Bookmark) {
  return bookmark.ownerId ?? bookmark.moduleId;
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
      moduleId: kind === 'module' ? id : '',
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

  // Legacy module helpers used by ModuleView and Bookmark.vue.
  function findByModuleAndAnchor(
    moduleId: string,
    noteId: string,
  ): Bookmark | undefined {
    return findByOwnerAndAnchor('module', moduleId, noteId);
  }

  function isBookmarked(moduleId: string, noteId: string): boolean {
    return isAnchorBookmarked('module', moduleId, noteId);
  }

  async function addBookmark(moduleId: string, noteId: string, title: string) {
    await addAnchorBookmark('module', moduleId, noteId, title);
  }

  async function removeBookmark(moduleId: string, noteId: string) {
    await removeAnchorBookmark('module', moduleId, noteId);
  }

  return {
    ...base,
    bookmarksFor,
    findByOwnerAndAnchor,
    isAnchorBookmarked,
    addAnchorBookmark,
    removeAnchorBookmark,
    toggleAnchorBookmark,
    findByModuleAndAnchor,
    isBookmarked,
    addBookmark,
    removeBookmark,
  };
});
