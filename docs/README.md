# Owlbear's DMH — Project Documentation

> Generated from the source tree at commit `71bb33e`. The goal of this
> documentation is to describe the code that exists, not an idealized version
> of it.

## What this project is

**Owlbear's Dungeon Master Helper** (`dmh-pwa`) is a local-first Progressive
Web App for running tabletop RPG sessions. It stores notes, modules, characters,
parties, monsters, encounters, combats, timers, and a local music jukebox in the
browser. There is no server and no account system: all user data lives in
IndexedDB, with a small amount of configuration in `localStorage`.

| Concern           | Choice                                                   |
| ----------------- | -------------------------------------------------------- |
| UI framework      | Vue 3 (`<script setup>`), TypeScript                     |
| Component library | Quasar 2 + Tabler icons                                  |
| State             | Pinia 4 (setup stores) + `pinia-shared-state`            |
| Storage           | IndexedDB through `idb`, JSON Schema validation with Ajv |
| Build             | Vite 8, `vite-plugin-pwa` (Workbox)                      |
| Markdown          | markdown-it for rendering, Milkdown/Crepe for editing    |
| Audio             | Howler for playback, `music-metadata` in a web worker    |
| Tests             | Vitest 5 + `@vue/test-utils` + happy-dom/jsdom           |
| Hosting target    | GitHub Pages under `/dmh-pwa`                            |

## Documentation map

### Architecture

| Document                                                                                   | Covers                                                           |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| [architecture/overview.md](architecture/overview.md)                                       | Boot sequence, layers, layout shell, routing, error handling     |
| [architecture/data-model.md](architecture/data-model.md)                                   | Every entity, fields, relationships, ID/timestamp conventions    |
| [architecture/persistence-and-state.md](architecture/persistence-and-state.md)             | IndexedDB, base store, Pinia stores, schemas, migrations, backup |
| [architecture/i18n.md](architecture/i18n.md)                                               | Locale loading, language persistence, key conventions            |
| [architecture/editor-dialog-pattern.md](architecture/editor-dialog-pattern.md)             | Required editor dialog tabs, field ordering, entity categories   |
| [architecture/pwa.md](architecture/pwa.md)                                                 | Manifest, service worker, install prompt, update flow            |
| [architecture/legacy-and-unreachable-code.md](architecture/legacy-and-unreachable-code.md) | Coverage exclusions and documented unreachable branches          |

### Feature parts

| Document                                                                                         | Covers                                                                   |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| [features/notes.md](features/notes.md)                                                           | Note list, editor, detail page, tags, hidden notes                       |
| [features/modules-and-documents.md](features/modules-and-documents.md)                           | Modules, document tree, book rendering, TOC, bookmarks                   |
| [features/module-import-export.md](features/module-import-export.md)                             | Module ZIP format, validation, import, export                            |
| [features/characters.md](features/characters.md)                                                 | Player characters                                                        |
| [features/parties.md](features/parties.md)                                                       | Parties and character membership                                         |
| [features/monsters.md](features/monsters.md)                                                     | Monsters and module membership                                           |
| [features/encounters.md](features/encounters.md)                                                 | Encounter definitions and monster rosters                                |
| [features/combat.md](features/combat.md)                                                         | Combat lifecycle, initiative, turns                                      |
| [features/timers.md](features/timers.md)                                                         | Countdown timers and global timer loop                                   |
| [features/jukebox.md](features/jukebox.md)                                                       | Track import, metadata, playlists, playback                              |
| [features/maps.md](features/maps.md)                                                             | Map images, locations, entity bindings, markers and icons                |
| [features/calculator.md](features/calculator.md)                                                 | Arithmetic and unit converter dialog                                     |
| [features/dice-roller.md](features/dice-roller.md)                                               | Plugin-based dice parser/evaluator (work in progress, not yet connected) |
| [features/dice-probability-calculator/README.md](features/dice-probability-calculator/README.md) | AnyDice-compatible probability library, spec, validation matrix          |
| [features/markdown-and-mentions.md](features/markdown-and-mentions.md)                           | Markdown pipeline, entity links, mention index                           |

### Components and utilities

