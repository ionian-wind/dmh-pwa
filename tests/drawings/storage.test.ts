import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  generateId: vi.fn(() => 'generated-id'),
  idbGetItem: vi.fn(),
  idbPutItem: vi.fn().mockResolvedValue(undefined),
  idbDeleteItem: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/utils/storage', () => ({
  generateId: mocks.generateId,
  idbGetItem: mocks.idbGetItem,
  idbPutItem: mocks.idbPutItem,
  idbDeleteItem: mocks.idbDeleteItem,
}));

vi.mock('@/utils/schemaValidator', () => ({
  registerValidationSchema: vi.fn(),
}));

import { deleteDrawing, getDrawing, saveDrawing } from '@/drawings/storage';

describe('drawing storage', () => {
  beforeEach(() => {
    mocks.generateId.mockClear();
    mocks.idbGetItem.mockReset();
    mocks.idbPutItem.mockClear();
    mocks.idbDeleteItem.mockClear();
  });

  it('creates a drawing with a generated id', async () => {
    const drawing = await saveDrawing({
      snapshot: '{"shape":1}',
      preview: 'data:image/png;base64,preview',
    });

    expect(drawing).toMatchObject({
      id: 'generated-id',
      snapshot: '{"shape":1}',
      preview: 'data:image/png;base64,preview',
    });
    expect(mocks.idbPutItem).toHaveBeenCalledWith(
      'drawings',
      expect.objectContaining({ id: 'generated-id' }),
    );
  });

  it('updates an existing drawing and preserves createdAt', async () => {
    mocks.idbGetItem.mockResolvedValue({
      id: 'draw-1',
      snapshot: '{}',
      preview: 'old',
      createdAt: 100,
      updatedAt: 100,
    });

    const drawing = await saveDrawing(
      { snapshot: '{"shape":2}', preview: 'new' },
      'draw-1',
    );

    expect(drawing).toMatchObject({
      id: 'draw-1',
      snapshot: '{"shape":2}',
      preview: 'new',
      createdAt: 100,
    });
    expect(drawing.updatedAt).toBeGreaterThanOrEqual(100);
  });

  it('loads and deletes drawings', async () => {
    mocks.idbGetItem.mockResolvedValue({ id: 'draw-1' });

    await expect(getDrawing('draw-1')).resolves.toEqual({ id: 'draw-1' });
    await deleteDrawing('draw-1');

    expect(mocks.idbGetItem).toHaveBeenCalledWith('drawings', 'draw-1');
    expect(mocks.idbDeleteItem).toHaveBeenCalledWith('drawings', 'draw-1');
  });
});
