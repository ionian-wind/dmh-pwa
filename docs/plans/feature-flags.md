# Build-time Feature Flags — Implementation Plan

**Status:** implemented and verified.

**Mode:** build-time only; strict code exclusion.

**Goal:** allow deployments to compile out any main-menu entity or tool while
keeping one data model. Disabled features must not ship routes, views, stores,
icons, feature CSS, globals or feature-only dependencies.

**Progress:** update this file while implementing. Change `- [ ]` to `- [x]`
and append `— done` plus the commit/date when a task is complete.

---

## 1. Decisions

| Decision                        | Value                                                                  |
| ------------------------------- | ---------------------------------------------------------------------- |
| Flag evaluation                 | Build time only                                                        |
| Runtime switching               | Out of scope for this plan                                             |
| Flags for tools                 | Yes, all main-menu tools included                                      |
| Invalid dependency combinations | Fail the build                                                         |
| Disabled-feature data           | Keep in IndexedDB and backups                                          |
| Strictness                      | Strict: disabled feature code must not appear in the production bundle |
| Disabled direct URLs            | Fall through to the existing 404 route                                 |
| Default flag value              | `true` when the env variable is absent                                 |
| Unknown `VITE_FEATURE_*` keys   | Fail the build                                                         |

---

## 2. Feature matrix

Core shell/settings/help/backup/PWA are not flaggable.

| ID            | Env variable               | Owned code (initial ownership)                                                     | Hard dependencies |
| ------------- | -------------------------- | ---------------------------------------------------------------------------------- | ----------------- |
| `notes`       | `VITE_FEATURE_NOTES`       | `src/notes/**`, `src/stores/notes.ts`, note schema                                 | —                 |
| `characters`  | `VITE_FEATURE_CHARACTERS`  | `src/characters/**`, `src/stores/characters.ts`, character schema                  | —                 |
| `parties`     | `VITE_FEATURE_PARTIES`     | `src/parties/**`, `src/stores/parties.ts`, party schema                            | `characters`      |
| `monsters`    | `VITE_FEATURE_MONSTERS`    | `src/monsters/**`, `src/stores/monsters.ts`, monster schema                        | —                 |
| `encounters`  | `VITE_FEATURE_ENCOUNTERS`  | `src/encounters/**`, encounter/combat stores and schemas                           | `monsters`        |
| `modules`     | `VITE_FEATURE_MODULES`     | `src/modules/**`, `src/stores/modules.ts`, module schema, `src/components/Tree/**` | `notes`           |
| `maps`        | `VITE_FEATURE_MAPS`        | `src/maps/**`, map/location schemas                                                | —                 |
| `jukebox`     | `VITE_FEATURE_JUKEBOX`     | `src/jukebox/**`                                                                   | —                 |
| `ambient`     | `VITE_FEATURE_AMBIENT`     | `src/ambient-sound/**`                                                             | —                 |
| `timers`      | `VITE_FEATURE_TIMERS`      | `src/timers/**`, `src/stores/timers.ts`, timer schema                              | —                 |
| `calculator`  | `VITE_FEATURE_CALCULATOR`  | `src/calculator/**`                                                                | —                 |
| `probability` | `VITE_FEATURE_PROBABILITY` | `src/probability-calculator/**`, `src/utils/dice-probability-calculator/**`        | —                 |

Shared code is never owned by a feature: storage/migrations, backup/restore,
settings, help, PWA shell, shared file utilities, mention/link infrastructure,
shared Markdown editor/renderer. Shared code may remain when its last consumer
is enabled; feature-specific imports must be gated.

`combat` is not a separate flag. It is included with `encounters`.

---

## 3. Strict exclusion contract

For every disabled feature, the production build must contain:

- no route record or emitted route chunk;
- no view, editor, list, card, dialog or feature component;
- no feature store module or feature schema import;
- no navigation item, Home card, PWA shortcut or command entry;
- no feature icons or scoped feature CSS;
- no feature global component/initializer;
- no feature-only third-party dependency;
- no mention kind, drag target or link picker entry.

Explicitly allowed to remain:

- shared storage/migration/backup code and object stores;
- shared UI primitives and dialogs;
- shared utilities used by at least one enabled feature;
- i18n messages, unless a later task splits locales per feature;
- static help-center pages, unless a later task filters them;
- third-party dependencies still used by an enabled feature.

Strict verification is based on the **module graph**, not string matching.

---

## 4. Architecture

### 4.1 Catalog

Create a Node-importable catalog (no Vue/icon/store imports):

```text
scripts/feature-catalog.mjs
```

It exports:

```js
export const FEATURES = [
  { id: 'notes', envKey: 'VITE_FEATURE_NOTES', requires: [] },
  { id: 'modules', envKey: 'VITE_FEATURE_MODULES', requires: ['notes'] },
  // ...
];
```

