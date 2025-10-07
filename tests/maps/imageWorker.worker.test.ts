import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

function imageDataWithFourColors() {
  const colors = [
    [240, 0, 0, 255],
    [0, 240, 0, 255],
    [0, 0, 240, 255],
    [240, 180, 0, 255],
  ];
  const pixels: number[] = [];
  for (const color of colors) {
    for (let i = 0; i < 100; i += 1) pixels.push(...color);
  }
  return new Uint8ClampedArray(pixels);
}

class OffscreenCanvasMock {
  context = {
    drawImage: vi.fn(),
    getImageData: vi.fn(() => ({ data: imageDataWithFourColors() })),
  };

  constructor(
    public width: number,
    public height: number,
  ) {}

  getContext() {
    return this.context;
  }
}

const posted: any[] = [];

describe('map image worker', () => {
  beforeAll(async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockResolvedValue({ width: 20, height: 20 }),
    );
    vi.stubGlobal('OffscreenCanvas', OffscreenCanvasMock);
    (self as any).postMessage = vi.fn((message) => posted.push(message));
    await import('@/maps/worker/image.worker');
  });

  beforeEach(() => {
    posted.length = 0;
    vi.clearAllMocks();
    (self as any).postMessage = vi.fn((message) => posted.push(message));
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockResolvedValue({ width: 20, height: 20 }),
    );
    vi.stubGlobal('OffscreenCanvas', OffscreenCanvasMock);
  });

  async function run(data: File | string) {
    await (self as any).onmessage({ data } as MessageEvent);
    return posted.at(-1);
  }

  it('extracts dimensions, dominant color and palette from a file', async () => {
    const result = await run(
      new File(['image'], 'map.png', { type: 'image/png' }),
    );

    expect(result.type).toBe('success');
    expect(result.metadata).toMatchObject({
      width: 20,
      height: 20,
      aspectRatio: 1,
      mimeType: 'image/png',
      color: expect.stringMatching(/^#[0-9a-f]{6}$/i),
    });
    expect(result.metadata.palette).toHaveLength(4);
  });

  it('fetches URL inputs before extracting metadata', async () => {
    const blob = new Blob(['image'], { type: 'image/webp' });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        blob: vi.fn().mockResolvedValue(blob),
        headers: { get: vi.fn(() => 'image/webp') },
      }),
    );

    const result = await run('https://example.com/map.webp');

    expect(fetch).toHaveBeenCalledWith('https://example.com/map.webp');
    expect(result.metadata.mimeType).toBe('image/webp');
  });

  it('reports canvas and bitmap errors', async () => {
    vi.stubGlobal(
      'OffscreenCanvas',
      class {
        getContext() {
          return null;
        }
      },
    );
    const canvasError = await run(new File(['x'], 'map.png'));
    expect(canvasError).toEqual({
      type: 'error',
      error: 'Failed to get canvas context',
    });

    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockRejectedValue(new Error('bad image')),
    );
    vi.stubGlobal('OffscreenCanvas', OffscreenCanvasMock);
    const bitmapError = await run(new File(['x'], 'bad.png'));
    expect(bitmapError).toEqual({ type: 'error', error: 'bad image' });
  });
});
