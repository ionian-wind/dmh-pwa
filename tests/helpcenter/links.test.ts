import { describe, expect, it } from 'vitest';
import { getHelpLocale, helpHref } from '@/helpcenter/links';

function expected(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}/help/${path}`;
}

describe('help center static links', () => {
  it('resolves the current locale', () => {
    expect(getHelpLocale('ru')).toBe('ru');
    expect(getHelpLocale('en')).toBe('en');
    expect(getHelpLocale('de')).toBe('en');
  });

  it('points at generated HTML files', () => {
    expect(helpHref('', 'en')).toBe(expected('en/index.html'));
    expect(helpHref('getting-started/install', 'ru')).toBe(
      expected('ru/getting-started/install.html'),
    );
    expect(helpHref('troubleshooting/persistent-storage.html', 'en')).toBe(
      expected('en/troubleshooting/persistent-storage.html'),
    );
  });
});
