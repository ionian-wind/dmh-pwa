import { unzip, type ZipEntry } from 'unzipit';

export type ZipEntries = Record<string, ZipEntry>;

/**
 * Open a ZIP archive through a Blob reader. unzipit reads the central
 * directory and individual entries via Blob slices, so a large archive does not
 * need to be copied into a single ArrayBuffer first.
 */
export async function openZip(blob: Blob): Promise<ZipEntries> {
  const { entries } = await unzip(blob);
  return entries;
}

export async function readZipText(
  entries: ZipEntries,
  candidates: string[],
): Promise<string | null> {
  for (const path of candidates) {
    const entry = entries[path];
    if (entry && !entry.isDirectory) return entry.text();
  }
  return null;
}

export async function readZipBlob(
  entries: ZipEntries,
  candidates: string[],
): Promise<Blob | null> {
  for (const path of candidates) {
    const entry = entries[path];
    if (entry && !entry.isDirectory) return entry.blob();
  }
  return null;
}

export function listZipFiles(entries: ZipEntries, prefix: string): ZipEntry[] {
  return Object.values(entries).filter(
    (entry) => !entry.isDirectory && entry.name.startsWith(prefix),
  );
}
