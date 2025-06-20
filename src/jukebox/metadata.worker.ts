import { parseBlob } from 'music-metadata';
import getColor from './color-from-image';
import { Buffer } from 'buffer';

// In case the global polyfill is not picked up by the worker, we can provide it here.
(self as any).Buffer = Buffer;

async function extractColor(pic: { data: Uint8Array, format: string }): Promise<{ color?: string }> {
  try {
    const blob = new Blob([pic.data], { type: pic.format });
    const bitmap = await createImageBitmap(blob);
    
    const dominantColor = await getColor(bitmap);
    const color = `rgb(${dominantColor.join(',')})`;
    
    return { color };
  } catch (e) {
    console.error('Failed to extract color in worker', e);
    return {};
  }
}

self.onmessage = async (event: MessageEvent<File>) => {
  const file = event.data;
  try {
    const metadata = await parseBlob(file);
    const common = metadata.common || {};
    
    let picture: { data: Uint8Array, format: string } | undefined;
    let color: string | undefined;

    if (common.picture && common.picture.length > 0) {
      const pic = common.picture[0];
      picture = pic;
      const colorInfo = await extractColor(pic);
      color = colorInfo.color;
    }

    const extractedData = {
      title: common.title,
      artist: common.artist,
      album: common.album,
      genre: Array.isArray(common.genre) ? common.genre.join(', ') : common.genre,
      year: common.year,
      trackNumber: common.track?.no,
      discNumber: common.disk?.no,
      composer: Array.isArray(common.composer) ? common.composer.join(', ') : common.composer,
      comment: Array.isArray(common.comment) ? common.comment.join(' ') : common.comment,
      lyrics: Array.isArray(common.lyrics) ? common.lyrics.join(' ') : common.lyrics,
      picture,
      color,
    };
    const transferables = picture ? [picture.data.buffer] : [];
    self.postMessage({ type: 'success', metadata: extractedData }, { transfer: transferables });
  } catch (error) {
    self.postMessage({ type: 'error', error: (error as Error).message });
  }
}; 