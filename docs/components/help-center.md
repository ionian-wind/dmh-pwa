# Help Center

## Purpose

The help center is a **VitePress** site built as static HTML and served directly
by GitHub Pages. It does not boot the Vue app.

VitePress provides the docs theme, sidebar, locale switcher, Markdown
extensions, image handling and local search.

## Content layout

Source content lives in `helpcenter/`:

```text
helpcenter/
  .vitepress/config.mts
  .vitepress/theme/index.ts
  public/
    icon-192.png
  index.md
  en/
    index.md
    getting-started/
      index.md
      install.md
      images/install-menu.svg
    troubleshooting/
      index.md
      persistent-storage.md
      images/site-settings.svg
    reference/
      index.md
      browsers.md
      markdown.md
      dice-probability-syntax.md
  ru/
    index.md
    getting-started/
      index.md
      install.md
      images/install-menu.svg
    troubleshooting/
      index.md
      persistent-storage.md
      images/site-settings.svg
    reference/
      index.md
      markdown.md
      dice-probability-syntax.md
```

Rules:

- `en/` and `ru/` are independent locale trees.
- `index.md` is the folder landing page.
- Images can live next to the page that uses them.
- Relative Markdown links and image paths are resolved by VitePress.
- VitePress falls back to the default locale for missing translations when
  configured accordingly.

## Branding

The help center uses `helpcenter/public/icon-192.png` as:

- the navbar logo (`themeConfig.logo`, resolved through the `/dmh-pwa/help/`
  base);
- the favicon and Apple touch icon in `head`;
- the icon shown in the browser tab of every static help page.

Replace that file to update all three; no config change is needed.

## Theme localization

Visible theme strings are configured per locale in
`helpcenter/.vitepress/config.mts`:

- `title` and `description`;
- `outline.label`;
- `docFooter.prev` / `next`;
- menu, appearance, language-menu, skip-link and return-to-top labels;
- local-search button and modal translations;
- the 404 page text.

VitePress 1.x still hardcodes a few screen-reader-only labels
(“Main Navigation”, “Sidebar Navigation”, “Pager” and two aria labels).
`helpcenter/.vitepress/theme/index.ts` extends the default theme and updates
those labels after mount and on route changes, using the page’s `lang`.

When adding a locale, add its visible strings to `config.mts` and its
screen-reader labels to the theme helper.

## Frontmatter

VitePress uses the normal Markdown frontmatter:

```md
---
title: Install the app
description: Install Owlbear's DMH as a standalone app.
order: 10
---
```

- `title` — browser title and sidebar label context.
- `description` — meta description.
- `order` is available for custom ordering in content-loading code, but the
  sidebar is currently configured explicitly in `.vitepress/config.mts`.

## Generated URLs

For a deployment at `/dmh-pwa`:

```text
/dmh-pwa/help/en/index.html
/dmh-pwa/help/en/getting-started/install.html
/dmh-pwa/help/ru/troubleshooting/persistent-storage.html
/dmh-pwa/help/assets/...
```

`cleanUrls` is kept off so GitHub Pages can serve the `.html` files directly.

## Build and dev

Package scripts:

```bash
npm run dev          # app on 5173 + help center on 5174
npm run dev:app      # app only, help links will fail
npm run help:dev     # VitePress help server only
npm run help:build   # static pages into dist/help
npm run build        # clean dist, build help, then build the app
```

`npm run build` runs:

1. `scripts/clean-dist.mjs`
2. `vitepress build helpcenter`
3. `vite build` with `emptyOutDir: false`

That order lets the PWA precache scan the generated help pages. The app dev
server proxies `/dmh-pwa/help` to the VitePress dev server on port 5174, so
`npm run dev` starts both. Use `npm run dev:app` only when you do not need the
in-app help links.

## App links

The app links to the static pages in a new tab:

- left menu → `Help center` (`target="_blank"`);
- Markdown help buttons in entity editors and detail headers →
  `reference/markdown`;
- probability calculator syntax action →
  `reference/dice-probability-syntax`;
- install prompt → `getting-started/install`;
- Settings persistent-storage denial message → install and site-settings guides
  (`target="_blank" rel="noopener noreferrer"`).

`src/helpcenter/links.ts` builds the URL from `import.meta.env.BASE_URL`.
Toolbar actions use a plain anchor (`href` + `target="_blank"`) through the
shared `ViewHeader` button config; the old in-app help dialogs and the
`/probability-calculator/syntax` route were removed.

The help-center navbar **Open app** item uses `HelpOpenAppLink` rather than a
normal VitePress `nav` link, because VitePress prefixes internal nav links with
the `/dmh-pwa/help/` base. The component derives `/dmh-pwa/` from
`import.meta.env.BASE_URL` and uses `target="_self"` so VitePress’s SPA router
loads the app shell as a real page instead of treating it as a help route.

## Search

VitePress local search is enabled in `.vitepress/config.mts`:

```ts
themeConfig: {
  search: {
    provider: 'local';
  }
}
```

It indexes English and Russian pages separately. A future application-level
help search is still described in
[help-center-search.md](../proposals/help-center-search.md), but most static
search needs are already covered by VitePress.

## Adding a page

1. Create the Markdown file in the locale tree(s).
2. Add frontmatter.
3. Add a sidebar entry in `helpcenter/.vitepress/config.mts`.
4. Use relative `.md` links and image paths.
5. Run `npm run help:build` and `npm run build`.

## Tests

- `tests/helpcenter/links.test.ts` — app-side static URL generation.
- Build verification is done with `npm run help:build` and `npm run build`.