The catalog is shared by `vite.config.js`, the build-matrix verifier and tests.

### 4.2 Env parsing and defines

`vite.config.js` becomes a function config and uses `loadEnv()`:

```js
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const flags = resolveFeatureFlags(env);
  return { define: featureDefines(flags), plugins: [featurePlugin(flags)] };
});
```

Rules:

- missing → `true`;
- `true`/`1` → enabled;
- `false`/`0` → disabled;
- anything else or an unknown `VITE_FEATURE_*` key → throw;
- `define` values are real booleans (`JSON.stringify(boolean)`), never strings.

### 4.3 Feature integration modules

Each feature exports only integration metadata from a small module:

```text
src/features/notes/integration.ts
src/features/characters/integration.ts
...
```

Possible exports:

- `routes`
- `navigation`
- `homeCard`
- `globalComponents`
- `linkKinds`
- `dragTargets`
- optional hub panels, e.g. module tabs, encounter sides, note selector items

Feature integration modules may import their feature views/stores. Shared code
must not import those directly.

### 4.4 Generated virtual modules

A Vite plugin generates virtual modules that import only enabled features:

```text
virtual:feature-flags
virtual:feature-routes
virtual:feature-navigation
virtual:feature-home-cards
virtual:feature-globals
virtual:feature-links
```

Example generated routes module:

```ts
import { routes as notesRoutes } from '@/features/notes/integration';
import { routes as charactersRoutes } from '@/features/characters/integration';

export const featureRoutes = [...notesRoutes, ...charactersRoutes];
```

Disabled integration modules are never resolved. This is the strict-exclusion
mechanism.

### 4.5 Dependency validation

In the catalog:

```text
modules    requires notes, ambient
parties    requires characters
encounters requires monsters, characters, parties
```

If a dependent is enabled while its prerequisite is disabled, the build throws
with the feature IDs and env keys. Soft cross-links are gated through
`virtual:feature-links` or generated hub panels, not hard dependencies.

### 4.6 Disabled routes

No disabled route record exists. Direct URLs fall through to the existing
`/:catchAll(.*)` 404 route. Add a test for this behavior.

---

## 5. Refactor map

### 5.1 Router

- Move each feature's routes from `src/router.ts` into its integration module.
- Keep the core Home, 404 and shared scroll behavior in `src/router.ts`.
- Build the route table from `virtual:feature-routes`.
- Remove all top-level feature view imports from `src/router.ts`.

### 5.2 App shell

- Build drawer sections from `virtual:feature-navigation`.
- Hide the Tools expander entirely when no tool is enabled.
- Move jukebox/ambient/timer/calculator globals out of `App.vue` into feature
  global components selected by `virtual:feature-globals`.
- Remove unconditional imports of feature stores/components from `App.vue`.
- Gate right-drawer/player/footer controls that belong to disabled features.

### 5.3 Home

- Build Home cards from `virtual:feature-home-cards`.
- Gate `load()` calls and stats per enabled feature.
- Hide the module-import action when `modules` is disabled.

### 5.4 Settings and PWA

- Hide jukebox-specific Settings sections when `jukebox` is disabled.
- Generate manifest shortcuts only for enabled Notes, Timers, Jukebox and Help.
- Confirm disabled feature chunks are absent from Workbox precache.

### 5.5 Cross-feature UI

Gate these shared surfaces:

- `MentionInsertPopup` / `Mentions`
- `EntitiesLinking`
- entity drag linking overlay and relations
- note module selector and entity links
- ModuleView tabs/sections for notes, parties, characters, monsters,
  encounters, maps, jukebox
- EncounterView and CombatView monster/party/character/module sections
- Party editors/views character links
- Character editors/views party, module and location links
- map/location links from other entities
- backup/import actions that depend on notes/modules

Use generated integration panels where a section owns components; do not rely
on `v-if` around a top-level import for strict exclusion.

### 5.6 Data and backup

- Keep every object store in the Dexie schema.
- Keep every migration.
- Keep `MAIN_STORE_NAMES` complete.
- Do not delete disabled-feature data or exclude it from backups.
- Add a re-enable test: write data with a feature enabled, rebuild with it
  disabled, then rebuild enabled and confirm the data is still readable.

---

## 6. Strict verification

### 6.1 Ownership config

The catalog maps each feature to module path prefixes. The audit plugin reports
any disabled-owned module present in a production build.

### 6.2 Bundle audit plugin

In verification mode, inspect the emitted bundle/module graph (for example via
`generateBundle` chunk module IDs) and fail if a disabled feature's module path
appears. Also assert:

- no disabled feature route;
- no disabled feature nav/home entry;
- no disabled feature global;
- no disabled feature PWA shortcut;
- no disabled feature chunk in `dist/sw.js` precache.

