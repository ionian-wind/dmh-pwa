export interface StorageEstimateInfo {
  supported: boolean;
  usage: number | null;
  quota: number | null;
}

function storageManager(): StorageManager | undefined {
  if (typeof navigator === 'undefined') return undefined;
  return navigator.storage;
}

export async function getStorageEstimate(): Promise<StorageEstimateInfo> {
  const storage = storageManager();
  if (!storage?.estimate) {
    return { supported: false, usage: null, quota: null };
  }

  try {
    const estimate = await storage.estimate();
    return {
      supported: true,
      usage: estimate.usage ?? 0,
      quota: estimate.quota ?? null,
    };
  } catch {
    return { supported: false, usage: null, quota: null };
  }
}

export async function isStoragePersisted(): Promise<boolean> {
  const storage = storageManager();
  if (!storage?.persisted) return false;

  try {
    return await storage.persisted();
  } catch {
    return false;
  }
}

/**
 * Ask the browser to keep this origin's data when storage is low. This is
 * best-effort and does not prevent the user from clearing site data.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  const storage = storageManager();
  if (!storage?.persist) return false;

  try {
    return await storage.persist();
  } catch {
    return false;
  }
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes)) {
    return '—';
  }
  if (bytes < 1024) return `${Math.max(0, Math.round(bytes))} B`;

  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const digits = value < 10 ? 1 : 0;
  return `${value.toFixed(digits)} ${units[unitIndex]}`;
}
