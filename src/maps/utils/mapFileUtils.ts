import { debug, debugError } from '@/utils/debug';
import { extractImageMetadata } from './imageWorker';
import type { ImageMetadata } from './imageWorker';
import type { MapFile, MapFileSource } from '../types';
import { generateId } from '@/utils/storage';

async function loadImageDimensions(blob: Blob): Promise<ImageMetadata> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(blob);
    const result = {
      width: bitmap.width,
      height: bitmap.height,
      naturalWidth: bitmap.width,
      naturalHeight: bitmap.height,
      aspectRatio: bitmap.width / bitmap.height,
      fileSize: blob.size,
      mimeType: blob.type,
    };
    bitmap.close?.();
    return result;
  }

  return {
    width: 0,
    height: 0,
    aspectRatio: 1,
    fileSize: blob.size,
    mimeType: blob.type,
  };
}

async function buildMapFile(
  file: File,
  source: MapFileSource,
  name?: string,
): Promise<MapFile> {
  let imageMetadata: ImageMetadata | undefined;
  if (file.type.startsWith('image/')) {
    try {
      imageMetadata = await extractImageMetadata(file);
      debug('Extracted image metadata:', imageMetadata);
    } catch (error) {
      debugError('Failed to extract image metadata:', error);
      imageMetadata = await loadImageDimensions(file);
    }
  }

  return {
    id: generateId(),
    name: name || file.name,
    size: file.size,
    type: file.type,
    lastModified: file.lastModified,
    source,
    imageMetadata,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export async function createMapFileFromFile(file: File): Promise<MapFile> {
  return buildMapFile(file, { kind: 'blob', blob: file });
}

export async function createMapFileFromHandle(
  handle: FileSystemFileHandle,
  name?: string,
): Promise<MapFile> {
  const file = await handle.getFile();
  return buildMapFile(file, { kind: 'handle', handle }, name);
}

export async function getMapFileBlob(mapFile: MapFile): Promise<Blob> {
  if (mapFile.source?.kind === 'blob') return mapFile.source.blob;
  if (mapFile.source?.kind === 'handle') {
    return mapFile.source.handle.getFile();
  }
  const legacyHandle = (mapFile as any).handle as
    | FileSystemFileHandle
    | undefined;
  if (legacyHandle) return legacyHandle.getFile();
  throw new Error('Map file has no readable source');
}

export async function updateMapFileMetadata(
  mapFile: MapFile,
): Promise<MapFile> {
  try {
    const file = await getMapFileBlob(mapFile);
    if (file.type.startsWith('image/')) {
      const imageMetadata = await extractImageMetadata(
        file instanceof File
          ? file
          : new File([file], mapFile.name, { type: file.type }),
      );
      debug('Updated image metadata:', imageMetadata);
      return { ...mapFile, imageMetadata, updatedAt: Date.now() };
    }
  } catch (error) {
    debugError('Failed to update image metadata:', error);
  }

  return mapFile;
}

export async function getMapFileUrl(mapFile: MapFile): Promise<string> {
  const blob = await getMapFileBlob(mapFile);
  return URL.createObjectURL(blob);
}

export function revokeMapFileUrl(url: string): void {
  URL.revokeObjectURL(url);
}
