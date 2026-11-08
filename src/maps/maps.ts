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
import {
  OPFS_THRESHOLD_BYTES,
  opfsPathFor,
  supportsOpfs,
  writeOpfsFile,
} from '@/utils/files/opfs';
import { debugError } from '@/utils/debug';

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
  let stored = file;

  if (
    file.source?.kind === 'blob' &&
    file.size >= OPFS_THRESHOLD_BYTES &&
    supportsOpfs()
  ) {
    try {
      const path = opfsPathFor(file.id);
      await writeOpfsFile(path, file.source.blob);
      stored = { ...file, source: { kind: 'opfs', path } };
    } catch (error) {
      debugError('Failed to promote map file to OPFS:', error);
    }
  }

  await putStoredFile(stored);
  if (stored.imageMetadata) {
    await putMapImageMetadata({
      id: stored.id,
      imageMetadata: stored.imageMetadata,
      createdAt: stored.createdAt,
      updatedAt: stored.updatedAt,
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
