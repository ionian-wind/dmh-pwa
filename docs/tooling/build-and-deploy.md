# Build, CI, and Deployment

## Local development

```bash
npm install        # runs patch-package via postinstall
npm run dev        # Vite dev server (PWA dev worker enabled)
npm run build      # production build to dist/
npm run preview    # serve the production build
npm run test       # vitest run
npm run types-check # tsc --noEmit (does NOT check .vue files)
npm run format     # prettier via lint-staged config
npm run lint       # eslint
```

Node version is pinned by `.nvmrc` to **22.20.0**; CI uses Node 22. The
`package.json` README prerequisite of "Node 18+" is outdated.

Dependencies are exact-pinned (`save-exact = true` in `.npmrc`) and installed
with `legacy-peer-deps = true`.

## Vite configuration

`vite.config.js`:

- `base: '/dmh-pwa'` — all URLs assume GitHub Pages project hosting.
- `resolve.alias['@'] = '/src'`.
- Vue plugin with Quasar asset URL transforms.
- Quasar plugin, auto-importing PascalCase components and using
  `src/assets/styles/quasar-variables.sass`.
- `VitePWA` with manifest + Workbox (see
  [architecture/pwa.md](../architecture/pwa.md)).
- `worker.format = 'es'` so the metadata worker can use ES modules.

### Build output

- `dist/` — hashed JS/CSS, `index.html`, `manifest.webmanifest`, generated
  `sw.js`, `workbox-*.js`, icons and public assets.
- `index.html` references `/src/main.ts` in dev; Vite rewrites for production.
- The PWA plugin injects an inline service-worker registration; no separate
  `registerSW.js` is emitted.
- `helpCenterStaticPlugin` generates static help pages under `dist/help/`
  during `generateBundle`. They are included in the Workbox precache.

### Assets

- `public/` is copied verbatim (icons, legacy manifest/sw, dice-box assets).
- `src/assets/styles` includes `global.css` (design tokens/light theme) and
  `quasar-variables.sass` (Quasar palette).
- Quasar's own CSS is imported in `main.ts`:
  `import 'quasar/src/css/index.sass'`.
- Milkdown Crepe themes are imported globally:
  `@milkdown/crepe/theme/common/style.css` and `frame.css`.

### Bundle size concerns

- Milkdown/Crepe, Quasar, Howler, JSZip, music-metadata, mathjs, and Chevrotain
  are all in the main dependency graph. `mathjs` is imported in full
  (`create(all)`) in the calculator.
- The WIP dice engine and `@3d-dice` assets are currently unmounted; plan their
  bundle impact before connecting the feature.
- No route-level code splitting is configured; all views are statically
  imported in `router.ts`.
- `maximumFileSizeToCacheInBytes` is 30 MB, which may hide a bloated chunk.

## Type checking

`npm run types-check` runs `vue-tsc --noEmit -p tsconfig.json`, which checks
both `<script setup>` and templates. It currently reports **0 errors** and is
run in CI. `vue-tsc` finds issues that plain `tsc` cannot see in `.vue` files.

## Linting and formatting

- Prettier: single quotes, trailing commas, 80 columns.
- ESLint: invoked by `npm run lint` over `{src,tools,test,migrations}/**/*`;
  `tools` and `migrations` (root) do not exist, so the glob is partly wrong
  (actual migration folder is `src/migrations`).
- Husky + lint-staged run formatting/linting on commit; `commitlint` enforces
  conventional commits.
- `.editorconfig`, `.gitattributes`, `.prettierrc` are present.

## CI (`.github/workflows/ci.yml`)

Triggers on pushes/PRs to `main`.

Steps:

1. Checkout (`actions/checkout@v3`).
2. Node 22 (`actions/setup-node@v3`).
3. `npm ci`.
4. `npm run types-check`.
5. `npm run test:regression`.
6. `npm run build` with `VITE_COMMIT_SHA=${{ github.sha }}`.
7. `cp dist/index.html dist/404.html` (SPA fallback for GitHub Pages).
8. Deploy `dist` to `gh-pages` with `peaceiris/actions-gh-pages@v3`.

Vite inlines `VITE_COMMIT_SHA` into the bundle during the build, so no extra
request is needed at runtime. Locally the value is absent and `CommitBadge`
falls back to `dev`. The badge is fixed in the page's bottom-left corner,
non-interactable, and visually semi-transparent.

The full suite runs in CI along with the regression suite. See
[testing.md](testing.md).

Implications:

- Broken tests and type errors do not block deploys.
- `actions/*@v3` and `peaceiris/actions-gh-pages@v3` are older major versions.
- There is no caching step, so every run reinstalls dependencies.
- There is no Lighthouse/PWA audit.
- The build must succeed; if it does, it deploys directly from `main`.

## Hosting assumptions

- Site root: `https://<user>.github.io/dmh-pwa/`.
- `router` base `/dmh-pwa/`, Vite base `/dmh-pwa`, manifest scope `/dmh-pwa`.
- Deploying to a domain root requires changing all four places plus icon paths.
- HTTPS is required for service workers and File System Access.
- `404.html` copy enables client-side routing fallback.
- The `manifest` link in `index.html` is `/manifest.json`, while the generated
  manifest lives at `/dmh-pwa/manifest.webmanifest`; verify which one the
  production HTML ends up referencing.

## Docker

A `.dockerignore` exists but no `Dockerfile`. No container build is defined.

## Recommended improvements

- Add a `typecheck` script using `vue-tsc` and run it in CI.
- Re-enable tests after modernizing them (or run a curated subset).
- Add dependency caching and pin action versions.
- Lazy-load heavy routes (jukebox, calculator/Milkdown, dice).
- Replace the full `mathjs` import with only the required functions.
- Remove unused dependencies (`rpg-awesome`, `text-cursor-helper`,
  `@vueuse/core`, `sharp` if only used by scripts, `remove-markdown`/
  `sanitize-html` if only used by the script). Keep `@3d-dice/*` while the WIP
  dice UI is still planned.
- Add a bundle analyzer and a size budget.
- Consolidate PWA assets (single manifest, single worker).
- Add a `Dockerfile`/static-server config or remove `.dockerignore`.
