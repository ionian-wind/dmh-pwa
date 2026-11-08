import { expect, test } from '@playwright/test';

import { seedJukeboxTracks } from './helpers/seed';

test('track actions menu stays open while moving the pointer over it', async ({
  page,
}) => {
  await seedJukeboxTracks(page);

  const firstTrack = page.locator('.track-item').first();
  await firstTrack.hover();

  const trigger = firstTrack.locator('.track-menu-trigger');
  await expect(trigger).toBeVisible();
  await trigger.click();

  const menu = page.locator('.track-actions-menu');
  await expect(menu).toBeVisible();

  const playNext = menu.getByText('Play next', { exact: true });
  await expect(playNext).toBeVisible();
  await playNext.hover();
  await page.waitForTimeout(300);

  await expect(menu).toBeVisible();
  await expect(playNext).toBeVisible();
  await playNext.click();
  await expect(menu).toBeHidden();
});
