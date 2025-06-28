import type { IDBPTransaction } from 'idb';

export interface Migration {
  version: number;
  name: string;
  affectedStores: string[];
  go: (transaction: IDBPTransaction<unknown, string[], 'versionchange'>) => Promise<void>;
}
