import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import MarkdownIt from 'markdown-it';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, '..');
const HELP_ROOT = path.join(PROJECT_ROOT, 'helpcenter');
const LOCALES = ['en', 'ru'];
const LOCALE_TITLES = { en: 'Help center', ru: 'Справочный центр' };
const LOCALE_LABELS = { en: 'English', ru: 'Русский' };

function normalizeBase(base) {
  const value = base || '/';
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function normalizeRelative(baseDir, relative) {
  const parts = baseDir.split('/').filter(Boolean);
  for (const part of relative.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') parts.pop();
    else parts.push(part);
  }
  return parts.join('/');
}

function parseFrontMatter(raw) {
  const normalized = raw.replace(/\r\n/g, '\n');
  if (!normalized.startsWith('---\n')) {
    return { data: {}, body: normalized };
  }

  const end = normalized.indexOf('\n---', 4);
  if (end === -1) return { data: {}, body: normalized };

  const data = {};
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

function humanize(value) {
  const text = value
    .split('/')
    .filter(Boolean)
    .pop()
    ?.replace(/[-_]+/g, ' ')
    .trim();
  if (!text) return 'Help center';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function pagePathFromRelative(relative) {
  const withoutExtension = relative.replace(/\.md$/i, '');
  if (withoutExtension === 'index') return '';
  if (withoutExtension.endsWith('/index')) {
    return withoutExtension.slice(0, -'/index'.length);
  }
  return withoutExtension;
}

function outputForRelative(relative) {
  const withoutExtension = relative.replace(/\.md$/i, '');
  if (withoutExtension === 'index') return 'index.html';
  if (withoutExtension.endsWith('/index')) {
    return `${withoutExtension.slice(0, -'/index'.length)}/index.html`;
  }
  return `${withoutExtension}.html`;
}

function outputForPath(pagePath, isIndex) {
  if (!pagePath) return 'index.html';
  return isIndex ? `${pagePath}/index.html` : `${pagePath}.html`;
}

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else files.push(full);
  }
  return files;
}

function readPage(locale, absolute, relative) {
  return fs.readFile(absolute, 'utf8').then((raw) => {
    const { data, body } = parseFrontMatter(raw);
    const heading = body.match(/^#\s+(.+)$/m)?.[1]?.trim();
    const pagePath = pagePathFromRelative(relative);
    const isIndex = relative === 'index.md' || relative.endsWith('/index.md');

    return {
      locale,
      relative,
      path: pagePath,
      isIndex,
      title: data.title || heading || humanize(relative.replace(/\.md$/i, '')),
      description: data.description || '',
      order: Number.isFinite(data.order) ? data.order : 1000,
      body: body.replace(/^#\s+.+\n?/m, '').replace(/^\n+/, ''),
    };
  });
}

function buildNav(pages) {
  const root = {
    path: '',
    title: 'Help center',
    order: 0,
    children: [],
    page: null,
  };

  for (const page of pages) {
    const segments = page.path ? page.path.split('/') : [];
    let node = root;
    for (let index = 0; index < segments.length; index += 1) {
      const pagePath = segments.slice(0, index + 1).join('/');
      let child = node.children.find((entry) => entry.path === pagePath);
      if (!child) {
        child = {
          path: pagePath,
          title: humanize(segments[index]),
          order: 1000,
          children: [],
          page: null,
        };
        node.children.push(child);
      }
      node = child;
    }
    node.title = page.title;
    node.order = page.order;
    node.page = page;
  }

  const sort = (nodes) => {
    nodes.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
    nodes.forEach((node) => sort(node.children));
  };
  sort(root.children);
  return root.children;
}

function renderNav(nodes, activePath, helpBase, locale) {
  if (!nodes.length) return '';
  return `<ul class="help-nav">${nodes
    .map((node) => {
      const output = outputForPath(node.path, node.page?.isIndex ?? false);
      const href = `${helpBase}/${locale}/${output}`;
      const active = node.path === activePath ? ' class="active"' : '';
      return `<li><a${active} href="${href}">${escapeHtml(
        node.title,
      )}</a>${renderNav(node.children, activePath, helpBase, locale)}</li>`;
    })
    .join('')}</ul>`;
}

function renderPage({
  page,
  pages,
  navHtml,
  content,
  appBase,
  helpBase,
  localeSwitch,
}) {
  const localeTitle = LOCALE_TITLES[page.locale];
  const rootHref = `${helpBase}/${page.locale}/index.html`;
  const switchHref = `${helpBase}/${localeSwitch.locale}/${localeSwitch.output}`;
  const appHref = `${appBase}/`;
  const breadcrumb =
    page.path === ''
      ? ''
      : `<div class="help-breadcrumb"><a href="${rootHref}">${escapeHtml(
          localeTitle,
        )}</a></div>`;

  return `<!doctype html>
<html lang="${page.locale}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(page.title)} · ${escapeHtml(localeTitle)}</title>
  <meta name="description" content="${escapeHtml(page.description)}">
  <link rel="stylesheet" href="${helpBase}/help.css">
</head>
<body>
  <header class="help-topbar">
    <a class="help-topbar__brand" href="${rootHref}">${escapeHtml(
      localeTitle,
    )}</a>
    <nav class="help-topbar__links">
      <a href="${switchHref}" target="_self">${
        LOCALE_LABELS[localeSwitch.locale]
      }</a>
      <a href="${appHref}" target="_self">Open the app</a>
    </nav>
  </header>
  <div class="help-layout">
    <aside class="help-sidebar">
      <div class="help-sidebar__title">${escapeHtml(localeTitle)}</div>
      ${navHtml}
    </aside>
    <main class="help-content">
      ${breadcrumb}
      <h1>${escapeHtml(page.title)}</h1>
      ${
        page.description
          ? `<p class="help-description">${escapeHtml(page.description)}</p>`
          : ''
      }
      ${content}
      <div class="help-footer">Owlbear's DMH</div>
    </main>
  </div>
</body>
</html>`;
}

export async function buildHelpCenterAssets({ base = '/dmh-pwa/' } = {}) {
  const appBase = normalizeBase(base);
  const helpBase = `${appBase}/help`;
  const assets = [];
  const pagesByLocale = { en: [], ru: [] };
  const assetSet = new Set();
  const localeFiles = { en: [], ru: [] };

  for (const locale of LOCALES) {
    const directory = path.join(HELP_ROOT, locale);
    const files = await walk(directory);
    for (const absolute of files) {
      const relative = path
        .relative(directory, absolute)
        .split(path.sep)
        .join('/');
      if (relative.endsWith('.md')) {
        localeFiles[locale].push({ absolute, relative });
      } else {
        assetSet.add(`${locale}/${relative}`);
        assets.push({
          fileName: `help/${locale}/${relative}`,
          source: await fs.readFile(absolute),
        });
      }
    }
  }

  for (const locale of LOCALES) {
    pagesByLocale[locale] = await Promise.all(
      localeFiles[locale].map(({ absolute, relative }) =>
        readPage(locale, absolute, relative),
      ),
    );
    pagesByLocale[locale].sort(
      (a, b) => a.order - b.order || a.title.localeCompare(b.title),
    );
  }

  const pageOutput = (page) => outputForRelative(page.relative);
  const pageByPath = (locale, pagePath) =>
    pagesByLocale[locale].find((page) => page.path === pagePath);

  const markdown = new MarkdownIt({
    html: false,
    linkify: true,
    typographer: true,
  });

  const isExternal = (href) =>
    /^(?:[a-z]+:)?\/\//i.test(href) ||
    /^(?:mailto|tel|data|javascript):/i.test(href);

  const resolveLink = (fromPage, href) => {
    if (!href || isExternal(href) || href.startsWith('#')) return null;

    const [rawPath, hash = ''] = href.split('#');
    if (rawPath.startsWith('/helpcenter/')) {
      const match = rawPath.match(/^\/helpcenter\/(en|ru)\/(.*)$/);
      if (!match) return null;
      const output = outputForRelative(match[2]);
      return `${helpBase}/${match[1]}/${output}${hash ? `#${hash}` : ''}`;
    }
    if (rawPath.startsWith(`${helpBase}`)) {
      return `${rawPath}${hash ? `#${hash}` : ''}`;
    }
    if (rawPath.startsWith('/help')) {
      return `${appBase}${rawPath}${hash ? `#${hash}` : ''}`;
    }
    if (rawPath.startsWith('/')) {
      return `${rawPath}${hash ? `#${hash}` : ''}`;
    }

    const target = normalizeRelative(
      path.posix.dirname(fromPage.relative),
      rawPath,
    );
    const targetPage =
      pageByPath(fromPage.locale, pagePathFromRelative(target)) ?? null;
    const output = targetPage
      ? pageOutput(targetPage)
      : rawPath.endsWith('.md')
        ? outputForRelative(target)
        : `${target}/index.html`;
    return `${helpBase}/${fromPage.locale}/${output}${hash ? `#${hash}` : ''}`;
  };

  const resolveAsset = (fromPage, source) => {
    if (isExternal(source) || source.startsWith('data:')) return source;
    if (source.startsWith('/')) return source;

    const target = normalizeRelative(
      path.posix.dirname(fromPage.relative),
      source,
    );
    const own = `${helpBase}/${fromPage.locale}/${target}`;
    if (assetSet.has(`${fromPage.locale}/${target}`)) return own;
    if (fromPage.locale !== 'en' && assetSet.has(`en/${target}`)) {
      return `${helpBase}/en/${target}`;
    }
    return source;
  };

  markdown.renderer.rules.link_open = (tokens, index, options, env, self) => {
    const token = tokens[index];
    const href = token.attrGet('href');
    const page = env?.page;
    if (typeof href === 'string' && page) {
      const resolved = resolveLink(page, href);
      if (resolved) token.attrSet('href', resolved);
      if (isExternal(href)) {
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
    const page = env?.page;
    if (typeof source === 'string' && page) {
      token.attrSet('src', resolveAsset(page, source));
    }
    token.attrSet('loading', 'lazy');
    return defaultImage(tokens, index, options, env, self);
  };

  for (const locale of LOCALES) {
    const pages = pagesByLocale[locale];
    const nav = buildNav(pages);
    const navHtml = renderNav(nav, '', helpBase, locale);

    for (const page of pages) {
      const otherLocale = locale === 'en' ? 'ru' : 'en';
      const otherPage = pageByPath(otherLocale, page.path);
      const localeSwitch = otherPage
        ? { locale: otherLocale, output: pageOutput(otherPage) }
        : { locale: otherLocale, output: 'index.html' };
      const content = markdown.render(page.body, { page });
      const html = renderPage({
        page,
        pages,
        navHtml: renderNav(nav, page.path, helpBase, locale),
        content,
        appBase,
        helpBase,
        localeSwitch,
      });
      assets.push({
        fileName: `help/${locale}/${pageOutput(page)}`,
        source: html,
      });
    }
  }

  assets.push({
    fileName: 'help/help.css',
    source: await fs.readFile(path.join(HELP_ROOT, 'help.css'), 'utf8'),
  });
  assets.push({
    fileName: 'help/index.html',
    source: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=${helpBase}/en/index.html"><title>Help center</title></head><body><a href="${helpBase}/en/index.html">Help center</a></body></html>`,
  });

  return assets;
}

async function writeToDist() {
  const outDir = path.join(PROJECT_ROOT, 'dist');
  const assets = await buildHelpCenterAssets({
    base: process.env.HELP_BASE || '/dmh-pwa/',
  });
  for (const asset of assets) {
    const target = path.join(outDir, asset.fileName);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, asset.source);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await writeToDist();
}
