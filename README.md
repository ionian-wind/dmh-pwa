# Owlbear's Dungeon Master Helper (DMH PWA)

A local-first Progressive Web App for running tabletop RPG sessions. It manages
campaign notes, characters, parties, pawns, encounters, combats, maps, timers,
music, ambient sound and dice probabilities in a single browser app.

There is no server and no account system. Campaign data lives in IndexedDB; UI
preferences and a few player settings live in `localStorage`.

## Features

- **Notes** — Markdown notes with visual/raw editors, tags, entity mentions,
  internal links, drawing blocks, downloads and a detail sidebar.
- **Characters, parties and pawns** — reusable campaign entities with linked
  records and dialog-based editors.
- **Encounters and combat** — build encounters from pawns, start a combat with a
  party, then track initiative, rounds, turns, postpone and completion.
- **Maps and locations** — location records with OpenLayers maps, image layers,
  markers, drawn areas and links to other entities.
- **Jukebox** — local audio import, playlists, queue, shuffle/repeat and a
  persistent player.
- **Ambient sound** — importable `.spk` packs with ambience layers, one-shots
  and scene/mood music, plus a global sound-control panel.
- **Timers** — countdown timers with a global tick and completion notifications.
- **Calculator** — a draggable arithmetic and unit-converter dialog.
- **Dice probability calculator** — an AnyDice-compatible language with a Monaco
  editor, tables, charts, statistics, CSV export, share links and reusable code
  snippets.
- **Backup and restore** — export all main stores to a ZIP archive and restore
  them later, optionally including external file handles.
- **Help center** — static English and Russian guides built with VitePress.
- **Localization and themes** — English/Russian UI and light/dark/auto themes.
- **Build-time feature flags** — remove whole features from a production build.

Entity editors and detail pages use a shared dialog/tab pattern: main fields and
options live in the first tab, while cross-entity links live in a second tab.
See [docs/architecture/editor-dialog-pattern.md](docs/architecture/editor-dialog-pattern.md).

## Tech stack

| Concern        | Choice                                                       |
| -------------- | ------------------------------------------------------------ |
| UI             | Vue 3 (`<script setup>`), TypeScript, Quasar 2, Tabler icons |
| State          | Pinia 4 with `pinia-shared-state`                            |
| Storage        | IndexedDB via Dexie, JSON Schema validation with Ajv         |
| Build          | Vite 8, `vite-plugin-pwa` (Workbox)                          |
| Markdown       | markdown-it for rendering, Milkdown/Crepe for editing        |
| Maps           | OpenLayers via `vue3-openlayers`, Terra Draw                 |
| Audio          | Howler, `music-metadata` in a worker                         |
| Help center    | VitePress                                                    |
| Tests          | Vitest 5, `@vue/test-utils`, jsdom; Playwright for E2E       |
| Hosting target | GitHub Pages under `/dmh-pwa`                                |

## Requirements

- Node.js **24.18.0** (pinned in `.nvmrc`; CI uses Node 24)
- npm

Dependencies are exact-pinned (`.npmrc` sets `save-exact=true` and
`legacy-peer-deps=true`). `npm install` runs `patch-package` through
`postinstall`.

## Quick start

```bash
# Install dependencies
npm install

# Run the app and the help center together
npm run dev

# Run only the app (help links will not resolve)
npm run dev:app

# Build for production (help center first, then the app)
npm run build

# Preview the production build
npm run preview
```

`npm run dev` starts:

- app: <http://localhost:5173/dmh-pwa/>
- help center: <http://localhost:5173/dmh-pwa/help/> (proxied to VitePress)

The VitePress server on port `5174` can also be opened directly; it redirects
app routes back to port `5173`. In production both are served from the same
origin.

## Development commands

