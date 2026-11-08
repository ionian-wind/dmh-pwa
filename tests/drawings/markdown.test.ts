import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getDrawing: vi.fn(),
}));

vi.mock('@/drawings/storage', () => ({
  getDrawing: mocks.getDrawing,
}));

import {
  drawingMarkdownUrl,
  hydrateDrawingUrls,
  parseDrawingMarkdownUrl,
} from '@/drawings/markdown';

describe('drawing markdown URLs', () => {
  beforeEach(() => {
    mocks.getDrawing.mockReset();
  });

  it('builds and parses drawing:// URLs', () => {
    expect(drawingMarkdownUrl('draw-1')).toBe('drawing://draw-1');
    expect(parseDrawingMarkdownUrl('drawing://draw-1')).toBe('draw-1');
    expect(parseDrawingMarkdownUrl('drawing://')).toBeNull();
    expect(parseDrawingMarkdownUrl('https://example.com/a.png')).toBeNull();
  });

  it('hydrates rendered drawing images with stored previews', async () => {
    mocks.getDrawing.mockResolvedValue({
      id: 'draw-1',
      preview: 'data:image/png;base64,preview',
    });
    const root = document.createElement('div');
    root.innerHTML = '<img src="drawing://draw-1">';

    await hydrateDrawingUrls(root);

    expect(root.querySelector('img')?.getAttribute('src')).toBe(
      'data:image/png;base64,preview',
    );
  });

  it('hydrates deferred drawing placeholders', async () => {
    mocks.getDrawing.mockResolvedValue({
      id: 'draw-1',
      preview: 'data:image/png;base64,preview',
    });
    const root = document.createElement('div');
    root.innerHTML =
      '<img src="data:image/gif;base64,placeholder" data-drawing-src="drawing://draw-1">';

    await hydrateDrawingUrls(root);

    const image = root.querySelector('img');
    expect(image?.getAttribute('src')).toBe('data:image/png;base64,preview');
    expect(image?.hasAttribute('data-drawing-src')).toBe(false);
  });

  it('leaves missing drawings unchanged', async () => {
    mocks.getDrawing.mockResolvedValue(undefined);
    const root = document.createElement('div');
    root.innerHTML = '<img src="drawing://missing">';

    await hydrateDrawingUrls(root);

    expect(root.querySelector('img')?.getAttribute('src')).toBe(
      'drawing://missing',
    );
  });
});
