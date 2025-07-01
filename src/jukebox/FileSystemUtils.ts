import { debug } from '../utils/debug';
import { debugError } from '../utils/debug';

export async function pickAudioFiles(): Promise<FileSystemFileHandle[]> {
  // Only works in Chromium browsers
  // @ts-ignore
  const handles = await window.showOpenFilePicker({
    multiple: true,
    types: [
      {
        description: 'Audio Files',
        accept: { 'audio/*': ['.mp3', '.wav', '.ogg', '.flac', '.aac'] },
      },
    ],
    excludeAcceptAllOption: true,
  });

  debug(handles);

  return handles;
}

export async function getFileFromHandle(handle: FileSystemFileHandle): Promise<File> {
  return await handle.getFile();
}

async function getAudioMetadata(file: File): Promise<{ duration: number }> {
  return new Promise((resolve, reject) => {
    const audio = document.createElement('audio');
    audio.preload = 'metadata';
    audio.src = URL.createObjectURL(file);
    audio.onloadedmetadata = () => {
        debug({ duration: audio.duration })
      resolve({ duration: audio.duration });
      URL.revokeObjectURL(audio.src);
    };
    audio.onerror = (e) => {
      reject(e);
    };
  });
}

export async function extractTrackMetadata(file: File): Promise<any> {
  const audioMetadata = await getAudioMetadata(file);

  return new Promise((resolve, reject) => {
    // Vite specific worker import: `?worker` suffix is not needed with `new URL`
    const worker = new Worker(new URL('./worker/metadata.worker.ts', import.meta.url), {
      type: 'module',
    });

    worker.onmessage = (event: MessageEvent) => {
      if (event.data.type === 'success') {
        resolve({ ...event.data.metadata, ...audioMetadata });
      } else {
        debugError('Jukebox Worker Error:', event.data.error);
        // Resolve with an empty object so the flow doesn't break
        resolve({});
      }
      worker.terminate();
    };

    worker.onerror = (error: ErrorEvent) => {
      debugError('Jukebox Worker failed to load:', error);
      // Reject or resolve with empty, depends on how you want to handle it
      resolve({});
      worker.terminate();
    };

    // Post the file to the worker to start parsing
    worker.postMessage(file);
  });
}

// The extractColorFromPicture function is no longer needed here,
// as the logic has been moved into the web worker.
// The file can be cleaned up to remove it. 
