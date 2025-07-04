import { ref, computed, type Ref, type ComputedRef } from 'vue';
import { nanoid } from 'nanoid';
import { openDB as idbOpenDB, IDBPDatabase } from 'idb';
import { defineStore } from 'pinia';
import JSZip from 'jszip';

import * as schemaValidator from './schemaValidator';
import { WithMetadata } from '@/types';
import { deepUnwrap } from './deepUnwrap';
import { sortedMigrations } from '@/migrations';
import type { Migration } from '@/types/migration';
import { debug } from './debug';

export class StorageError extends Error {
  constructor(
    message: string,
    public key?: string,
    public cause?: unknown,
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

export function hasRequiredFields<T extends object>(
  obj: T,
  fields: (keyof T)[],
): boolean {
  return fields.every((field) => field in obj);
}

// --- IndexedDB Helper using idb ---
const DB_NAME = 'dmh-db';
const MIGRATIONS_STORE = 'migrations';

export async function openDB(): Promise<IDBPDatabase> {
  const DB_VERSION = Math.max(
    ...sortedMigrations.map(({ version }) => version),
  );
  let toRun: Migration[] = [];
  const affectedStores = new Set<string>();

  return idbOpenDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      const createStore = (storeName: string) => {
        if (!db.objectStoreNames.contains(storeName)) {
          affectedStores.add(storeName);
          db.createObjectStore(storeName, {
            keyPath: 'id',
            autoIncrement: false,
          });
        }
      };

      createStore(MIGRATIONS_STORE);

      // Use DB_VERSION if newVersion is null
      const effectiveNewVersion = newVersion ?? DB_VERSION;
      // Run migrations for versions > oldVersion and <= newVersion
      toRun = sortedMigrations.filter((m) => {
        if (m.version > oldVersion && m.version <= effectiveNewVersion) {
          m.affectedStores.forEach((storeName) => createStore(storeName));
          return true;
        }

        return false;
      });

      let chain: Promise<any> = Promise.resolve();

      debug('{{{ MIGRATIONS to run: %i }}}', toRun.length);

      for (const migration of toRun) {
        chain = chain.then(() => {
          const info = {
            id: generateId(),
            version: migration.version,
            name: migration.name,
            appliedAt: Date.now(),
          };

          debug('{{{ MIGRATION loading %o }}}', info);

          return Promise.resolve(migration.go(transaction)).then(() =>
            transaction
              .objectStore(MIGRATIONS_STORE)
              .put(info)
              .then(() => debug('{{{ MIGRATION loaded %o }}}', info)),
          );
        });
      }

      chain
        .then(() => debug('{{{ MIGRATIONS finished successfully }}}'))
        .catch((err) => {
          debug('{{{ MIGRATIONS failed }}}');
          transaction.abort();
          throw err;
        });
    },
  });
}

// --- Per-item CRUD helpers using idb ---
export async function idbGetItem<T>(
  storeName: string,
  id: string,
): Promise<T | undefined> {
  const db = await openDB();
  return db.transaction(storeName).objectStore(storeName).get(id);
}

export async function idbPutItem<T extends { id: string }>(
  storeName: string,
  item: T,
): Promise<void> {
  if (schemaValidator.canValidate(storeName)) {
    const { valid, errors } = await schemaValidator.validateSchema(
      storeName,
      item,
    );

    if (!valid) {
      throw new StorageError(
        `Validation failed for store '${storeName}': ${errors.join('; ')}`,
      );
    }
  }

  const db = await openDB();
  await db.transaction(storeName, 'readwrite').objectStore(storeName).put(item);
}

export async function idbDeleteItem(
  storeName: string,
  id: string,
): Promise<void> {
  const db = await openDB();
  await db
    .transaction(storeName, 'readwrite')
    .objectStore(storeName)
    .delete(id);
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
  update: (
    id: string,
    patch: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>,
  ) => Promise<T>;
  remove: (id: string) => Promise<void>;
  load: () => Promise<void>;

  current: ComputedRef<T | null>;
  setCurrentId: (id: string | null) => void;
  clearCurrent: () => void;
}

// This cache will ensure that we create only one store instance per store name.
const storeCache: Map<string, BaseStore<any>> = new Map();

