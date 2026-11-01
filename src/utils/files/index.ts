export { type IFileHandler, type AudioFileData } from './IFileHandler';
export { FileSystemFileHandler } from './FileSystemFileHandler';
export { BlobFileHandler } from './BlobFileHandler';

import { FileSystemFileHandler } from './FileSystemFileHandler';
import { BlobFileHandler } from './BlobFileHandler';

export function createFileHandler(): FileSystemFileHandler | BlobFileHandler {
  if ('showOpenFilePicker' in window) {
    return new FileSystemFileHandler();
  }
  return new BlobFileHandler();
}

export const fileHandler = createFileHandler();
