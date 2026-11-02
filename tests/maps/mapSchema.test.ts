import { beforeAll, describe, expect, it } from 'vitest';

import mapSchema from '@/maps/schemas/map.schema.json';
import {
  registerValidationSchema,
  validateSchema,
} from '@/utils/schemaValidator';

const validMap = {
  id: 'map1',
  title: 'World',
  description: 'Campaign map',
  fileId: 'file1',
  locationId: 'l1',
  layers: [{ id: 'base', title: 'Base' }],
  locations: [
    {
      id: 'l1',
      name: 'Town',
      description: 'Starting town',
      color: '#336699',
      entities: [{ kind: 'note', id: 'n1' }],
    },
  ],
  markers: [
    {
      id: 'm1',
      title: 'Castle',
      description: 'Old castle',
      x: 100,
      y: 200,
      locationId: 'l1',
      layerId: 'base',
      entities: [
        { kind: 'monster', id: 'mon1' },
        { kind: 'map', id: 'map2' },
      ],
      icon: 'ra-castle',
      color: '#cc3333',
    },
  ],
  areas: [
    {
      id: 'a1',
      title: 'Forest',
      description: 'Dark woods',
      shape: 'polygon',
      points: [
        [0, 0],
        [100, 0],
        [100, 100],
      ],
      entities: [{ kind: 'note', id: 'n1' }],
      locationId: 'l1',
      layerId: 'base',
      icon: 'ra-forest',
      color: '#336699',
    },
  ],
  createdAt: 1,
  updatedAt: 2,
};

describe('map schema', () => {
  beforeAll(() => {
    registerValidationSchema('maps', mapSchema);
  });

  it('accepts maps with locations and markers', async () => {
    await expect(validateSchema('maps', validMap)).resolves.toEqual({
      valid: true,
      errors: [],
    });
  });

  it('rejects missing required map fields', async () => {
    const result = await validateSchema('maps', {
      id: 'map1',
      createdAt: 1,
      updatedAt: 2,
    });

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('rejects unknown entity kinds and malformed markers', async () => {
    const result = await validateSchema('maps', {
      ...validMap,
      markers: [
        {
          ...validMap.markers[0],
          icon: '',
          entities: [{ kind: 'spaceship', id: 'x' }],
        },
      ],
    });

    expect(result.valid).toBe(false);
  });

  it('rejects invalid area shapes and missing geometry', async () => {
    const result = await validateSchema('maps', {
      ...validMap,
      areas: [
        {
          ...validMap.areas[0],
          shape: 'hexagon',
        },
      ],
    });

    expect(result.valid).toBe(false);
  });
});
