import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalGetContext = HTMLCanvasElement.prototype.getContext;
const originalContext = { id: 'original' };
let baseContext: ReturnType<typeof vi.fn>;

async function load() {
  vi.resetModules();
  const module = await import('@/maps/utils/canvasReadback');
  module.enableFrequentHitDetectionReads();
  return module;
}

function canvasWith(width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

describe('canvasReadback', () => {
  beforeEach(() => {
    baseContext = vi.fn(() => originalContext);
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: baseContext,
    });
  });

  afterEach(() => {
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: originalGetContext,
    });
  });

  it('enables frequent reads for tiny 2d hit-detection canvases', async () => {
    await load();
    canvasWith(1, 1).getContext('2d');
    expect(baseContext).toHaveBeenCalledWith('2d', {
      willReadFrequently: true,
    });
  });

  it('leaves normal canvases, non-2d contexts and explicit options alone', async () => {
    await load();
    canvasWith(200, 200).getContext('2d');
    canvasWith(1, 1).getContext('webgl');
    canvasWith(1, 1).getContext('2d', { willReadFrequently: true });
    canvasWith(1, 1).getContext('2d', { willReadFrequently: false });

    expect(baseContext.mock.calls[0][1]).toBeUndefined();
    expect(baseContext.mock.calls[1][1]).toBeUndefined();
    expect(baseContext.mock.calls[2][1]).toEqual({
      willReadFrequently: true,
    });
    expect(baseContext.mock.calls[3][1]).toEqual({
      willReadFrequently: true,
    });
  });

  it('only patches the prototype once', async () => {
    const module = await load();
    const first = HTMLCanvasElement.prototype.getContext;
    module.enableFrequentHitDetectionReads();
    expect(HTMLCanvasElement.prototype.getContext).toBe(first);
    expect(originalContext).toBeTruthy();
  });

  it('does nothing when the canvas API is unavailable', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      'HTMLCanvasElement',
    );
    Object.defineProperty(globalThis, 'HTMLCanvasElement', {
      configurable: true,
      value: undefined,
    });
    const module = await import('@/maps/utils/canvasReadback');
    expect(() => module.enableFrequentHitDetectionReads()).not.toThrow();
    if (descriptor) {
      Object.defineProperty(globalThis, 'HTMLCanvasElement', descriptor);
    }
  });
});
