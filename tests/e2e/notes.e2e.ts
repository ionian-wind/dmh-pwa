import { expect, test } from '@playwright/test';

test('creates a drawing block from the slash menu', async ({ page }) => {
  await page.goto('/dmh-pwa/notes');
  await page.getByRole('button', { name: 'Create Note' }).click();

  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Title').fill('Sketch');
  await dialog.locator('.milkdown .ProseMirror').first().click();
  await page.keyboard.type('/');

  const drawingItem = page
    .locator('.milkdown-slash-menu li')
    .filter({ hasText: 'Drawing' })
    .first();
  await expect(drawingItem).toBeVisible();
  await drawingItem.click();

  await expect(dialog.locator('.qd-root')).toBeVisible({ timeout: 30000 });
  await dialog.locator('.qd-canvas').click({ position: { x: 120, y: 100 } });
  await dialog.getByRole('button', { name: 'OK', exact: true }).click();
  await expect(dialog.locator('.milkdown-drawing-block')).toBeVisible();

  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Sketch', { exact: true })).toBeVisible();

  const result = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('dmh-db');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const notes = await new Promise<any[]>((resolve, reject) => {
      const request = db.transaction('notes').objectStore('notes').getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const drawings = await new Promise<any[]>((resolve, reject) => {
      const request = db
        .transaction('drawings')
        .objectStore('drawings')
        .getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return {
      note: notes.find((entry) => entry.title === 'Sketch'),
      drawings,
    };
  });

  expect(result.note.content).toContain('![drawing](drawing://');
  expect(result.note.contentType).toBeUndefined();
  expect(result.drawings).toHaveLength(1);
  expect(result.drawings[0].snapshot).toContain('shape:');
  expect(result.drawings[0].preview).toContain('data:image/png');
});

test('localizes Quickdraw chrome from the app locale', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('dmh-config:savedLanguage', JSON.stringify('ru'));
  });
  await page.goto('/dmh-pwa/notes');
  await page.getByRole('button', { name: 'Создать заметку' }).click();

  const dialog = page.getByRole('dialog');
  await dialog.locator('.milkdown .ProseMirror').first().click();
  await page.keyboard.type('/');

  const drawingItem = page
    .locator('.milkdown-slash-menu li')
    .filter({ hasText: 'Рисунок' })
    .first();
  await expect(drawingItem).toBeVisible();
  await drawingItem.click();

  await expect(dialog.locator('.qd-root')).toBeVisible({ timeout: 30000 });
  await expect(
    dialog.locator('.qd-root button[title="Рисовать — D"]'),
  ).toBeVisible();
});
