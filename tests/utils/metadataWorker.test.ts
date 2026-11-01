import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseBlob } from 'music-metadata';

vi.mock('music-metadata', () => ({ parseBlob: vi.fn() }));

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

describe('metadata worker', () => {
  beforeAll(async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockResolvedValue({ width: 20, height: 20 }),
    );
    vi.stubGlobal('OffscreenCanvas', OffscreenCanvasMock);
    (self as any).postMessage = vi.fn((message) => posted.push(message));
    await import('@/utils/files/worker/metadata.worker');
  });

  beforeEach(() => {
    posted.length = 0;
    vi.clearAllMocks();
    (self as any).postMessage = vi.fn((message) => posted.push(message));
  });

  async function parse(file = new File(['x'], 'song.mp3')) {
    await (self as any).onmessage({ data: file } as MessageEvent);
    return posted.at(-1);
  }

  it('returns metadata, artwork, dominant color and four palette colors', async () => {
    vi.mocked(parseBlob).mockResolvedValue({
      common: {
        title: 'Song',
        artist: 'Artist',
        album: 'Album',
        genre: ['Rock'],
        year: 2026,
        track: { no: 1 },
        disk: { no: 1 },
        composer: ['Composer'],
        comment: ['Comment'],
        lyrics: ['Lyrics'],
        picture: [
          {
            data: new Uint8Array([1, 2, 3]),
            format: 'image/png',
          },
        ],
      },
    } as any);

    const result = await parse();

    expect(result.type).toBe('success');
    expect(result.metadata).toMatchObject({
      title: 'Song',
      artist: 'Artist',
      album: 'Album',
      genre: 'Rock',
      year: 2026,
      trackNumber: 1,
      discNumber: 1,
      composer: 'Composer',
      comment: 'Comment',
      lyrics: 'Lyrics',
      color: expect.stringMatching(/^#[0-9a-f]{6}$/i),
    });
    expect(result.metadata.palette).toHaveLength(4);
    expect(result.metadata.picture).toBeInstanceOf(Blob);
  });

  it('returns no color or palette when there is no artwork', async () => {
    vi.mocked(parseBlob).mockResolvedValue({
      common: { title: 'Instrumental', artist: 'Unknown' },
    } as any);

    const result = await parse();

    expect(result.type).toBe('success');
    expect(result.metadata.color).toBeUndefined();
    expect(result.metadata.palette).toBeNull();
    expect(result.metadata.picture).toBeUndefined();
  });

  it('reports parse failures', async () => {
    vi.mocked(parseBlob).mockRejectedValue(new Error('bad tags'));

    const result = await parse();

    expect(result).toEqual({ type: 'error', error: 'bad tags' });
  });

  it('reports canvas failures', async () => {
    vi.mocked(parseBlob).mockResolvedValue({
      common: {
        picture: [{ data: new Uint8Array([1]), format: 'image/png' }],
      },
    } as any);
    vi.stubGlobal(
      'OffscreenCanvas',
      class {
        getContext() {
          return null;
        }
      },
    );

    const result = await parse();

    expect(result).toEqual({
      type: 'error',
      error: 'Failed to get canvas context',
    });

    vi.stubGlobal('OffscreenCanvas', OffscreenCanvasMock);
  });
});
