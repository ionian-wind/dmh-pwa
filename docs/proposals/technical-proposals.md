# Technical Proposals

This document proposes engineering changes, ordered by impact and risk. Each
proposal states the problem, the desired end state, a migration path, and the
main risks. None of these are implemented in the current tree.

---

## 1. Type checking (implemented)

`npm run types-check` now uses `vue-tsc --noEmit -p tsconfig.json`, reports
**0 errors**, and runs in CI.

Remaining follow-up: enable `noUnusedLocals`/`noUnusedParameters` after the
codebase is clean.

---

## 2. Typed layout/chrome composition (implemented)

**Problem (historical).** Page chrome used string-keyed `provide`/`inject` and
wrapper components silently dropped named slots.

**Implemented.**

1. `src/composables/useLayout.ts` exposes a typed `LayoutStore` with
   `topMenuContent`, `rightDrawerContent`, `bottomDrawerContent`, and
   owner-scoped clearing.
2. `App.vue` calls `provideLayout()`; consumers use `useLayout()` /
   `useRightDrawer()`.
3. `BaseEntityView`/`BaseEntityTabView` forward `actions`, `sub`, `sidepanel`,
   and `editor` slots.
4. Tests cover owner-scoped right-drawer clearing in
   `tests/composables/useLayout.test.ts`.

Remaining nice-to-have: a dev-time warning for unknown slots.

---

## 3. Repository / unit-of-work layer with referential integrity

**Problem.** Stores write one record at a time; there are no cascades,
cross-store transactions, or foreign-key checks. Deletes leave dangling IDs
(module → notes, note → tree/bookmarks, character → party, monster → encounter,
encounter → combats, track → file).

**Proposal.**

Option A — **lightweight integrity service**:

- `src/services/integrity.ts` with `deleteModuleCascade`, `deleteNoteCascade`,
  `deleteCharacterCascade`, etc.
- Called by UI delete handlers; each uses existing base stores.
- Add a startup "repair" job that reports dangling IDs (read-only at first).

Option B — **repository layer**:

- Introduce `src/repositories/*` owning a domain aggregate and its stores.
- Expose `load`, `create`, `update`, `delete`, and transaction-aware methods.
- Migrate views away from direct Pinia store mutation.
- Use a single Dexie transaction per aggregate operation.

Recommendation: start with Option A to stop data loss, then evolve into Option
B for modules/notes (the largest aggregate).

**Also:**

- Add optional `onDelete` strategies (`cascade`, `detach`, `block`).
- Add a `deletedAt` soft-delete column for undo.
- Add an integrity report in HomeView ("N orphaned records").

**Risk.** Medium. Cascades can delete more than users expect; always confirm
and provide an undo window.

---

## 4. Import service (implemented)

`importModuleFromZip` now:

- validates module and notes against JSON Schemas,
- generates new IDs and rewrites `noteTree`/`moduleId`,
- writes module, notes, and mention-index records in one transaction,
- preserves archive timestamps (falling back to import time).

Remaining follow-up: versioned archive manifest and merge/replace modes.

**Proposal.**

1. Define a versioned archive manifest:
   ```json
   { "format": "dmh.module", "version": 1, "module": {...}, "tree": [...],
     "notes": [...] }
   ```
2. Validate module and every note against JSON Schemas **before** writing.
3. Generate new IDs for the module and all notes; rewrite all references
   (`noteTree.noteId`, `note.moduleId`).
4. Write module + notes + mention index in one `readwrite` transaction over
   `modules`, `notes`, `indexations_mentions`.
5. Return a summary and refresh the relevant Pinia stores.
6. Offer `Merge` (new IDs) vs `Replace` (preserve IDs, explicit confirmation).
7. Fix the script: pass the same module ID to `createModuleJson`, preserve raw
   Markdown content, and support the documented default file path.
8. Add round-trip tests: export → import → compare IDs/shape/content.

**Risk.** Medium. Define behavior for duplicate note titles and existing
bookmarks.

---

## 5. Sanitize Markdown and HTML (implemented)

