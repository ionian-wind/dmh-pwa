import type { IFileHandler, AudioFileData } from './IFileHandler';
import type { JukeboxFileSource } from '@/jukebox/types';
import { extractTrackMetadata as extractMetadata } from './FileSystemUtils';
import { debug } from '@/utils/debug';

export class FileSystemFileHandler implements IFileHandler {
  name = 'FileSystemFileHandler';

  isSupported(): boolean {
    return 'showOpenFilePicker' in window;
  }

  async pickAudioFiles(): Promise<AudioFileData[]> {
    const handles = await this.showOpenFilePicker();
    const files: AudioFileData[] = [];
    for (const handle of handles) {
      const file = await handle.getFile();
      files.push({
        file,
        source: { kind: 'handle', handle },
      });
    }
    return files;
  }

  private async showOpenFilePicker(): Promise<FileSystemFileHandle[]> {
    const handles = await (window as any).showOpenFilePicker({
      multiple: true,
      types: [
        {
          description: 'Audio Files',
          accept: { 'audio/*': ['.mp3', '.wav', '.ogg', '.flac', '.aac'] },
        },
      ],
      excludeAcceptAllOption: true,
    });
    debug(handles);
    return handles;
  }

  async getFile(source: JukeboxFileSource): Promise<File> {
    if (source.kind !== 'handle') {
      throw new Error('Invalid source type for FileSystemFileHandler');
    }
    return source.handle.getFile();
  }

  async extractTrackMetadata(file: File): Promise<Record<string, unknown>> {
    return extractMetadata(file);
  }

  async getAsFileSystemHandle(
    item: DataTransferItem,
  ): Promise<FileSystemFileHandle | null> {
    const handle = await (item as any).getAsFileSystemHandle();
    if (handle && handle.kind === 'file') {
      return handle;
    }
    return null;
  }
}
