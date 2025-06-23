import { vi } from 'vitest';
import { generateId, isArray, hasRequiredFields, isStorageAvailable, useStorage, clearStorage, getStorageKeys, getStorageSize, isStorageQuotaExceeded, getStorageInfo } from '@/utils/storage';

// Mock Vue's ref and watch
vi.mock('vue', () => ({
  ref: vi.fn((value) => ({ value })),
  watch: vi.fn(),
}));

// Mock schemaValidator
vi.mock('@/utils/schemaValidator', () => ({
  validateArray: vi.fn(() => true),
  getArrayValidationErrors: vi.fn(() => []),
}));

describe('Storage Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('generateId', () => {
    it('should generate a unique ID', () => {
      const id1 = generateId();
      const id2 = generateId();
      
      expect(id1).toBeDefined();
      expect(typeof id1).toBe('string');
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^test-uuid-/);
    });
  });

  describe('isArray', () => {
    it('should return true for arrays', () => {
      expect(isArray([])).toBe(true);
      expect(isArray([1, 2, 3])).toBe(true);
      expect(isArray(['a', 'b', 'c'])).toBe(true);
    });

    it('should return false for non-arrays', () => {
      expect(isArray(null)).toBe(false);
      expect(isArray(undefined)).toBe(false);
      expect(isArray('string')).toBe(false);
      expect(isArray(123)).toBe(false);
      expect(isArray({})).toBe(false);
      expect(isArray(() => {})).toBe(false);
    });
  });

  describe('hasRequiredFields', () => {
    it('should return true when all required fields are present', () => {
      const obj = { name: 'test', age: 25, email: 'test@example.com' };
      const requiredFields = ['name', 'age'] as (keyof typeof obj)[];
      
      expect(hasRequiredFields(obj, requiredFields)).toBe(true);
    });

    it('should return false when required fields are missing', () => {
      const obj = { name: 'test', age: 25 };
      const requiredFields = ['name', 'age', 'email'] as (keyof typeof obj)[];
      
      expect(hasRequiredFields(obj, requiredFields)).toBe(false);
    });

    it('should return true for empty required fields array', () => {
      const obj = { name: 'test' };
      const requiredFields: (keyof typeof obj)[] = [];
      
      expect(hasRequiredFields(obj, requiredFields)).toBe(true);
    });
  });

  describe('isStorageAvailable', () => {
    it('should return true when localStorage is available', () => {
      expect(isStorageAvailable()).toBe(true);
    });

    it('should return false when localStorage throws an error', () => {
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn().mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      expect(isStorageAvailable()).toBe(false);

      localStorage.setItem = originalSetItem;
    });
  });

  describe('useStorage', () => {
    const mockRef = { value: [] };
    const mockWatch = vi.fn();

    beforeEach(() => {
      const { ref, watch } = require('vue');
      ref.mockReturnValue(mockRef);
      watch.mockImplementation(mockWatch);
    });

    it('should initialize with default value when no stored data', () => {
      const { ref } = require('vue');
      const defaultValue = [{ id: '1', name: 'test' }];
      
      useStorage({
        key: 'test-key',
        defaultValue,
      });

      expect(ref).toHaveBeenCalledWith(defaultValue);
    });

    it('should initialize with stored data when available', () => {
      const storedData = [{ id: '1', name: 'stored' }];
      localStorage.setItem('test-key', JSON.stringify(storedData));
      
      const { ref } = require('vue');
      
      useStorage({
        key: 'test-key',
        defaultValue: [],
      });

      expect(ref).toHaveBeenCalledWith(storedData);
    });

    it('should use default value when stored data is invalid JSON', () => {
      localStorage.setItem('test-key', 'invalid-json');
      
      const { ref } = require('vue');
      const defaultValue = [];
      
      useStorage({
        key: 'test-key',
        defaultValue,
      });

      expect(ref).toHaveBeenCalledWith(defaultValue);
    });

    it('should set up watcher for data changes', () => {
      const { watch } = require('vue');
      
      useStorage({
        key: 'test-key',
        defaultValue: [],
      });

      expect(watch).toHaveBeenCalled();
    });
  });

  describe('clearStorage', () => {
    it('should clear specific key when provided', () => {
      localStorage.setItem('test-key', 'test-value');
      localStorage.setItem('other-key', 'other-value');
      
      clearStorage('test-key');
      
      expect(localStorage.getItem('test-key')).toBeNull();
      expect(localStorage.getItem('other-key')).toBe('other-value');
    });

    it('should clear all storage when no key provided', () => {
      localStorage.setItem('key1', 'value1');
      localStorage.setItem('key2', 'value2');
      
      clearStorage();
      
      expect(localStorage.length).toBe(0);
    });
  });

  describe('getStorageKeys', () => {
    it('should return all storage keys', () => {
      localStorage.setItem('key1', 'value1');
      localStorage.setItem('key2', 'value2');
      
      const keys = getStorageKeys();
      
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys.length).toBe(2);
    });

    it('should return empty array when storage is empty', () => {
      const keys = getStorageKeys();
      
      expect(keys).toEqual([]);
    });
  });

  describe('getStorageSize', () => {
    it('should calculate total storage size', () => {
      localStorage.setItem('key1', 'value1');
      localStorage.setItem('key2', 'value2');
      
      const size = getStorageSize();
      
      expect(typeof size).toBe('number');
      expect(size).toBeGreaterThan(0);
    });

    it('should return 0 for empty storage', () => {
      const size = getStorageSize();
      
      expect(size).toBe(0);
    });
  });

  describe('isStorageQuotaExceeded', () => {
    it('should return true for quota exceeded errors', () => {
      const quotaError = new Error('QuotaExceededError');
      quotaError.name = 'QuotaExceededError';
      
      expect(isStorageQuotaExceeded(quotaError)).toBe(true);
    });

    it('should return false for other errors', () => {
      const otherError = new Error('Other error');
      
      expect(isStorageQuotaExceeded(otherError)).toBe(false);
    });

    it('should return false for non-error values', () => {
      expect(isStorageQuotaExceeded('string')).toBe(false);
      expect(isStorageQuotaExceeded(123)).toBe(false);
      expect(isStorageQuotaExceeded(null)).toBe(false);
    });
  });

  describe('getStorageInfo', () => {
    it('should return storage information', () => {
      localStorage.setItem('key1', 'value1');
      localStorage.setItem('key2', 'value2');
      
      const info = getStorageInfo();
      
      expect(info).toHaveProperty('size');
      expect(info).toHaveProperty('itemCount');
      expect(typeof info.size).toBe('number');
      expect(typeof info.itemCount).toBe('number');
      expect(info.itemCount).toBe(2);
    });
  });
}); 