`parseMarkdown` sanitizes risky HTML through a browser-safe DOMParser allow-list
(fast path when no dangerous tags/attributes are present), and `EncounterView`
sanitizes its description. Tests cover `<script>`/`onerror` stripping.

Remaining: consider disabling raw HTML entirely for untrusted imports.

**Proposal.**

1. Sanitize the HTML output of `parseMarkdown` with a browser-safe allow-list
   sanitizer (implemented with DOMParser).
   - Allow standard Markdown tags plus the attributes the app adds
     (`data-kind`, `data-id`, `class`, `id`, `target`, `rel`).
   - Disallow `<script>`, `<iframe>`, `<object>`, event handler attributes,
     `javascript:` URLs.
2. Sanitize `encounter.description` before `v-html`, or render it with
   `Markdown` instead.
3. Add tests with `<img onerror>`, `<script>`, and `javascript:` links.
4. Consider disabling raw HTML entirely (`html: false`) unless a trusted import
   flag is set.

**Risk.** Low. Sanitization may strip intentional HTML in legacy notes; provide
a preview warning.

---

## 6. Backup/restore (mostly implemented)

`MAIN_STORE_NAMES` covers every store, file bytes are written as binary ZIP
entries, restore reloads the page, and the backup includes a versioned
manifest. Remaining: transactional restore and richer per-file reconnect
selection. See [generic-file-handling.md](generic-file-handling.md) for the
implemented OPFS, streaming, hashing and backup design.

**Proposal.**

1. Add `manifest.json` to the backup ZIP:
   `{ format: 'dmh.backup', version: 2, createdAt, appVersion, stores: [...] }`.
2. Include every object store, including `timers`, `jukebox_*`, and
   `indexations_mentions`.
3. For jukebox:
   - export Blob and OPFS files as binary entries (`files/<id>`),
   - optionally copy readable handle files into the archive,
   - keep unavailable handle metadata and provide a Settings reconnect flow.
4. Restore inside a single transaction (or a staging DB then swap).
5. Validate every record; collect errors and continue in a "best effort" mode
   with a report.
6. Reload **all** stores and reinitialize the player/timer stores.
7. Add automatic rolling backups (e.g., once per day to a separate IDB store
   or File System Access).

**Risk.** Medium. Binary archives can be large; add progress reporting.

---

## 7. Consolidate the PWA layer

**Problem.** The legacy `public/sw.js` and `public/manifest.json` conflicted
with the generated Workbox assets. The install prompt was also disabled.

**Proposal.**

1. Delete `public/sw.js` and `public/manifest.json` (done); rely solely on
   `vite-plugin-pwa`.
2. Remove the manual manifest link from `index.html` (done; the plugin injects
   it).
3. Fix `PWAInstallPrompt` (done).
4. Make update handling explicit: `registerType: 'prompt'` + a custom
   `onNeedRefresh` callback, or keep `autoUpdate` without the manual banner.
5. Add a Workbox `navigateFallback` for SPA routes and verify offline
   navigation.
6. Add a Lighthouse/PWA audit to CI (optional).

**Risk.** Medium: service worker changes require users to reload twice.

---

## 8. Route-level code splitting and bundle reduction

**Problem.** All views are statically imported; Milkdown, Quasar, Howler,
JSZip, music-metadata, mathjs, and Chevrotain are in the main graph. The WIP
dice UI and engine are not mounted yet, so their weight is not currently part
of the rendered experience but should be accounted for before release.

**Proposal.**

1. Convert router imports to `() => import(...)` for heavy routes:
   jukebox, modules, combat, calculator, timers.
2. Lazy-load editors (`NoteEditor`, `MilkdownEditor`) behind the modal open
   state.
3. Import only needed mathjs functions (`evaluate`, `unit`) instead of
   `create(all)`.
4. Remove or relocate unused dependencies (`rpg-awesome`,
   `text-cursor-helper`, `@vueuse/core`, `sharp` if script-only). Keep
   `@3d-dice/*` while the WIP dice UI is still planned; remove it only if that
   feature is retired.
5. Add `rollup-plugin-visualizer` and a bundle budget in CI.
6. Verify the worker is code-split and not blocked by the main chunk.

