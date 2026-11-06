import { copyBlob } from './streams';

export interface SaveFileOptions {
  suggestedName: string;
  mimeType?: string;
  description?: string;
  /** Set to false to always use the download fallback. */
  useSavePicker?: boolean;
}

export type SaveBlobResult = 'saved' | 'downloaded' | 'cancelled';

function extensionOf(name: string): string {
  const index = name.lastIndexOf('.');
  return index >= 0 ? name.slice(index) : '';
}

function canUseSavePicker(): boolean {
  return typeof window !== 'undefined' && 'showSaveFilePicker' in window;
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Save a Blob to disk. Uses the File System Access save picker when available
 * and streams the bytes directly into the chosen file; otherwise falls back to
 * an anchor download.
 */
export async function saveBlob(
  blob: Blob,
  options: SaveFileOptions,
): Promise<SaveBlobResult> {
  if (options.useSavePicker !== false && canUseSavePicker()) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: options.suggestedName,
        types: options.mimeType
          ? [
              {
                description: options.description ?? 'File',
                accept: {
                  [options.mimeType]: [extensionOf(options.suggestedName)],
                },
              },
            ]
          : undefined,
      });
      const writable = await handle.createWritable();

      try {
        await copyBlob(blob, (chunk) =>
          writable.write(new Blob([chunk as unknown as BlobPart])),
        );
        await writable.close();
      } catch (error) {
        try {
          await writable.abort?.();
        } catch {
          // The writable may already be closed.
        }
        throw error;
      }

      return 'saved';
    } catch (error) {
      if ((error as DOMException | undefined)?.name === 'AbortError') {
        return 'cancelled';
      }
      // Fall through to the download path when the picker or write fails.
    }
  }

  downloadBlob(blob, options.suggestedName);
  return 'downloaded';
}
