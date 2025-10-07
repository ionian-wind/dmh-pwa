interface ImageMetadata {
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

interface ImageWorkerMessage {
  type: 'success' | 'error';
  metadata?: ImageMetadata;
  error?: string;
}

const getImageData = async (file: File): Promise<ImageData> => {
  const bitmap = await createImageBitmap(file);
  
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Failed to get canvas context');
  }
  context.drawImage(bitmap, 0, 0);

  return context.getImageData(0, 0, bitmap.width, bitmap.height);
}

const getColor = (imageData: ImageData, sample: number = 10, group: number = 30): string => {
  const data = imageData.data;
  const gap = 4 * sample;
  const amount = data.length / gap;
  const rgb = { r: 0, g: 0, b: 0 };

  for (let i = 0; i < data.length; i += gap) {
    rgb.r += data[i];
    rgb.g += data[i + 1];
    rgb.b += data[i + 2];
  }

  const avgR = Math.round(rgb.r / amount);
  const avgG = Math.round(rgb.g / amount);
  const avgB = Math.round(rgb.b / amount);

  return '#' + [avgR, avgG, avgB].map(val => {
    const hex = val.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

const getPalette = (imageData: ImageData, sample: number = 10, group: number = 30, amount: number = 4): string[] => {
  const data = imageData.data;
  const gap = 4 * sample;
  const colors: { [key: string]: number } = {};

  for (let i = 0; i < data.length; i += gap) {
    const rgb = [
      Math.round(data[i] / group) * group,
      Math.round(data[i + 1] / group) * group,
      Math.round(data[i + 2] / group) * group,
    ].join();

    colors[rgb] = colors[rgb] ? colors[rgb] + 1 : 1;
  }

  return Object.entries(colors)
    .sort(([_keyA, valA], [_keyB, valB]) => valA > valB ? -1 : 1)
    .slice(0, amount)
    .map(([rgb]) => {
      const [r, g, b] = rgb.split(',').map(Number);
      return '#' + [r, g, b].map(val => {
        const hex = val.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      }).join('');
    });
}

self.onmessage = async (event: MessageEvent<File | string>) => {
  try {
    let file: File;
    let url: string | undefined;

    if (typeof event.data === 'string') {
      // Handle URL string
      url = event.data;
      const response = await fetch(url);
      file = new File([await response.blob()], 'image.jpg', { type: response.headers.get('content-type') || 'image/jpeg' });
    } else {
      // Handle File object
      file = event.data;
    }

    const bitmap = await createImageBitmap(file);
    const imageData = await getImageData(file);

    const metadata: ImageMetadata = {
      width: bitmap.width,
      height: bitmap.height,
      naturalWidth: bitmap.width,
      naturalHeight: bitmap.height,
      aspectRatio: bitmap.width / bitmap.height,
      fileSize: file.size,
      mimeType: file.type,
      color: getColor(imageData),
      palette: getPalette(imageData),
    };

    const message: ImageWorkerMessage = {
      type: 'success',
      metadata,
    };

    self.postMessage(message);
  } catch (error) {
    const message: ImageWorkerMessage = {
      type: 'error',
      error: (error as Error).message,
    };
    self.postMessage(message);
  }
}; 