export function useStore<T extends WithMetadata>(
  options: StorageOptions,
): BaseStore<T> {
  const { storeName, validationSchema } = options;

  // If a store for this name already exists in the cache, return it.
  if (storeCache.has(storeName)) {
    return storeCache.get(storeName) as BaseStore<T>;
  }

  const items = ref<any[]>([]) as unknown as Ref<T[]>;
  const isLoaded: Ref<boolean> = ref(false);
  const error: Ref<Error | null> = ref(null);
  const currentId = ref<string | null>(null);

  const current = computed(() => {
    if (!currentId.value) return null;
    return getById(currentId.value) || null;
  });

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

  async function create(
    data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<T> {
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

  async function update(
    id: string,
    patch: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<T> {
    const idx = items.value.findIndex((item) => item.id === id);
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
    items.value = items.value.filter((item) => item.id !== id);
    if (currentId.value === id) currentId.value = null;
  }

  const getById = (id: string): T | null => {
    return items.value.find((item) => item.id === id) || null;
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
    current,
    setCurrentId: (id: string | null) => {
      currentId.value = id;
    },
    clearCurrent: () => {
      currentId.value = null;
    },
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
        await idbPutItem(
          store,
          deepUnwrap({ id: key, links: links.value[key] }),
        );
      } else {
        await idbDeleteItem(store, key);
      }
    }

    async function addLink(from: EntityRef, to: EntityRef) {
      const key = makeKey(from);
      if (!links.value[key]) links.value[key] = [];
      if (
        !links.value[key].some(
          (link) => link.kind === to.kind && link.id === to.id,
        )
      ) {
        links.value[key].push({ kind: to.kind, id: to.id });
        await saveKey(key);
      }
    }

    async function removeLink(from: EntityRef, to: EntityRef) {
      const key = makeKey(from);
      if (links.value[key]) {
        links.value[key] = links.value[key].filter(
          (link) => !(link.kind === to.kind && link.id === to.id),
        );
        if (links.value[key].length === 0) delete links.value[key];
        await saveKey(key);
      }
    }

    function getLinks(from: EntityRef): Link[] {
      const key = makeKey(from);
      return links.value[key] || [];
    }

    async function setLinks(from: EntityRef, toLinks: Link[]) {
      const key = makeKey(from);
      // Deduplicate by kind+id
      const seen = new Set<string>();
      const uniqueLinks = toLinks.filter((link) => {
        const k = makeKey(link);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      links.value[key] = uniqueLinks;
      await saveKey(key);
    }

    async function clearLinks(from: EntityRef) {
      const key = makeKey(from);
      delete links.value[key];
      await saveKey(key);
    }

    async function clearAll() {
      links.value = {};
      // Remove all records from the object store
      const all = await idbGetAllItems<{ id: string }>(store);
      await Promise.all(all.map((rec) => idbDeleteItem(store, rec.id)));
    }

    function getBacklinks(target: EntityRef): EntityRef[] {
      const result: EntityRef[] = [];
      const targetKey = makeKey(target);
      for (const [fromKey, toLinks] of Object.entries(links.value)) {
        if (toLinks.some((link) => makeKey(link) === targetKey)) {
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

// --- Database initialization ---
let isInitialized = false;

export async function initializeDatabase(): Promise<void> {
  if (isInitialized) {
    return;
  }

  try {
    debug('Initializing database...');
    await openDB();
    isInitialized = true;
    debug('Database initialized successfully');
  } catch (error) {
    debug('Failed to initialize database:', error);
    throw error;
  }
}

// List of all main store names for backup/restore
export const MAIN_STORE_NAMES = [
  'characters',
  'combats',
  'encounters',
  'monsters',
  'modules',
  'notes',
  'noteTypes',
  'parties',
  'bookmarks',
];

/**
 * Backup all main stores as a zip file (returns a Blob)
 */
export async function backupAllStores(): Promise<Blob> {
  const zip = new JSZip();
  for (const storeName of MAIN_STORE_NAMES) {
    const items = await idbGetAllItems(storeName);
    zip.file(`${storeName}.json`, JSON.stringify(items, null, 2));
  }
  return zip.generateAsync({ type: 'blob' });
}

/**
 * Restore all main stores from a zip file (Blob or File)
 * Overwrites all data in those stores
 */
export async function restoreAllStores(zipFile: Blob): Promise<void> {
  const zip = await JSZip.loadAsync(zipFile);
  for (const storeName of MAIN_STORE_NAMES) {
    const file = zip.file(`${storeName}.json`);
    if (!file) continue;
    const content = await file.async('string');
    let items: any[] = [];
    try {
      items = JSON.parse(content);
    } catch (e) {
      // skip invalid JSON
      continue;
    }
    // Clear existing store
    await clearStore(storeName);
    // Add items
    for (const item of items) {
      await idbPutItem(storeName, item);
    }
  }
}

/**
 * Clear all items from a store
 */
export async function clearStore(storeName: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);
  const keys = await store.getAllKeys();
  for (const key of keys) {
    await store.delete(key);
  }
  await tx.done;
}
