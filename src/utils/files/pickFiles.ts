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

export function canUseFileSystemAccess(): boolean {
  return typeof window !== 'undefined' && 'showOpenFilePicker' in window;
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

function pickWithInput(options: PickFilesOptions): Promise<PickedFile[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = options.multiple ?? false;
    input.accept =
      options.acceptAttribute ??
      Object.entries(options.accept ?? {})
        .flatMap(([type, extensions]) => [type, ...extensions])
        .join(',');

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
