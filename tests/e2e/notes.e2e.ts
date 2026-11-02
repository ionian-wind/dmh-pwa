import { expect, test } from '@playwright/test';

test('creates a drawing note from the brush action', async ({ page }) => {
  await page.goto('/dmh-pwa/notes');
  const brush = page.getByRole('button', { name: 'Create drawing note' });
  await expect(brush).toBeVisible();

  await brush.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Title').fill('Sketch');
  await expect(dialog.locator('.tl-container')).toBeVisible();
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();

  await expect(page.getByText('Sketch', { exact: true })).toBeVisible();

  const note = await page.evaluate(async () => {
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
    db.close();
    return notes.find((entry) => entry.title === 'Sketch');
  });

  expect(note.contentType).toBe('draw');
  expect(note.content).toContain('document');
});
