import { describe, expect, it } from 'vitest';
import {
  generateId,
  isArray,
  hasRequiredFields,
  StorageError,
  MAIN_STORE_NAMES,
} from '@/utils/storage';

describe('storage helpers', () => {
  it('generates unique 10-character IDs', () => {
    const first = generateId();
    const second = generateId();
    expect(first).toHaveLength(10);
    expect(first).not.toBe(second);
  });

  it('detects arrays', () => {
    expect(isArray([])).toBe(true);
    expect(isArray([1, 2])).toBe(true);
    expect(isArray('nope')).toBe(false);
    expect(isArray(null)).toBe(false);
  });

  it('checks required fields', () => {
    expect(hasRequiredFields({ a: 1, b: 2 }, ['a', 'b'])).toBe(true);
    expect(hasRequiredFields({ a: 1 }, ['a', 'b'])).toBe(false);
  });

  it('exposes the stores used by backup/restore', () => {
    expect(MAIN_STORE_NAMES).toEqual(
      expect.arrayContaining([
        'notes',
        'modules',
        'timers',
        'jukebox_files',
        'indexations_mentions',
      ]),
    );
  });

  it('wraps storage errors', () => {
    const error = new StorageError('failed', 'notes', new Error('cause'));
    expect(error.name).toBe('StorageError');
    expect(error.key).toBe('notes');
    expect(error.cause).toBeInstanceOf(Error);
  });
});
