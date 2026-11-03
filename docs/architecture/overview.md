# Architecture Overview

## Purpose

This document describes how the application starts, how it is layered, what the
shell layout does, and where each kind of responsibility lives. It is the entry
point for the rest of the part documentation.

## Technology stack

- **Vue 3** with `<script setup>` single-file components and TypeScript.
- **Quasar 2** as the component/layout system (`QLayout`, `QDrawer`, `QPage`,
  `QDialog`, `QInput`, `QSelect`, tables, tabs, notifications). Global Quasar
  plugins registered are `Notify` and `Dialog`.
- **Pinia 3** setup stores; `pinia-shared-state` is enabled so state can be
  synchronized between browser tabs via `BroadcastChannel`/`localStorage`
  (library default behavior).
- **IndexedDB** via `idb` as the single source of truth.
- **markdown-it** for rendering, **Milkdown/Crepe** for WYSIWYG editing.
- **Howler** for the jukebox; **music-metadata** in a worker for tags/artwork.
- **Vite** for dev/build; **vite-plugin-pwa** for offline support.

## Boot sequence

`index.html` mounts into `#q-app` and loads `src/main.ts`.

```
initializeDatabase()  ── opens IndexedDB, runs migrations (fire and forget)
      │
createApp(App)
      │
pinia (+ PiniaSharedState)
router
useConfigStore() ── reads localStorage-backed preferences
i18n ── locale starts as 'ru', then a watcher applies savedLanguage
setupAnchorScrollHandler()
VueDnDKit plugin
Quasar plugin (Notify, Dialog, ru locale, FontAwesome icon set)
global errorHandler / warnHandler (log through utils/debug)
app.mount('#q-app')
```

Two details matter:

- `initializeDatabase()` is started **before mount but not awaited**. Store
  `load()` calls call `openDB()` themselves, so it is usually harmless; it just
  warms the connection.
- The i18n locale is initialized to `'ru'` in `src/i18n/index.ts` and then
  immediately overridden from `configStore.savedLanguage` (defaults to
  `navigator.language`). A stored `"en"` value wins after first render tick.

## Runtime layers

```
┌──────────────────────────────────────────────────────────────┐
│ Shell (App.vue)                                              │
│  header slot injection, left nav, right drawer, footer,      │
│  PWA banners, calculator dialog, jukebox dialog, mention     │
│  modal stack                                                 │
├──────────────────────────────────────────────────────────────┤
│ Route views (src/<domain>/*View.vue)                         │
│  list pages, detail pages, combat, jukebox, timers           │
├──────────────────────────────────────────────────────────────┤
│ Feature components (cards, editors, sidebars, selectors)     │
├──────────────────────────────────────────────────────────────┤
│ Shared component library (src/components/common, Tree, UI)   │
├──────────────────────────────────────────────────────────────┤
│ Domain stores (src/stores/*) + jukebox stores                │
│  filtering, domain helpers, mention indexing                 │
├──────────────────────────────────────────────────────────────┤
│ Base store (src/utils/storage.ts useStore)                   │
│  CRUD, schema validation, current item, sorted view          │
├──────────────────────────────────────────────────────────────┤
│ IndexedDB (dmh-db) + JSON Schema (Ajv) + migrations          │
└──────────────────────────────────────────────────────────────┘
```

Cross-cutting modules used from every layer:

- `utils/markdownParser.ts` — markdown rendering and entity link extraction.
- `utils/storage.ts` — database, base stores, mention index, backup/restore.
- `utils/debug.ts` — `debug`, `debugWarn`, `debugError` wrappers.
- `composables/useModalState.ts` — global modal ordering.
- `dialogs/` — promise wrappers around Quasar `Dialog` (`confirm`, `alert`,
  `prompt`).

## Shell layout (`src/App.vue`)

`QLayout view="hHh LpR lFr"` defines five regions:

| Region          | Implementation                   | Content source               |
| --------------- | -------------------------------- | ---------------------------- |
| Header          | `QHeader` + `QToolbar`           | `layout.topMenuContent`      |
| Left navigation | `QDrawer`, hover-mini            | Hard-coded `sections` array  |
| Right drawer    | `QDrawer`, persistent            | `layout.rightDrawerContent`  |
| Page            | `QPageContainer` + `router-view` | Route components             |
| Footer          | `QFooter`                        | `layout.bottomDrawerContent` |

### Header injection protocol

`App.vue` creates a typed layout store via `provideLayout()` and provides it
under `LayoutKey`. Consumers use `useLayout()` / `useRightDrawer()` from
`src/composables/useLayout.ts`:

- `setTopMenuContent({ component, props })`
- `setRightDrawerContent({ component, props }, owner?)`
- `clearRightDrawer(owner?)`
- `setBottomDrawerContent({ component, props })`

