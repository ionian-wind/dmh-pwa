import {
  generateId,
  idbDeleteItem,
  idbGetAllItems,
  idbGetItem,
  idbPutItem,
} from '@/utils/storage';
import { debugError } from '@/utils/debug';
import type {
  FileProgress,
  FileStorageStrategy,
  ImportedFile,
  StoredFile,
  StoredFileSource,
} from './types';
import { buildFileSignature } from './signature';
import {
  OPFS_THRESHOLD_BYTES,
  deleteOpfsFile,
  opfsPathFor,
  readOpfsFile,
  supportsOpfs,
  writeOpfsFile,
} from './opfs';
import { requestPersistentStorage } from './persist';

export const FILE_STORE = 'files';
export { buildFileSignature } from './signature';

export interface ImportFileOptions {
  /** Where to store the bytes. `auto` preserves handles and sends large blobs to OPFS. */
  storage?: FileStorageStrategy;
  signal?: AbortSignal;
  onProgress?: (progress: FileProgress) => void;
}

async function resolveSourceForStorage(
  file: File,
  source: StoredFileSource,
  fileId: string,
  options: ImportFileOptions,
): Promise<StoredFileSource> {
  const strategy = options.storage ?? 'auto';

  if (strategy === 'handle' || strategy === 'blob') return source;
  if (!supportsOpfs()) {
    if (strategy === 'opfs') {
      throw new Error('OPFS is not supported in this browser');
    }
    return source;
  }
  if (strategy === 'auto' && source.kind === 'handle') return source;
  if (strategy === 'auto' && file.size < OPFS_THRESHOLD_BYTES) return source;

  const path = opfsPathFor(fileId);
  try {
    await writeOpfsFile(path, file, {
      signal: options.signal,
      onProgress: options.onProgress,
    });
    void requestPersistentStorage();
    return { kind: 'opfs', path };
  } catch (error) {
    if (strategy === 'opfs') throw error;
    debugError('Failed to store file in OPFS; falling back to blob:', error);
    return source;
  }
}

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
  const existing = await getStoredFile(id);
  await idbDeleteItem(FILE_STORE, id);

  if (existing?.source.kind === 'opfs') {
    try {
      await deleteOpfsFile(existing.source.path);
    } catch (error) {
      debugError('Failed to delete OPFS file:', error);
    }
  }
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
  options: ImportFileOptions = {},
): Promise<ImportedFile> {
  const signature = buildFileSignature(file);
  const existing = await findStoredFileBySignature(signature);
  if (existing) return { file: existing, created: false };

  const candidate = createStoredFile(file, source);
  const resolvedSource = await resolveSourceForStorage(
    file,
    source,
    candidate.id,
    options,
  );
  const stored: StoredFile = { ...candidate, source: resolvedSource };

  try {
    await putStoredFile(stored);
  } catch (error) {
    if (resolvedSource.kind === 'opfs') {
      try {
        await deleteOpfsFile(resolvedSource.path);
      } catch {
        // Keep the original write error.
      }
    }
    throw error;
  }

  return { file: stored, created: true };
}

/**
 * Import a file with a caller-provided source, or treat it as a Blob when no
 * source is supplied. Use `storage` to force OPFS/IDB for fallback picks.
 */
export async function importFile(
  file: File,
  options: ImportFileOptions & { source?: StoredFileSource } = {},
): Promise<ImportedFile> {
  const { source = { kind: 'blob', blob: file }, ...importOptions } = options;
  return importStoredFile(file, source, importOptions);
}

export async function getStoredFileBlob(file: StoredFile): Promise<Blob> {
  if (file.source.kind === 'blob') return file.source.blob;
  if (file.source.kind === 'opfs') return readOpfsFile(file.source.path);
  return file.source.handle.getFile();
}

export async function getStoredFileUrl(file: StoredFile): Promise<string> {
  return URL.createObjectURL(await getStoredFileBlob(file));
}

export function revokeStoredFileUrl(url: string): void {
  URL.revokeObjectURL(url);
}
