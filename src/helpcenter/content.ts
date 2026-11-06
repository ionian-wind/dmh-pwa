import MarkdownIt from 'markdown-it';

export type HelpLocale = 'en' | 'ru';

const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, '');
export const HELP_BASE_PATH = `${BASE_PATH}/help`;

const RAW_PAGES = import.meta.glob('/helpcenter/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const ASSET_URLS = import.meta.glob(
  '/helpcenter/**/*.{png,jpg,jpeg,svg,webp,gif}',
  {
    query: '?url',
    import: 'default',
    eager: true,
  },
) as Record<string, string>;

interface HelpSourcePage {
  locale: HelpLocale;
  path: string;
  file: string;
  title: string;
  description: string;
  order: number;
  body: string;
}

export interface HelpPage extends HelpSourcePage {
  html: string;
}

export interface HelpNavNode {
  path: string;
  title: string;
  description: string;
  order: number;
  children: HelpNavNode[];
}

interface FrontMatter {
  title?: string;
  description?: string;
  order?: number;
}

function parseFrontMatter(raw: string): {
  data: FrontMatter;
  body: string;
} {
  const normalized = raw.replace(/\r\n/g, '\n');
  if (!normalized.startsWith('---\n')) {
    return { data: {}, body: normalized };
  }

  const end = normalized.indexOf('\n---', 4);
  if (end === -1) return { data: {}, body: normalized };

  const data: Record<string, string> = {};
  for (const line of normalized.slice(4, end).split('\n')) {
    const colon = line.indexOf(':');
    if (colon <= 0) continue;
    const key = line.slice(0, colon).trim();
    let value = line.slice(colon + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    data[key] = value;
  }

  return {
    data: {
      title: data.title,
      description: data.description,
      order: data.order === undefined ? undefined : Number(data.order),
    },
    body: normalized.slice(end + 4).replace(/^\n+/, ''),
  };
}

function humanize(value: string): string {
  const text = value
    .split('/')
    .filter(Boolean)
    .pop()
    ?.replace(/[-_]+/g, ' ')
    .trim();
  if (!text) return 'Help center';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function pagePathFromFile(relative: string): string {
  const withoutExtension = relative.replace(/\.md$/i, '');
  if (withoutExtension === 'index') return '';
  if (withoutExtension.endsWith('/index')) {
    return withoutExtension.slice(0, -'/index'.length);
  }
  return withoutExtension;
}

function parsePage(key: string, raw: string): HelpSourcePage | null {
  const match = key.match(/\/helpcenter\/(en|ru)\/(.+)$/);
  if (!match) return null;

  const locale = match[1] as HelpLocale;
  const relative = match[2];
  const { data, body } = parseFrontMatter(raw);
  const heading = body.match(/^#\s+(.+)$/m)?.[1]?.trim();
  const withoutHeading = body.replace(/^#\s+.+\n?/m, '').replace(/^\n+/, '');
  const path = pagePathFromFile(relative);

  return {
    locale,
    path,
    file: key,
    title: data.title || heading || humanize(relative.replace(/\.md$/i, '')),
    description: data.description || '',
    order: Number.isFinite(data.order) ? (data.order as number) : 1000,
    body: withoutHeading,
  };
}

const pagesByLocale: Record<HelpLocale, Map<string, HelpSourcePage>> = {
  en: new Map(),
  ru: new Map(),
};

for (const [key, raw] of Object.entries(RAW_PAGES)) {
  const page = parsePage(key, raw);
  if (page) pagesByLocale[page.locale].set(page.path, page);
}

const navCache: Partial<Record<HelpLocale, HelpNavNode[]>> = {};
const pageCache = new Map<string, HelpPage | null>();

function normalizeRoutePath(path: string): string {
  return path.replace(/^\/+|\/+$/g, '').replace(/\/index$/i, '');
}

function normalizeUrlPath(path: string): string {
  const parts: string[] = [];
  for (const part of path.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') parts.pop();
    else parts.push(part);
  }
  return `/${parts.join('/')}`;
}

function isExternalLink(href: string): boolean {
  return (
    /^(?:[a-z]+:)?\/\//i.test(href) ||
    /^(?:mailto|tel|data|javascript):/i.test(href)
  );
}

export function getHelpPages(locale: HelpLocale): HelpSourcePage[] {
  return [...pagesByLocale[locale].values()].sort(
    (a, b) => a.order - b.order || a.title.localeCompare(b.title),
  );
}

export function getHelpPage(
  locale: HelpLocale,
  routePath: string,
): HelpPage | null {
  const path = normalizeRoutePath(routePath);
  const cacheKey = `${locale}:${path}`;
  if (pageCache.has(cacheKey)) {
    return pageCache.get(cacheKey) as HelpPage | null;
  }

  const source =
    pagesByLocale[locale].get(path) ?? pagesByLocale.en.get(path) ?? null;
  const page = source ? { ...source, html: renderHelpMarkdown(source) } : null;
  pageCache.set(cacheKey, page);
  return page;
}

export function getHelpNav(locale: HelpLocale): HelpNavNode[] {
  if (navCache[locale]) return navCache[locale] as HelpNavNode[];

  const root: HelpNavNode = {
    path: '',
    title: 'Help center',
    description: '',
    order: 0,
    children: [],
  };

  for (const page of getHelpPages(locale)) {
    const segments = page.path ? page.path.split('/') : [];
    let node = root;

    for (let index = 0; index < segments.length; index += 1) {
      const path = segments.slice(0, index + 1).join('/');
      let child = node.children.find((entry) => entry.path === path);
      if (!child) {
        child = {
          path,
          title: humanize(segments[index]),
          description: '',
          order: 1000,
          children: [],
        };
        node.children.push(child);
      }
      node = child;
    }

    node.title = page.title;
    node.description = page.description;
    node.order = page.order;
  }

  const sort = (nodes: HelpNavNode[]) => {
    nodes.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
    nodes.forEach((node) => sort(node.children));
  };
  sort(root.children);

  navCache[locale] = root.children;
  return root.children;
}

export function resolveHelpLink(
  fromFile: string,
  href: string,
  _locale: HelpLocale,
): string | null {
  if (!href || isExternalLink(href) || href.startsWith('#')) return null;

  const [rawPath, hash = ''] = href.split('#');
  if (rawPath.startsWith('/helpcenter/')) {
    const match = rawPath.match(/^\/helpcenter\/(en|ru)\/(.*)$/);
    if (!match) return null;
    const relative = match[2]
      .replace(/\.md$/i, '')
      .replace(/\/index$/i, '');
    const route = relative === 'index' ? '' : relative;
    return `${HELP_BASE_PATH}${route ? `/${route}` : ''}${hash ? `#${hash}` : ''}`;
  }
  if (rawPath.startsWith(`${HELP_BASE_PATH}`)) {
    return `${rawPath}${hash ? `#${hash}` : ''}`;
  }
  if (rawPath.startsWith('/help')) {
    return `${BASE_PATH}${rawPath}${hash ? `#${hash}` : ''}`;
  }
  if (rawPath.startsWith('/')) {
    return `${rawPath}${hash ? `#${hash}` : ''}`;
  }

  const baseDir = fromFile.slice(0, fromFile.lastIndexOf('/'));
  const target = normalizeUrlPath(`${baseDir}/${rawPath}`);
  const match = target.match(/^\/helpcenter\/(en|ru)\/(.*)$/);
  if (!match) return null;

  const relative = match[2].replace(/\.md$/i, '').replace(/\/index$/i, '');
  const route = relative === 'index' ? '' : relative;
  return `${HELP_BASE_PATH}${route ? `/${route}` : ''}${hash ? `#${hash}` : ''}`;
}

function resolveHelpAsset(
  fromFile: string,
  source: string,
  locale: HelpLocale,
): string {
  if (isExternalLink(source) || source.startsWith('data:')) return source;
  if (source.startsWith('/')) {
    return ASSET_URLS[source] ?? source;
  }

  const baseDir = fromFile.slice(0, fromFile.lastIndexOf('/'));
  const target = normalizeUrlPath(`${baseDir}/${source}`);
  const candidates = [target];
  if (locale === 'ru') {
    candidates.push(target.replace('/helpcenter/ru/', '/helpcenter/en/'));
  }
  for (const candidate of candidates) {
    const url = ASSET_URLS[candidate];
    if (url) return url;
  }
  return source;
}

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
});

markdown.renderer.rules.link_open = (tokens, index, options, env, self) => {
  const token = tokens[index];
  const href = token.attrGet('href');
  const page = (env as { page?: HelpSourcePage } | undefined)?.page;

  if (typeof href === 'string' && page) {
    const resolved = resolveHelpLink(page.file, href, page.locale);
    if (resolved) token.attrSet('href', resolved);
    if (isExternalLink(href)) {
      token.attrSet('target', '_blank');
      token.attrSet('rel', 'noopener noreferrer');
    }
  }

  return self.renderToken(tokens, index, options);
};

const defaultImage = markdown.renderer.rules.image;
markdown.renderer.rules.image = (tokens, index, options, env, self) => {
  const token = tokens[index];
  const source = token.attrGet('src');
  const page = (env as { page?: HelpSourcePage } | undefined)?.page;

  if (typeof source === 'string' && page) {
    token.attrSet('src', resolveHelpAsset(page.file, source, page.locale));
  }
  token.attrSet('loading', 'lazy');

  return defaultImage!(tokens, index, options, env ?? {}, self);
};

export function renderHelpMarkdown(page: HelpSourcePage): string {
  return markdown.render(page.body, { page });
}

export function getHelpAssetUrl(key: string): string | undefined {
  return ASSET_URLS[key];
}
