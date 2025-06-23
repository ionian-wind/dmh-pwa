import { vi } from 'vitest';
import { registerValidationSchema, validateSchema, getValidationErrors, validateArray, getArrayValidationErrors } from '@/utils/schemaValidator';

describe('Schema Validator', () => {
  const testSchema = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      age: { type: 'number' },
      email: { type: 'string', format: 'email' }
    },
    required: ['name', 'age']
  };

  const validData = {
    name: 'John Doe',
    age: 30,
    email: 'john@example.com'
  };

  const invalidData = {
    name: 'John Doe',
    age: 'thirty', // should be number
    email: 'invalid-email' // invalid email format
  };

  beforeEach(() => {
    // Clear any previously registered schemas
    vi.clearAllMocks();
  });

  describe('registerValidationSchema', () => {
    it('should register a schema without throwing errors', () => {
      expect(() => {
        registerValidationSchema('test-schema', testSchema);
      }).not.toThrow();
    });

    it('should register multiple schemas with different names', () => {
      const schema1 = { type: 'string' };
      const schema2 = { type: 'number' };

      expect(() => {
        registerValidationSchema('schema1', schema1);
        registerValidationSchema('schema2', schema2);
      }).not.toThrow();
    });
  });

  describe('validateSchema', () => {
    beforeEach(() => {
      registerValidationSchema('test-schema', testSchema);
    });

    it('should return true for valid data', async () => {
      const result = await validateSchema('test-schema', validData);
      expect(result).toBe(true);
    });

    it('should return false for invalid data', async () => {
      const result = await validateSchema('test-schema', invalidData);
      expect(result).toBe(false);
    });

    it('should throw error for non-existent schema', async () => {
      await expect(validateSchema('non-existent', validData))
        .rejects
        .toThrow('Schema "non-existent" not found');
    });

    it('should handle missing required fields', async () => {
      const dataWithMissingFields = { name: 'John' }; // missing age
      const result = await validateSchema('test-schema', dataWithMissingFields);
      expect(result).toBe(false);
    });

    it('should handle wrong data types', async () => {
      const dataWithWrongTypes = {
        name: 123, // should be string
        age: 30
      };
      const result = await validateSchema('test-schema', dataWithWrongTypes);
      expect(result).toBe(false);
    });
  });

  describe('getValidationErrors', () => {
    beforeEach(() => {
      registerValidationSchema('test-schema', testSchema);
    });

    it('should return empty array for valid data', async () => {
      const errors = await getValidationErrors('test-schema', validData);
      expect(errors).toEqual([]);
    });

    it('should return validation errors for invalid data', async () => {
      const errors = await getValidationErrors('test-schema', invalidData);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.includes('age'))).toBe(true);
      expect(errors.some(error => error.includes('email'))).toBe(true);
    });

    it('should throw error for non-existent schema', async () => {
      await expect(getValidationErrors('non-existent', validData))
        .rejects
        .toThrow('Schema "non-existent" not found');
    });

    it('should include field paths in error messages', async () => {
      const dataWithWrongTypes = {
        name: 123,
        age: 'thirty'
      };
      const errors = await getValidationErrors('test-schema', dataWithWrongTypes);
      expect(errors.some(error => error.includes('name'))).toBe(true);
      expect(errors.some(error => error.includes('age'))).toBe(true);
    });
  });

  describe('validateArray', () => {
    beforeEach(() => {
      registerValidationSchema('test-schema', testSchema);
    });

    it('should return true for array with all valid items', async () => {
      const validArray = [validData, { ...validData, name: 'Jane' }];
      const result = await validateArray('test-schema', validArray);
      expect(result).toBe(true);
    });

    it('should return false for array with invalid items', async () => {
      const mixedArray = [validData, invalidData];
      const result = await validateArray('test-schema', mixedArray);
      expect(result).toBe(false);
    });

    it('should return false for non-array data', async () => {
      const result = await validateArray('test-schema', validData);
      expect(result).toBe(false);
    });

    it('should return true for empty array', async () => {
      const result = await validateArray('test-schema', []);
      expect(result).toBe(true);
    });

    it('should throw error for non-existent schema', async () => {
      await expect(validateArray('non-existent', [validData]))
        .rejects
        .toThrow('Schema "non-existent" not found');
    });
  });

  describe('getArrayValidationErrors', () => {
    beforeEach(() => {
      registerValidationSchema('test-schema', testSchema);
    });

    it('should return empty array for valid array', async () => {
      const validArray = [validData, { ...validData, name: 'Jane' }];
      const errors = await getArrayValidationErrors('test-schema', validArray);
      expect(errors).toEqual([]);
    });

    it('should return errors for array with invalid items', async () => {
      const mixedArray = [validData, invalidData];
      const errors = await getArrayValidationErrors('test-schema', mixedArray);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.includes('index 1'))).toBe(true);
    });

    it('should return error for non-array data', async () => {
      const errors = await getArrayValidationErrors('test-schema', validData);
      expect(errors).toEqual(['Data is not an array']);
    });

    it('should return empty array for empty array', async () => {
      const errors = await getArrayValidationErrors('test-schema', []);
      expect(errors).toEqual([]);
    });

    it('should include index information in error messages', async () => {
      const arrayWithMultipleErrors = [invalidData, invalidData];
      const errors = await getArrayValidationErrors('test-schema', arrayWithMultipleErrors);
      expect(errors.some(error => error.includes('index 0'))).toBe(true);
      expect(errors.some(error => error.includes('index 1'))).toBe(true);
    });

    it('should throw error for non-existent schema', async () => {
      await expect(getArrayValidationErrors('non-existent', [validData]))
        .rejects
        .toThrow('Schema "non-existent" not found');
    });
  });
}); 