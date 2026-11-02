import { expect, test } from '@playwright/test';
import { enterMapEditMode, seedMap } from './helpers/seed';

test.beforeEach(async ({ page }) => {
  await seedMap(page);
});

test('renders map actions as a sized OpenLayers control', async ({ page }) => {
  await enterMapEditMode(page);
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

test('keeps marker and area sidebar tabs and shows map item popups', async ({
  page,
}) => {
  await expect(page.getByRole('tab', { name: 'Map' })).toHaveCount(0);

  const markersTab = page.locator('.tab-item', { hasText: 'Markers' });
  await expect(markersTab).toHaveClass(/tab-item--active/);
  await expect(page.locator('.map-marker-item')).toContainText('Castle');

  await page.locator('.tab-item', { hasText: 'Areas' }).click();
  await expect(page.locator('.tab-item', { hasText: 'Areas' })).toHaveClass(
    /tab-item--active/,
  );
  await expect(page.locator('.map-area-item')).toHaveCount(0);

  await page.locator('.tab-item', { hasText: 'Markers' }).click();
  await page.locator('.map-marker-item').hover();
  await expect(page.locator('.map-marker-accessible.is-hovered')).toHaveCount(
    1,
  );

  await page.evaluate(() =>
    document
      .querySelector<HTMLButtonElement>('.map-marker-accessible')
      ?.click(),
  );
  await expect(page.locator('.map-info-popup')).toContainText('Castle');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('shows map and location tabs and opens location details', async ({
  page,
}) => {
  await page.goto('/dmh-pwa/maps');

  await expect(page.getByRole('tab', { name: 'Maps' })).toBeVisible();
  await expect(
    page.locator('.base-list-container [title="Open linked location"]'),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'Locations' }).click();
  await expect(page.locator('.location-card')).toContainText('Town');
  await expect(
    page.locator('.location-card [title="Open linked map"]'),
  ).toBeVisible();

  await page.locator('.location-card h5').click();
  await expect(page).toHaveURL(/\/locations\/location-1/);
  await expect(page.getByRole('tab', { name: 'Map' })).toBeVisible();
  await expect(page.locator('.location-linked-group-title')).toContainText(
    'E2E World',
  );
  await expect(page.locator('.location-linked-item')).toContainText('Castle');
  await expect(page.getByRole('tab', { name: 'Notes' })).toBeVisible();
});

test('adds a marker from the action menu and map click', async ({ page }) => {
  await enterMapEditMode(page);
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
    page.locator('.map-marker-item', { hasText: 'E2E Marker' }),
  ).toBeVisible();
});

test('opens the context menu with a draw submenu and adds a marker', async ({
  page,
}) => {
  await enterMapEditMode(page);
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
    page.locator('.map-marker-item', { hasText: 'Context Marker' }),
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
