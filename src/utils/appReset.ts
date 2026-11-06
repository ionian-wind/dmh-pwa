import { resetStoreCache } from './storage';

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}

async function clearIndexedDatabases(): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  if (typeof indexedDB.databases === 'function') {
    const databases = await indexedDB.databases();
    await Promise.all(
      databases
        .map((database) => database.name)
        .filter((name): name is string => !!name)
        .map(deleteDatabase),
    );
    return;
  }
  await deleteDatabase('dmh-db');
}

async function clearCaches(): Promise<void> {
  if (typeof caches === 'undefined') return;
  const keys = await caches.keys();
  await Promise.all(keys.map((key) => caches.delete(key)));
}

async function clearServiceWorkers(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations.map((registration) => registration.unregister()),
  );
}

function clearCookies(): void {
  for (const cookie of document.cookie.split(';')) {
    const name = cookie.split('=')[0]?.trim();
    if (name) {
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    }
  }
}

/**
 * Remove every piece of storage owned by this site: IndexedDB databases,
 * localStorage, sessionStorage, cookies, Cache Storage and service workers.
 */
export async function clearAllAppData(): Promise<void> {
  await resetStoreCache();
  await clearIndexedDatabases();
  try {
    localStorage.clear();
  } catch {
    // Ignore storage access failures.
  }
  try {
    sessionStorage.clear();
  } catch {
    // Ignore storage access failures.
  }
  clearCookies();
  await clearCaches();
  await clearServiceWorkers();
}

export function reloadAppFromMainPage(): void {
  window.location.assign(import.meta.env.BASE_URL || '/');
}
