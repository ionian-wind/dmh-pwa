import { ref, watch } from 'vue';
import type { Ref, UnwrapRef } from 'vue';
import * as schemaValidator from './schemaValidator';

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

// --- IndexedDB Helper ---
const DB_NAME = 'dmh-db';
const STORE_NAME = 'keyval';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet<T>(key: string, value: T): Promise<void> {
  const db = await openDB();
  // Serialize to plain data to avoid DataCloneError
  let plain: T;
  try {
    plain = JSON.parse(JSON.stringify(value));
  } catch (e) {
    throw new Error('Failed to serialize data for IndexedDB: ' + (e instanceof Error ? e.message : String(e)));
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(plain, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function idbRemove(key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined';
  } catch {
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

// --- Cross-tab/window sync ---
const STORAGE_CHANNEL = 'dmh-sync';
const SYNC_KEY = '__dmh_sync__';
const broadcast = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel(STORAGE_CHANNEL)
  : null;

function debounce(fn: (...args: any[]) => void, delay: number) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: any[]) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function useStorage<T>({ key, defaultValue, schema, sync = true, validate, onError }: StorageOptions<T>): Ref<UnwrapRef<T>> {
  const data = ref<T>(defaultValue);
  let loaded = false;
  const useIDB = isIndexedDBAvailable();

  // Initial load from IndexedDB
  (async () => {
    if (useIDB) {
      try {
        const stored = await idbGet<T>(key);
        if (stored !== undefined) {
          if (schema) {
            let valid = false;
            let errors: string[] = [];
            if (Array.isArray(stored)) {
              valid = await schemaValidator.validateArray(schema, stored);
              if (!valid) errors = await schemaValidator.getArrayValidationErrors(schema, stored);
            } else {
              valid = await schemaValidator.validateSchema(schema, stored);
              if (!valid) errors = await schemaValidator.getValidationErrors(schema, stored);
            }
            if (!valid) {
              console.error(`Invalid data in storage for key "${key}":`, errors);
              data.value = defaultValue;
            } else {
              data.value = stored as T;
            }
          } else {
            data.value = stored as T;
          }
        }
      } catch (e) {
        console.error(`[Storage] Error loading from IndexedDB for key "${key}":`, e);
        data.value = defaultValue;
      }
    } else {
      // fallback: do nothing, already defaultValue
      console.warn('IndexedDB is not available. Using in-memory storage only.');
    }
    loaded = true;
  })();

  // Cross-tab/window sync: reload value if notified
  const reloadFromIDB = debounce(async () => {
    if (useIDB) {
      try {
        const stored = await idbGet<T>(key);
        if (stored !== undefined) {
          if (schema) {
            let valid = false;
            let errors: string[] = [];
            if (Array.isArray(stored)) {
              valid = await schemaValidator.validateArray(schema, stored);
              if (!valid) errors = await schemaValidator.getArrayValidationErrors(schema, stored);
            } else {
              valid = await schemaValidator.validateSchema(schema, stored);
              if (!valid) errors = await schemaValidator.getValidationErrors(schema, stored);
            }
            if (!valid) {
              console.error(`Invalid data in storage for key "${key}":`, errors);
              data.value = defaultValue;
            } else {
              data.value = stored as T;
            }
          } else {
            data.value = stored as T;
          }
        }
      } catch (e) {
        console.error(`[Storage] Error loading from IndexedDB for key "${key}":`, e);
        data.value = defaultValue;
      }
    } else {
      // fallback: do nothing, already defaultValue
      console.warn('IndexedDB is not available. Using in-memory storage only.');
    }
    loaded = true;
  }, 100);

  if (sync) {
    // BroadcastChannel
    if (broadcast) {
      broadcast.addEventListener('message', (event) => {
        if (event.data && event.data.key === key) {
          reloadFromIDB();
        }
      });
    }
    // localStorage fallback
    window.addEventListener('storage', (event) => {
      if (event.key === SYNC_KEY && event.newValue) {
        try {
          const msg = JSON.parse(event.newValue);
          if (msg.key === key) {
            reloadFromIDB();
          }
        } catch {}
      }
    });
  }

  watch(data, async (newValue) => {
    if (!loaded) return; // Don't save until initial load
    if (schema) {
      let valid = false;
      let errors: string[] = [];
      if (Array.isArray(newValue)) {
        valid = await schemaValidator.validateArray(schema, newValue);
        if (!valid) errors = await schemaValidator.getArrayValidationErrors(schema, newValue);
      } else {
        valid = await schemaValidator.validateSchema(schema, newValue);
        if (!valid) errors = await schemaValidator.getValidationErrors(schema, newValue);
      }
      if (!valid) {
        console.error(`Invalid data being stored for key "${key}":`, errors);
        return;
      }
    }
    if (useIDB) {
      try {
        await idbSet(key, newValue);
        // Broadcast change
        if (sync) {
          if (broadcast) {
            broadcast.postMessage({ key });
          } else {
            // Fallback: update dummy localStorage key to trigger storage event
            try {
              localStorage.setItem(SYNC_KEY, JSON.stringify({ key, t: Date.now() }));
            } catch {}
          }
        }
      } catch (error) {
        console.error(`[Storage] Error saving data for key: ${key}:`, error);
        onError?.(error instanceof Error ? error : new Error(String(error)));
      }
    }
  }, { deep: true });

  // No sync event for IndexedDB, so skip that part

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

// IndexedDB-based storage management
export async function clearStorage(key?: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    if (key) {
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    } else {
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    }
  });
}

export async function getStorageKeys(): Promise<string[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAllKeys();
    req.onsuccess = () => resolve(req.result as string[]);
    req.onerror = () => reject(req.error);
  });
}

export async function getStorageSize(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => {
      const all = req.result;
      let size = 0;
      for (const value of all) {
        try {
          size += JSON.stringify(value).length;
        } catch {
          // ignore
        }
      }
      resolve(size);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getStorageInfo(): Promise<{ size: number; itemCount: number }> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => {
      const all = req.result;
      let totalSize = 0;
      let itemCount = all.length;
      for (const value of all) {
        try {
          totalSize += JSON.stringify(value).length;
        } catch {
          // ignore
        }
      }
      resolve({ size: totalSize, itemCount });
    };
    req.onerror = () => reject(req.error);
  });
}

export function isStorageQuotaExceeded(error: unknown): boolean {
  return error instanceof DOMException && (
    error.name === 'QuotaExceededError' ||
    error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
  );
}