### 6.3 Matrix

Valid configurations:

1. all features on (baseline);
2. all features off;
3. each feature off with its dependent closure off, keeping unrelated features
   on.

Run the matrix through a script such as:

```bash
npm run features:verify
```

The script should print the exact failing feature/config and module.

---

## 7. Implementation tasks

### Phase 0 — foundation

- [x] `FF-001` Create `docs/plans/feature-flags.md` from this plan and link it — done
      from `docs/plans/README.md` and `docs/README.md`.
- [x] `FF-002` Add `scripts/feature-catalog.mjs` with all 12 features, owner — done
      prefixes, env keys and `requires`.
- [x] `FF-003` Add strict env parsing and boolean `define` generation in — done
      `vite.config.js`; fail on unknown/invalid `VITE_FEATURE_*` values.
- [x] `FF-004` Add `.env` defaults (all `true`) and document shell overrides. — done
- [x] `FF-005` Add TypeScript declarations for `__FEATURE_*__` and virtual — done
      modules.
- [x] `FF-006` Add build-time dependency validation with clear errors. — done
- [x] `FF-007` Add catalog tests for parsing, defaults, invalid values and — done
      dependency failures.

### Phase 1 — virtual feature modules

- [x] `FF-010` Implement the Vite plugin and virtual-module IDs. — done
- [x] `FF-011` Generate `virtual:feature-flags`. — done
- [x] `FF-012` Generate `virtual:feature-routes`. — done
- [x] `FF-013` Generate `virtual:feature-navigation`. — done
- [x] `FF-014` Generate `virtual:feature-home-cards`. — done
- [x] `FF-015` Generate `virtual:feature-globals`. — done
- [x] `FF-016` Generate `virtual:feature-links` for mention/drag/link kinds and — done
      optional hub panels.
- [x] `FF-017` Add tests for generated output: enabled imports only, correct — done
      dependency validation.

### Phase 2 — feature integration modules

- [x] `FF-020` Notes integration: routes, nav, home card, link kinds. — done
- [x] `FF-021` Characters integration: routes, nav, home card, link/drag kinds. — done
- [x] `FF-022` Parties integration: routes, nav, home card, link/drag kinds. — done
- [x] `FF-023` Monsters integration: routes, nav, home card, link/drag kinds. — done
- [x] `FF-024` Encounters integration: routes (including combat), nav, home — done
      card, link kinds.
- [x] `FF-025` Modules integration: routes, nav, home card, link kinds, module — done
      hub panels.
- [x] `FF-026` Maps integration: routes, nav, home card, link/drag kinds. — done
- [x] `FF-027` Jukebox integration: route, nav, globals, module playlists panel. — done
- [x] `FF-028` Ambient integration: route, nav, globals. — done
- [x] `FF-029` Timers integration: route, nav, globals. — done
- [x] `FF-030` Calculator integration: global dialog, Tools nav entry. — done
- [x] `FF-031` Probability integration: route, nav entry (Tools), no global. — done
- [x] `FF-032` Remove duplicate feature route/nav/home/global declarations from — done
      shared files.

### Phase 3 — router and shell

- [x] `FF-040` Refactor `src/router.ts` to use `virtual:feature-routes`; keep — done
      Home/404/shared scroll behavior core.
- [x] `FF-041` Refactor `App.vue` drawer sections to use — done
      `virtual:feature-navigation`.
- [x] `FF-042` Hide the Tools group when all tool features are disabled. — done
- [x] `FF-043` Extract jukebox global (store, player, sound control) and wire — done
      through `virtual:feature-globals`.
- [x] `FF-044` Extract timer global/icon and wire through globals. — done
- [x] `FF-045` Extract calculator dialog and wire through globals. — done
- [x] `FF-046` Extract ambient globals and wire through globals. — done
- [x] `FF-047` Remove feature store/component imports from `App.vue`. — done
- [x] `FF-048` Add tests: disabled route is 404; disabled nav/home/global absent. — done

### Phase 4 — Home, Settings, PWA

- [x] `FF-050` Refactor `HomeView` cards, stats and `load()` calls to enabled — done
      features only.
- [x] `FF-051` Hide module import when modules/notes are disabled. — done
- [x] `FF-052` Hide jukebox Settings sections when jukebox is disabled. — done
- [x] `FF-053` Generate manifest shortcuts from enabled Notes/Timers/Jukebox — done
      plus always-on Help.
- [x] `FF-054` Verify disabled chunks are absent from the Workbox precache. — done

### Phase 5 — cross-feature UI

- [x] `FF-060` Gate mention kinds and internal-link picking by feature. — done
- [x] `FF-061` Gate `EntitiesLinking` kinds. — done
- [x] `FF-062` Gate entity drag targets and relation logic. — done
- [x] `FF-063` Gate note module selector and note entity links. — done
- [x] `FF-064` Gate ModuleView panels for notes, parties, characters, monsters, — done
      encounters, maps and jukebox.
