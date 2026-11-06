import type { MapFile, MapImageMetadata } from './types';
import {
  idbDeleteItem,
  idbGetAllItems,
  idbGetItem,
  idbPutItem,
} from '@/utils/storage';
import {
  deleteFileIfUnreferenced,
  isFileReferenced,
} from '@/utils/files/fileReferences';
import { getStoredFile, putStoredFile } from '@/utils/files/fileStorage';

const META_STORE = 'map_image_metadata';

export async function getMapImageMetadata(
  id: string,
): Promise<MapImageMetadata | undefined> {
  return idbGetItem<MapImageMetadata>(META_STORE, id);
}

export async function putMapImageMetadata(
  metadata: MapImageMetadata,
): Promise<void> {
  return idbPutItem<MapImageMetadata>(META_STORE, metadata);
}

export async function deleteMapImageMetadata(id: string): Promise<void> {
  return idbDeleteItem(META_STORE, id);
}

export async function getMapFile(id: string): Promise<MapFile | undefined> {
  const file = await getStoredFile(id);
  if (!file) return undefined;
  const metadata = await getMapImageMetadata(id);
  return {
    ...file,
    imageMetadata: metadata?.imageMetadata,
  };
}

export async function getAllMapFiles(): Promise<MapFile[]> {
  const metadata = await idbGetAllItems<MapImageMetadata>(META_STORE);
  const files: MapFile[] = [];
  for (const entry of metadata) {
    const file = await getStoredFile(entry.id);
    if (file) {
      files.push({ ...file, imageMetadata: entry.imageMetadata });
    }
  }
  return files;
}

export async function putMapFile(file: MapFile): Promise<void> {
  await putStoredFile(file);
  if (file.imageMetadata) {
    await putMapImageMetadata({
      id: file.id,
      imageMetadata: file.imageMetadata,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    });
  }
}

export async function deleteMapFile(id: string): Promise<void> {
  const stillReferenced = await isFileReferenced(id);
  if (!stillReferenced) {
    await deleteMapImageMetadata(id);
  }
  await deleteFileIfUnreferenced(id);
}
