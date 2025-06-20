/* eslint-disable no-bitwise */

// TODO: Refactor this to be more readable
// this is a modified version of color-thief by Lokesh Dhakar
// https://github.com/lokesh/color-thief/
const getColor = async (image: ImageBitmap): Promise<[number, number, number]> => {
  const canvas = new OffscreenCanvas(image.width, image.height);
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Failed to get canvas context');
  }
  context.drawImage(image, 0, 0);
  const imageData = context.getImageData(0, 0, image.width, image.height).data;
  const pixels = imageData;
  const pixelCount = image.width * image.height;

  const quantize = (pixels: Uint8ClampedArray, maxcolors: number): [number, number, number] => {
    const pixelArray: number[][] = [];
    // 1. Sample pixels
    for (let i = 0, offset, r, g, b, a; i < pixelCount; i += 10) { // Quality setting is 10
      offset = i * 4;
      r = pixels[offset + 0];
      g = pixels[offset + 1];
      b = pixels[offset + 2];
      a = pixels[offset + 3];
      // If pixel is mostly opaque and not white
      if (a >= 125) {
        if (!(r > 250 && g > 250 && b > 250)) {
          pixelArray.push([r, g, b]);
        }
      }
    }

    // 2. Group pixels into 5-bit color bins and count them
    const colorMap = new Map<number, number>();
    pixelArray.forEach((pixel: number[]) => {
      const r5 = pixel[0] >> 3;
      const g5 = pixel[1] >> 3;
      const b5 = pixel[2] >> 3;
      const key = (r5 << 10) | (g5 << 5) | b5;
      const currentCount = colorMap.get(key) || 0;
      colorMap.set(key, currentCount + 1);
    });

    // 3. Sort by frequency
    const sortedColors = Array.from(colorMap.entries()).sort((a, b) => b[1] - a[1]);

    // 4. Get the most frequent color
    if (sortedColors.length === 0) {
      // Return a default color if no pixels were sampled (e.g., fully transparent image)
      return [0, 0, 0];
    }
    const dominantColorKey = sortedColors[0][0];

    // 5. Unpack the key and convert back to 8-bit color
    const r5 = (dominantColorKey >> 10) & 0x1f;
    const g5 = (dominantColorKey >> 5) & 0x1f;
    const b5 = dominantColorKey & 0x1f;

    const r = r5 << 3;
    const g = g5 << 3;
    const b = b5 << 3;

    return [r, g, b];
  };

  return quantize(pixels, 5);
};
export default getColor;
