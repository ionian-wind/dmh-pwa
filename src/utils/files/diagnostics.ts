import { getAllStoredFiles } from './fileStorage';
import { getStorageEstimate, isStoragePersisted } from './persist';
import type { StoredFileSource } from './types';

export interface UnavailableFile {
  id: string;
  name: string;
  size: number;
  type: string;
  reason: 'unavailable' | 'permission';
}

export interface FileStorageDiagnostics {
  supported: boolean;
  usage: number | null;
  quota: number | null;
  persisted: boolean;
  fileCount: number;
  totalFileBytes: number;
  byKind: Record<StoredFileSource['kind'], number>;
  unavailableCount: number;
  unavailableFiles: UnavailableFile[];
}

async function handleNeedsPermission(
  source: StoredFileSource,
): Promise<boolean> {
  if (source.kind !== 'handle') return false;

  const handle = source.handle as FileSystemFileHandle & {
    queryPermission?: (options: { mode: string }) => Promise<string>;
  };
  if (typeof handle.queryPermission !== 'function') return false;

  try {
    return (await handle.queryPermission({ mode: 'read' })) !== 'granted';
  } catch {
    return true;
  }
}

export async function getFileStorageDiagnostics(): Promise<FileStorageDiagnostics> {
  const [files, estimate, persisted] = await Promise.all([
    getAllStoredFiles(),
    getStorageEstimate(),
    isStoragePersisted(),
  ]);

  const byKind: Record<StoredFileSource['kind'], number> = {
    blob: 0,
    handle: 0,
    opfs: 0,
  };
  const unavailableFiles: UnavailableFile[] = [];
  let totalFileBytes = 0;

  for (const file of files) {
    const kind = file.source?.kind;
    if (kind === 'blob' || kind === 'handle' || kind === 'opfs') {
      byKind[kind] += 1;
    } else {
      unavailableFiles.push({
        id: file.id,
        name: file.name,
        size: file.size,
        type: file.type,
        reason: 'unavailable',
      });
    }

    if (file.source && (await handleNeedsPermission(file.source))) {
      unavailableFiles.push({
        id: file.id,
        name: file.name,
        size: file.size,
        type: file.type,
        reason: 'permission',
      });
    }

    totalFileBytes += Number(file.size) || 0;
  }

  return {
    supported: estimate.supported,
    usage: estimate.usage,
    quota: estimate.quota,
    persisted,
    fileCount: files.length,
    totalFileBytes,
    byKind,
    unavailableCount: unavailableFiles.length,
    unavailableFiles,
  };
}
