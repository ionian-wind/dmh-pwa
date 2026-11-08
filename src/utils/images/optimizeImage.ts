export interface OptimizeImageOptions {
  /** Longest output side in pixels. Default 8192. */
  maxDimension?: number;
  /** Lossy WebP quality, 0..1. Default 0.9 (0.95 for PNG sources). */
  quality?: number;
  /** Files below this size are left untouched. Default 1 MB. */
  minSizeBytes?: number;
  /** Skip re-encoding when the result is not at least this much smaller. */
  minSavingRatio?: number;
}

const DEFAULT_OPTIONS: Required<OptimizeImageOptions> = {
  maxDimension: 8192,
  quality: 0.9,
  minSizeBytes: 1024 * 1024,
  minSavingRatio: 0.95,
};

function isOptimizableImage(file: File): boolean {
  if (!file.type.startsWith('image/')) return false;
  // SVG is vector; animated GIFs must keep their frames.
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') return false;
  return true;
}

function fitWithin(
  width: number,
  height: number,
  maxDimension: number,
): { width: number; height: number } {
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function encodeCanvas(
  canvas: OffscreenCanvas | HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  if ('convertToBlob' in canvas) {
    return canvas.convertToBlob({ type, quality });
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

/**
 * Re-encode a large raster image as WebP before it is stored locally.
 *
 * The original file is returned when the input is already small, when the
 * format must be preserved (SVG/GIF), when decoding fails, or when re-encoding
 * does not save enough space.
 */
export async function optimizeImageFile(
  file: File,
  options: OptimizeImageOptions = {},
): Promise<File> {
  const config = { ...DEFAULT_OPTIONS, ...options };

  if (
    !isOptimizableImage(file) ||
    file.size < config.minSizeBytes ||
    typeof createImageBitmap !== 'function'
  ) {
    return file;
  }

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const size = fitWithin(bitmap.width, bitmap.height, config.maxDimension);
    const canvas =
      typeof OffscreenCanvas !== 'undefined'
        ? new OffscreenCanvas(size.width, size.height)
        : Object.assign(document.createElement('canvas'), size);
    const context = canvas.getContext('2d');

    if (!context) return file;

    context.drawImage(bitmap, 0, 0, size.width, size.height);

    const quality = file.type === 'image/png' ? 0.95 : config.quality;
    const blob = await encodeCanvas(canvas, 'image/webp', quality);

    if (!blob || blob.type !== 'image/webp') return file;
    if (blob.size >= file.size * config.minSavingRatio) return file;

    return new File([blob], file.name, {
      type: blob.type,
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  } finally {
    bitmap?.close?.();
  }
}
