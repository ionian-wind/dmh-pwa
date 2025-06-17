import { ref, watch } from 'vue';
import type { Ref, UnwrapRef } from 'vue';
import { validateArray, getArrayValidationErrors } from './schemaValidator';

export class StorageError extends Error {
  constructor(
    message: string,
    public key?: string,
    public cause?: unknown
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

export function generateId(): string {
  return self.crypto.randomUUID();
}

export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

export function hasRequiredFields<T extends object>(obj: T, fields: (keyof T)[]): boolean {
  return fields.every(field => field in obj);
}

export function isStorageAvailable(): boolean {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
}

interface StorageOptions<T> {
  key: string;
  defaultValue: T;
  schema?: string;
  sync?: boolean;
  validate?: (value: unknown) => boolean;
  onError?: (error: Error) => void;
}

export function useStorage<T>({ key, defaultValue, schema, sync = true, validate, onError }: StorageOptions<T>): Ref<UnwrapRef<T>> {
  const stored = localStorage.getItem(key);
  let initialValue: T;

  if (!isStorageAvailable()) {
    console.warn('localStorage is not available. Using in-memory storage only.');
  }
  
  console.log(`[Storage] Initializing storage for key: ${key}`);
  
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (schema) {
        if (Array.isArray(parsed)) {
          if (!validateArray(schema, parsed)) {
            console.error(`Invalid data in storage for key "${key}":`, getArrayValidationErrors(schema, parsed));
            initialValue = defaultValue;
          } else {
            initialValue = parsed as unknown as T;
          }
        } else {
          console.error(`Expected array data for key "${key}"`);
          initialValue = defaultValue;
        }
      } else {
        initialValue = parsed as T;
      }
    } catch (e) {
      console.error(`Error parsing stored data for key "${key}":`, e);
      initialValue = defaultValue;
    }
  } else {
    console.log(`[Storage] No stored data found for key: ${key}, using default value`);
    initialValue = defaultValue;
  }
  
  const data = ref<T>(initialValue);
  
