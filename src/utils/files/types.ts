import type { WithMetadata } from '@/types';

export type StoredFileSource =
  | { kind: 'blob'; blob: Blob }
  | { kind: 'handle'; handle: FileSystemFileHandle }
  | { kind: 'opfs'; path: string };

export type FileStorageStrategy = 'auto' | 'handle' | 'opfs' | 'blob';

export interface FileProgress {
  loaded: number;
  total: number;
  percent: number;
}

export interface StoredFile extends WithMetadata {
  id: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  signature: string;
  /** Optional SHA-256 of the file bytes. */
  contentHash?: string;
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
