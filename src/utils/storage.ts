import { ref, computed, type Ref, type ComputedRef } from 'vue';
import { nanoid } from 'nanoid';
import { openDB as idbOpenDB, IDBPDatabase } from 'idb';
import { defineStore } from 'pinia';

import * as schemaValidator from './schemaValidator';
import { WithMetadata } from "@/types";
import { deepUnwrap } from './deepUnwrap';

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
  'jukebox_files'
];

async function openDB(): Promise<IDBPDatabase> {
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
  const db = await openDB();
  return db.transaction(storeName).objectStore(storeName).get(id);
}

export async function idbPutItem<T extends { id: string }>(storeName: string, item: T): Promise<void> {
  if (schemaValidator.canValidate(storeName)) {
    const { valid, errors } = await schemaValidator.validateSchema(storeName, item);
  
    if (!valid) {
      throw new StorageError(`Validation failed for store '${storeName}': ${errors.join('; ')}`);
    }
  }
  
  const db = await openDB();
  await db.transaction(storeName, 'readwrite').objectStore(storeName).put(item);
}

export async function idbDeleteItem(storeName: string, id: string): Promise<void> {
  const db = await openDB();
  await db.transaction(storeName, 'readwrite').objectStore(storeName).delete(id);
}

export async function idbGetAllItems<T>(storeName: string): Promise<T[]> {
  const db = await openDB();
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

// This cache will ensure that we create only one store instance per store name.
const storeCache: Map<string, BaseStore<any>> = new Map();

export function useStore<T extends WithMetadata>(options: StorageOptions): BaseStore<T> {
  const { storeName, validationSchema } = options;

  // If a store for this name already exists in the cache, return it.
  if (storeCache.has(storeName)) {
    return storeCache.get(storeName) as BaseStore<T>;
  }

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
    const newItem: T = {
      ...deepUnwrap(data),
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

    const plainOriginal = deepUnwrap(items.value[idx]);
    const plainPatch = deepUnwrap(patch);

    const updated: T = {
      ...plainOriginal,
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

  const store: BaseStore<T> = {
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

  // Add the new store to the cache before returning it.
  storeCache.set(storeName, store);

  return store;
}

// --- Indexation Store Logic (moved from createIndexationStore.ts) ---
export interface EntityRef {
  kind: string;
  id: string;
}

export interface Link {
  kind: string;
  id: string;
}

function makeKey(ref: EntityRef) {
  return `${ref.kind}:${ref.id}`;
}

export function createIndexationStore(storeName: string) {
  const store = `indexations_${storeName}`;
  return defineStore(storeName, () => {
    const links = ref<Record<string, Link[]>>({});
    const loaded = ref(false);

    async function load() {
      const all = await idbGetAllItems<{ id: string; links: Link[] }>(store);
      links.value = {};
      for (const rec of all) {
        links.value[rec.id] = rec.links;
      }
      loaded.value = true;
    }

    async function saveKey(key: string) {
      if (links.value[key] && links.value[key].length > 0) {
        await idbPutItem(store, deepUnwrap({ id: key, links: links.value[key] }));
      } else {
        await idbDeleteItem(store, key);
      }
    }

    function addLink(from: EntityRef, to: EntityRef) {
      const key = makeKey(from);
      if (!links.value[key]) links.value[key] = [];
      if (!links.value[key].some(link => link.kind === to.kind && link.id === to.id)) {
        links.value[key].push({ kind: to.kind, id: to.id });
        saveKey(key);
      }
    }

    function removeLink(from: EntityRef, to: EntityRef) {
      const key = makeKey(from);
      if (links.value[key]) {
        links.value[key] = links.value[key].filter(link => !(link.kind === to.kind && link.id === to.id));
        if (links.value[key].length === 0) delete links.value[key];
        saveKey(key);
      }
    }

    function getLinks(from: EntityRef): Link[] {
      const key = makeKey(from);
      return links.value[key] || [];
    }

    function setLinks(from: EntityRef, toLinks: Link[]) {
      const key = makeKey(from);
      // Deduplicate by kind+id
      const seen = new Set<string>();
      const uniqueLinks = toLinks.filter(link => {
        const k = makeKey(link);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      links.value[key] = uniqueLinks;
      saveKey(key);
    }

    function clearLinks(from: EntityRef) {
      const key = makeKey(from);
      delete links.value[key];
      saveKey(key);
    }

    async function clearAll() {
      links.value = {};
      // Remove all records from the object store
      const all = await idbGetAllItems<{ id: string }>(store);
      await Promise.all(all.map(rec => idbDeleteItem(store, rec.id)));
    }

    function getBacklinks(target: EntityRef): EntityRef[] {
      const result: EntityRef[] = [];
      const targetKey = makeKey(target);
      for (const [fromKey, toLinks] of Object.entries(links.value)) {
        if (toLinks.some(link => makeKey(link) === targetKey)) {
          const [kind, id] = fromKey.split(':');
          result.push({ kind, id });
        }
      }
      return result;
    }

    return {
      links,
      loaded,
      addLink,
      removeLink,
      getLinks,
      setLinks,
      clearLinks,
      clearAll,
      getBacklinks,
      load,
    };
  });
}

// Global mentions store for all entity mentions
export const useMentionsStore = createIndexationStore('mentions');

export const useCombatEntityIndexationStore = createIndexationStore('combatEntityIndexation');
