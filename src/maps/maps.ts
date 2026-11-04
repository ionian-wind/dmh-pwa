import type { MapFile } from './types';
import {
  idbGetItem,
  idbPutItem,
  idbDeleteItem,
  idbGetAllItems,
} from '@/utils/storage';

// Direct file handler storage helpers (not Pinia)
const FILE_STORE = 'map_files';

export async function getMapFile(id: string): Promise<MapFile | undefined> {
  return idbGetItem<MapFile>(FILE_STORE, id);
}

export async function getAllMapFiles(): Promise<MapFile[]> {
  return idbGetAllItems<MapFile>(FILE_STORE);
}

export async function putMapFile(file: MapFile): Promise<void> {
  return idbPutItem<MapFile>(FILE_STORE, file);
}

export async function deleteMapFile(id: string): Promise<void> {
  return idbDeleteItem(FILE_STORE, id);
}
