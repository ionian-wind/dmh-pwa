import type { WithMetadata } from '@/types';

export type StoredFileSource =
  | { kind: 'blob'; blob: Blob }
  | { kind: 'handle'; handle: FileSystemFileHandle };

export interface StoredFile extends WithMetadata {
  id: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  signature: string;
  source: StoredFileSource;
}

export interface ImportedFile {
  file: StoredFile;
  created: boolean;
}

export interface FileReferenceProvider {
  id: string;
  isReferenced: (fileId: string) => boolean | Promise<boolean>;
}
