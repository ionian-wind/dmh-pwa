import { describe, expect, it } from 'vitest';
import {
  HELP_BASE_PATH,
  getHelpAssetUrl,
  getHelpNav,
  getHelpPage,
  getHelpPages,
  renderHelpMarkdown,
  resolveHelpLink,
} from '@/helpcenter/content';

describe('help center content', () => {
  it('loads localized nested pages and frontmatter', () => {
    const enPaths = getHelpPages('en').map((page) => page.path);
    expect(enPaths).toContain('');
    expect(enPaths).toContain('getting-started');
    expect(enPaths).toContain('getting-started/install');
    expect(enPaths).toContain('troubleshooting/persistent-storage');

    const page = getHelpPage('en', 'getting-started/install');
    expect(page).toMatchObject({
      title: 'Install the app',
      description: expect.stringContaining('standalone app'),
    });
    expect(page?.html).toContain('Chrome and Edge on desktop');
    expect(page?.html).toContain('<img');
    expect(page?.html).not.toContain('<h1>Install the app</h1>');
  });

  it('loads Russian pages and builds a hierarchical navigation tree', () => {
    const page = getHelpPage('ru', 'troubleshooting/persistent-storage');
    expect(page?.title).toBe('Постоянное хранилище');

    const nav = getHelpNav('ru');
    expect(nav.map((node) => node.path)).toEqual([
      'getting-started',
      'troubleshooting',
    ]);
    expect(nav[0].children.map((node) => node.path)).toContain(
      'getting-started/install',
    );
  });

  it('resolves relative markdown links and assets', () => {
    const installFile = '/helpcenter/en/getting-started/install.md';

    expect(
      resolveHelpLink(
        installFile,
        '../troubleshooting/persistent-storage.md',
        'en',
      ),
    ).toBe(`${HELP_BASE_PATH}/troubleshooting/persistent-storage`);
    expect(resolveHelpLink(installFile, './index.md', 'en')).toBe(
      `${HELP_BASE_PATH}/getting-started`,
    );
    expect(resolveHelpLink(installFile, '#after-installing', 'en')).toBeNull();
    expect(
      resolveHelpLink(installFile, 'https://example.com/docs', 'en'),
    ).toBeNull();
    expect(
      getHelpAssetUrl('/helpcenter/en/getting-started/images/install-menu.svg'),
    ).toBeTruthy();
  });

  it('returns null for an unknown page', () => {
    expect(getHelpPage('en', 'missing/page')).toBeNull();
  });
});

describe('help center rendering branches', () => {
  it('falls back to humanized titles and English assets', () => {
    const empty = getHelpPage('en', 'reference/empty');
    expect(empty?.title).toBe('Empty');

    const html = renderHelpMarkdown({
      locale: 'ru',
      path: 'reference/test',
      file: '/helpcenter/ru/reference/test.md',
      title: 'Test',
      description: '',
      order: 1,
      body: '![Browser](images/browser.svg)\n\n![Data](data:image/png;base64,abc)',
    });
    expect(html).toMatch(/src="data:image\/svg\+xml/);
    expect(html).toContain('src="data:image/png;base64,abc"');
    expect(getHelpAssetUrl('/missing.svg')).toBeUndefined();
  });

  it('returns cached pages and absolute help links', () => {
    const first = getHelpPage('en', 'reference/browsers');
    expect(getHelpPage('en', 'reference/browsers')).toBe(first);
    expect(
      resolveHelpLink('/helpcenter/en/index.md', `${HELP_BASE_PATH}/foo`, 'en'),
    ).toBe(`${HELP_BASE_PATH}/foo`);
    expect(
      resolveHelpLink('/helpcenter/en/index.md', '/helpcenter/xx/a.md', 'en'),
    ).toBeNull();
  });

  it('renders external, absolute and missing asset links', () => {
    const html = renderHelpMarkdown({
      locale: 'en',
      path: 'test',
      file: '/helpcenter/en/test.md',
      title: 'Test',
      description: '',
      order: 1,
      body: [
        '[external](https://example.com)',
        '[absolute help](/help/foo)',
        '[absolute app](/notes)',
        '![absolute](/helpcenter/en/getting-started/images/install-menu.svg)',
        '![missing](images/missing.svg)',
        '![external](https://example.com/a.png)',
        '![missing absolute](/missing.png)',
      ].join('\n\n'),
    });

    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain(`href="${HELP_BASE_PATH}/foo"`);
    expect(html).toContain('href="/notes"');
    expect(html).toMatch(/src="data:image\/svg\+xml/);
    expect(html).toContain('src="images/missing.svg"');
    expect(html).toContain('src="https://example.com/a.png"');
    expect(html).toContain('src="/missing.png"');
  });

  it('parses quoted frontmatter and falls back to English', () => {
    const page = getHelpPage('en', 'reference/browsers');
    expect(page?.title).toBe('Browser notes');
    expect(page?.description).toBe('Links to browser documentation.');
    expect(page?.html).toContain('target="_blank"');

    const fallback = getHelpPage('ru', 'reference');
    expect(fallback?.title).toBe('Reference');
  });

  it('handles link edge cases and caches navigation', () => {
    const file = '/helpcenter/en/reference/index.md';
    expect(resolveHelpLink(file, '', 'en')).toBeNull();
    expect(resolveHelpLink(file, '#top', 'en')).toBeNull();
    expect(resolveHelpLink(file, '/help/foo', 'en')).toBe(
      `${HELP_BASE_PATH}/foo`,
    );
    expect(resolveHelpLink(file, '/notes', 'en')).toBe('/notes');
    expect(resolveHelpLink(file, `${HELP_BASE_PATH}/foo#x`, 'en')).toBe(
      `${HELP_BASE_PATH}/foo#x`,
    );
    expect(resolveHelpLink(file, '/help/foo#x', 'en')).toBe(
      `${HELP_BASE_PATH}/foo#x`,
    );
    expect(resolveHelpLink(file, '/notes#x', 'en')).toBe('/notes#x');
    expect(
      resolveHelpLink(
        file,
        '/helpcenter/en/getting-started/install.md#x',
        'en',
      ),
    ).toBe(`${HELP_BASE_PATH}/getting-started/install#x`);
    expect(resolveHelpLink('/elsewhere/file.md', 'page.md', 'en')).toBeNull();
    expect(
      resolveHelpLink(file, '/helpcenter/en/getting-started/install.md', 'en'),
    ).toBe(`${HELP_BASE_PATH}/getting-started/install`);

    const first = getHelpNav('en');
    expect(getHelpNav('en')).toBe(first);
  });

  it('covers the root page', () => {
    const page = getHelpPage('en', '');
    expect(page?.title).toBe('Help center');
  });
});
