import { getDrawing } from './storage';

export const DRAWING_URL_PREFIX = 'drawing://';

export function drawingMarkdownUrl(id: string): string {
  return `${DRAWING_URL_PREFIX}${id}`;
}

export function parseDrawingMarkdownUrl(url: string): string | null {
  if (!url.startsWith(DRAWING_URL_PREFIX)) return null;
  const id = decodeURIComponent(url.slice(DRAWING_URL_PREFIX.length));
  return id || null;
}

/** Replace `drawing://` image sources with stored PNG previews. */
export async function hydrateDrawingUrls(root: ParentNode): Promise<void> {
  const images = root.querySelectorAll<HTMLImageElement>(
    'img[src^="drawing://"], img[data-drawing-src]',
  );
  await Promise.all(
    [...images].map(async (image) => {
      const value =
        image.getAttribute('data-drawing-src') ?? image.getAttribute('src');
      if (!value) return;
      const id = parseDrawingMarkdownUrl(value);
      if (!id) return;
      const drawing = await getDrawing(id);
      if (drawing?.preview) {
        image.setAttribute('src', drawing.preview);
        image.removeAttribute('data-drawing-src');
      }
    }),
  );
}
