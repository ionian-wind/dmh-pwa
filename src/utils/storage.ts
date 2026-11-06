import { ref, computed, type Ref, type ComputedRef } from 'vue';
import { nanoid } from 'nanoid';
import Dexie, { type Table, type Transaction } from 'dexie';
import { defineStore } from 'pinia';
import JSZip from 'jszip';

import * as schemaValidator from './schemaValidator';
import { WithMetadata } from '@/types';
import { deepUnwrap } from './deepUnwrap';
import { sortedMigrations } from '@/migrations';
import type {
  Migration,
  MigrationStore,
  MigrationTransaction,
} from '@/types/migration';
import { buildFileSignature } from './files/signature';
import {
  clearOpfsFiles,
  readOpfsFile,
  supportsOpfs,
  writeOpfsFile,
} from './files/opfs';
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

// --- Dexie database ---
const DB_NAME = 'dmh-db';
const MIGRATIONS_STORE = 'migrations';
const MIGRATION_VERSION = Math.max(
  ...sortedMigrations.map(({ version }) => version),
);
const SCHEMA_VERSION = 12;
const DB_VERSION = Math.max(SCHEMA_VERSION, MIGRATION_VERSION);

// All stores that may exist in the database. The main list is also used by
// backup/restore; legacy stores remain declared so older databases can be
// opened and their data migrated.
export const MAIN_STORE_NAMES = [
  'characters',
  'combats',
  'encounters',
  'monsters',
  'modules',
  'notes',
  'noteTypes',
  'parties',
  'map_locations',
  'bookmarks',
  'timers',
  'jukebox_playlists',
  'jukebox_tracks',
  'files',
  'map_image_metadata',
  'indexations_mentions',
];

const migrationStoreNames = sortedMigrations.flatMap(
  (migration) => migration.affectedStores,
);
const SCHEMA_STORE_NAMES = Array.from(
  new Set([
    MIGRATIONS_STORE,
    ...MAIN_STORE_NAMES,
    ...migrationStoreNames,
    'maps',
    'map_files',
    'jukebox_files',
    'sound_packs',
  ]),
);

// Explicit indexes for the queries the app performs. Any store added by a
// migration but not listed here still gets the `id` primary key.
const EXPLICIT_SCHEMA: Record<string, string> = {
  migrations: 'id, version',
  characters: 'id, updatedAt, *moduleIds',
  combats: 'id, updatedAt, encounterId, partyId, status',
  encounters: 'id, updatedAt, *moduleIds',
  monsters: 'id, updatedAt, *moduleIds',
  modules: 'id, updatedAt',
  notes: 'id, updatedAt, createdAt, typeId, *tags, *moduleIds',
  noteTypes: 'id, updatedAt',
  parties: 'id, updatedAt, *moduleIds',
  map_locations: 'id, updatedAt',
  bookmarks: 'id, moduleId, noteId',
  timers: 'id, updatedAt, status',
  jukebox_playlists: 'id, updatedAt',
  jukebox_tracks: 'id, updatedAt',
  files: 'id, signature, contentHash, updatedAt',
  map_image_metadata: 'id',
  indexations_mentions: 'id',
  maps: 'id',
  map_files: 'id',
  jukebox_files: 'id',
  sound_packs: 'id, addedAt',
};

const SCHEMA: Record<string, string> = { ...EXPLICIT_SCHEMA };
for (const storeName of SCHEMA_STORE_NAMES) {
  if (!(storeName in SCHEMA)) SCHEMA[storeName] = 'id';
}

export class DmhDatabase extends Dexie {
  migrations!: Table<
    { id: string; version: number; name: string; appliedAt: number },
    string
  >;
  characters!: Table<any, string>;
  combats!: Table<any, string>;
  encounters!: Table<any, string>;
  monsters!: Table<any, string>;
  modules!: Table<any, string>;
  notes!: Table<any, string>;
  noteTypes!: Table<any, string>;
  parties!: Table<any, string>;
  map_locations!: Table<any, string>;
  bookmarks!: Table<any, string>;
  timers!: Table<any, string>;
  jukebox_playlists!: Table<any, string>;
  jukebox_tracks!: Table<any, string>;
  jukebox_files!: Table<any, string>;
  files!: Table<any, string>;
  map_image_metadata!: Table<any, string>;
  indexations_mentions!: Table<any, string>;
  sound_packs!: Table<any, string>;
  maps!: Table<any, string>;
  map_files!: Table<any, string>;

