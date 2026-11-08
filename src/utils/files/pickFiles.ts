import type { StoredFileSource } from './types';

export interface PickedFile {
  file: File;
  source: StoredFileSource;
}

export interface PickFilesOptions {
  multiple?: boolean;
  description?: string;
  accept?: Record<string, string[]>;
  acceptAttribute?: string;
  excludeAcceptAllOption?: boolean;
}

export interface DirectoryPickOptions {
  accept?: Record<string, string[]>;
  acceptAttribute?: string;
  recursive?: boolean;
  signal?: AbortSignal;
  onProgress?: (file: File, index: number, total: number) => void;
}

export function canUseFileSystemAccess(): boolean {
  return typeof window !== 'undefined' && 'showOpenFilePicker' in window;
}

export function canUseDirectoryPicker(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

function isAbortError(error: unknown): boolean {
  return (error as DOMException | undefined)?.name === 'AbortError';
}

async function pickWithFileSystemAccess(
  options: PickFilesOptions,
): Promise<PickedFile[]> {
  const handles = await (window as any).showOpenFilePicker({
    multiple: options.multiple ?? false,
    types:
      options.accept && options.description
        ? [{ description: options.description, accept: options.accept }]
        : undefined,
    excludeAcceptAllOption: options.excludeAcceptAllOption ?? true,
  });
  const files: PickedFile[] = [];
  for (const handle of handles as FileSystemFileHandle[]) {
    files.push({
      file: await handle.getFile(),
      source: { kind: 'handle', handle },
    });
  }
  return files;
}

function pickWithInput(
  options: PickFilesOptions & { directory?: boolean },
): Promise<PickedFile[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = options.multiple ?? false;
    input.accept =
      options.acceptAttribute ??
      Object.entries(options.accept ?? {})
        .flatMap(([type, extensions]) => [type, ...extensions])
        .join(',');
    if (options.directory) {
      (input as any).webkitdirectory = true;
    }

    let settled = false;
    const finish = (files: PickedFile[]) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('focus', handleFocus);
      resolve(files);
    };

    const handleFocus = () => {
      // Some browsers do not fire `cancel`; when focus returns and no
      // selection happened, resolve with an empty list.
      setTimeout(() => {
        if (!settled && (!input.files || input.files.length === 0)) {
          finish([]);
        }
      }, 500);
    };

    input.onchange = () => {
      if (!input.files) {
        finish([]);
        return;
      }
      finish(
        Array.from(input.files).map((file) => ({
          file,
          source: { kind: 'blob', blob: file },
        })),
      );
    };

    input.addEventListener('cancel', () => finish([]));
    window.addEventListener('focus', handleFocus, { once: true });
    input.click();
  });
}

/**
 * Pick one or more files using the File System Access API when possible and
 * fall back to a regular file input (blob sources) otherwise.
 */
export async function pickFiles(
  options: PickFilesOptions = {},
): Promise<PickedFile[]> {
  if (canUseFileSystemAccess()) {
    try {
      return await pickWithFileSystemAccess(options);
    } catch (error) {
      if (isAbortError(error)) return [];
      // Fall through to the input picker.
    }
  }
  return pickWithInput(options);
}

function matchesAccept(file: File, accept?: Record<string, string[]>): boolean {
  if (!accept) return true;

  return Object.entries(accept).some(([mime, extensions]) => {
    if (mime.endsWith('/*') && file.type.startsWith(mime.slice(0, -1))) {
      return true;
    }
    if (mime === file.type) return true;
    return extensions.some((extension) =>
      file.name.toLowerCase().endsWith(extension.toLowerCase()),
    );
  });
}

async function collectDirectoryFiles(
  directory: FileSystemDirectoryHandle,
  options: DirectoryPickOptions,
  collected: PickedFile[],
): Promise<void> {
  for await (const entry of directory.values()) {
    if (options.signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    if (entry.kind === 'file') {
      const file = await entry.getFile();
      if (matchesAccept(file, options.accept)) {
        collected.push({
          file,
          source: { kind: 'handle', handle: entry },
        });
      }
      continue;
    }

    if (options.recursive) {
      await collectDirectoryFiles(entry, options, collected);
    }
  }
}

/**
 * Pick a directory and return its files as handles. Falls back to a
 * `webkitdirectory` input when the File System Access directory picker is not
 * available.
 */
export async function pickDirectory(
  options: DirectoryPickOptions = {},
): Promise<PickedFile[]> {
  if (canUseDirectoryPicker()) {
    try {
      const directory = await (window as any).showDirectoryPicker({
        mode: 'read',
      });
      const collected: PickedFile[] = [];
      await collectDirectoryFiles(directory, options, collected);
      collected.forEach((picked, index) => {
        options.onProgress?.(picked.file, index + 1, collected.length);
      });
      return collected;
    } catch (error) {
      if (isAbortError(error)) return [];
      // Fall through to the input fallback.
    }
  }

  return pickWithInput({
    multiple: true,
    accept: options.accept,
    acceptAttribute: options.acceptAttribute,
    directory: true,
  });
}

export async function getPickedFileFromDataTransferItem(
  item: DataTransferItem,
): Promise<PickedFile | null> {
  if ('getAsFileSystemHandle' in item) {
    try {
      const handle = await (item as any).getAsFileSystemHandle();
      if (handle?.kind === 'file') {
        return {
          file: await handle.getFile(),
          source: { kind: 'handle', handle },
        };
      }
    } catch {
      // Fall back to a regular File below.
    }
  }
  const file = item.getAsFile();
  return file ? { file, source: { kind: 'blob', blob: file } } : null;
}
