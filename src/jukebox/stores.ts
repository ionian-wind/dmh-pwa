import { useStore, idbGetItem, idbPutItem, idbDeleteItem, idbGetAllItems } from '@/utils/storage';
import type { JukeboxPlaylist, JukeboxTrack, JukeboxFile } from './types';
import { defineStore } from 'pinia';
import { ref } from 'vue';

// Bypass schema validation for jukebox stores (FileSystemFileHandle is not plain object)
export const useJukeboxPlaylistsStore = () =>
  useStore<JukeboxPlaylist>({ storeName: 'jukebox_playlists', validationSchema: undefined });

export const useJukeboxTracksStore = () =>
  useStore<JukeboxTrack>({ storeName: 'jukebox_tracks', validationSchema: undefined });

export const useJukeboxFilesStore = () =>
  useStore<JukeboxFile>({ storeName: 'jukebox_files', validationSchema: undefined });

export function isFileSystemFileHandle(handle: any): handle is FileSystemFileHandle {
  return handle && handle.kind === 'file';
}

// File helpers (not Pinia)
const FILE_STORE = 'jukebox_files';

export async function getJukeboxFile(id: string): Promise<JukeboxFile | undefined> {
  return idbGetItem<JukeboxFile>(FILE_STORE, id);
}

export async function getAllJukeboxFiles(): Promise<JukeboxFile[]> {
  return idbGetAllItems<JukeboxFile>(FILE_STORE);
}

export async function putJukeboxFile(file: JukeboxFile): Promise<void> {
  return idbPutItem<JukeboxFile>(FILE_STORE, file);
}

export async function deleteJukeboxFile(id: string): Promise<void> {
  return idbDeleteItem(FILE_STORE, id);
}

// Picture URL Cache Store
// This store manages object URLs for track artwork to prevent blinking effects
// caused by constantly recreating URLs on every render. It provides a centralized
// caching mechanism that can be shared between components.
export const usePictureUrlCacheStore = defineStore('pictureUrlCache', () => {
  const createdUrls = ref<string[]>([]);
  const pictureUrlCache = ref<Map<string, string>>(new Map());

  /**
   * Get a cached URL for a picture (string or Blob)
   * @param picture - The picture data (string URL or Blob)
   * @returns The cached URL string
   */
  function getPictureUrl(picture: string | Blob | undefined): string {
    if (!picture) return '';
    
    if (typeof picture === 'string') {
      return picture;
    }
    
    // Create a unique key for this blob based on its content
    const blobKey = `${picture.size}-${picture.type}`;
    
    // Check if we already have a URL for this blob
    if (pictureUrlCache.value.has(blobKey)) {
      return pictureUrlCache.value.get(blobKey)!;
    }
    
    // Create new URL and cache it
    const url = URL.createObjectURL(picture);
    pictureUrlCache.value.set(blobKey, url);
    createdUrls.value.push(url);
    return url;
  }

  /**
   * Get a CSS style object with background-image for a picture
   * @param picture - The picture data (string URL or Blob)
   * @returns CSS style object with backgroundImage property
   */
  function getPictureStyle(picture: string | Blob | undefined): { backgroundImage: string } {
    const url = getPictureUrl(picture);
    return { backgroundImage: url ? `url(${url})` : '' };
  }

  /**
   * Clear all cached URLs and revoke object URLs to free memory
   */
  function clearCache() {
    createdUrls.value.forEach((url: string) => URL.revokeObjectURL(url));
    createdUrls.value = [];
    pictureUrlCache.value.clear();
  }

  return {
    getPictureUrl,
    getPictureStyle,
    clearCache
  };
}); 