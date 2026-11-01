import type { IFileHandler, AudioFileData } from './IFileHandler';
import type { JukeboxFileSource } from '@/jukebox/types';
import { extractTrackMetadata as extractMetadata } from './FileSystemUtils';

export class BlobFileHandler implements IFileHandler {
  name = 'BlobFileHandler';

  isSupported(): boolean {
    return true;
  }

  async pickAudioFiles(): Promise<AudioFileData[]> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.accept = 'audio/*,.mp3,.wav,.ogg,.flac,.aac';

      let settled = false;
      const finish = (files: AudioFileData[]) => {
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

      input.onchange = async () => {
        if (!input.files) {
          finish([]);
          return;
        }

        const files: AudioFileData[] = [];
        for (const file of input.files) {
          files.push({
            file,
            source: { kind: 'blob', blob: file },
          });
        }
        finish(files);
      };

      input.addEventListener('cancel', () => finish([]));
      window.addEventListener('focus', handleFocus, { once: true });

      input.click();
    });
  }

  async getFile(source: JukeboxFileSource): Promise<File> {
    if (source.kind !== 'blob') {
      throw new Error('Invalid source type for BlobFileHandler');
    }
    const blob = source.blob;
    const name = (blob as File).name || 'unnamed';
    return new File([blob], name, {
      type: blob.type,
    });
  }

  async extractTrackMetadata(file: File): Promise<Record<string, unknown>> {
    return extractMetadata(file);
  }

  async getAsFileSystemHandle(
    _item: DataTransferItem,
  ): Promise<FileSystemFileHandle | null> {
    return null;
  }
}
