import { deleteStoredFile } from './fileStorage';
import type { FileReferenceProvider } from './types';

const providers = new Set<FileReferenceProvider>();

export function registerFileReferenceProvider(
  provider: FileReferenceProvider,
): () => void {
  providers.add(provider);
  return () => providers.delete(provider);
}

export async function isFileReferenced(fileId: string): Promise<boolean> {
  for (const provider of providers) {
    if (await provider.isReferenced(fileId)) return true;
  }
  return false;
}

/**
 * Delete a generic file only when no registered business domain still points
 * at it.
 */
export async function deleteFileIfUnreferenced(
  fileId: string,
): Promise<boolean> {
  if (await isFileReferenced(fileId)) return false;
  await deleteStoredFile(fileId);
  return true;
}
