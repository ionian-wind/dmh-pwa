import {
  getStoredFile,
  getStoredFileUrl,
  importFile,
} from '@/utils/files/fileStorage';

export const FILE_MARKDOWN_SCHEME = 'dmh-file://';

const urlCache = new Map<string, string>();
const pending = new Map<string, Promise<string>>();

export function fileMarkdownUrl(fileId: string): string {
  return `${FILE_MARKDOWN_SCHEME}${fileId}`;
}

export function parseFileMarkdownUrl(url: string): string | null {
  if (!url.startsWith(FILE_MARKDOWN_SCHEME)) return null;
  const id = decodeURIComponent(url.slice(FILE_MARKDOWN_SCHEME.length));
  return id || null;
}

/** Store an uploaded file through the app file layer and return its markdown URL. */
export async function uploadStoredFile(file: File): Promise<string> {
  const { file: stored } = await importFile(file, {
    storage: 'auto',
    contentHash: true,
  });
  return fileMarkdownUrl(stored.id);
}

/** Resolve a `dmh-file://` URL to a temporary object URL for rendering. */
export async function resolveStoredFileUrl(url: string): Promise<string> {
  const id = parseFileMarkdownUrl(url);
  if (!id) return url;

  const cached = urlCache.get(id);
  if (cached) return cached;

  let promise = pending.get(id);
  if (!promise) {
    promise = (async () => {
      const stored = await getStoredFile(id);
      if (!stored) return '';
      return getStoredFileUrl(stored);
    })().finally(() => pending.delete(id));
    pending.set(id, promise);
  }

  const resolved = await promise;
  if (resolved) urlCache.set(id, resolved);
  return resolved;
}

/** Replace stored-file URLs with renderable object URLs inside rendered HTML. */
export async function hydrateStoredFileUrls(root: ParentNode): Promise<void> {
  const nodes = root.querySelectorAll<HTMLElement>(
    'img[src^="dmh-file://"], img[data-file-src], a[href^="dmh-file://"]',
  );
  await Promise.all(
    [...nodes].map(async (node) => {
      const attr = node.tagName === 'A' ? 'href' : 'src';
      const value =
        node.getAttribute(node.tagName === 'A' ? 'href' : 'data-file-src') ??
        node.getAttribute(attr);
      if (!value) return;
      const resolved = await resolveStoredFileUrl(value);
      if (resolved) {
        node.setAttribute(attr, resolved);
        node.removeAttribute('data-file-src');
      }
    }),
  );
}

export function clearStoredFileUrlCache(): void {
  for (const url of urlCache.values()) URL.revokeObjectURL(url);
  urlCache.clear();
  pending.clear();
}