  watch(data, (newValue) => {
    if (schema && Array.isArray(newValue)) {
      if (!validateArray(schema, newValue)) {
        console.error(`Invalid data being stored for key "${key}":`, getArrayValidationErrors(schema, newValue));
        return;
      }
    }
    try {
      console.log(`[Storage] Saving data for key: ${key}`);
      console.log(`[Storage] Data size: ${JSON.stringify(newValue).length} bytes`);
      
      const dataInfo = {
        type: typeof newValue,
        isArray: Array.isArray(newValue),
        keys: Object.keys(newValue as object),
        hasMetadata: 'createdAt' in (newValue as object) && 'updatedAt' in (newValue as object)
      };
      console.log(`[Storage] Data structure:`, dataInfo);
      
      const serialized = JSON.stringify(newValue);
      localStorage.setItem(key, serialized);
      
      console.log(`[Storage] Successfully saved data for key: ${key}`);
      console.log(`[Storage] Current storage size: ${getStorageSize()} bytes`);
      console.log(`[Storage] Total items in storage: ${localStorage.length}`);
    } catch (error) {
      console.error(`[Storage] Error saving data for key: ${key}:`, error);
      if (error instanceof Error) {
        console.error(`[Storage] Error details:`, {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
      const storageError = new StorageError(
        `Failed to save data for key "${key}". The data might be too large or contain circular references.`,
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw storageError;
    }
  }, { deep: true });
  
  if (sync) {
    window.addEventListener('storage', (event) => {
      if (event.key === key && event.newValue) {
        try {
          console.log(`[Storage] Found storage event for key: ${key}`);
          let parsed: unknown;
          try {
            parsed = JSON.parse(event.newValue);
          } catch (parseError) {
            throw new StorageError(
              `Failed to parse JSON data from storage event for key "${key}". The data might be corrupted.`,
              key,
              parseError
            );
          }
          
          if (validate && !validate(parsed)) {
            console.log(`[Storage] Invalid data format for key: ${key}, using default value`);
            const validationErrors = getValidationErrors(parsed);
            console.error(`[Storage] Validation errors:`, validationErrors);
            throw new StorageError(
              `Data validation failed for key "${key}" in storage event:\n${validationErrors.join('\n')}`,
              key,
              parsed
            );
          }
          
          data.value = parsed as T;
        } catch (error) {
          console.error(`[Storage] Error processing storage event (${key}):`, error);
          const storageError = error instanceof StorageError 
            ? error 
            : new StorageError(
                `Unexpected error processing storage event for key "${key}".`,
                key,
                error
              );
          
          console.error(`Error processing storage event (${key}):`, storageError);
          onError?.(storageError);
        }
      }
    });
  }
  
  return data as Ref<UnwrapRef<T>>;
}

// Validation error helpers
function getValidationErrors(value: unknown, path: string = ''): string[] {
  console.log(`[Storage] Validating data${path ? ` at path: ${path}` : ''}`);
  const errors: string[] = [];
  
  // Check for null at any level
  if (value === null) {
    const error = `- ${path ? `Field "${path}"` : 'Value'} is null`;
    console.log(`[Storage] Validation error: ${error}`);
    errors.push(error);
    return errors;
  }
  
  if (!isObject(value)) {
    const error = `- ${path ? `Field "${path}"` : 'Value'} is not an object, got ${typeof value}`;
    console.log(`[Storage] Validation error: ${error}`);
    errors.push(error);
    return errors;
  }
  
  // Check for common validation issues
  if (Array.isArray(value)) {
    const error = `- ${path ? `Field "${path}"` : 'Value'} is an array, expected an object`;
    console.log(`[Storage] Validation error: ${error}`);
    errors.push(error);
    return errors;
  }
  
  // Check for null values in required fields
  Object.entries(value).forEach(([key, val]) => {
    const fieldPath = path ? `${path}.${key}` : key;
    
    if (val === null) {
      const error = `- Field "${fieldPath}" is null`;
      console.log(`[Storage] Validation error: ${error}`);
      errors.push(error);
    } else if (val === undefined) {
      const error = `- Field "${fieldPath}" is undefined`;
      console.log(`[Storage] Validation error: ${error}`);
      errors.push(error);
    } else if (typeof val === 'object' && Object.keys(val).length === 0) {
      const error = `- Field "${fieldPath}" is an empty object`;
      console.log(`[Storage] Validation error: ${error}`);
      errors.push(error);
    } else if (Array.isArray(val)) {
      // Check array items
      if (val.length === 0) {
        const error = `- Field "${fieldPath}" is an empty array`;
        console.log(`[Storage] Validation error: ${error}`);
        errors.push(error);
      } else {
        val.forEach((item, index) => {
          if (item === null) {
            const error = `- Field "${fieldPath}[${index}]" is null`;
            console.log(`[Storage] Validation error: ${error}`);
            errors.push(error);
          } else if (item === undefined) {
            const error = `- Field "${fieldPath}[${index}]" is undefined`;
            console.log(`[Storage] Validation error: ${error}`);
            errors.push(error);
          } else if (typeof item === 'object' && item !== null) {
            // Recursively check nested objects in arrays
            errors.push(...getValidationErrors(item, `${fieldPath}[${index}]`));
          }
        });
      }
    } else if (typeof val === 'object' && val !== null) {
      // Recursively check nested objects
      errors.push(...getValidationErrors(val, fieldPath));
    }
  });
  
  // Check for invalid types
  Object.entries(value).forEach(([key, val]) => {
    const fieldPath = path ? `${path}.${key}` : key;
    
    if (typeof val === 'number' && isNaN(val)) {
      const error = `- Field "${fieldPath}" is NaN`;
      console.log(`[Storage] Validation error: ${error}`);
      errors.push(error);
    } else if (Array.isArray(val)) {
      val.forEach((item, index) => {
        if (typeof item === 'number' && isNaN(item)) {
          const error = `- Field "${fieldPath}[${index}]" is NaN`;
          console.log(`[Storage] Validation error: ${error}`);
          errors.push(error);
        }
      });
    }
  });
  
  if (errors.length === 0) {
    console.log(`[Storage] Validation successful${path ? ` for path: ${path}` : ''}`);
  }
  
  return errors;
}

// Type guards for validation
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Storage management
export function clearStorage(key?: string): void {
  console.log(`[Storage] Clearing storage${key ? ` for key: ${key}` : ''}`);
  try {
    if (key) {
      localStorage.removeItem(key);
    } else {
      localStorage.clear();
    }
    console.log(`[Storage] Successfully cleared storage${key ? ` for key: ${key}` : ''}`);
  } catch (error) {
    console.error(`[Storage] Error clearing storage:`, error);
  }
}

export function getStorageKeys(): string[] {
  console.log('[Storage] Getting storage keys');
  try {
    return Object.keys(localStorage);
  } catch (error) {
    console.error('Error getting storage keys:', error);
    return [];
  }
}

export function getStorageSize(): number {
  console.log('[Storage] Getting storage size');
  try {
    let size = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        size += localStorage.getItem(key)?.length || 0;
      }
    }
    console.log(`[Storage] Storage size: ${size} bytes`);
    return size;
  } catch (error) {
    console.error('Error getting storage size:', error);
    return 0;
  }
}

export function isStorageQuotaExceeded(error: unknown): boolean {
  return error instanceof DOMException && (
    error.name === 'QuotaExceededError' ||
    error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
  );
}

export function getStorageInfo(): { size: number; itemCount: number } {
  console.log('[Storage] Getting storage info');
  try {
    let totalSize = 0;
    let itemCount = 0;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value) {
          totalSize += value.length;
          itemCount++;
        }
      }
    }
    
    console.log(`[Storage] Storage info - Size: ${totalSize} bytes, Items: ${itemCount}`);
    return { size: totalSize, itemCount };
  } catch (error) {
    console.error('[Storage] Error getting storage info:', error);
    return { size: 0, itemCount: 0 };
  }
}
