# Owlbear's DMH — Project Documentation

> Generated from the current working tree. The goal of this documentation is to
> describe the code that exists, not an idealized version of it.

## What this project is

**Owlbear's Dungeon Master Helper** (`dmh-pwa`) is a local-first Progressive
Web App for running tabletop RPG sessions. It stores notes, characters,
parties, pawns, encounters, combats, timers, and a local music jukebox in the
browser. There is no server and no account system: all user data lives in
IndexedDB, with a small amount of configuration in `localStorage`.

| Concern           | Choice                                                                     |
| ----------------- | -------------------------------------------------------------------------- |
| UI framework      | Vue 3 (`<script setup>`), TypeScript                                       |
| Component library | Quasar 2 + Tabler icons                                                    |
| State             | Pinia 4 (setup stores) + `pinia-shared-state`                              |
| Storage           | IndexedDB through Dexie, JSON Schema validation with Ajv                   |
| Build             | Vite 8, `vite-plugin-pwa` (Workbox)                                        |
| Markdown          | markdown-it for cards/exports, Milkdown/Crepe for editors and detail views |
| Audio             | Howler for playback, `music-metadata` in a web worker                      |
| Tests             | Vitest 5 + `@vue/test-utils`, jsdom (happy-dom installed)                  |
| Hosting target    | GitHub Pages under `/dmh-pwa`                                              |

## Documentation map

### Architecture

| Document                                                                                         | Covers                                                           |
| ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| [architecture/overview.md](architecture/overview.md)                                             | Boot sequence, layers, layout shell, routing, error handling     |
| [architecture/data-model.md](architecture/data-model.md)                                         | Every entity, fields, relationships, ID/timestamp conventions    |
| [architecture/persistence-and-state.md](architecture/persistence-and-state.md)                   | IndexedDB, base store, Pinia stores, schemas, migrations, backup |
| [architecture/i18n.md](architecture/i18n.md)                                                     | Locale loading, language persistence, key conventions            |
| [architecture/editor-dialog-pattern.md](architecture/editor-dialog-pattern.md)                   | Required editor dialog tabs, field ordering, entity categories   |
| [architecture/pwa.md](architecture/pwa.md)                                                       | Manifest, service worker, install prompt, update flow            |
| [architecture/feature-flags.md](architecture/feature-flags.md)                                   | Build-time feature flags, ownership and strict verification      |
| [architecture/markdown-rendering-performance.md](architecture/markdown-rendering-performance.md) | Card/detail Markdown rendering benchmark and decision            |
| [architecture/legacy-and-unreachable-code.md](architecture/legacy-and-unreachable-code.md)       | Coverage exclusions and documented unreachable branches          |

### Feature parts

| Document                                                                                           | Covers                                                                      |
| -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| [features/notes.md](features/notes.md)                                                             | Note list, editor, detail page, tags                                        |
| [features/characters.md](features/characters.md)                                                   | Player characters                                                           |
| [features/parties.md](features/parties.md)                                                         | Parties and character membership                                            |
| [features/pawns.md](features/pawns.md)                                                             | Pawns                                                                       |
| [features/encounters.md](features/encounters.md)                                                   | Encounter definitions and pawn rosters                                      |
| [features/combat.md](features/combat.md)                                                           | Combat lifecycle, initiative, turns                                         |
| [features/timers.md](features/timers.md)                                                           | Countdown timers and global timer loop                                      |
| [features/jukebox.md](features/jukebox.md)                                                         | Track import, metadata, playlists, playback                                 |
| [ambient-sound-configurator.md](ambient-sound-configurator.md)                                     | Ambient sound packs, scenes, layers and playback                            |
| [features/maps.md](features/maps.md)                                                               | Map images, locations, entity bindings, markers and icons                   |
| [features/calculator.md](features/calculator.md)                                                   | Arithmetic and unit converter dialog                                        |
| [features/dice-probability-calculator/README.md](features/dice-probability-calculator/README.md)   | AnyDice-compatible probability library, specification and validation matrix |
| [features/dice-probability-calculator/library.md](features/dice-probability-calculator/library.md) | Probability library API and usage                                           |
| [features/dice-probability-calculator/spec.md](features/dice-probability-calculator/spec.md)       | Probability language specification                                          |
| [features/markdown-and-mentions.md](features/markdown-and-mentions.md)                             | Markdown pipeline, entity links, mention index                              |

### Components and utilities

| Document                                                                   | Covers                                                 |
| -------------------------------------------------------------------------- | ------------------------------------------------------ |
| [components/common-components.md](components/common-components.md)         | Shared cards, lists, headers, selectors, inputs        |
| [components/help-center.md](components/help-center.md)                     | Static Markdown help center, locales, images and links |
| [components/markdown-editor.md](components/markdown-editor.md)             | Milkdown wrapper and mention insertion popup           |
| [components/modals-and-navigation.md](components/modals-and-navigation.md) | Modal stack, dialogs, drawer injection, layout regions |
| [utils/files.md](utils/files.md)                                           | File System Access / Blob handlers and metadata worker |
| [utils/helpers.md](utils/helpers.md)                                       | IDs, debug, unwrapping, scrolling, titles, random      |

