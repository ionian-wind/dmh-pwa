import { ref, watch } from 'vue';
import type { Ref, UnwrapRef } from 'vue';
import * as schemaValidator from './schemaValidator';
import { nanoid } from 'nanoid';

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
  return nanoid(10);
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
  migrate?: MigrationFunction<T>;
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

export function useStorage<T>({ key, defaultValue, schema, sync = true, validate, onError, migrate }: StorageOptions<T>): [Ref<UnwrapRef<T>>, Ref<boolean>] {
  const data = ref<T>(defaultValue);
  const loaded = ref(false);
  const useIDB = isIndexedDBAvailable();

  // Initial load from IndexedDB
  (async () => {
    if (useIDB) {
      try {
        const stored = await idbGet<T>(key);
        if (stored !== undefined) {
          let processedData = stored;
          
          // Apply migration if provided
          if (migrate) {
            try {
              processedData = migrate(stored) as T;
              console.log(`[Storage] Migrated data for key "${key}"`);
            } catch (e) {
              console.warn(`[Storage] Migration failed for key "${key}":`, e);
              processedData = defaultValue;
            }
          }
          
          if (schema) {
            let valid = false;
            let errors: string[] = [];
            if (Array.isArray(processedData)) {
              valid = await schemaValidator.validateArray(schema, processedData);
              if (!valid) errors = await schemaValidator.getArrayValidationErrors(schema, processedData);
            } else {
              valid = await schemaValidator.validateSchema(schema, processedData);
              if (!valid) errors = await schemaValidator.getValidationErrors(schema, processedData);
            }
            if (!valid) {
              console.error(`Invalid data in storage for key "${key}":`, errors);
              data.value = defaultValue;
            } else {
              data.value = processedData as unknown as T;
            }
          } else {
            data.value = processedData as unknown as T;
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
    loaded.value = true;
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
              data.value = stored as unknown as T;
            }
          } else {
            data.value = stored as unknown as T;
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
    loaded.value = true;
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
    if (!loaded.value) return; // Don't save until initial load
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

  return [data, loaded];
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
  return error instanceof Error && (
    error.name === 'QuotaExceededError' ||
    error.message.includes('quota') ||
    error.message.includes('QuotaExceeded')
  );
}

// Migration utilities for backward compatibility
export interface MigrationFunction<T> {
  (data: unknown): T;
}

export async function migrateStorageData<T>(
  key: string,
  migrationFn: MigrationFunction<T>,
  defaultValue: T
): Promise<T> {
  try {
    const stored = await idbGet<unknown>(key);
    if (stored !== undefined) {
      try {
        return migrationFn(stored);
      } catch (e) {
        console.warn(`[Storage] Migration failed for key "${key}":`, e);
        return defaultValue;
      }
    }
  } catch (e) {
    console.warn(`[Storage] Error reading data for migration from key "${key}":`, e);
  }
  return defaultValue;
}

// Common migration functions
export function migrateNoteData(data: unknown): any[] {
  if (!Array.isArray(data)) {
    throw new Error('Expected array of notes');
  }
  
  return data.map(note => {
    if (typeof note !== 'object' || note === null) {
      throw new Error('Invalid note object');
    }
    
    const migratedNote = { ...note };
    
    // Ensure typeId is either string or null
    if (migratedNote.typeId === undefined) {
      migratedNote.typeId = null;
    }
    
    // Ensure moduleId is either string or null
    if (migratedNote.moduleId === undefined) {
      migratedNote.moduleId = null;
    }
    
    // Ensure tags is an array
    if (!Array.isArray(migratedNote.tags)) {
      migratedNote.tags = [];
    }
    
    // Ensure required fields exist
    if (!migratedNote.id) {
      migratedNote.id = generateId();
    }
    if (!migratedNote.createdAt) {
      migratedNote.createdAt = Date.now();
    }
    if (!migratedNote.updatedAt) {
      migratedNote.updatedAt = Date.now();
    }
    
    return migratedNote;
  });
}

export function migrateMonsterData(data: unknown): any[] {
  if (!Array.isArray(data)) {
    throw new Error('Expected array of monsters');
  }
  
  return data.map(monster => {
    if (typeof monster !== 'object' || monster === null) {
      throw new Error('Invalid monster object');
    }
    
    const migratedMonster = { ...monster };
    
    // Ensure moduleId is either string or null
    if (migratedMonster.moduleId === undefined) {
      migratedMonster.moduleId = null;
    }
    
    // Ensure moduleIds is an array
    if (!Array.isArray(migratedMonster.moduleIds)) {
      migratedMonster.moduleIds = migratedMonster.moduleId ? [migratedMonster.moduleId] : [];
    }
    
    // Convert challengeRating to number if it's a string
    if (typeof migratedMonster.challengeRating === 'string') {
      const cr = parseFloat(migratedMonster.challengeRating);
      migratedMonster.challengeRating = isNaN(cr) ? 0 : cr;
    }
    
    // Ensure challengeRating is a number
    if (typeof migratedMonster.challengeRating !== 'number') {
      migratedMonster.challengeRating = 0;
    }
    
    // Ensure stats are numbers
    if (migratedMonster.stats) {
      const statNames = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
      statNames.forEach(stat => {
        if (typeof migratedMonster.stats[stat] === 'string') {
          const value = parseInt(migratedMonster.stats[stat]);
          migratedMonster.stats[stat] = isNaN(value) ? 10 : value;
        }
        if (typeof migratedMonster.stats[stat] !== 'number') {
          migratedMonster.stats[stat] = 10;
        }
      });
    }
    
    // Ensure arrays are arrays
    if (!Array.isArray(migratedMonster.senses)) {
      migratedMonster.senses = [];
    }
    if (!Array.isArray(migratedMonster.languages)) {
      migratedMonster.languages = [];
    }
    if (!Array.isArray(migratedMonster.actions)) {
      migratedMonster.actions = [];
    }
    
    // Ensure required fields exist
    if (!migratedMonster.id) {
      migratedMonster.id = generateId();
    }
    if (!migratedMonster.createdAt) {
      migratedMonster.createdAt = Date.now();
    }
    if (!migratedMonster.updatedAt) {
      migratedMonster.updatedAt = Date.now();
    }
    
    return migratedMonster;
  });
}

export function migrateCharacterData(data: unknown): any[] {
  if (!Array.isArray(data)) {
    throw new Error('Expected array of characters');
  }
  
  return data.map(character => {
    if (typeof character !== 'object' || character === null) {
      throw new Error('Invalid character object');
    }
    
    const migratedCharacter = { ...character };
    
    // Ensure partyId is either string or null
    if (migratedCharacter.partyId === undefined) {
      migratedCharacter.partyId = null;
    }
    
    // Ensure arrays are arrays
    if (!Array.isArray(migratedCharacter.tags)) {
      migratedCharacter.tags = [];
    }
    
    // Ensure required fields exist
    if (!migratedCharacter.id) {
      migratedCharacter.id = generateId();
    }
    if (!migratedCharacter.createdAt) {
      migratedCharacter.createdAt = Date.now();
    }
    if (!migratedCharacter.updatedAt) {
      migratedCharacter.updatedAt = Date.now();
    }
    
    return migratedCharacter;
  });
}

export function migratePartyData(data: unknown): any[] {
  if (!Array.isArray(data)) {
    throw new Error('Expected array of parties');
  }
  
  return data.map(party => {
    if (typeof party !== 'object' || party === null) {
      throw new Error('Invalid party object');
    }
    
    const migratedParty = { ...party };
    
    // Ensure moduleIds is an array
    if (!Array.isArray(migratedParty.moduleIds)) {
      migratedParty.moduleIds = migratedParty.moduleId ? [migratedParty.moduleId] : [];
    }
    
    // Ensure characters is an array
    if (!Array.isArray(migratedParty.characters)) {
      migratedParty.characters = [];
    }
    
    // Ensure arrays are arrays
    if (!Array.isArray(migratedParty.tags)) {
      migratedParty.tags = [];
    }
    
    // Ensure required fields exist
    if (!migratedParty.id) {
      migratedParty.id = generateId();
    }
    if (!migratedParty.createdAt) {
      migratedParty.createdAt = Date.now();
    }
    if (!migratedParty.updatedAt) {
      migratedParty.updatedAt = Date.now();
    }
    
    return migratedParty;
  });
}

export function migrateEncounterData(data: unknown): any[] {
  if (!Array.isArray(data)) {
    throw new Error('Expected array of encounters');
  }
  
  return data.map(encounter => {
    if (typeof encounter !== 'object' || encounter === null) {
      throw new Error('Invalid encounter object');
    }
    
    const migratedEncounter = { ...encounter };
    
    // Ensure moduleId is either string or null
    if (migratedEncounter.moduleId === undefined) {
      migratedEncounter.moduleId = null;
    }
    
    // Ensure monsters is an object
    if (typeof migratedEncounter.monsters !== 'object' || migratedEncounter.monsters === null) {
      migratedEncounter.monsters = {};
    }
    
    // Ensure numbers are numbers
    if (typeof migratedEncounter.currentRound !== 'number') {
      migratedEncounter.currentRound = 0;
    }
    if (typeof migratedEncounter.currentTurn !== 'number') {
      migratedEncounter.currentTurn = 0;
    }
    
    // Ensure required fields exist
    if (!migratedEncounter.id) {
      migratedEncounter.id = generateId();
    }
    if (!migratedEncounter.createdAt) {
      migratedEncounter.createdAt = Date.now();
    }
    if (!migratedEncounter.updatedAt) {
      migratedEncounter.updatedAt = Date.now();
    }
    
    return migratedEncounter;
  });
}

export function migrateCombatData(data: unknown): any[] {
  if (!Array.isArray(data)) {
    throw new Error('Expected array of combats');
  }
  
  return data.map(combat => {
    if (typeof combat !== 'object' || combat === null) {
      throw new Error('Invalid combat object');
    }
    
    const migratedCombat = { ...combat };
    
    // Ensure combatants is an array
    if (!Array.isArray(migratedCombat.combatants)) {
      migratedCombat.combatants = [];
    }
    
    // Ensure numbers are numbers
    if (typeof migratedCombat.currentRound !== 'number') {
      migratedCombat.currentRound = 0;
    }
    if (typeof migratedCombat.currentTurn !== 'number') {
      migratedCombat.currentTurn = 0;
    }
    
    // Ensure required fields exist
    if (!migratedCombat.id) {
      migratedCombat.id = generateId();
    }
    if (!migratedCombat.createdAt) {
      migratedCombat.createdAt = Date.now();
    }
    if (!migratedCombat.updatedAt) {
      migratedCombat.updatedAt = Date.now();
    }
    
    return migratedCombat;
  });
}
