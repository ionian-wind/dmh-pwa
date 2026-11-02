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
