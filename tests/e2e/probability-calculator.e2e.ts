import { expect, test } from '@playwright/test';

test('probability calculator renders results and chart', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/dmh-pwa/probability-calculator');
  await expect(page.locator('[data-lce-editor-container="true"]')).toBeVisible({
    timeout: 30_000,
  });
  await expect(
    page.getByText('Dice Probability Calculator').first(),
  ).toBeVisible();

  // The default program is `output 3d6`.
  await expect(page.locator('.probability-table tbody tr')).toHaveCount(16, {
    timeout: 30_000,
  });

  await page.getByRole('button', { name: 'Graph' }).click();
  await expect(page.locator('.probability-chart-wrapper svg')).toBeVisible({
    timeout: 30_000,
  });

  await page.getByRole('button', { name: 'Summary' }).click();
  await expect(
    page.getByText('Most likely', { exact: false }).first(),
  ).toBeVisible();

  expect(
    errors.filter((error) => !error.includes('Failed to load resource')),
  ).toEqual([]);
});

test('opens the probability calculator from the main menu', async ({
  page,
}) => {
  await page.goto('/dmh-pwa/');
  await page.locator('.q-drawer').first().hover();
  await page.getByText('Tools', { exact: true }).click();
  await page.getByText('Probability Calculator', { exact: true }).click();
  await expect(page).toHaveURL(/\/dmh-pwa\/probability-calculator$/);
  await expect(page.locator('[data-lce-editor-container="true"]')).toBeVisible({
    timeout: 30_000,
  });
});

test('links to the static syntax reference', async ({ page }) => {
  await page.goto('/dmh-pwa/probability-calculator');
  const link = page.locator('a[href*="dice-probability-syntax.html"]');
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute(
    'href',
    /\/help\/(en|ru)\/reference\/dice-probability-syntax\.html$/,
  );
  await expect(link).toHaveAttribute('target', '_blank');
});

test('creates a share link with the source in the hash', async ({ page }) => {
  await page.goto('/dmh-pwa/probability-calculator');
  await expect(page.locator('[data-lce-editor-container="true"]')).toBeVisible({
    timeout: 30_000,
  });

  await page.getByRole('button', { name: 'click to create link' }).click();
  const linkInput = page.getByLabel('Share link');
  await expect(linkInput).not.toHaveValue('');
  const value = await linkInput.inputValue();
  expect(value).toContain('#code=');
  expect(page.url()).toContain('#code=');
});

test('shows completions from included code pieces while typing', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'dmh-probability-calculator:library',
      JSON.stringify([
        {
          id: 'library-piece',
          name: 'Combat library',
          include: true,
          code: `DAMAGE: 2d6 + 3
function: double N:n if above B:n {
  result: N + N
}`,
        },
      ]),
    );
  });
  await page.goto('/dmh-pwa/probability-calculator');
  await page
    .locator('[data-lce-editor-container="true"]')
    .waitFor({ timeout: 30_000 });

  const editor = page.locator(
    '[data-lce-editor-container="true"] [contenteditable="true"]',
  );
  await editor.click();
  await page.keyboard.press('Control+A');
  await page.keyboard.type('[dou');

  const suggestions = page.locator('.lce-completion-popup');
  await expect(suggestions).toBeVisible({ timeout: 10_000 });
  await expect(suggestions).toContainText('double N if above B');
  await expect(suggestions).toContainText('From code piece: Combat library');

  await page.keyboard.press('Escape');
  await page.keyboard.press('Control+A');
  await page.keyboard.type('DAM');
  await expect(suggestions).toBeVisible({ timeout: 10_000 });
  await expect(suggestions).toContainText('DAMAGE');
});

test('localizes composer suggestions in Russian', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('dmh-config:savedLanguage', JSON.stringify('ru'));
    localStorage.setItem(
      'dmh-probability-calculator:library',
      JSON.stringify([
        {
          id: 'library-piece-ru',
          name: 'Боевая библиотека',
          include: true,
          code: 'DAMAGE: 2d6 + 3',
        },
      ]),
    );
  });
  await page.goto('/dmh-pwa/probability-calculator');
  await page
    .locator('[data-lce-editor-container="true"]')
    .waitFor({ timeout: 30_000 });

  const editor = page.locator(
    '[data-lce-editor-container="true"] [contenteditable="true"]',
  );
  await editor.click();
  await page.keyboard.press('Control+A');
  await page.keyboard.type('DAM');

  const suggestions = page.locator('.lce-completion-popup');
  await expect(suggestions).toBeVisible({ timeout: 10_000 });
  await expect(suggestions).toContainText(
    'Из фрагмента кода: Боевая библиотека',
  );
  await expect(suggestions).not.toContainText('From code piece');
});

test('highlights syntax errors and clears them before the next calculation', async ({
  page,
}) => {
  await page.goto('/dmh-pwa/probability-calculator');
  await page
    .locator('[data-lce-editor-container="true"]')
    .waitFor({ timeout: 30_000 });
  const editor = page.locator(
    '[data-lce-editor-container="true"] [contenteditable="true"]',
  );
  await editor.click();
  await page.keyboard.press('Control+A');
  await page.keyboard.type('output 1 +');
  await page.getByRole('button', { name: 'Calculate' }).click();
  await expect(page.locator('.lce-decoration-gutter').first()).toBeVisible({
    timeout: 10_000,
  });

  await editor.click();
  await page.keyboard.press('Control+A');
  await page.keyboard.type('output 1d4');
  await page.getByRole('button', { name: 'Calculate' }).click();
  await expect(page.locator('.lce-decoration-gutter')).toHaveCount(0);
});
