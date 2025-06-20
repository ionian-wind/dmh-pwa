import { ref, computed, type Ref, type ComputedRef } from 'vue';
import { nanoid } from 'nanoid';
import { openDB as idbOpenDB, IDBPDatabase } from 'idb';
import { toRaw } from 'vue';

import * as schemaValidator from './schemaValidator';
import {WithMetadata} from "@/types";

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

// --- IndexedDB Helper using idb ---
const DB_NAME = 'dmh-db';
const DB_VERSION = 1;
// TODO: implement migrations mechanism, so we can add changes to database structure without breaking existing data
const ALL_STORE_NAMES = [
  'characters',
  'monsters',
  'notes',
  'parties',
  'modules',
  'encounters',
  'combats',
  'noteTypes',
  // Indexation stores
  'indexations_mentions',
  // Jukebox stores
  'jukebox_playlists',
  'jukebox_tracks',
];

async function openDB(storeName: string): Promise<IDBPDatabase> {
  // Always open the main DB, and ensure all stores exist
  return idbOpenDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      for (const name of ALL_STORE_NAMES) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: 'id', autoIncrement: false });
        }
      }
    },
  });
}

// --- Per-item CRUD helpers using idb ---
export async function idbGetItem<T>(storeName: string, id: string): Promise<T | undefined> {
  const db = await openDB(storeName);
  return db.transaction(storeName).objectStore(storeName).get(id);
}

export async function idbPutItem<T extends { id: string }>(storeName: string, item: T): Promise<void> {
  const { valid, errors } = await schemaValidator.validateSchema(storeName, item);
  
  if (!valid) {
    throw new StorageError(`Validation failed for store '${storeName}': ${errors.join('; ')}`);
  }
  
  const db = await openDB(storeName);
  await db.transaction(storeName, 'readwrite').objectStore(storeName).put(item);
}

export async function idbDeleteItem(storeName: string, id: string): Promise<void> {
  const db = await openDB(storeName);
  await db.transaction(storeName, 'readwrite').objectStore(storeName).delete(id);
}

export async function idbGetAllItems<T>(storeName: string): Promise<T[]> {
  const db = await openDB(storeName);
  return db.transaction(storeName).objectStore(storeName).getAll();
}

export interface StorageOptions {
  validationSchema?: any;
  storeName: string;
}

export interface BaseStore<T extends WithMetadata> {
  items: Ref<T[]>;
  isLoaded: Ref<boolean>;
  error: Ref<Error | null>;
  sortedItems: ComputedRef<T[]>;
  getById: (id: string) => T | null;
  create: (item: Omit<T, 'id' | 'createdAt' | 'updatedAt'>) => Promise<T>;
  update: (id: string, patch: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<T>;
  remove: (id: string) => Promise<void>;
  load: () => Promise<void>;
}

export function deepUnwrap(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(deepUnwrap);
  }
  if (obj && typeof obj === 'object') {
    if (typeof obj === 'function') return undefined;
    if (obj.__v_isRef) return deepUnwrap(obj.value);
    if (obj.__v_isReactive) obj = toRaw(obj);
    const out: any = {};
    for (const key in obj) {
      out[key] = deepUnwrap(obj[key]);
    }
    return out;
  }
  return obj;
}

export function useStore<T extends WithMetadata>(options: StorageOptions): BaseStore<T> {
  const { storeName, validationSchema } = options;
  const items = ref<any[]>([]) as unknown as Ref<T[]>;
  const isLoaded: Ref<boolean> = ref(false);
  const error: Ref<Error | null> = ref(null);

  // Register validation schema if provided
  if (validationSchema && storeName) {
    schemaValidator.registerValidationSchema(storeName, validationSchema);
  }

  async function load() {
    try {
      items.value = await idbGetAllItems<T>(storeName);
      isLoaded.value = true;
    } catch (e) {
      error.value = e instanceof Error ? e : new Error(String(e));
      throw error.value;
    }
  }

  // Optionally, call load() initially if you want eager loading
  // load();

  async function create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    const plainData = deepUnwrap(data);
    const newItem: T = {
      ...plainData,
      id: generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } as T;
    await idbPutItem(storeName, newItem);
    items.value.push(newItem);
    return newItem;
  }

  async function update(id: string, patch: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>): Promise<T> {
    const idx = items.value.findIndex(item => item.id === id);
    if (idx === -1) throw new Error('Item not found');
    const plainPatch = deepUnwrap(patch);
    const updated: T = {
      ...items.value[idx],
      ...plainPatch,
      updatedAt: Date.now(),
    };
    await idbPutItem(storeName, updated);
    items.value[idx] = updated;
    return updated;
  }

  async function remove(id: string): Promise<void> {
    await idbDeleteItem(storeName, id);
    items.value = items.value.filter(item => item.id !== id);
  }

  const getById = (id: string): T | null => {
    return items.value.find(item => item.id === id) || null;
  };

  const sortedItems: ComputedRef<T[]> = computed(() => {
    return [...items.value].sort((a, b) => b.updatedAt - a.updatedAt);
  });

  return {
    items,
    isLoaded,
    error,
    sortedItems,
    getById,
    create,
    update,
    remove,
    load,
  };
}
