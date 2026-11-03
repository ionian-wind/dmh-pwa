import { describe, expect, it } from 'vitest';
import {
  MAP_BASE_LAYER_ID,
  createBaseLayer,
  createLayer,
  normalizeLayers,
} from '@/maps/utils/mapLayers';

describe('map layers', () => {
  it('creates the base layer and named layers', () => {
    expect(createBaseLayer()).toEqual({ id: MAP_BASE_LAYER_ID, title: 'Base' });
    expect(createLayer('  Upper  ')).toMatchObject({ title: 'Upper' });
    expect(createLayer('   ')).toMatchObject({ title: 'Layer' });
    expect(createLayer('Upper').id).not.toBe(MAP_BASE_LAYER_ID);
  });

  it('normalizes non-array and invalid layers into the base layer', () => {
    expect(normalizeLayers(undefined)).toEqual([
      { id: MAP_BASE_LAYER_ID, title: 'Base' },
    ]);
    expect(normalizeLayers('nope')).toEqual([
      { id: MAP_BASE_LAYER_ID, title: 'Base' },
    ]);
    expect(normalizeLayers([null, 42, 'bad'])).toEqual([
      { id: MAP_BASE_LAYER_ID, title: 'Base' },
    ]);
  });

  it('repairs missing ids and titles while preserving the base layer', () => {
    const layers = normalizeLayers([
      { id: '', title: '   ' },
      { id: 'upper', title: ' Upper ' },
      { id: 'base', title: 'Custom base' },
    ]);

    expect(layers).toHaveLength(3);
    expect(layers[0]).toMatchObject({ title: 'Base' });
    expect(layers[0].id).not.toBe('');
    expect(layers[1]).toEqual({ id: 'upper', title: 'Upper' });
    expect(layers[2]).toEqual({ id: 'base', title: 'Custom base' });
  });

  it('prepends the base layer when it is missing', () => {
    const layers = normalizeLayers([{ id: 'upper', title: 'Upper' }]);
    expect(layers[0]).toEqual({ id: MAP_BASE_LAYER_ID, title: 'Base' });
    expect(layers[1]).toEqual({ id: 'upper', title: 'Upper' });
  });
});
