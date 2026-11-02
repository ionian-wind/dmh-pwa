import { expect, test, type Locator } from '@playwright/test';

function parseRgb(value: string): [number, number, number] {
  const match = value.match(/\d+/g) ?? [];
  return [Number(match[0]), Number(match[1]), Number(match[2])];
}

function relativeLuminance([r, g, b]: [number, number, number]) {
  const channels = [r, g, b].map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

async function contrastRatio(locator: Locator) {
  const colors = await locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return { color: style.color, background: style.backgroundColor };
  });
  const foreground = relativeLuminance(parseRgb(colors.color));
  const background = relativeLuminance(parseRgb(colors.background));
  const lighter = Math.max(foreground, background);
  const darker = Math.min(foreground, background);
  return (lighter + 0.05) / (darker + 0.05);
}

test('secondary buttons keep readable text contrast', async ({ page }) => {
  await page.goto('/dmh-pwa/');

  const restore = page.getByRole('button', { name: /restore/i });
  await expect(restore).toBeVisible();

  expect(await contrastRatio(restore)).toBeGreaterThanOrEqual(4.5);
});
