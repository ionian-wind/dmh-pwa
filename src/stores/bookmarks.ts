import { defineStore } from 'pinia';
import type { Bookmark } from '@/types';
import { useStore } from '@/utils/storage';
import bookmarkSchema from '@/schemas/bookmark.schema.json';

export const useBookmarkStore = defineStore('bookmarks', () => {
  const base = useStore<Bookmark>({ storeName: 'bookmarks', validationSchema: bookmarkSchema });

  // Find a bookmark by moduleId and noteId
  function findByModuleAndAnchor(moduleId: string, noteId: string): Bookmark | undefined {
    return base.items.value.find(b => b.moduleId === moduleId && b.noteId === noteId);
  }

  // Check if a heading is bookmarked
  function isBookmarked(moduleId: string, noteId: string): boolean {
    return !!findByModuleAndAnchor(moduleId, noteId);
  }

  // Add a bookmark
  async function addBookmark(moduleId: string, noteId: string, title: string) {
    if (isBookmarked(moduleId, noteId)) return;
    await base.create({ moduleId, noteId, title });
  }

  // Remove a bookmark
  async function removeBookmark(moduleId: string, noteId: string) {
    const bookmark = findByModuleAndAnchor(moduleId, noteId);
    if (bookmark) {
      await base.remove(bookmark.id);
    }
  }

  return {
    ...base,
    findByModuleAndAnchor,
    isBookmarked,
    addBookmark,
    removeBookmark,
  };
}); 