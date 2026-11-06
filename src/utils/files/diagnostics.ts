import { getAllStoredFiles } from './fileStorage';
import { getStorageEstimate, isStoragePersisted } from './persist';
import type { StoredFileSource } from './types';

export interface FileStorageDiagnostics {
  supported: boolean;
  usage: number | null;
  quota: number | null;
  persisted: boolean;
  fileCount: number;
  totalFileBytes: number;
  byKind: Record<StoredFileSource['kind'], number>;
  unavailableCount: number;
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
  let totalFileBytes = 0;
  let unavailableCount = 0;

  for (const file of files) {
    const kind = file.source?.kind;
    if (kind === 'blob' || kind === 'handle' || kind === 'opfs') {
      byKind[kind] += 1;
    } else {
      unavailableCount += 1;
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
    unavailableCount,
  };
}