**Risk.** Low. Watch for dynamic-import + PWA precache interactions
(`globPatterns` already includes JS).

---

## 9. Replace hand-rolled stores' duplication with a typed factory

**Problem.** Nine domain stores repeat the same `searchQuery`/`filtered`/
`setFilter` boilerplate; several methods are unused. The base store has no
`isLoading` although docs claim it does.

**Proposal.**

1. Create a typed `createEntityStore<T>` helper that composes the base store
   and optional search fields:
   ```ts
   createEntityStore({
     storeName, schema, search: (item, query) => ...,
     onAfterCreate, onAfterUpdate, onAfterDelete,
   })
   ```
2. Move mention indexing into `onAfter*` hooks for notes.
3. Add optional `isLoading` and `lastLoadedAt`.
4. Delete unused `setFilter`/`clearFilter` aliases or wire the search UI.
5. Write one store test per behavior against `fake-indexeddb`, not per store.

**Risk.** Medium: refactor touches every store. Do it incrementally with the
existing API as a façade.

---

## 10. Dice engine (WIP; plugin API and tests complete)

`dicePlugin` now exposes `parse`/`evaluate`/`register`, roll references and
nested inline rolls work, and the dice suite passes. Remaining: a UI entry point
that registers all plugins once, deterministic RNG, operator-order fixes, and
`d%` support.

**Proposal.**

1. Introduce `src/utils/rng.ts`:
   ```ts
   interface Rng {
     next(): number;
     int(maxExclusive: number): number;
   }
   function mulberry32(seed: number): Rng;
   function systemRng(): Rng;
   ```
2. Pass an RNG through `EvaluationContext` and `rollDice`/`explodeDice`.
3. Fix `ast.ts` to preserve operator order by walking token positions, not
   concatenated operator groups.
4. Fix `rollCustomDice` to roll `count` dice, not `count × sides`.
5. Implement Fudge variants correctly.
6. Create `src/utils/dice-roller/index.ts` that registers all plugins once.
7. Wire `RollButton`/combat to the engine; surface warnings.
8. Add golden tests for mixed arithmetic and modifiers.

**Risk.** Medium. Dice semantics need a product decision (e.g., `d%`).

---

## 11. Audio library architecture

**Problem.** Blob vs handle sources, no quota management, no reconnect flow,
duplicate tracks, shared-file deletion, permission requests at startup, color
bug, and per-component cache clearing.

**Proposal.**

1. Extract a `JukeboxLibraryService` that owns file import, dedupe (hash by
   name+size+lastModified+content hash), metadata extraction, and reference
   counts.
2. Store a content hash; reuse the same file record for identical content.
3. Reference-count file records; delete only when no track references them.
4. Add a "Reconnect files" screen for handle permissions.
5. Request permissions only on user action (`play`, `relink`).
6. Use `navigator.storage.estimate()` and warn before large imports.
7. Replace the per-file worker with a small worker pool (2–4 workers).
8. Fix color format; store hex strings and a validated palette.
9. Replace the shared URL cache with a reference-counted cache keyed by a
   stable blob ID.
10. Add tests for queue transitions, repeat/shuffle, and removal.

**Risk.** High: touches persistence and playback. Ship behind a feature flag.

---

## 12. State loading and shared-state policy

**Problem.** Every view calls `load()` on mount; `load()` replaces the entire
array and can race with another view or tab. `pinia-shared-state` can overwrite
in-flight edits.

**Proposal.**

1. Add `loadedAt`/`isLoading` and a `load({ force })` policy with a TTL.
2. Bootstrap all stores once after database initialization, then use targeted
   refreshes.
3. For `pinia-shared-state`, exclude volatile UI state (search, current
   selection) and add a merge strategy for records (per-ID update instead of
   whole-array replacement).
4. Consider `BroadcastChannel` messages for domain events
   (`note:updated`, `combat:changed`) instead of sharing whole stores.

**Risk.** Medium. Multi-tab behavior needs explicit tests.

---

## 13. Modal contract (implemented)

`BaseModal` now supports a `footer` slot, emits `update:isOpen`, and shares a
single close path. Remaining: dirty tracking and schema-backed form validation.

