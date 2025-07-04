import { Buffer } from 'buffer';
import { type ICommonTagsResult, IPicture, parseBlob } from 'music-metadata';

import { getColor, getPalette } from './color-from-image';

// In case the global polyfill is not picked up by the worker, we can provide it here.
(self as any).Buffer = Buffer;

const getImageData = async (pic: IPicture) => {
  const blob = new Blob([pic.data], { type: pic.format });
  const bitmap = await createImageBitmap(blob);

  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Failed to get canvas context');
  }
  context.drawImage(bitmap, 0, 0);

  return {
    image: context.getImageData(0, 0, bitmap.width, bitmap.height).data,
    blob,
  };
};

self.onmessage = async (event: MessageEvent<File>) => {
  const file = event.data;
  try {
    const metadata = await parseBlob(file);
    const common: ICommonTagsResult =
      metadata.common || ({} as ICommonTagsResult);

    let picture: Blob | undefined;
    let color: string | undefined;
    let palette: null | string[];

    if (common.picture && common.picture.length > 0) {
      const { image, blob } = await getImageData(common.picture[0]);
      picture = blob;

      color = getColor(image, { sample: 10, group: 30, format: 'hex' });
      palette = getPalette(image, {
        sample: 10,
        group: 30,
        amount: 4,
        format: 'hex',
      });
    }

    const extractedData = {
      title: common.title,
      artist: common.artist,
      album: common.album,
      genre: Array.isArray(common.genre)
        ? common.genre.join(', ')
        : common.genre,
      year: common.year,
      trackNumber: common.track?.no,
      discNumber: common.disk?.no,
      composer: Array.isArray(common.composer)
        ? common.composer.join(', ')
        : common.composer,
      comment: Array.isArray(common.comment)
        ? common.comment.join(' ')
        : common.comment,
      lyrics: Array.isArray(common.lyrics)
        ? common.lyrics.join(' ')
        : common.lyrics,
      picture,
      color,
      palette,
    };
    self.postMessage({ type: 'success', metadata: extractedData });
  } catch (error) {
    self.postMessage({ type: 'error', error: (error as Error).message });
  }
};
