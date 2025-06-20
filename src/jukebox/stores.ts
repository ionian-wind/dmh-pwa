import { useStore, idbGetItem, idbPutItem, idbDeleteItem, idbGetAllItems } from '@/utils/storage';
import type { JukeboxPlaylist, JukeboxTrack, JukeboxFile } from './types';

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