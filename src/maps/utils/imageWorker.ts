import { debug, debugError } from '../../utils/debug';

export interface ImageMetadata {
  width: number;
  height: number;
  naturalWidth?: number;
  naturalHeight?: number;
  aspectRatio: number;
  fileSize?: number;
  mimeType?: string;
  color?: string;
  palette?: string[];
}

export async function extractImageMetadata(file: File): Promise<ImageMetadata> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../worker/image.worker.ts', import.meta.url), {
      type: 'module',
    });

    worker.onmessage = (event: MessageEvent) => {
      if (event.data.type === 'success') {
        resolve(event.data.metadata);
      } else {
        debugError('Image Worker Error:', event.data.error);
        reject(new Error(event.data.error));
      }
      worker.terminate();
    };

    worker.onerror = (error: ErrorEvent) => {
      debugError('Image Worker failed to load:', error);
      reject(error);
      worker.terminate();
    };

    worker.postMessage(file);
  });
}

export async function extractImageMetadataFromUrl(url: string): Promise<ImageMetadata> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../worker/image.worker.ts', import.meta.url), {
      type: 'module',
    });

    worker.onmessage = (event: MessageEvent) => {
      if (event.data.type === 'success') {
        resolve(event.data.metadata);
      } else {
        debugError('Image Worker Error:', event.data.error);
        reject(new Error(event.data.error));
      }
      worker.terminate();
    };

    worker.onerror = (error: ErrorEvent) => {
      debugError('Image Worker failed to load:', error);
      reject(error);
      worker.terminate();
    };

    worker.postMessage(url);
  });
} 
