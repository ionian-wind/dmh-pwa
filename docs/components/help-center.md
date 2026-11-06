# Help Center

## Purpose

The help center is a set of **static HTML pages**, not a Vue route. The build
generates them from Markdown and emits them next to the app, so GitHub Pages can
serve them directly without booting the SPA.

## Content layout

Source content lives in `helpcenter/`:

```text
helpcenter/
  help.css
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
      empty.md
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
```

Rules:

- `en/` and `ru/` are independent trees.
- Every folder has an `index.md`; it becomes the folder landing page.
- Other `.md` files become child pages.
- Images live next to the page that uses them (or in a shared subfolder).
- Relative links between pages and relative image paths are resolved by the
  static generator.
- Missing pages fall back to English at generation time.
- Files that exist only in English are still generated under `/help/en/...`;
  Russian pages can link to them explicitly or omit them.

## Frontmatter

All fields are optional:

```md
---
title: Install the app
description: Install Owlbear's DMH as a standalone app.
order: 10
---
```

- `title` — sidebar, breadcrumb and page heading.
- `description` — subtitle and meta description.
- `order` — lower numbers appear first; default is `1000`.

If `title` is absent, the first `# Heading` is used, then a humanized filename.
The leading H1 is removed from the rendered body so the page title is rendered
once.

## Generated URLs

For a deployment at `/dmh-pwa`:

```text
/dmh-pwa/help/en/index.html
/dmh-pwa/help/en/getting-started/index.html
/dmh-pwa/help/en/getting-started/install.html
/dmh-pwa/help/ru/troubleshooting/persistent-storage.html
/dmh-pwa/help/help.css
/dmh-pwa/help/en/getting-started/images/install-menu.svg
/dmh-pwa/help/index.html          # redirects to English root
```

The generated pages are fully standalone: own `<html>`, meta tags, shared CSS,
sidebar navigation, locale switch and a link back to the app.

## Building

`scripts/build-helpcenter.mjs`:

- reads all Markdown and non-Markdown files from `helpcenter/<locale>/`;
- parses frontmatter and builds a hierarchical navigation tree;
- rewrites relative `.md` links to generated `.html` URLs;
- rewrites relative images to generated static asset URLs, with English
  fallback;
- renders Markdown with `markdown-it` (`html: false`);
- escapes page titles, descriptions and navigation labels;
- emits HTML, CSS and image assets.

`vite.config.js` registers `helpCenterStaticPlugin`:

- **build:** emits the generated assets during `generateBundle`, before the PWA
  plugin writes its precache manifest, so help pages are part of the offline
  cache;
- **dev:** a middleware serves the generated files from memory so help links
  work during `npm run dev` before a production build.

The output is written under `dist/help/` by Vite. GitHub Pages serves it at
`/<base>/help/...` directly.

## App links

The app does not route to the help center. It links to the generated pages in a
new tab:

- left menu → `Help center` (`target="_blank"`);
- Settings persistent-storage denial message → install and site-settings guides
  (`target="_blank" rel="noopener noreferrer"`).

`src/helpcenter/links.ts` builds the static URL from
`import.meta.env.BASE_URL`, so the same code works in dev, preview and GitHub
Pages.

## Images

Reference images relative to the Markdown file:

```md
![The install control](images/install-menu.svg)
```

If a Russian image is missing, the generator falls back to the English asset at
the same path. Keep diagrams small; generated assets are precached.

## Adding a page

1. Create the Markdown file in the locale tree(s).
2. Add frontmatter with `title` and `order`.
3. Add the page to the parent `index.md` if it should be linked explicitly.
4. Use relative `.md` links and relative image paths.
5. Run the help center tests and `npm run build`.

## Tests

- `tests/helpcenter/links.test.ts` — static URL generation and locale mapping.
- `tests/helpcenter/buildHelpCenter.test.ts` — generated HTML, navigation,
  images, locale switch, external links and redirect page.

## Future

Client-side search over the generated pages is proposed in
[help-center-search.md](../proposals/help-center-search.md).
