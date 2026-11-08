import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearAllAppData } from '@/utils/appReset';

function openDatabase(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('items', { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function listDatabases(): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.databases();
    request.then(resolve).catch(reject);
  });
}

describe('clearAllAppData', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('clears databases, storage, cookies, caches and service workers', async () => {
    const extra = await openDatabase('extra-site-data');
    extra.close();

    const deleteCache = vi.fn().mockResolvedValue(true);
    vi.stubGlobal('caches', {
      keys: vi.fn().mockResolvedValue(['app-cache']),
      delete: deleteCache,
    });
    const unregister = vi.fn().mockResolvedValue(true);
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        getRegistrations: vi
          .fn()
          .mockResolvedValue([{ unregister }, { unregister }]),
      },
    });
    document.cookie = 'session=abc';

    await clearAllAppData();

    expect(await listDatabases()).not.toContain('extra-site-data');
    expect(localStorage.clear).toHaveBeenCalled();
    expect(deleteCache).toHaveBeenCalledWith('app-cache');
    expect(unregister).toHaveBeenCalledTimes(2);
  });

  it('falls back to deleting the known app database', async () => {
    const original = indexedDB.databases;
    Object.defineProperty(indexedDB, 'databases', {
      configurable: true,
      value: undefined,
    });
    const app = await openDatabase('dmh-db');
    app.close();

    await clearAllAppData();

    expect(await listDatabases().catch(() => [])).toEqual([]);
    Object.defineProperty(indexedDB, 'databases', {
      configurable: true,
      value: original,
    });
  });
});
