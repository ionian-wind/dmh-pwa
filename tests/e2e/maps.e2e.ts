import { expect, test } from '@playwright/test';
import { seedMap } from './helpers/seed';

test.beforeEach(async ({ page }) => {
  await seedMap(page);
});

test('renders map actions as a sized OpenLayers control', async ({ page }) => {
  const trigger = page.locator('.ol-map-actions-trigger');
  await expect(trigger).toBeVisible();

  const triggerBox = await trigger.boundingBox();
  expect(triggerBox?.width).toBeGreaterThanOrEqual(29);
  expect(triggerBox?.height).toBeGreaterThanOrEqual(29);

  await trigger.click();

  const menu = page.locator('.ol-map-actions-menu');
  await expect(menu).toBeVisible();
  await expect(menu.getByText('Draw area', { exact: true })).toBeVisible();

  const addMarker = menu.getByRole('button', {
    name: 'Add marker',
    exact: true,
  });
  await expect(addMarker).toBeVisible();
  const addMarkerBox = await addMarker.boundingBox();
  expect(addMarkerBox?.width).toBeGreaterThan(120);

  await expect(menu.getByText('Polygon', { exact: true })).toBeVisible();
});

test('separates map, locations and sidebar marker/area lists into tabs', async ({
  page,
}) => {
  await expect(page.getByRole('tab', { name: 'Map' })).toBeVisible();

  await page.getByRole('tab', { name: 'Locations' }).click();
  await expect(page.locator('.map-location-item')).toContainText('Town');

  const markersTab = page.locator('.tab-item', { hasText: 'Markers' });
  await expect(markersTab).toHaveClass(/tab-item--active/);
  await expect(page.locator('.map-marker-item')).toContainText('Castle');

  await page.locator('.tab-item', { hasText: 'Areas' }).click();
  await expect(page.locator('.map-areas-empty')).toContainText('No areas');
});

test('adds a marker from the action menu and map click', async ({ page }) => {
  await page.locator('.ol-map-actions-trigger').click();
  await page
    .locator('.ol-map-actions-menu')
    .getByRole('button', { name: 'Add marker', exact: true })
    .click();

  await expect(page.locator('.map-hint')).toContainText(/click/i);

  await page.locator('.ol-viewport').click({ position: { x: 420, y: 280 } });

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Marker title').fill('E2E Marker');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();

  await expect(
    page.locator('.map-marker-button', { hasText: 'E2E Marker' }),
  ).toBeVisible();
});

test('opens the context menu with a draw submenu and adds a marker', async ({
  page,
}) => {
  const viewport = page.locator('.ol-viewport');
  await viewport.click({
    button: 'right',
    position: { x: 520, y: 300 },
  });

  const menu = page.locator('div.ol-ctx-menu-container');
  await expect(menu).toBeVisible();
  await expect(
    menu.getByText('Add marker here', { exact: true }),
  ).toBeVisible();

  await menu.getByText('Draw area', { exact: true }).hover();
  await expect(
    page.getByText('Polygon', { exact: true }).filter({ visible: true }),
  ).toBeVisible();
  await expect(
    page.getByText('Freehand', { exact: true }).filter({ visible: true }),
  ).toBeVisible();

  await menu.getByText('Add marker here', { exact: true }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Marker title').fill('Context Marker');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();

  await expect(
    page.locator('.map-marker-button', { hasText: 'Context Marker' }),
  ).toBeVisible();

  const marker = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('dmh-db');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const maps = await new Promise<any[]>((resolve, reject) => {
      const request = db.transaction('maps').objectStore('maps').getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return maps[0].markers.find(
      (entry: any) => entry.title === 'Context Marker',
    );
  });

  expect(marker).toBeTruthy();
  expect(marker.x).toBeGreaterThanOrEqual(0);
  expect(marker.x).toBeLessThanOrEqual(200);
  expect(marker.y).toBeGreaterThanOrEqual(0);
  expect(marker.y).toBeLessThanOrEqual(100);
});
