import type { StoredFileSource } from './types';

export async function getFileFromSource(
  source: StoredFileSource,
): Promise<File> {
  if (source.kind === 'handle') {
    return source.handle.getFile();
  }
  const blob = source.blob;
  return new File([blob], (blob as File).name || 'unnamed', {
    type: blob.type,
  });
}

export async function getUrlFromSource(
  source: StoredFileSource,
): Promise<string> {
  return URL.createObjectURL(await getFileFromSource(source));
}

export function revokeSourceUrl(url: string): void {
  URL.revokeObjectURL(url);
}

export async function verifySourcePermission(
  source: StoredFileSource,
  mode: 'read' | 'readwrite' = 'read',
): Promise<boolean> {
  if (source.kind !== 'handle') return true;
  const handle = source.handle as FileSystemFileHandle & {
    queryPermission?: (options: { mode: string }) => Promise<string>;
    requestPermission?: (options: { mode: string }) => Promise<string>;
  };
  const query = await handle.queryPermission?.({ mode });
  if (query === 'granted') return true;
  try {
    const request = await handle.requestPermission?.({ mode });
    return request === 'granted';
  } catch {
    return false;
  }
}
