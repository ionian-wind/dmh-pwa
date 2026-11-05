# Testing

## Setup

- Runner: **Vitest 5** (`vitest.config.ts`).
- Environment: `jsdom` (`happy-dom` is installed but unused in the config).
- Globals enabled (`describe/it/expect` without imports).
- Setup file: `tests/setup.ts`.
- Coverage: V8, excludes `main.ts`, `router.ts`, i18n, types, schemas, tests,
  generated output (`dist/`, `dev-dist/`, service workers), `scripts/`,
  declarations and configs.
- Alias `@` → `src`.

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
submenu, and the event-based bridge into the existing marker editor. A theme
check also verifies that secondary buttons keep sufficient text contrast.

`tests/setup.ts`:

- Takes over `window.localStorage` with a mock object of `vi.fn()`s.
- Mocks `matchMedia`, `crypto.randomUUID`, `ResizeObserver`,
  `IntersectionObserver`.
- Replaces global `console` methods with `vi.fn()` (though
  `beforeAll(exposeConsole)` then swaps in Node's `Console`, so output is still
  printed).
- Clears mocks before each test.

Each test gets a fresh Pinia, Vue I18n, Quasar component stubs, a layout-store
provide and `fake-indexeddb`; tests only override these globals when they need
different behaviour. Router-dependent components install a memory router in the
test itself.

## Test layout

```
tests/
  components/   # cards, editors, selectors, PWA, RollButton
  composables/  # useModalState
  e2e/          # Playwright browser tests (chromium + firefox)
  stores/       # one per domain store
  utils/        # formatTime, markdownParser, schemaValidator, storage
  views/        # list/detail/combat pages
src/utils/dice-roller/
  __tests__/             # core + integration + per-plugin copies
  plugins/*/__tests__/   # plugin unit tests
```

Total test files: 171. Total tests: 1366.

## Current results (measured)

```
npm test
Test Files  171 passed (171)
Tests       1366 passed (1366)
```

Coverage (V8, `npm run test:coverage`):

```
Statements  95.68%
Branches    87.10%
Functions    95.31%
Lines       96.97%
```

`vitest.config.ts` enforces 87% statements, functions, branches and lines
globally, plus 87% statements and lines for **every individual source file**.
Third-party integration wrappers, generated/copied components, the legacy
dice-roller engine, thin adapters and the app shell are excluded. The full list
and the documented unreachable defensive branches are in
[architecture/legacy-and-unreachable-code.md](../architecture/legacy-and-unreachable-code.md).

The maintained regression suite is also green:

```
npm run test:regression
Test Files  2 passed (2)
Tests       18 passed (18)
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
5. **Dice plugin was WIP.** The plugin now has `parse`/`evaluate`/`register`,
   roll references have a lexer token, nested inline rolls are balanced, and
   the dice suites pass.
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
- `tests/regressions/` holds the bug-focused suite added during remediation.

## Coverage focus

The suite now includes direct tests for:

- backup/restore round-trips, IDB CRUD and mention backlinks,
- file handlers, worker metadata extraction and color/palette extraction,
- jukebox playback/queue transitions with a mocked Howler,
- PWA install/update flows and event cleanup,
- BaseListView/BaseEntityTabView integration, cards, controls and calculators,
- module import/export, markdown sanitizing/task lists and mention plugin helpers,
- map canvas readback patching and the map-layers migration,
- Monaco environment setup and the probability calculator page, code library,
  syntax page, editor completions, sharing, chart zoom and syntax markers,
- note Markdown/PNG downloads and the shared `SidebarItem` component,
- drag-and-drop and ordering paths: `BaseListView` sort events and drop
  handlers, playlist `sortOrder` persistence, jukebox file drops and track
  reordering, the `Tree` drag handles/drop target wiring, and tree reorder
  propagation from `ModuleDocumentTree`,
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
  variables, keywords and code-piece definitions.

The remaining intentional low-coverage area is the large dice-roller AST/plugin
implementation; it is exercised by parser, evaluator, macro, table, formatting
and integration suites rather than line-by-line unit tests.