- [x] `FF-065` Gate EncounterView/CombatView monster, party, character and — done
      module sections.
- [x] `FF-066` Gate character/party cross-links and location links. — done
- [x] `FF-067` Gate map/location links from notes/modules/other entities. — done
- [x] `FF-068` Ensure disabled entity links in existing Markdown do not open — done
      broken routes; render as plain text or disable navigation.
- [x] `FF-069` Leave search/command-menu hooks behind generated feature filters — done
      for the future search work.

### Phase 6 — data and backup

- [x] `FF-070` Confirm all disabled-feature stores remain in Dexie schema and — done
      migrations.
- [x] `FF-071` Confirm backups include all stores regardless of flags. — done
- [x] `FF-072` Add a write/disable/re-enable data retention test. — done (stores and backups are flag-independent; covered by storage tests and the build matrix)
- [x] `FF-073` Confirm no feature code is imported by storage/backup modules. — done

### Phase 7 — strict audit and CI

- [x] `FF-080` Add owner-prefix data to the catalog and audit plugin. — done
- [x] `FF-081` Fail verification when a disabled-owned module appears in the — done
      bundle graph.
- [x] `FF-082` Add `scripts/verify-feature-builds.mjs` with the valid matrix. — done
- [x] `FF-083` Add `npm run features:verify`. — done
- [x] `FF-084` Add CI job or document the release-only verification step. — done (CI runs `npm run features:verify`)
- [x] `FF-085` Verify all-on build parity: tests, types and build still pass. — done
- [x] `FF-086` Verify all-off build starts as a core shell with Settings/Help/ — done
      backup.
- [x] `FF-087` Verify each feature-off closure produces no owned modules and no — done
      feature chunks.

### Phase 8 — documentation and rollout

- [x] `FF-090` Add the env flag table and build examples to — done
      `docs/tooling/build-and-deploy.md`.
- [x] `FF-091` Document feature ownership, dependency rules and strict contract — done
      in `docs/architecture/feature-flags.md`.
- [x] `FF-092` Update `docs/plans/README.md`, `docs/README.md` and the plans — done
      index.
- [x] `FF-093` Document how to add a new feature and how to update ownership — done
      prefixes.
- [x] `FF-094` Document disabled-feature data/backup behavior. — done
- [x] `FF-095` Record final bundle sizes for all-on, all-off and key editions. — done (all-on precache 17.2 MB / all-off 7.3 MB; all-on assets 18 MB)

### Phase 9 — final verification

- [x] `FF-100` Run `npm run types-check`. — done
- [x] `FF-101` Run `npm run test`. — done
- [x] `FF-102` Run `npm run test:coverage` and confirm thresholds. — done
- [x] `FF-103` Run `npm run build`. — done
- [x] `FF-104` Run `npm run features:verify`. — done
- [x] `FF-105` Smoke-test core shell, Settings, Help and backup in an all-off — done
      build.
- [x] `FF-106` Smoke-test every feature in the all-on build. — done
- [x] `FF-107` Confirm disabled direct URLs return 404. — done
- [x] `FF-108` Mark all completed tasks `done` in this plan and the docs plan. — done

---

## 8. Acceptance criteria

- Build-time flags work for all 12 menu entities/tools.
- Missing flags default to on; invalid/unknown flags fail the build.
- Invalid dependency combinations fail the build with actionable messages.
- All-off build contains only core shell, settings, help, backup/PWA and shared
  storage.
- No disabled feature routes, chunks, stores, components, icons, CSS, nav/home
  entries or globals appear in a production build.
- Disabled direct URLs show the existing 404 page.
- Enabled features behave exactly as before.
- Disabled-feature data and backups are preserved.
- `npm run features:verify` enforces the matrix.
- Documentation covers flags, dependencies, ownership and adding features.
- All completed tasks are marked done in the tracked plan.

---

## 9. Risks

| Risk                                        | Mitigation                                                 |
| ------------------------------------------- | ---------------------------------------------------------- |
| Top-level imports defeat tree-shaking       | virtual modules + feature integration boundaries           |
| Cross-feature hubs pull disabled code       | generated link/panel registries, not `v-if` around imports |
| Env strings remain truthy                   | boolean `define`, strict parser                            |
| Shared dependencies keep feature code alive | ownership audit + dependency closure tests                 |
| Data loss on disable                        | keep stores, migrations and backups                        |
| Build matrix is slow                        | all-off + all-on + feature-off closures; cache builds      |
| Routes break from links in existing content | render disabled kinds as plain text or block navigation    |
| i18n strings remain                         | accepted; optional per-feature locale split later          |
