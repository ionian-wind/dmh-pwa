# Testing

## Setup

- Runner: **Vitest 5** (`vitest.config.ts`).
- Environment: `jsdom`, with `pool: 'vmThreads'` so one jsdom environment is
  created per worker rather than per test file.
- Globals enabled (`describe/it/expect` without imports).
- Setup file: `tests/setup.ts`.
- Coverage: V8, excludes `main.ts`, `router.ts`, i18n, types, schemas, tests,
  generated output (`dist/`, `dev-dist/`, service workers), `scripts/`,
  declarations and configs.
- Alias `@` → `src`.

Commands:

```bash
npm test                       # full Vitest run
npm run test:watch             # watch mode
npm run test:ui                # Vitest UI
npm run test:coverage          # V8 coverage
npm run test:regression        # tests/regressions only
npm run test:probability-calculator
```

## End-to-end tests

- Runner: **Playwright** (`playwright.config.ts`).
- Projects: `chromium` and `firefox`.
- Test directory: `tests/e2e` with `*.e2e.ts` files, so Vitest does not pick
  them up.
- The config starts Vite on `127.0.0.1:4174` and uses the `/dmh-pwa` base path.
- Service workers are blocked during E2E runs to keep test state deterministic.
- `tests/e2e/helpers/seed.ts` writes map/file fixtures directly to IndexedDB
  after the app has run its migrations.

Commands:

```bash
npm run test:e2e:install   # once per machine
npm run test:e2e           # chromium + firefox
npm run test:e2e:chromium  # chromium only
npm run test:e2e:firefox   # firefox only
```

The map E2E suite covers the custom `ol/control/Control` action menu, marker
placement from a map click, the `ol-contextmenu` right-click menu, its draw
submenu, and the event-based bridge into the existing marker editor. The theme
suite verifies secondary-button text contrast, and separate suites cover notes,
jukebox playback, read-only Milkdown views and the probability calculator.

`tests/setup.ts`:

- Takes over `window.localStorage` with a mock object of `vi.fn()`s.
- Provides configurable `matchMedia` mocks, `crypto.randomUUID`, `ResizeObserver`
  and `IntersectionObserver`.
- Restores full Web Crypto when the pool exposes a partial jsdom crypto object.
- Polyfills `ReadableStream` from `node:stream/web`.
- Adds a `structuredClone` fallback for cross-realm plain data used by
  `fake-indexeddb`, while still rejecting genuinely uncloneable values.
- Replaces global `console` methods with `vi.fn()` (though
  `beforeAll(exposeConsole)` then swaps in Node's `Console`, so output is still
  printed).
- Clears mocks and resets IndexedDB state before each test.

Each test gets a fresh Pinia, Vue I18n, Quasar component stubs, a layout-store
provide and `fake-indexeddb`; tests only override these globals when they need
different behaviour. Router-dependent components install a memory router in the
test itself.

## Test layout

```
tests/
  ambient/      # ambient sound pages, packs, player, scenes
  characters/   # character editor and view sidebar
  components/   # cards, dialogs, editors, selectors, PWA, settings
  composables/  # layout, modal state, drag snap, entity edit mode
  dialogs/      # promise dialog wrappers
  drawings/     # note drawing storage and Markdown helpers
  e2e/          # Playwright browser tests (chromium + firefox)
  encounters/   # combat view, active combats, encounter sidebar
  features/     # feature flags and feature navigation
  helpcenter/   # static help URL generation
  helpers/      # Quasar stubs, fake OPFS, in-memory stores
  jukebox/      # player, playlists, bulk selection, UI
  maps/         # map/location editors, catalog, actions, files
  notes/        # note editor/options/view sidebar/download
  parties/      # party editor
  pawns/        # pawn editor branches
  regressions/  # bug-focused suite
  scripts/      # sound-pack archive helpers
  stores/       # one per domain store
  coverage/     # branch-coverage additions for stores, audio and utilities
  utils/        # files, markdown, migrations, storage, RNG and dice helpers
  views/        # home/list smoke tests
src/utils/bag-of-dice/
  __tests__/    # engine, reference compatibility, branch coverage
  engine/       # parser, evaluator, plugins, shared-RNG re-export
src/utils/dice-probability-calculator/
  __tests__/    # parser, evaluator, sampling and official-doc fixtures
src/utils/rng.ts
                # shared RNG, replay and weighted-sampling library
```

Total test files: 223. Total tests: 1850.

## Current results (measured)

```
npm test
Test Files  223 passed (223)
Tests       1850 passed (1850)
```

Coverage (V8, `npm run test:coverage`, exit code 0):

