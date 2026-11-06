# Help Center

## Purpose

The help center renders static Markdown guides inside the app. It requires no
server, works offline and participates in the same PWA precache as the rest of
the application.

## Content layout

Content lives outside `src/`:

```text
helpcenter/
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
- Relative links between pages and relative image paths are resolved
  automatically.
- Missing pages fall back to English at read time.

## Frontmatter

All fields are optional:

```md
---
title: Install the app
description: Install Owlbear's DMH as a standalone app.
order: 10
---
```

- `title` — used in the sidebar, breadcrumb and page heading.
- `description` — short subtitle and search metadata later.
- `order` — lower numbers appear first; default is `1000`.

If `title` is absent, the first `# Heading` is used, then a humanized filename.
The leading H1 is removed from the rendered body so the view can render the
title once.

## Routing

- `/help` — root `index.md`.
- `/help/getting-started` — `getting-started/index.md`.
- `/help/getting-started/install` — `getting-started/install.md`.
- `/help/troubleshooting/persistent-storage` — the persistent-storage guide.

The current app locale selects the `en` or `ru` tree. Switching language
re-renders the same route from the other tree.

## Rendering

`src/helpcenter/content.ts`:

- loads Markdown and image URLs with `import.meta.glob`;
- parses frontmatter and extracts titles;
- builds a hierarchical navigation tree from the folder structure;
- rewrites relative `.md` links to `/help/...` routes;
- rewrites relative image paths to Vite-imported asset URLs;
- renders Markdown with `markdown-it` (`html: false`, linkified links).

`src/helpcenter/HelpCenterView.vue` renders:

- a sticky sidebar tree (`HelpNav.vue`);
- the page title and description;
- the rendered Markdown;
- a not-found state for unknown paths.

Internal links are intercepted in the article and pushed through Vue Router so
the app does not reload.

## Images

Reference images relative to the Markdown file:

```md
![The install control](images/install-menu.svg)
```

If a Russian image is missing, the resolver falls back to the English asset at
the same path. Use images for short diagrams, not for large screenshots; the
whole help center is precached.

## Adding a page

1. Create the Markdown file in both locale trees (or only one while drafting).
2. Add frontmatter with `title` and `order`.
3. Add the page to the parent `index.md` if it should be linked explicitly.
4. Use relative `.md` links and relative image paths.
5. Run the help center tests.

## Tests

- `tests/helpcenter/helpContent.test.ts` — loading, frontmatter, navigation,
  link and asset resolution.
- `tests/helpcenter/helpCenterView.test.ts` — rendering, navigation, images and
  the not-found state.

## Future

Client-side help search is proposed in
[help-center-search.md](../proposals/help-center-search.md).
