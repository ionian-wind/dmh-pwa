# Testing

## Setup

- Runner: **Vitest 3** (`vitest.config.ts`).
- Environment: `jsdom` (`happy-dom` is installed but unused in the config).
- Globals enabled (`describe/it/expect` without imports).
- Setup file: `tests/setup.ts`.
- Coverage: V8, excludes `main.ts`, `router.ts`, i18n, types, schemas, tests,
  declarations, configs.
- Alias `@` → `src`.

`tests/setup.ts`:

- Takes over `window.localStorage` with a mock object of `vi.fn()`s.
- Mocks `matchMedia`, `crypto.randomUUID`, `ResizeObserver`,
  `IntersectionObserver`.
- Replaces global `console` methods with `vi.fn()` (though
  `beforeAll(exposeConsole)` then swaps in Node's `Console`, so output is still
  printed).
- Clears mocks before each test.

There is no global Pinia, Vue I18n, Quasar, or router installation. Components
that use `useI18n()` or Quasar components must mock or install them per test;
many do not, which is a major source of failures.

## Test layout

```
tests/
  components/   # cards, editors, selectors, PWA, RollButton
  composables/  # useModalState
  stores/       # one per domain store
  utils/        # formatTime, markdownParser, schemaValidator, storage
  views/        # list/detail/combat pages
src/utils/dice-roller/
  __tests__/             # core + integration + per-plugin copies
  plugins/*/__tests__/   # plugin unit tests
```

Total test files: 72. Total tests: 536.

## Current results (measured)

```
npm test
Test Files  72 passed (72)
Tests       536 passed (536)
```

Coverage (V8, `npm run test:coverage`):

```
Statements  82.44%
Branches    81.46%
Functions   71.02%
Lines       82.44%
```

Every source module now has tests. The only files below 80% line coverage are the
large dice-roller AST/plugin files, which have dedicated parser/evaluator suites.
`vitest.config.ts` enforces global thresholds (80% statements/lines, 75%
branches, 65% functions) so future changes cannot silently drop coverage.

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
- `tests/helpers/quasar-stubs.ts` provides light Q* stubs that render slots and
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
- module import/export, markdown sanitizing/task lists and mention plugin helpers.

The remaining intentional low-coverage area is the large dice-roller AST/plugin
implementation; it is exercised by parser, evaluator, macro, table, formatting
and integration suites rather than line-by-line unit tests.

