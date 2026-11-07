import { expect, test } from '@playwright/test';

test('renders note content with the Milkdown view and toggles tasks', async ({
  page,
}) => {
  await page.goto('/dmh-pwa/');
  await expect(page.locator('body')).toBeVisible();

  const noteId = `milkdown-e2e-${Date.now()}`;
  const now = Date.now();
  const content = [
    '# Milkdown view',
    '',
    'Some **bold** text.',
    '',
    '- [ ] Task one',
    '- [x] Task two',
    '',
    '[Goblin](monster://m1)',
    '',
    '#harbor',
    '',
    '## Anchor heading {#note-secret}',
  ].join('\n');

  await page.evaluate(
    async ({ noteId, now, content }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('dmh-db');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const tx = db.transaction(['notes', 'monsters'], 'readwrite');
      tx.objectStore('notes').put({
        id: noteId,
        title: 'Milkdown view e2e',
        content,
        contentType: 'text',
        typeId: null,
        tags: ['harbor'],
        createdAt: now,
        updatedAt: now,
      });
      tx.objectStore('monsters').put({
        id: 'm1',
        name: 'Goblin',
        type: 'Beast',
        notes: '',
        moduleIds: [],
        createdAt: now,
        updatedAt: now,
      });
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    },
    { noteId, now, content },
  );

  await page.goto(`/dmh-pwa/notes/${noteId}`);
  const view = page.locator('.milkdown-view');
  await expect(view.locator('.milkdown')).toBeVisible({ timeout: 30000 });
  await expect(view.locator('h1')).toHaveText('Milkdown view');
  await expect(view.locator('h2')).toHaveText('Anchor heading');
  await expect(view.locator('h2')).toHaveAttribute('id', 'note-secret');
  await expect(view.locator('.disabled-internal-link')).toHaveCount(0);
  await expect(view.locator('.tag-link')).toHaveText('#harbor');
  await expect(view.locator('.ProseMirror')).toHaveAttribute(
    'contenteditable',
    'false',
  );

  await page.getByRole('button', { name: 'Edit' }).first().click();
  await expect(
    page.locator('.ProseMirror[contenteditable="true"]'),
  ).toBeVisible();
  await expect(page.locator('.ProseMirror h2')).toHaveText('Anchor heading');

  await page.getByRole('button', { name: 'View mode' }).first().click();
  await expect(
    page.locator('.milkdown-view .ProseMirror[contenteditable="false"]'),
  ).toBeVisible();
  await expect(view.locator('h1')).toHaveText('Milkdown view');

  const task = view.locator('li.list-item').filter({ hasText: 'Task one' });
  await task.locator('.label-wrapper').click();

  await expect
    .poll(async () => {
      return page.evaluate(async (id) => {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open('dmh-db');
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        const note = await new Promise<any>((resolve, reject) => {
          const request = db.transaction('notes').objectStore('notes').get(id);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        db.close();
        return note?.content ?? '';
      }, noteId);
    })
    .toContain('- [x] Task one');
});
