import { afterEach, describe, expect, it, vi } from 'vitest';
import { optimizeImageFile } from '@/utils/images/optimizeImage';

class FakeCanvas {
  static result: Blob = new Blob(['webp'], { type: 'image/webp' });
  static last: FakeCanvas | null = null;

  width: number;
  height: number;
  drawImage = vi.fn();

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    FakeCanvas.last = this;
  }

  getContext() {
    return { drawImage: this.drawImage };
  }

  async convertToBlob() {
    return FakeCanvas.result;
  }
}

const bitmap = (width = 10_000, height = 5_000) => ({
  width,
  height,
  close: vi.fn(),
});

function largeFile(name = 'map.jpg', type = 'image/jpeg') {
  return new File([new Uint8Array(1_100_000)], name, { type });
}

describe('optimizeImageFile', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    FakeCanvas.last = null;
    FakeCanvas.result = new Blob(['webp'], { type: 'image/webp' });
  });

  it('resizes and re-encodes a large raster image as WebP', async () => {
    vi.stubGlobal('OffscreenCanvas', FakeCanvas);
    const imageBitmap = bitmap();
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(imageBitmap));

    const result = await optimizeImageFile(largeFile());

    expect(result.name).toBe('map.jpg');
    expect(result.type).toBe('image/webp');
    expect(FakeCanvas.last).toMatchObject({ width: 8192, height: 4096 });
    expect(FakeCanvas.last?.drawImage).toHaveBeenCalledWith(
      imageBitmap,
      0,
      0,
      8192,
      4096,
    );
    expect(imageBitmap.close).toHaveBeenCalled();
  });

  it('leaves small, vector, animated and failed images untouched', async () => {
    vi.stubGlobal('OffscreenCanvas', FakeCanvas);
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bitmap()));

    const small = new File(['tiny'], 'tiny.jpg', { type: 'image/jpeg' });
    await expect(optimizeImageFile(small)).resolves.toBe(small);

    const svg = new File(['<svg/>'], 'icon.svg', { type: 'image/svg+xml' });
    await expect(optimizeImageFile(svg, { minSizeBytes: 0 })).resolves.toBe(
      svg,
    );

    const gif = new File(['gif'], 'anim.gif', { type: 'image/gif' });
    await expect(optimizeImageFile(gif, { minSizeBytes: 0 })).resolves.toBe(
      gif,
    );

    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockRejectedValue(new Error('decode failed')),
    );
    await expect(
      optimizeImageFile(largeFile('bad.jpg'), { minSizeBytes: 0 }),
    ).resolves.toMatchObject({ name: 'bad.jpg' });
  });

  it('keeps the original when WebP is unavailable or saving is too small', async () => {
    vi.stubGlobal('OffscreenCanvas', FakeCanvas);
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bitmap()));
    const file = largeFile();

    FakeCanvas.result = new Blob(['png'], { type: 'image/png' });
    await expect(optimizeImageFile(file)).resolves.toBe(file);

    FakeCanvas.result = new Blob([new Uint8Array(file.size)], {
      type: 'image/webp',
    });
    await expect(optimizeImageFile(file)).resolves.toBe(file);
  });

  it('uses a regular canvas when OffscreenCanvas is unavailable', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bitmap()));
    vi.stubGlobal('OffscreenCanvas', undefined);
    const context = { drawImage: vi.fn() };
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => context),
      toBlob: vi.fn((callback: BlobCallback) =>
        callback(new Blob(['webp'], { type: 'image/webp' })),
      ),
    };
    const createElement = vi
      .spyOn(document, 'createElement')
      .mockReturnValue(canvas as any);

    await expect(optimizeImageFile(largeFile())).resolves.toMatchObject({
      type: 'image/webp',
    });
    expect(canvas.width).toBe(8192);
    expect(context.drawImage).toHaveBeenCalled();
    createElement.mockRestore();
  });

  it('returns the original when a 2D context is unavailable', async () => {
    vi.stubGlobal('OffscreenCanvas', FakeCanvas);
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bitmap()));
    const file = largeFile();
    const getContext = FakeCanvas.prototype.getContext;
    FakeCanvas.prototype.getContext = vi.fn(() => null) as any;

    await expect(optimizeImageFile(file)).resolves.toBe(file);
    FakeCanvas.prototype.getContext = getContext;
  });
});
