import type { Page } from '@playwright/test';

export const APP_PATH = '/dmh-pwa';

async function waitForAppDatabase(page: Page) {
  await page.waitForFunction(async () => {
    if (!('databases' in indexedDB)) return false;
    const databases = await indexedDB.databases();
    const database = databases.find((entry) => entry.name === 'dmh-db');
    return Boolean(database && (database.version ?? 0) >= 7);
  });
}

async function dismissInstallPrompt(page: Page) {
  const notNow = page.getByRole('button', { name: /not now/i });
  if (await notNow.isVisible().catch(() => false)) {
    await notNow.click();
  }
}

export interface SeededMapOptions {
  id?: string;
  title?: string;
}

export async function seedMap(page: Page, options: SeededMapOptions = {}) {
  const id = options.id ?? 'e2e-map';
  const title = options.title ?? 'E2E World';

  await page.goto(`${APP_PATH}/maps`);
  await waitForAppDatabase(page);

  await page.evaluate(
    async ({ mapId, mapTitle }) => {
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100">' +
        '<rect width="200" height="100" fill="#e8d8b0"/>' +
        '<circle cx="100" cy="50" r="30" fill="#336699"/>' +
        '</svg>';
      const imageBlob = new Blob([svg], { type: 'image/svg+xml' });

      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('dmh-db');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      const fileId = `file-${mapId}`;
      const now = Date.now();
      const transaction = db.transaction(
        ['maps', 'map_files', 'map_locations'],
        'readwrite',
      );
      transaction.objectStore('map_files').put({
        id: fileId,
        name: 'world.svg',
        size: imageBlob.size,
        type: imageBlob.type,
        lastModified: now,
        source: { kind: 'blob', blob: imageBlob },
        imageMetadata: {
          width: 200,
          height: 100,
          aspectRatio: 2,
          color: '#e8d8b0',
          palette: ['#e8d8b0', '#336699'],
        },
        createdAt: now,
        updatedAt: now,
      });
      transaction.objectStore('map_locations').put({
        id: 'location-1',
        name: 'Town',
        description: '',
        color: '#336699',
        entities: [],
        createdAt: now,
        updatedAt: now,
      });
      transaction.objectStore('maps').put({
        id: mapId,
        title: mapTitle,
        description: 'Playwright map',
        fileId,
        locationId: 'location-1',
        layers: [{ id: 'base', title: 'Base' }],
        markers: [
          {
            id: 'marker-1',
            title: 'Castle',
            x: 50,
            y: 50,
            locationId: 'location-1',
            layerId: 'base',
            entities: [],
            icon: 'ra-castle-emblem',
            color: '#cc3333',
          },
        ],
        areas: [],
        createdAt: now,
        updatedAt: now,
      });

      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      });
      db.close();
    },
    { mapId: id, mapTitle: title },
  );

  await page.goto(`${APP_PATH}/maps/${id}`);
  await dismissInstallPrompt(page);
  await page.locator('.ol-map-actions-trigger').waitFor({ state: 'attached' });
}

export async function enterMapEditMode(page: Page) {
  await page.locator('.map-mode-toggle .map-mode-edit').click();
  await page.getByRole('button', { name: 'Add layer' }).waitFor();
}
