import { beforeEach, describe, expect, it } from 'vitest';
import {
  registerValidationSchema,
  validateSchema,
  getValidationErrors,
  validateArray,
  getArrayValidationErrors,
  canValidate,
} from '@/utils/schemaValidator';

const schema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    age: { type: 'number' },
  },
  required: ['name', 'age'],
  additionalProperties: false,
};

describe('schema validator', () => {
  beforeEach(() => {
    registerValidationSchema('test-schema', schema);
  });

  it('is idempotent when registering the same key twice', () => {
    expect(() =>
      registerValidationSchema('test-schema', schema),
    ).not.toThrow();
    expect(canValidate('test-schema')).toBe(true);
  });

  it('returns a structured result for valid and invalid data', async () => {
    await expect(validateSchema('test-schema', { name: 'A', age: 1 })).resolves
      .toEqual({ valid: true, errors: [] });

    const invalid = await validateSchema('test-schema', {
      name: 'A',
      age: 'old',
    });
    expect(invalid.valid).toBe(false);
    expect(invalid.errors.length).toBeGreaterThan(0);
  });

  it('reports missing required fields', async () => {
    const errors = await getValidationErrors('test-schema', { name: 'A' });
    expect(errors.join(' ')).toContain('age');
  });

  it('throws for unknown schemas', async () => {
    await expect(validateSchema('missing-schema', {})).rejects.toThrow(
      'Schema "missing-schema" not found',
    );
  });

  it('validates arrays item by item', async () => {
    await expect(
      validateArray('test-schema', [
        { name: 'A', age: 1 },
        { name: 'B', age: 2 },
      ]),
    ).resolves.toBe(true);
    await expect(
      validateArray('test-schema', [{ name: 'A', age: 1 }, { name: 'B' }]),
    ).resolves.toBe(false);
  });

  it('collects array errors with indexes', async () => {
    const errors = await getArrayValidationErrors('test-schema', [
      { name: 'A', age: 1 },
      { name: 'B' },
    ]);
    expect(errors.join(' ')).toContain('Item at index 1');
  });
});
