import { debug, debugError } from '@/utils/debug';
import { extractImageMetadata } from './imageWorker';
import type { MapFile } from '../types';
import { generateId } from '@/utils/storage';

export async function createMapFileFromHandle(
  handle: FileSystemFileHandle,
  name?: string
): Promise<MapFile> {
  const file = await handle.getFile();
  const id = generateId();
  
  let imageMetadata;
  try {
    // Only extract metadata for image files
    if (file.type.startsWith('image/')) {
      imageMetadata = await extractImageMetadata(file);
      debug('Extracted image metadata:', imageMetadata);
    }
  } catch (error) {
    debugError('Failed to extract image metadata:', error);
    // Continue without metadata rather than failing
  }

  const mapFile: MapFile = {
    id,
    name: name || file.name,
    size: file.size,
    type: file.type,
    lastModified: file.lastModified,
    handle,
    imageMetadata,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  return mapFile;
}

export async function updateMapFileMetadata(
  mapFile: MapFile
): Promise<MapFile> {
  try {
    const file = await mapFile.handle.getFile();
    
    // Only extract metadata for image files
    if (file.type.startsWith('image/')) {
      const imageMetadata = await extractImageMetadata(file);
      debug('Updated image metadata:', imageMetadata);
      
      return {
        ...mapFile,
        imageMetadata,
        updatedAt: Date.now(),
      };
    }
  } catch (error) {
    debugError('Failed to update image metadata:', error);
  }

  return mapFile;
}

export async function getMapFileUrl(mapFile: MapFile): Promise<string> {
  const file = await mapFile.handle.getFile();
  return URL.createObjectURL(file);
}

export function revokeMapFileUrl(url: string): void {
  URL.revokeObjectURL(url);
} 
