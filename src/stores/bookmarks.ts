import { defineStore } from 'pinia';
import type { Bookmark } from '@/types';
import { useStore } from '@/utils/storage';
import bookmarkSchema from '@/schemas/bookmark.schema.json';

export const useBookmarkStore = defineStore('bookmarks', () => {
  const base = useStore<Bookmark>({ storeName: 'bookmarks', validationSchema: bookmarkSchema });

  // Find a bookmark by moduleId and anchorId
  function findByModuleAndAnchor(moduleId: string, anchorId: string): Bookmark | undefined {
    return base.items.value.find(b => b.moduleId === moduleId && b.anchorId === anchorId);
  }

  // Check if a heading is bookmarked
  function isBookmarked(moduleId: string, anchorId: string): boolean {
    return !!findByModuleAndAnchor(moduleId, anchorId);
  }

  // Add a bookmark
  async function addBookmark(moduleId: string, anchorId: string, title: string) {
    if (isBookmarked(moduleId, anchorId)) return;
    await base.create({ moduleId, anchorId, title });
  }

  // Remove a bookmark
  async function removeBookmark(moduleId: string, anchorId: string) {
    const bookmark = findByModuleAndAnchor(moduleId, anchorId);
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