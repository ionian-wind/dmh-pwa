import type { JukeboxFile, JukeboxFileSource } from '@/jukebox/types';

export interface AudioFileData {
  file: File;
  source: JukeboxFileSource;
}

export interface IFileHandler {
  name: string;
  isSupported(): boolean;
  pickAudioFiles(): Promise<AudioFileData[]>;
  getFile(source: JukeboxFileSource): Promise<File>;
  extractTrackMetadata(file: File): Promise<Record<string, unknown>>;
  getAsFileSystemHandle(
    item: DataTransferItem,
  ): Promise<FileSystemFileHandle | null>;
}