### Tooling

| Document                                                   | Covers                                                |
| ---------------------------------------------------------- | ----------------------------------------------------- |
| [tooling/scripts.md](tooling/scripts.md)                   | Markdown converter, migration generator, icon scripts |
| [tooling/testing.md](tooling/testing.md)                   | Test layout, results and coverage                     |
| [tooling/build-and-deploy.md](tooling/build-and-deploy.md) | Vite config, PWA generation, CI/deploy                |

### Plans

Plans are committed work expected to be implemented, plus implementation
records that are now complete. Proposals are optional ideas that may never be
implemented.

| Document                                                           | Covers                                             |
| ------------------------------------------------------------------ | -------------------------------------------------- |
| [plans/README.md](plans/README.md)                                 | Plan conventions and current status                |
| [plans/scribe-and-play-modes.md](plans/scribe-and-play-modes.md)   | Scribe preparation and Play session modes          |
| [plans/feature-flags.md](plans/feature-flags.md)                   | Build-time menu/entity feature flags               |
| [plans/pwa-hardening-plan.md](plans/pwa-hardening-plan.md)         | Manifest, install UX, safe-area and PWA audit plan |
| [plans/milkdown-view-renderer.md](plans/milkdown-view-renderer.md) | Milkdown detail-view renderer plan and status      |
| [plans/remove-modules-entity.md](plans/remove-modules-entity.md)   | Completed Modules removal and migration record     |
| [plans/dice-roller.md](plans/dice-roller.md)                       | Dice roller notation, architecture and branch plan |

### Cross-cutting analysis

| Document                                                                                 | Covers                                              |
| ---------------------------------------------------------------------------------------- | --------------------------------------------------- |
| [integration/cross-part-behavior.md](integration/cross-part-behavior.md)                 | How parts call each other; end-to-end flows         |
| [proposals/technical-proposals.md](proposals/technical-proposals.md)                     | Engineering improvements and refactors              |
| [proposals/bugs.md](proposals/bugs.md)                                                   | Current defect status and resolved-item index       |
| [proposals/fixes-applied.md](proposals/fixes-applied.md)                                 | What was fixed in the first remediation pass        |
| [proposals/feature-proposals.md](proposals/feature-proposals.md)                         | Product features that fit the existing architecture |
| [proposals/hotkeys-and-command-menu.md](proposals/hotkeys-and-command-menu.md)           | Global hotkeys and the command menu                 |
| [proposals/help-center-search.md](proposals/help-center-search.md)                       | Offline search across localized help pages          |
| [proposals/global-and-local-search.md](proposals/global-and-local-search.md)             | Local fuzzy suggestions and global entity search    |
| [proposals/generic-file-handling.md](proposals/generic-file-handling.md)                 | OPFS, streaming, backups and generic file storage   |
| [proposals/image-quick-tools.md](proposals/image-quick-tools.md)                         | Crop/resize/convert/compress utility                |
| [proposals/image-filters-and-composition.md](proposals/image-filters-and-composition.md) | Filter stacks, layers and image composition         |

## Conventions used in this documentation

- **Part** = a cohesive slice of the app (a feature domain, a shared subsystem,
  or a tooling area).
- **Store** always means a Pinia store unless explicitly called a "base store"
  (`useStore()` in `src/utils/storage.ts`).
- **Base store** = the shared CRUD wrapper around one IndexedDB object store.
- **Entity** = a persisted record with `id`, `createdAt`, `updatedAt`.
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
  utils/files/                     File System Access / OPFS / Blob + audio worker
  utils/dice-roller/               dice engine (work in progress)
  utils/dice-probability-calculator/ AnyDice-compatible probability library
  probability-calculator/          probability calculator page, Monaco + charts
  helpcenter/links.ts              static help-center URL helper
  features/                        feature catalog integrations (routes, nav, links)
  components/                      shared UI + PWA + dialogs
  <domain>/                        one folder per feature domain
  i18n/locales/{en,ru}.json        translations
helpcenter/                        VitePress site: localized Markdown + images
tests/                             Vitest suites and Playwright E2E helpers
scripts/                           feature verification, benchmark and content tooling
public/                            icons, screenshots, dice-box assets
docs/                              this documentation
```

## Important status notes

Three facts materially affect how the code should be read:

1. **The test suite is current and green.** At this working tree, `npm test`
   reports **1615 / 1615 passing tests across 207 files**. The dedicated
   regression suite is also green: `npm run test:regression` → **18 / 18
   passing**. See [tooling/testing.md](tooling/testing.md).
2. **The type check uses `vue-tsc`** (`npm run types-check`) and currently
   reports **0 errors**. CI runs the type check, regression suite, full test
   suite, feature build matrix, and production build. See
   [proposals/fixes-applied.md](proposals/fixes-applied.md).
3. **Some features are intentionally incomplete.** The dice engine and 3D dice
   UI are explicitly work in progress and are not treated as defects. All
   previously tracked UI/data defects have been fixed; see
   [proposals/fixes-applied.md](proposals/fixes-applied.md).