**Proposal.**

1. Standardize `BaseModal`:
   - slots: `default`, `header-actions`, `footer`;
   - emits: `submit`, `cancel`, `update:isOpen`;
   - optional `busy`, `error`, `maxWidth`.
2. Create `useEntityForm` composable for draft state, dirty tracking, reset, and
   submit guards.
3. Validate with the same JSON Schema used for persistence (or a shared
   validator) so the UI and DB agree.
4. Return deep-cloned emitted data, not live refs.
5. Replace `persistent` with a configurable `dismissible` prop.

**Risk.** Low–medium. Mechanical updates across ~10 editors.

---

## 14. i18n and strings (mostly implemented)

Missing keys were added, `t('common.')` typos fixed, `LanguageSwitcher` is
mounted, and Quasar follows the app locale. Remaining: translate English-only
combat/document literals and add a key-parity CI check.

**Proposal.**

1. Add a CI script that:
   - compares key sets between `en.json` and `ru.json`,
   - extracts static `t('...')` keys from `.vue`/`.ts` and reports missing
     ones,
   - reports unused keys.
2. Fix missing keys (`partyView.title`, `noteTypeSelector.iconPlaceholder`,
   `common.linked`, the `common.` typos).
3. Mount `LanguageSwitcher` in the header or a settings menu.
4. Configure Quasar language dynamically:
   `Quasar.lang.set(quasarLang[locale])`.
5. Move combat/document literals into locale files.

**Risk.** Low.

---

## 15. Testing strategy (implemented)

The suite now runs **536 / 536 passing across 72 files** with shared
Pinia/i18n/Quasar setup and `fake-indexeddb`; CI runs type check, the regression
suite, and the full suite. Remaining: broaden coverage for jukebox playback,
file handlers, and Milkdown.

**Proposal.**

1. Add a `mountWithApp` helper installing Pinia, Vue I18n, Quasar, and a
   memory router.
2. Use `fake-indexeddb` + a per-test database reset; stop mocking stores.
3. Delete obsolete suites (old storage API, old character schema).
4. Split `tests/` (app) from `src/utils/dice-roller/__tests__` (library).
5. Add contract tests for the flows listed in
   [integration/cross-part-behavior.md](../integration/cross-part-behavior.md):
   note create/edit/index, module export/import round trip, combat persistence,
   backup/restore.
6. Re-enable `npm test` in CI once green; keep a `test:smoke` suite as a gate
   in the meantime.

**Risk.** Medium effort, high payoff.

---

## 16. Code hygiene and repository structure (partially done)

Stale store docs carry historical banners; `content/README.md` documents the
empty directory. Remaining: remove/verify unused dependencies, delete or
archive remaining exploratory components, and add `knip`/`depcheck`.

**Proposal.**

1. Remove or explicitly mark experimental code that is not on a roadmap.
2. Keep WIP areas (dice engine, 3D dice UI) clearly isolated and documented
   rather than deleting them.
3. Update `README.md` and delete/archive stale summaries.
4. Add `knip`/`depcheck` to find unused exports/dependencies.
5. Add a `docs/` link from the root README.
6. Normalize formatting/lint globs (`tools`/`migrations` paths are wrong).

**Risk.** Low.

---

## Suggested execution order

| Phase | Work                                                          | Outcome                                                    |
| ----- | ------------------------------------------------------------- | ---------------------------------------------------------- |
| 0     | Fix C1/C2/C5, real `vue-tsc`, tests smoke                     | App stops losing data and can gate changes                 |
| 1     | Layout contract (H1/H2/H3), delete/navigation consistency     | Major UI features actually work                            |
| 2     | Import service + backup completeness                          | Safe data portability                                      |
| 3     | Store factory + search UI + modal contract                    | Remove duplication and dead UI                             |
| 4     | Jukebox service + dice-engine completion (separate WIP track) | Stabilize jukebox; finish dice feature on its own schedule |
| 5     | Splitting, i18n, hygiene                                      | Performance and maintainability                            |

Each phase should ship with tests from
[integration/cross-part-behavior.md](../integration/cross-part-behavior.md).