  constructor() {
    super(DB_NAME);
    // Version 12 adds query indexes and the sound_packs store while keeping
    // the legacy store names/key paths; migrations remain recorded separately.
    this.version(DB_VERSION).stores(SCHEMA);
    this.on('versionchange', () => this.close());
  }
}

let dbPromise: Promise<DmhDatabase> | null = null;

function migrationTransaction(transaction: Transaction): MigrationTransaction {
  const store = (name: string): MigrationStore => {
    const table = transaction.table(name);
    return {
      getAll: () => table.toArray(),
      put: (value) => table.put(value),
      getAllKeys: () => table.toCollection().primaryKeys(),
      delete: (key) => table.delete(key),
      clear: () => table.clear(),
    };
  };
  return { objectStore: store };
}

async function openAndMigrate(): Promise<DmhDatabase> {
  const db = new DmhDatabase();
  await db.open();
  await applyPendingMigrations(db);
  return db;
}

export function openDB(): Promise<DmhDatabase> {
  if (!dbPromise) {
    dbPromise = openAndMigrate().catch((error) => {
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
}

/**
 * Run migrations that are not recorded in the migrations store. Dexie opens
 * the legacy database at the same version, so existing data is preserved.
 */
export async function applyPendingMigrations(
  db: DmhDatabase,
  migrations: Migration[] = sortedMigrations,
): Promise<void> {
  const applied = (await db.table(MIGRATIONS_STORE).toArray()) as Array<{
    version: number;
  }>;
  const appliedVersions = new Set(applied.map((record) => record.version));

  for (const migration of migrations) {
    if (appliedVersions.has(migration.version)) continue;

    const info = {
      id: generateId(),
      version: migration.version,
      name: migration.name,
      appliedAt: Date.now(),
    };

    const storeNames = Array.from(
      new Set([MIGRATIONS_STORE, ...migration.affectedStores]),
    );
    const tables = storeNames.map((storeName) => db.table(storeName));

    await db.transaction('rw', tables, async (transaction) => {
      await migration.go(migrationTransaction(transaction));
      await transaction.table(MIGRATIONS_STORE).put(info);
    });

    appliedVersions.add(migration.version);
    debug('{{{ MIGRATION loaded %o }}}', info);
  }
}

// --- Per-item CRUD helpers backed by Dexie ---
export async function idbGetItem<T>(
  storeName: string,
  id: string,
): Promise<T | undefined> {
  const db = await openDB();
  return db.table(storeName).get(id) as Promise<T | undefined>;
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
  await db.table(storeName).put(item);
}

export async function idbDeleteItem(
  storeName: string,
  id: string,
): Promise<void> {
  const db = await openDB();
  await db.table(storeName).delete(id);
}

export async function idbGetAllItems<T>(storeName: string): Promise<T[]> {
  const db = await openDB();
  return db.table(storeName).toArray() as Promise<T[]>;
}

export async function idbFindByIndex<T>(
  storeName: string,
  indexName: string,
  value: string,
): Promise<T | undefined> {
  const db = await openDB();
  return db.table(storeName).where(indexName).equals(value).first() as Promise<
    T | undefined
  >;
}

export async function idbPutItems<T extends { id: string }>(
  storeName: string,
  items: T[],
): Promise<void> {
  if (items.length === 0) return;

  if (schemaValidator.canValidate(storeName)) {
    for (const item of items) {
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
  }

  const db = await openDB();
  await db.table(storeName).bulkPut(items);
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

/** Test helper: clear the in-memory base-store cache. */
export async function resetStoreCache(): Promise<void> {
  const pending = dbPromise;
  storeCache.clear();
  dbPromise = null;
  isInitialized = false;
  if (!pending) return;
  try {
    (await pending).close();
  } catch {
    // Ignore a connection that failed to open.
  }
}

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
      await clearStore(store);
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

const BACKUP_FORMAT = 'dmh.backup';
const BACKUP_VERSION = 2;

function isBlobLike(value: any): value is Blob {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof value.arrayBuffer === 'function' &&
    typeof value.slice === 'function' &&
    typeof value.size === 'number'
  );
}

function base64ToBlob(data: string, type: string): Blob {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type });
}

async function serializeStoreItems(
  storeName: string,
  items: any[],
  zip: JSZip,
  options: BackupOptions,
): Promise<any[]> {
  if (storeName !== 'files') return items;

  return Promise.all(
    items.map(async (item) => {
      const source = item?.source;
      if (!source) return item;

      if (source.kind === 'blob' && isBlobLike(source.blob)) {
        const entry = `files/${item.id}`;
        zip.file(entry, source.blob);
        return {
          ...item,
          source: {
            kind: 'binary',
            entry,
            type: source.blob.type,
            size: source.blob.size,
          },
        };
      }

      if (source.kind === 'opfs') {
        try {
          const file = await readOpfsFile(source.path);
          const entry = `files/${item.id}`;
          zip.file(entry, file);
          return {
            ...item,
            source: {
              kind: 'binary',
              entry,
              type: file.type,
              size: file.size,
            },
          };
        } catch {
          return {
            ...item,
            source: {
              kind: 'unavailable',
              reason: 'OPFS file is missing',
            },
          };
        }
      }

      if (source.kind === 'handle') {
        if (options.includeExternalFiles) {
          try {
            const file = await source.handle.getFile();
            const entry = `files/${item.id}`;
            zip.file(entry, file);
            return {
              ...item,
              source: {
                kind: 'binary',
                entry,
                type: file.type,
                size: file.size,
                external: true,
              },
            };
          } catch (error) {
            debug('Could not include external file in backup:', error);
          }
        }
        return {
          ...item,
          source: {
            kind: 'unavailable',
            reason: 'FileSystemFileHandle cannot be serialized',
          },
        };
      }

      return item;
    }),
  );
}

function deserializeStoreItems(storeName: string, items: any[]): any[] {
  if (storeName !== 'files') return items;

  return items.map((item) => {
    const source = item?.source;
    if (source?.kind === 'blob-data') {
      return {
        ...item,
        source: {
          kind: 'blob',
          blob: base64ToBlob(
            source.data,
            source.type || 'application/octet-stream',
          ),
        },
      };
    }
    return item;
  });
}

async function deserializeFileItemsForRestore(
  zip: JSZip,
  items: any[],
): Promise<any[]> {
  const restored: any[] = [];

  for (const item of items) {
    const source = item?.source;

    if (source?.kind === 'blob-data') {
      restored.push(...deserializeStoreItems('files', [item]));
      continue;
    }

    if (source?.kind === 'binary' && typeof source.entry === 'string') {
      const entry = zip.file(source.entry);
      if (!entry) {
        restored.push({
          ...item,
          source: {
            kind: 'unavailable',
            reason: 'Backup file entry is missing',
          },
        });
        continue;
      }

      const raw = await entry.async('blob');
      const blob = source.type ? new Blob([raw], { type: source.type }) : raw;

      if (supportsOpfs()) {
        try {
          await writeOpfsFile(source.entry, blob);
          restored.push({
            ...item,
            source: { kind: 'opfs', path: source.entry },
          });
          continue;
        } catch (error) {
          debug('Failed to restore file into OPFS:', error);
        }
      }

      restored.push({ ...item, source: { kind: 'blob', blob } });
      continue;
    }

    restored.push(item);
  }

  return restored;
}

interface LegacyRestoreData {
  files: any[];
  metadata: any[];
}

function hasReadableSource(source: any): boolean {
  if (!source) return false;
  if (source.kind === 'blob') return isBlobLike(source.blob);
  return source.kind === 'handle' || source.kind === 'opfs';
}

async function readLegacyFileRestore(zip: JSZip): Promise<LegacyRestoreData> {
  const files: any[] = [];
  const metadata: any[] = [];
  const legacyStores = ['jukebox_files', 'map_files'];
  for (const storeName of legacyStores) {
    const entry = zip.file(`${storeName}.json`);
    if (!entry) continue;
    let records: any[] = [];
    try {
      records = deserializeStoreItems(
        'files',
        JSON.parse(await entry.async('string')),
      );
    } catch {
      continue;
    }
    for (const record of records) {
      if (!record?.id || !hasReadableSource(record.source)) continue;
      const identity = {
        name: record.name || '',
        size: Number(record.size) || 0,
        type: record.type || '',
        lastModified: Number(record.lastModified) || 0,
      };
      files.push({
        ...record,
        ...identity,
        signature: buildFileSignature(identity),
        createdAt: Number(record.createdAt) || Date.now(),
        updatedAt: Number(record.updatedAt) || Date.now(),
      });
      if (record.imageMetadata) {
        metadata.push({
          id: record.id,
          imageMetadata: record.imageMetadata,
          createdAt: Number(record.createdAt) || Date.now(),
          updatedAt: Number(record.updatedAt) || Date.now(),
        });
      }
    }
  }
  return { files, metadata };
}

async function validateBackupManifest(zip: JSZip): Promise<void> {
  const entry = zip.file('manifest.json');
  if (!entry) return;

  let manifest: any;
  try {
    manifest = JSON.parse(await entry.async('string'));
  } catch {
    throw new Error('Invalid backup manifest');
  }

  if (manifest?.format && manifest.format !== BACKUP_FORMAT) {
    throw new Error('Unsupported backup format');
  }
  if (
    typeof manifest?.version === 'number' &&
    manifest.version > BACKUP_VERSION
  ) {
    throw new Error('Backup was created by a newer app version');
  }
}

/**
 * Backup all main stores as a zip file (returns a Blob). Large file bytes are
 * stored as binary entries instead of base64 JSON payloads.
 */
export interface BackupOptions {
  /** Copy user-linked handles into the archive when permission allows. */
  includeExternalFiles?: boolean;
}

export async function backupAllStores(
  options: BackupOptions = {},
): Promise<Blob> {
  const zip = new JSZip();
  zip.file(
    'manifest.json',
    JSON.stringify(
      {
        format: BACKUP_FORMAT,
        version: BACKUP_VERSION,
        createdAt: new Date().toISOString(),
        appVersion: import.meta.env.VITE_APP_VERSION ?? 'dev',
        stores: MAIN_STORE_NAMES,
        fileEncoding: 'binary',
        includesExternalFiles: !!options.includeExternalFiles,
      },
      null,
      2,
    ),
  );

  for (const storeName of MAIN_STORE_NAMES) {
    const items = await idbGetAllItems(storeName);
    const serialized = await serializeStoreItems(
      storeName,
      items,
      zip,
      options,
    );
    zip.file(`${storeName}.json`, JSON.stringify(serialized, null, 2));
  }
  return zip.generateAsync({ type: 'blob' });
}

/**
 * Restore all main stores from a zip file (Blob or File)
 * Overwrites all data in those stores
 */
export async function restoreAllStores(zipFile: Blob): Promise<void> {
  const zip = await JSZip.loadAsync(zipFile);
  await validateBackupManifest(zip);

  const legacy = zip.file('files.json')
    ? { files: [], metadata: [] }
    : await readLegacyFileRestore(zip);
  const hasFiles = !!zip.file('files.json') || legacy.files.length > 0;

  if (hasFiles && supportsOpfs()) {
    await clearOpfsFiles();
  }

  for (const storeName of MAIN_STORE_NAMES) {
    let items: any[] | null = null;
    const file = zip.file(`${storeName}.json`);

    if (file) {
      const content = await file.async('string');
      try {
        const parsed = JSON.parse(content);
        items =
          storeName === 'files'
            ? await deserializeFileItemsForRestore(zip, parsed)
            : deserializeStoreItems(storeName, parsed);
      } catch (e) {
        // skip invalid JSON
        continue;
      }
    } else if (storeName === 'files' && legacy.files.length > 0) {
      items = legacy.files;
    } else if (
      storeName === 'map_image_metadata' &&
      legacy.metadata.length > 0
    ) {
      items = legacy.metadata;
    }

    if (items === null) continue;

    // Clear existing store, then write the restored records in one batch.
    await clearStore(storeName);
    await idbPutItems(storeName, items);
  }
}

/**
 * Clear all items from a store
 */
export async function clearStore(storeName: string): Promise<void> {
  const db = await openDB();
  await db.table(storeName).clear();
}
