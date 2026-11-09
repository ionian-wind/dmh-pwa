# Architecture Overview

## Purpose

This document describes how the application starts, how it is layered, what the
shell layout does, and where each kind of responsibility lives. It is the entry
point for the rest of the part documentation.

## Technology stack

- **Vue 3** with `<script setup>` single-file components and TypeScript.
- **Quasar 2** as the component/layout system (`QLayout`, `QDrawer`, `QPage`,
  `QDialog`, `QInput`, `QSelect`, tables, tabs, notifications). Global Quasar
  plugins registered are `Notify`, `Dialog`, and `Dark`.
- **Pinia 4** setup stores; `pinia-shared-state` synchronizes serializable state
  between browser tabs. Runtime audio, playback and artwork-cache stores
  (`ambient-sound`, `jukeboxPlayer`, `pictureUrlCache`) opt out because they
  hold non-serializable `Map`/`Set`, `Blob` and object-URL state.
- **IndexedDB** via Dexie as the single source of truth.
- **markdown-it** for cards and exports, **Milkdown/Crepe** for editing and
  detail-view rendering.
- **Howler** for the jukebox and ambient audio; **music-metadata** in a worker
  for tags/artwork.
- **OpenLayers** (`vue3-openlayers`, `ol-ext`, `terra-draw`) for map display and
  editing.
- **Vite** for dev/build; **vite-plugin-pwa** for offline support. Feature
  routes, navigation, home cards, globals, links and entity panels are generated
  by the build-time feature plugin.

## Boot sequence

`index.html` mounts into `#q-app` and loads `src/main.ts`.

```
initializeDatabase()  ── opens IndexedDB, runs pending migrations (not awaited)
      │
createApp(App)
      │
pinia (+ PiniaSharedState, initialize: true)
router
useConfigStore() ── reads localStorage-backed preferences
i18n ── locale starts as 'ru', fallback 'en'
setupAnchorScrollHandler()
VueDnDKit plugin
Quasar plugin (Notify, Dialog, Dark; ru locale + FontAwesome icon set)
watch(uiTheme) ── Dark.set() + document color-scheme
watch(savedLanguage) ── i18n + Quasar.lang.set(ru | en-US)
Vue3OpenLayers plugin
global errorHandler / warnHandler (log through utils/debug)
app.mount('#q-app')
window error / unhandledrejection listeners
```

Two details matter:

- `initializeDatabase()` is started **before mount but not awaited**. Store
  `load()` calls call `openDB()` themselves, so it is usually harmless; it just
  warms the connection. Failures are logged through `debugError`.
