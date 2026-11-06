import { describe, expect, it } from 'vitest';
import { buildHelpCenterAssets } from '../../scripts/build-helpcenter.mjs';

describe('static help center build', () => {
  it('generates localized pages, navigation, assets and redirects', async () => {
    const assets = await buildHelpCenterAssets({ base: '/dmh-pwa/' });
    const byName = new Map(assets.map((asset) => [asset.fileName, asset]));
    const read = (name: string) => {
      const asset = byName.get(name);
      expect(asset, name).toBeTruthy();
      return String(asset!.source);
    };

    const install = read('help/en/getting-started/install.html');
    expect(install).toContain('<html lang="en">');
    expect(install).toContain('Install the app');
    expect(install).toContain(
      'href="/dmh-pwa/help/en/troubleshooting/persistent-storage.html"',
    );
    expect(install).toContain(
      'src="/dmh-pwa/help/en/getting-started/images/install-menu.svg"',
    );
    expect(install).toContain(
      'href="/dmh-pwa/help/ru/getting-started/install.html"',
    );

    const russian = read('help/ru/troubleshooting/persistent-storage.html');
    expect(russian).toContain('<html lang="ru">');
    expect(russian).toContain('Постоянное хранилище');

    expect(read('help/help.css')).toContain('.help-layout');
    expect(
      byName.get('help/en/getting-started/images/install-menu.svg'),
    ).toBeTruthy();
    expect(read('help/index.html')).toContain(
      'url=/dmh-pwa/help/en/index.html',
    );
  });

  it('uses absolute static links for external and app links', async () => {
    const assets = await buildHelpCenterAssets({ base: '/docs/' });
    const byName = new Map(assets.map((asset) => [asset.fileName, asset]));
    const referenceAsset = byName.get('help/en/reference/browsers.html');
    expect(referenceAsset).toBeTruthy();
    const reference = String(referenceAsset!.source);
    expect(reference).toContain('target="_blank"');
    expect(reference).toContain('rel="noopener noreferrer"');
    expect(reference).toContain('href="/docs/help/en/index.html"');
  });
});