The right drawer is ownership-aware: a view that did not set the current
content cannot clear it.

`BaseListView` and `BaseEntityView` publish a `ViewHeader` with
create/edit/delete/search/buttons. `JukeboxView` publishes `PlaylistList` to the
right drawer and `JukeboxPlayer` to the footer. `NoteView`, `PartyView`,
`MonsterView`, and `EncounterView` publish their domain sidebar to the right
drawer and clear it on unmount. `BaseEntityView` publishes a `sidepanel` slot
for `CharacterView` and `ModuleView`.

### Left navigation

Sections (`Section` enum): Notes, Characters, Parties, Modules, Monsters,
Encounters, Timers. Jukebox, Calculator, and Settings are secondary actions.
Settings opens `SettingsDialog` (language selection lives there). The timers
icon is animated by watching `timerStore.now` and cycling through twelve clock
icons; the watch runs only while a timer is running.

Active state is computed with `currentPath.startsWith(item.path)`, so detail
routes highlight their list section. Jukebox is active only on `/jukebox`.

### Global overlays

- `PWAInstallPrompt` and `PWAStatus` are always mounted.
- `MentionModalStack` renders the topmost mention modal globally.
- `CalculatorDialog` and `SoundControlDialog` are snapable bottom sheets opened from
  the left nav.

## Routing (`src/router.ts`)

`createWebHistory('/dmh-pwa/')` — the app assumes it is hosted under
`/dmh-pwa`. Core routes:

| Path              | Name             | Component      |
| ----------------- | ---------------- | -------------- |
| `/`               | home             | HomeView       |
| `/notes`          | notes            | NotesView      |
| `/notes/:id`      | note-detail      | NoteView       |
| `/parties`        | parties          | PartiesView    |
| `/parties/:id`    | party-detail     | PartyView      |
| `/monsters`       | monsters         | MonstersView   |
| `/monsters/:id`   | monster-detail   | MonsterView    |
| `/characters`     | characters       | CharactersView |
| `/characters/:id` | character-detail | CharacterView  |
| `/encounters`     | encounters       | EncountersView |
| `/encounters/:id` | encounter-detail | EncounterView  |
| `/combats/:id`    | combat-detail    | CombatView     |
| `/modules`        | modules          | ModulesView    |
| `/modules/:id`    | module-detail    | ModuleView     |
| `/jukebox`        | jukebox          | JukeboxView    |
| `/timers`         | timers           | TimersView     |
| `/:catchAll(.*)`  | —                | NotFoundView   |

List routes carry `meta.exact: true`; this is metadata only and is not used by
the router or guards.

`scrollBehavior` returns `false` when a hash or saved position exists (anchor
handling is delegated to `utils/anchorScroll.ts` and `utils/scrollToHeading.ts`),
otherwise scrolls to top.

There is **no `/combats` list route**, although `CombatView` and
`BaseEntityView` use `/combats` as their "list" fallback. See the bug list.

## Error handling

- `app.config.errorHandler` and `warnHandler` log through `debugError` /
  `debugWarn`; they do not surface anything to the user.
- `StorageError` (`utils/storage.ts`) wraps schema write failures.
- Individual stores expose an `error` ref, but views rarely read it.
- View-level failures generally degrade to empty lists or console logs.

## Build-time composition

`vite.config.js` registers:

1. `@vitejs/plugin-vue` with Quasar asset URL transforms.
2. `@quasar/vite-plugin` with auto-imported PascalCase components and
   `quasar-variables.sass`.
3. `VitePWA` with `registerType: 'autoUpdate'`, manifest metadata, runtime
   caching of images and remote JS/CSS, and `devOptions.enabled = true`.

Alias `@` → `/src`. Workers are emitted as ES modules.

## Architectural strengths

- Clear domain folders; one store per entity; one card/editor per domain.
- Store API is consistent (`load`, `create`, `update`, `remove`, `getById`,
  `sortedItems`, `current`).
- Write-time JSON Schema validation prevents malformed records.
- All persistence is local and offline-first.

## Architectural weaknesses (summary)

- No referential integrity between stores; deletes leave dangling IDs.
- The shell slot-injection protocol is now typed (`useLayout`) but still
  global; multiple views publishing at once follow last-writer/owner rules.
- Shared components grew two composition systems (`BaseListView`/
  `BaseEntityView` vs. direct Quasar layouts), so behavior differs per domain.
- Tests and docs drifted from the implementation.
- Some features are intentionally work in progress (dice engine / 3D dice);
  others are implemented but unwired by accident (PWA install, list search).

See [integration/cross-part-behavior.md](../integration/cross-part-behavior.md)
for concrete flows and [proposals/technical-proposals.md](../proposals/technical-proposals.md)
for remediation.