```bash
npm run dev                     # app + help center
npm run dev:app                 # Vite app only
npm run help:dev                # VitePress help center only
npm run help:build              # build static help pages into dist/help

npm run types-check             # vue-tsc --noEmit (scripts + templates)
npm run format                  # Prettier over the hook glob
npm run lint                    # ESLint
npm run lint:fix                # ESLint with --fix

npm test                        # full Vitest suite
npm run test:watch              # Vitest watch mode
npm run test:ui                 # Vitest UI
npm run test:coverage           # V8 coverage (thresholds in vitest.config.ts)
npm run test:regression         # tests/regressions only
npm run test:probability-calculator

npm run test:e2e:install        # install Chromium/Firefox once
npm run test:e2e                # Playwright, Chromium + Firefox
npm run test:e2e:chromium
npm run test:e2e:firefox

npm run features:verify         # build every feature-off configuration
npm run pack:sound -- <dir>     # build an ambient .spk pack
npm run unpack:sound -- <file>  # unpack an ambient .spk pack
npm run migration:generate <name>
```

### Test status

The current working tree passes:

```text
Test Files  207 passed (207)
Tests       1615 passed (1615)
```

The type check (`npm run types-check`) is expected to report no errors. Coverage
is collected with `npm run test:coverage`; the repository documents its current
coverage gates and exclusions in
[docs/tooling/testing.md](docs/tooling/testing.md).

## Build-time feature flags

Main-menu entities and tools can be excluded from a build with `VITE_FEATURE_*`
environment variables. Missing values default to on; `true`/`1` enable a feature
and `false`/`0` disable it. Unknown flags and invalid dependency combinations
abort the build. Flags are resolved at build time only — there is no runtime
switch.

| Feature                | Variable                   | Requires                   |
| ---------------------- | -------------------------- | -------------------------- |
| Notes                  | `VITE_FEATURE_NOTES`       | —                          |
| Characters             | `VITE_FEATURE_CHARACTERS`  | —                          |
| Parties                | `VITE_FEATURE_PARTIES`     | characters                 |
| Pawns                  | `VITE_FEATURE_PAWNS`       | —                          |
| Encounters and combat  | `VITE_FEATURE_ENCOUNTERS`  | pawns, characters, parties |
| Maps and locations     | `VITE_FEATURE_MAPS`        | —                          |
| Jukebox                | `VITE_FEATURE_JUKEBOX`     | —                          |
| Ambient sound          | `VITE_FEATURE_AMBIENT`     | —                          |
| Timers                 | `VITE_FEATURE_TIMERS`      | —                          |
| Calculator             | `VITE_FEATURE_CALCULATOR`  | —                          |
| Probability calculator | `VITE_FEATURE_PROBABILITY` | —                          |
| Help center links      | `VITE_FEATURE_HELP`        | —                          |

Copy `.env.template` to `.env` for a persistent local configuration, or pass
flags for one build:

```bash
VITE_FEATURE_JUKEBOX=false VITE_FEATURE_AMBIENT=false npm run build
```

`npm run features:verify` builds the all-on, all-off and per-feature-off
configurations, checks the bundle module graph and verifies the PWA manifest
shortcuts. See
[docs/architecture/feature-flags.md](docs/architecture/feature-flags.md).

## PWA and offline behavior

`vite.config.js` configures `vite-plugin-pwa` with:

- an installable manifest named **Owlbear's Dungeon Master Helper**, scoped to
  `/dmh-pwa/`;
- app shortcuts for Notes, Timers, Jukebox and the Help center;
- Workbox precaching for app assets and the generated help pages;
- automatic service-worker updates (`autoUpdate` with `skipWaiting` and
  `clientsClaim`);
- runtime caching for images and remote static resources.

All campaign data is in IndexedDB and is available offline. Audio and other
user-selected files are offline only when their Blob/OPFS storage or file-handle
permission is still available.

A development service worker runs during `npm run dev`, so stale-cache issues
are possible while debugging. Push notifications and background sync are not
implemented.

For install instructions, see
[helpcenter/en/getting-started/install.md](helpcenter/en/getting-started/install.md).
For implementation details, see [docs/architecture/pwa.md](docs/architecture/pwa.md).

