import {
  generateId,
  idbDeleteItem,
  idbGetAllItems,
  idbGetItem,
  idbPutItem,
} from '@/utils/storage';
import type { ImportedFile, StoredFile, StoredFileSource } from './types';
import { buildFileSignature } from './signature';

export const FILE_STORE = 'files';
export { buildFileSignature } from './signature';

export async function getStoredFile(
  id: string,
): Promise<StoredFile | undefined> {
  return idbGetItem<StoredFile>(FILE_STORE, id);
}

export async function getAllStoredFiles(): Promise<StoredFile[]> {
  return idbGetAllItems<StoredFile>(FILE_STORE);
}

export async function putStoredFile(file: StoredFile): Promise<void> {
  return idbPutItem<StoredFile>(FILE_STORE, file);
}

export async function deleteStoredFile(id: string): Promise<void> {
  return idbDeleteItem(FILE_STORE, id);
}

export async function findStoredFileBySignature(
  signature: string,
): Promise<StoredFile | undefined> {
  const files = await getAllStoredFiles();
  return files.find((file) => file.signature === signature);
}

export function createStoredFile(
  file: File,
  source: StoredFileSource,
  now = Date.now(),
): StoredFile {
  return {
    id: generateId(),
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: file.lastModified,
    signature: buildFileSignature(file),
    source,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Store a file unless an equivalent file (same name, size, modified time and
 * MIME type) already exists. Business records should still keep their own
 * metadata records and deletion checks.
 */
export async function importStoredFile(
  file: File,
  source: StoredFileSource,
): Promise<ImportedFile> {
  const signature = buildFileSignature(file);
  const existing = await findStoredFileBySignature(signature);
  if (existing) return { file: existing, created: false };

  const stored = createStoredFile(file, source);
  await putStoredFile(stored);
  return { file: stored, created: true };
}

export async function getStoredFileBlob(file: StoredFile): Promise<Blob> {
  if (file.source.kind === 'blob') return file.source.blob;
  return file.source.handle.getFile();
}

export async function getStoredFileUrl(file: StoredFile): Promise<string> {
  return URL.createObjectURL(await getStoredFileBlob(file));
}

export function revokeStoredFileUrl(url: string): void {
  URL.revokeObjectURL(url);
}