- The i18n locale is initialized to `'ru'` in `src/i18n/index.ts`; the immediate
  `savedLanguage` watcher replaces it with the stored value. The config default
  is `'ru'` when `navigator.language` starts with `ru`, otherwise `'en'`.
  Quasar's locale is switched between `quasar/lang/ru` and
  `quasar/lang/en-US` by the same watcher.

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
│ Feature integrations (src/features/<id>/integration.ts)      │
│  routes, navigation, home cards, link kinds, globals         │
├──────────────────────────────────────────────────────────────┤
│ Feature components (cards, editors, sidebars, selectors)     │
├──────────────────────────────────────────────────────────────┤
│ Shared component library (src/components/common, UI)         │
├──────────────────────────────────────────────────────────────┤
│ Domain stores (src/stores/*, maps, jukebox, ambient)         │
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
- `composables/useFeatureStores.ts` — dynamic access to stores for enabled link
  kinds.
- `dialogs/` — promise wrappers around Quasar `Dialog` (`confirm`, `alert`,
  `prompt`).

## Shell layout (`src/App.vue`)

`QLayout view="hHh LpR lFr"` defines five regions:

| Region          | Implementation                   | Content source                                 |
| --------------- | -------------------------------- | ---------------------------------------------- |
| Header          | `QHeader` + `QToolbar`           | `layout.topMenuContent` + active combat button |
| Left navigation | `QDrawer`, hover-mini            | `virtual:feature-navigation`                   |
| Right drawer    | `QDrawer`, persistent            | `layout.rightDrawerContent`                    |
| Page            | `QPageContainer` + `router-view` | Route components                               |
| Footer          | `QFooter`                        | `layout.bottomDrawerContent`                   |

The header also mounts `ActiveCombatButton` only when the encounters feature is
compiled in.

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

`BaseListView` publishes a `ViewHeader` with create/edit/delete/search/buttons.
`BaseEntityView` publishes only header actions; the entity title and subtitle
render at the top of the page content. `BaseEntityTabView` wraps it with
`QTabPanels` and switches the page header tabs between view and edit modes.
`JukeboxView` publishes `PlaylistList` to the right drawer and `JukeboxPlayer` to
the footer. `NoteView`, `PartyView`, `PawnView`, `CharacterView`,
`EncounterView`, and `CombatView` publish their domain sidebar to the right
drawer and clear it on unmount. `AmbientSoundView` publishes its sound-pack
sidebar and footer player; `ProbabilityCalculatorView` publishes its syntax
sidebar. `BaseEntityView` still exposes a `sidepanel` slot, but the current
detail views use `useRightDrawer()` directly.

### Left navigation

Navigation is generated from `virtual:feature-navigation`, not from a
hard-coded array. Each feature integration contributes entries with a
`placement` (`primary`, `footer`; the `gameSessions`, `scribe`, and `tools`
placements remain available for future collapsible groups) and an optional
`order`.

- **Primary**: Characters, a divider, Notes/Pawns/Encounters/Maps, another
  divider, then Timers/Calculator/Probability calculator.
- **Footer**: Jukebox, Help, then the always-present Settings item.
  Settings opens `SettingsDialog` (language, theme, backup and storage options).

The collapsible group support and `navigationGroupsExpanded` config remain in
place for future use, but no feature currently uses a group placement.
Jukebox opens `/jukebox` or the sound-control sheet depending on
`configStore.jukeboxUseMiniPlayer`.

Active state for route entries uses `activePathPrefixes` when provided,
otherwise the entry is active when `currentPath.startsWith(item.path)`. Detail
routes therefore highlight their list section. Component entries manage their
own active state: Jukebox highlights `/jukebox` and `/ambient`, Timers highlights
`/timers`, and Help is an external anchor. The timers icon cycles through twelve
clock icons while `timerStore.running` is true. The `Section` enum in
`src/types/index.ts` remains as a legacy domain list and is not used to build
navigation.

### Global overlays

- `PWAInstallPrompt`, `PWAStatus`, and `CommitBadge` are always mounted.
- `SettingsDialog` is always mounted and opened from the footer nav.
- Feature globals (`CalculatorGlobal`, `JukeboxGlobal`) mount the calculator and
  sound-control bottom sheets.
- `FeatureLinking` mounts `MentionModalStack` and the drag-linking overlay when
  at least one linking feature is enabled.

## Routing (`src/router.ts`)

`createWebHistory('/dmh-pwa/')` — the app assumes it is hosted under
`/dmh-pwa`. The table contains only the home route, `...featureRoutes`, and the
catch-all. Feature routes are generated from the enabled integrations:

| Path                      | Name                   | Component                 | Feature     |
| ------------------------- | ---------------------- | ------------------------- | ----------- |
| `/`                       | home                   | HomeView                  | shell       |
| `/notes`                  | notes                  | NotesView                 | notes       |
| `/notes/:id`              | note-detail            | NoteView                  | notes       |
| `/characters`             | characters             | CharactersView            | characters  |
| `/characters/:id`         | character-detail       | CharacterView             | characters  |
| `/parties`                | parties                | PartiesView               | parties     |
| `/parties/:id`            | party-detail           | PartyView                 | parties     |
| `/pawns`                  | pawns                  | PawnsView                 | pawns       |
| `/pawns/:id`              | pawn-detail            | PawnView                  | pawns       |
| `/encounters`             | encounters             | EncountersView            | encounters  |
| `/encounters/:id`         | encounter-detail       | EncounterView             | encounters  |
| `/combats`                | combats                | redirect `/encounters`    | encounters  |
| `/combats/:id`            | combat-detail          | CombatView                | encounters  |
| `/locations`              | locations              | MapsView                  | maps        |
| `/locations/:id`          | location-detail        | LocationView              | maps        |
| `/ambient`                | ambient-sound          | AmbientSoundView          | ambient     |
| `/ambient/:sceneId`       | —                      | redirect `ambient-sound`  | ambient     |
| `/jukebox`                | jukebox                | JukeboxView               | jukebox     |
| `/timers`                 | timers                 | TimersView                | timers      |
| `/probability-calculator` | probability-calculator | ProbabilityCalculatorView | probability |
| `/:catchAll(.*)`          | —                      | NotFoundView              | shell       |

Calculator and Help contribute navigation or globals but no routes. Disabled
features contribute no routes, so their URLs fall through to `NotFoundView`.

List routes carry `meta.exact: true`; this is metadata only and is not used by
the router or guards. There are no global navigation guards; entity edit mode
(`useEntityEditMode`) and the probability page use component-level
`onBeforeRouteLeave` hooks to confirm discarding unsaved changes. `/combats` is
a redirect to `/encounters`, not a combat list page; `CombatView` remains
reachable only at `/combats/:id`.

`scrollBehavior` returns `false` when a hash or saved position exists (anchor
handling is delegated to `utils/anchorScroll.ts` and `utils/scrollToHeading.ts`),
otherwise scrolls to top.

## Error handling

- `app.config.errorHandler` and `warnHandler` log through `debugError` /
  `debugWarn`; they do not surface anything to the user.
- `StorageError` (`utils/storage.ts`) wraps schema write failures.
- Individual stores expose an `error` ref, but views rarely read it.
- View-level failures generally degrade to empty lists or console logs.

## Build-time composition

`vite.config.js` registers:

1. `createFeaturePlugin(flags)` — resolves `virtual:feature-*` modules, validates
   dependencies and optionally audits the bundle.
2. `@vitejs/plugin-vue` with Quasar asset URL transforms.
3. `@quasar/vite-plugin` with auto-imported PascalCase components and
   `quasar-variables.sass`.
4. `VitePWA` with `registerType: 'autoUpdate'`, manifest metadata, conditional
   Notes/Timers/Jukebox/Help shortcuts, runtime caching of images and remote
   JS/CSS, and `devOptions.enabled = true`.

`define` exposes `__FEATURE_*__` booleans. Alias `@` → `/src`. Workers are
emitted as ES modules. `npm run build` cleans `dist`, builds the VitePress help
site into `dist/help`, then runs Vite; `build.emptyOutDir` is disabled for that
reason.

## Architectural strengths

- Clear domain folders; one store per entity; one card/editor per domain.
- Store API is consistent (`load`, `create`, `update`, `remove`, `getById`,
  `sortedItems`, `current`).
- Write-time JSON Schema validation covers most core domain records.
- All persistence is local and offline-first.

## Architectural weaknesses (summary)

- No referential integrity between stores; deletes leave dangling IDs.
- The shell slot-injection protocol is now typed (`useLayout`) but still
  global; multiple views publishing at once follow last-writer/owner rules.
- Shared components grew several composition systems (`BaseListView`,
  `BaseEntityView`/`BaseEntityTabView`, and direct Quasar layouts), so behavior
  differs per domain.
- Some stores bypass schema validation (jukebox, files, map metadata), and
  legacy object stores remain declared for migration compatibility.
- Some features are intentionally work in progress (dice engine / 3D dice UI,
  which is not mounted); the ambient and probability features are newer and less
  covered by the older part docs.

See [integration/cross-part-behavior.md](../integration/cross-part-behavior.md)
for concrete flows and [proposals/technical-proposals.md](../proposals/technical-proposals.md)
for remediation.