## Help center

The help center is a separate VitePress site under `helpcenter/`:

- `helpcenter/index.md` — language chooser.
- `helpcenter/en/` and `helpcenter/ru/` — localized guides.
- `helpcenter/.vitepress/config.mts` — locales, sidebars, local search and the
  **Open app** navigation item.

The app links to the static pages through `src/helpcenter/links.ts`. The
left-menu **Help center** item opens the localized landing page in a new tab.
`npm run build` builds the help center into `dist/help/` before the app build so
the pages are included in the PWA precache.

## Project structure

```text
src/
  main.ts, App.vue, router.ts     app bootstrap, shell and routes
  features/                       per-feature routes, navigation, links and globals
  notes/ characters/ parties/     feature domains
  pawns/ encounters/ maps/
  jukebox/ ambient-sound/ timers/
  calculator/ probability-calculator/
  stores/                         Pinia domain stores
  migrations/                     IndexedDB schema migrations
  schemas/                        JSON schemas used for write validation
  utils/storage.ts                Dexie setup, base store, backup/restore
  utils/files/                    File System Access, OPFS, Blob and audio workers
  utils/dice-probability-calculator/
  components/                     shared UI, dialogs, PWA components
  i18n/locales/{en,ru}.json       translations
  helpcenter/links.ts             static help URL helper
helpcenter/                       VitePress help center (English and Russian)
tests/                            Vitest suites and Playwright E2E tests
scripts/                          build, feature verification, content tooling
public/                           icons, screenshots and copied static assets
docs/                             architecture, feature, component and tooling docs
content/                          local, git-ignored content workspace
```

## Data and backups

- Main records are stored in the `dmh-db` IndexedDB database through Dexie.
- UI settings, theme, language and player preferences are stored in
  `localStorage` under `dmh-config:*` keys.
- `backupAllStores()` produces a ZIP with one JSON file per main store plus
  binary file entries and a `manifest.json`.
- `restoreAllStores()` validates the manifest format/version, clears the
  affected stores and restores the archive. The app reloads after a restore.
- Module content is no longer a persisted entity; ambient content is imported as
  `.spk` packs at runtime.

## Deployment

`npm run build` writes the deployable site to `dist/`, including the generated
manifest, service worker, workbox runtime files and `dist/help/`.

The GitHub Actions workflow (`.github/workflows/ci.yml`) runs on pushes and pull
requests to `main`:

1. `npm ci`
2. `npm run types-check`
3. `npm run test:regression`
4. `npm test`
5. `npm run features:verify`
6. `npm run build` with `VITE_COMMIT_SHA`
7. `cp dist/index.html dist/404.html`
8. deploy `dist/` to GitHub Pages

The site assumes deployment at `/dmh-pwa/`: Vite `base`, the router base, the
manifest scope/start URL and the help-center base all use that prefix. A domain
root deployment requires changing those together plus icon paths. HTTPS is
required for service workers and File System Access.

See [docs/tooling/build-and-deploy.md](docs/tooling/build-and-deploy.md) for
details.

## Known limitations

- The standalone dice-roller engine and the 3D dice button are work in progress
  and are not mounted in the app shell.
- Feature flags are build-time only; they do not change the database schema, and
  data for disabled features is preserved.
- There is no server, account system, cloud sync or collaborative editing.
- Deployment paths assume GitHub Pages project hosting under `/dmh-pwa`.

## Documentation

Start with [docs/README.md](docs/README.md), which maps the full documentation
set. Useful entry points:

- [Architecture overview](docs/architecture/overview.md)
- [Persistence and state](docs/architecture/persistence-and-state.md)
- [Feature flags](docs/architecture/feature-flags.md)
- [PWA and offline behavior](docs/architecture/pwa.md)
- [Testing](docs/tooling/testing.md)
- [Build and deployment](docs/tooling/build-and-deploy.md)
- [Help center implementation](docs/components/help-center.md)

## License

MIT — see [LICENSE](LICENSE).
