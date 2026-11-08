import { debugError } from '@/utils/debug';
import { copyBlob } from './streams';
import type { FileProgress } from './types';

/** Files at or above this size go to OPFS when the picker fell back to a Blob. */
export const OPFS_THRESHOLD_BYTES = 8 * 1024 * 1024;

const FILES_DIR = 'files';

export function supportsOpfs(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    !!navigator.storage &&
    typeof navigator.storage.getDirectory === 'function'
  );
}

export function opfsPathFor(fileId: string): string {
  return `${FILES_DIR}/${fileId}`;
}

function splitPath(path: string): { directories: string[]; fileName: string } {
  const parts = path.split('/').filter(Boolean);
  const fileName = parts.pop();
  if (!fileName) throw new Error(`Invalid OPFS path: ${path}`);
  return { directories: parts, fileName };
}

async function rootDirectory(): Promise<FileSystemDirectoryHandle> {
  if (!supportsOpfs()) {
    throw new Error('OPFS is not supported in this browser');
  }
  return navigator.storage.getDirectory();
}

async function directoryFor(
  directories: string[],
  create: boolean,
): Promise<FileSystemDirectoryHandle> {
  let directory = await rootDirectory();
  for (const name of directories) {
    directory = await directory.getDirectoryHandle(name, { create });
  }
  return directory;
}

export interface OpfsWriteOptions {
  chunkSize?: number;
  signal?: AbortSignal;
  onProgress?: (progress: FileProgress) => void;
}

/**
 * Write a Blob into the origin-private file system. Bytes are streamed, so a
 * large file is never held in memory as a second copy.
 */
export async function writeOpfsFile(
  path: string,
  blob: Blob,
  options: OpfsWriteOptions = {},
): Promise<void> {
  const { directories, fileName } = splitPath(path);
  const directory = await directoryFor(directories, true);
  const handle = await directory.getFileHandle(fileName, { create: true });
  const writable = await handle.createWritable();

  try {
    await copyBlob(
      blob,
      (chunk) => writable.write(chunk as unknown as BufferSource),
      {
        chunkSize: options.chunkSize,
        signal: options.signal,
        onProgress: options.onProgress,
      },
    );
    await writable.close();
  } catch (error) {
    try {
      await writable.abort();
    } catch {
      // The stream may already be closed or aborted.
    }
    throw error;
  }
}

export async function readOpfsFile(path: string): Promise<File> {
  const { directories, fileName } = splitPath(path);
  const directory = await directoryFor(directories, false);
  const handle = await directory.getFileHandle(fileName);
  return handle.getFile();
}

export async function deleteOpfsFile(path: string): Promise<void> {
  const { directories, fileName } = splitPath(path);
  const directory = await directoryFor(directories, false);

  try {
    await directory.removeEntry(fileName, { recursive: true });
  } catch (error) {
    if ((error as DOMException | undefined)?.name !== 'NotFoundError') {
      throw error;
    }
  }
}

export interface OpfsFileInfo {
  path: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

/** List files under an OPFS directory. Used by diagnostics and tests. */
export async function listOpfsFiles(
  directoryPath = FILES_DIR,
): Promise<OpfsFileInfo[]> {
  const { directories } = splitPath(`${directoryPath}/placeholder`);
  const directory = await directoryFor(directories, false);
  const files: OpfsFileInfo[] = [];

  for await (const [name, entry] of directory.entries()) {
    if (entry.kind !== 'file') continue;
    const file = await entry.getFile();
    files.push({
      path: `${directoryPath}/${name}`,
      name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
    });
  }

  return files;
}

/** Remove the app's `files/` directory without touching other OPFS data. */
export async function clearOpfsFiles(): Promise<void> {
  if (!supportsOpfs()) return;

  try {
    const root = await rootDirectory();
    await root.removeEntry(FILES_DIR, { recursive: true });
  } catch (error) {
    if ((error as DOMException | undefined)?.name !== 'NotFoundError') {
      debugError('Failed to clear OPFS files:', error);
    }
  }
}

/** Remove every entry in the origin-private file system. */
export async function clearOpfsData(): Promise<void> {
  if (!supportsOpfs()) return;

  try {
    const root = await rootDirectory();
    const names: string[] = [];
    for await (const [name] of root.entries()) {
      names.push(name);
    }
    await Promise.all(
      names.map((name) => root.removeEntry(name, { recursive: true })),
    );
  } catch (error) {
    debugError('Failed to clear OPFS data:', error);
  }
}