```
Statements  94.25%
Branches    87.08%
Functions   92.83%
Lines       95.54%
```

`vitest.config.ts` enforces 87% statements, functions, branches and lines
globally. The per-file threshold is not enabled; UI-heavy, migration and
generated modules are excluded where unit coverage is not meaningful.
Third-party integration wrappers, generated/copied components, thin adapters
and the app shell are excluded. The full list and the documented unreachable
defensive branches are in
[architecture/legacy-and-unreachable-code.md](../architecture/legacy-and-unreachable-code.md).

The maintained regression suite is also green:

```
npm run test:regression
Test Files  2 passed (2)
Tests       21 passed (21)
```

The obsolete suites that mocked removed store APIs and old data shapes were
replaced with current coverage. Component/view tests use shared Pinia, i18n,
Quasar stubs, and `fake-indexeddb`; dice-engine tests now exercise the
registered plugin pipeline.

### Historical root causes (resolved)

1. **Stale store API.** Old tests called `createCharacter`, `loadCombats`, etc.
   The current stores expose `create`, `update`, `remove`, `getById`, `filtered`,
   and `load`; store tests were rewritten.
2. **Stale data model.** Old character tests assumed `level`, `stats`,
   `hitPoints`, etc.; the current type has `name`/`notes`.
3. **Removed storage API.** `isStorageAvailable`, `useStorage`, and friends no
   longer exist; the storage test now covers current helpers.
4. **Missing test plugins.** i18n/Pinia/Quasar were not installed. A shared
   setup now installs Pinia + i18n and stubs Quasar components.
5. **Dice plugin was WIP.** The maintained engine now lives in
   `src/utils/bag-of-dice`, uses the shared RNG library, and has parser,
   evaluator, reference-compatibility, metadata and branch-coverage suites.
6. **Old templates.** Tests referenced removed components (`CombatTracker`,
   `GlobalMenu`, etc.); those files were replaced with current coverage.
7. **Missing IndexedDB.** `fake-indexeddb` is now loaded globally and the
   database is reset between tests.
8. **Obsolete view suites.** Replaced with smoke tests that mount the current
   list views and Home/NotFound with a memory router.

## Test infrastructure

- `tests/setup.ts` installs a fresh Pinia, Vue I18n, Quasar component stubs,
  `fake-indexeddb`, and resets the base-store cache/database per test.
- `tests/helpers/quasar-stubs.ts` provides light Q\* stubs that render slots and
  emit model updates.
- `tests/helpers/mock-storage.ts` provides an in-memory base store for store
  unit tests.
- `tests/helpers/mount.ts` mounts with a local i18n instance without also
  installing the global test i18n, avoiding duplicate-plugin warnings.
- `tests/regressions/` holds the bug-focused suite added during remediation.

## Coverage focus

The suite now includes direct tests for:

- backup/restore round-trips, IDB CRUD and mention backlinks,
- file handlers, worker metadata extraction and color/palette extraction,
- jukebox playback/queue transitions with a mocked Howler,
- PWA install/update flows and event cleanup,
- BaseListView/BaseEntityTabView integration, cards, controls and calculators,
- the shared `EntityInfoDialog` main/linked tabs, inline editing, note options
  and picture picker; home-card ordering and `StatCard`; combat's scenes-only
  sidebar and participant info dialogs,
- markdown sanitizing/task lists and mention plugin helpers,
- map canvas readback patching and the map-layers migration,
- the Editora code editor, probability calculator page, code library,
  syntax page, editor completions, sharing, chart zoom and syntax markers,
- note Markdown/PNG downloads and the shared `SidebarItem` component,
- drag-and-drop and ordering paths: `BaseListView` sort events and drop
  handlers, playlist `sortOrder` persistence, jukebox file drops and track
  reordering,
- structured Chevrotain error providers, human-readable localized syntax
  messages, and the error banner's line/column link to the editor position,
- the syntax-page right-drawer TOC, clickable section-heading anchors, scroll
  spy, hash updates and the header toggle that hides/reopens the sidebar,
- AnyDice completion definitions from included code pieces, including
  function parameter snippets and source-piece labels,
- map entity catalog/link blocks including jukebox playlists,
- ambient sound pack import/export/storage, audio-engine fades/transitions,
  the ambient store's playback/mood/weather actions, recursive pack/unpack
  archive helpers and the sound-pack selector,
- localized completion labels/details for built-in snippets, program
  variables, keywords and code-piece definitions,
- shared RNG determinism, weighted sampling, replay state and probability
  calculator sampling through injected RNGs.
