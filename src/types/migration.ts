/**
 * Minimal object-store surface used by migrations.
 *
 * It intentionally mirrors the shape the legacy `idb` migrations were written
 * against; the storage layer adapts a Dexie transaction to it. That keeps the
 * migration bodies focused on data transforms and easy to unit test.
 */
export interface MigrationStore {
  getAll(): Promise<any[]>;
  put(value: any): Promise<any>;
  getAllKeys(): Promise<any[]>;
  delete(key: any): Promise<void>;
  clear(): Promise<void>;
}

export interface MigrationTransaction {
  objectStore(name: string): MigrationStore;
}

export interface Migration {
  version: number;
  name: string;
  affectedStores: string[];
  go: (transaction: MigrationTransaction) => Promise<void>;
}
