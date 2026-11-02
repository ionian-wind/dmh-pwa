import { expect, test } from '@playwright/test';

test('probability calculator renders results and chart', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/dmh-pwa/probability-calculator');
  await expect(page.locator('.monaco-editor')).toBeVisible({ timeout: 30_000 });
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
  await expect(page.locator('.monaco-editor')).toBeVisible({ timeout: 30_000 });
});

test('opens the syntax reference from the calculator', async ({ page }) => {
  await page.goto('/dmh-pwa/probability-calculator');
  await page.getByRole('button', { name: 'Syntax reference' }).click();
  await expect(page).toHaveURL(/\/dmh-pwa\/probability-calculator\/syntax$/);
  await expect(page.getByText('AnyDice Syntax Reference')).toBeVisible();

  await page.getByRole('button', { name: 'Back to calculator' }).click();
  await expect(page).toHaveURL(/\/dmh-pwa\/probability-calculator$/);
});

test('creates a share link with the source in the hash', async ({ page }) => {
  await page.goto('/dmh-pwa/probability-calculator');
  await expect(page.locator('.monaco-editor')).toBeVisible({ timeout: 30_000 });

  await page.getByRole('button', { name: 'click to create link' }).click();
  const linkInput = page.getByLabel('Share link');
  await expect(linkInput).not.toHaveValue('');
  const value = await linkInput.inputValue();
  expect(value).toContain('#code=');
  expect(page.url()).toContain('#code=');
});

test('highlights syntax errors and clears them before the next calculation', async ({
  page,
}) => {
  await page.goto('/dmh-pwa/probability-calculator');
  await page.locator('.monaco-editor').waitFor({ timeout: 30_000 });
  const editor = page.locator('.monaco-editor');
  await editor.click();
  await page.keyboard.press('Control+A');
  await page.keyboard.type('output 1 +');
  await page.getByRole('button', { name: 'Calculate' }).click();
  await expect(page.locator('.squiggly-error').first()).toBeVisible({
    timeout: 10_000,
  });

  await editor.click();
  await page.keyboard.press('Control+A');
  await page.keyboard.type('output 1d4');
  await page.getByRole('button', { name: 'Calculate' }).click();
  await expect(page.locator('.squiggly-error')).toHaveCount(0);
});