| Document                                                                   | Covers                                                 |
| -------------------------------------------------------------------------- | ------------------------------------------------------ |
| [components/common-components.md](components/common-components.md)         | Shared cards, lists, headers, selectors, inputs        |
| [components/tree.md](components/tree.md)                                   | Recursive drag-and-drop tree used by the book editor   |
| [components/markdown-editor.md](components/markdown-editor.md)             | Milkdown wrapper and mention insertion popup           |
| [components/modals-and-navigation.md](components/modals-and-navigation.md) | Modal stack, dialogs, drawer injection, layout regions |
| [utils/files.md](utils/files.md)                                           | File System Access / Blob handlers and metadata worker |
| [utils/helpers.md](utils/helpers.md)                                       | IDs, debug, unwrapping, scrolling, titles, random      |

### Tooling

| Document                                                   | Covers                                                |
| ---------------------------------------------------------- | ----------------------------------------------------- |
| [tooling/scripts.md](tooling/scripts.md)                   | Markdown converter, migration generator, icon scripts |
| [tooling/testing.md](tooling/testing.md)                   | Test layout, current results, why tests fail          |
| [tooling/build-and-deploy.md](tooling/build-and-deploy.md) | Vite config, PWA generation, CI/deploy                |

### Cross-cutting analysis

| Document                                                                 | Covers                                              |
| ------------------------------------------------------------------------ | --------------------------------------------------- |
| [integration/cross-part-behavior.md](integration/cross-part-behavior.md) | How parts call each other; end-to-end flows         |
| [proposals/technical-proposals.md](proposals/technical-proposals.md)     | Engineering improvements and refactors              |
| [proposals/bugs.md](proposals/bugs.md)                                   | Current defect status and resolved-item index       |
| [proposals/fixes-applied.md](proposals/fixes-applied.md)                 | What was fixed in the first remediation pass        |
| [proposals/feature-proposals.md](proposals/feature-proposals.md)         | Product features that fit the existing architecture |

## Conventions used in this documentation

- **Part** = a cohesive slice of the app (a feature domain, a shared subsystem,
  or a tooling area).
- **Store** always means a Pinia store unless explicitly called a "base store"
  (`useStore()` in `src/utils/storage.ts`).
- **Base store** = the shared CRUD wrapper around one IndexedDB object store.
- **Entity** = a persisted record with `id`, `createdAt`, `updatedAt`.
- **Document note** = a note with `hidden === true`, used as a node in a
  module's `noteTree` and rendered in the module "Book" tab.
- A code path described as "not wired" exists in the repository but is never
  reached by the running application.

## Repository quick reference

```
src/
  main.ts, App.vue, router.ts      bootstrap + shell
  stores/                          Pinia domain stores
  migrations/                      IndexedDB schema migrations
  schemas/                         JSON schemas used for write validation
  utils/storage.ts                 IndexedDB + base store + backup
  utils/markdownParser.ts          markdown-it renderer + entity link parsing
  utils/files/                     File System Access / Blob + audio worker
  utils/dice-roller/               dice engine (work in progress)
  utils/dice-probability-calculator/ AnyDice-compatible probability library
  probability-calculator/          probability calculator page, Monaco + charts
  components/                      shared UI + Tree + PWA + dialogs
  <domain>/                        one folder per feature domain
  i18n/locales/{en,ru}.json        translations
tests/                             Vitest suites (largely stale)
scripts/                           offline content/migration tooling
public/                            icons, legacy manifest, legacy sw.js, dice assets
docs/                              this documentation
```

## Important status notes

Three facts materially affect how the code should be read:

1. **The test suite is current and green.** `npm test` reports
   **1485 / 1485 passing tests across 185 files** (after replacing obsolete suites
   that targeted removed APIs). The dedicated regression suite is also green:
   `npm run test:regression` → **18 / 18 passing**. See
   [tooling/testing.md](tooling/testing.md).
2. **The type check uses `vue-tsc`** (`npm run types-check`) and reports
   **0 errors**. CI runs the type check, regression suite, and build. See
   [proposals/fixes-applied.md](proposals/fixes-applied.md).
3. **Some features are intentionally incomplete.** The dice engine and 3D dice
   UI are explicitly work in progress and are not treated as defects. All
   previously tracked UI/data defects have been fixed; see
   [proposals/fixes-applied.md](proposals/fixes-applied.md).
