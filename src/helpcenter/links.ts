export type HelpLocale = 'en' | 'ru';

export function getHelpLocale(locale: string): HelpLocale {
  return locale === 'ru' ? 'ru' : 'en';
}

/**
 * URL of a static help page generated into dist/help/<locale>/.
 * Pass '' for the locale landing page.
 */
export function helpHref(path: string, locale: HelpLocale): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const normalized = path.replace(/^\/+|\/+$/g, '');
  const page = !normalized
    ? 'index.html'
    : normalized.endsWith('.html')
      ? normalized
      : `${normalized}.html`;
  return `${base}/help/${locale}/${page}`;
}
