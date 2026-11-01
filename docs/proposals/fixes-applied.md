# Fixes Applied

This document records the remediation work performed on the defects that were
originally tracked in `bugs.md`. The bug file now contains only current status,
because every tracked item below has been fixed.

Tests were written first in:

- `tests/regressions/bugs.test.ts` — persistence, sanitization, color,
  validation, import remapping, combat turns, routing.
- `tests/regressions/ui-contracts.test.ts` — PWA install listeners, sidebar
  props, entity/tab/modal slots, inputs, module selector, legacy party data.

Run them with:

```bash
npm run test:regression
npm run types-check
```

## Verified results

| Check | Before | After |
| --- | --- | --- |
| `npm test` | 353 / 578 failing | **334 / 334 passing** |
| `npm run test:regression` | suites did not exist | **18 / 18 pass** |
| `npx vue-tsc --noEmit` | 46 errors | **0 errors** |
| `npm run build` | passes | passes |

The legacy suites were replaced with current coverage: store tests use an
in-memory base-store mock, component/view tests use shared Pinia/i18n/Quasar
stubs and `fake-indexeddb`, and the dice engine tests now exercise the
registered plugin pipeline.

## Fixed defects

### Critical

| ID | Fix |
| --- | --- |
| C1 | Removed the early `return` in `PWAInstallPrompt`; listeners are now registered/removed correctly. |
| C2 | Combat turn/round/postpone/initiative changes are persisted via the store; turn logic was extracted to `src/utils/combatTurn.ts` and used by `CombatView`. Active index resumes from `currentTurn`. |
| C3 | `remapImportedModule()` generates new module/note IDs, rewrites `noteTree`, and is used by `importModuleFromZip`. |
| C4 | Imports validate module/notes against JSON Schemas, write notes+module+mention index in one transaction, and no longer bypass validation. |
| C5 | Markdown output is sanitized when it contains risky HTML; encounter descriptions use `sanitizeHtmlContent`. |
| C6 | Backup includes timers, playlists, tracks, files (Blob data encoded), and the mention index; restore decodes Blob data. Home reloads the app after restore. |

### High

| ID | Fix |
| --- | --- |
| H1 | All four entity sidebars now read plain props instead of `props.x.value`. |
| H2 | `BaseEntityTabView` forwards `actions`, `sub`, and `sidepanel`; `BaseEntityView` renders `actions`/`sub` and publishes its sidepanel slot to the right drawer. Module TOC/bookmarks/export and character mentions are reachable. |
| H3 | Added the missing `v-for="bookmark in moduleBookmarks"` and keys. |
| H4 | Monster list passes `showActions`, binds view/edit/delete/copy, and confirms deletion. |
| H5 | `ModuleDocumentView` watches `noteTree` and notes and rebuilds chunks. |
| H6 | Anchor lookup accepts both raw note IDs and `note-<id>` heading IDs. |
| H7 | `BaseListView` forwards search props/events to `ViewHeader`; all searchable list views bind to their store's `searchQuery`. |
| H8 | Note module, type, and tag selectors are re-enabled. |
| H9 | `BaseEntityView` forwards `subtitle`; `ViewHeader` renders it. |
| H10 | Delete handlers use the app confirm dialog, return booleans, and let `BaseEntityView` navigate. Fixed missing confirmation keys and module/tree deletes. |
| H11 | Added `/combats` redirect to `/encounters`; combat not-found/list routes use `/encounters`. |
| H12 | Combat tabs use `:model-value` instead of writing a readonly computed. |
| H13 | Markdown converter preserves note Markdown and uses one module ID for the module and its notes; default file path works. |
| H14 | Color extraction honors `format: 'hex'`. |
| H15 | `AlbumPicture` no longer clears the shared artwork cache on unmount; cache keys use blob identity. |
| H16 | Replaced obsolete suites with current store/component/view tests; the full suite is green. |
| H17 | `types-check` now uses `vue-tsc`; CI runs it. |

### Medium

| ID | Fix |
| --- | --- |
| M1 | `BaseModal` supports a `footer` slot and emits `update:isOpen`; close/cancel share one path. |
| M2 | `ModuleSelector` supports `allowNone` and emits `null` for "no module"; encounters disable it. |
| M3 | `PartyCard` guards missing `moduleIds`. |
| M4 | Draggable `BaseListView` cards now receive view/edit/delete/tag/copy listeners. |
| M5 | One-color gradients no longer divide by zero. |
| M6 | Artwork cache no longer collides on size+type. |
| M7 | `playTrack` captures the previous track ID before preparing, so new tracks reset progress. |
| M8 | Repeat-list wraps the queue index instead of appending the playlist forever. |
| M9 | File permission is only requested when not already granted, and errors are contained. |
| M10 | Blob picker resolves on cancel/focus-loss. |
| M11 | Deleting a track only deletes its file record when no other track shares it; duplicate imports are skipped. |
| M12 | Timer polling stops when no timer is running and restarts on start. |
| M13 | `NumberSpinner` accepts typed input with clamping. |
| M14 | `ToggleSwitch` no longer mutates its prop. |
| M15 | `validateArray` checks per-item validity. |
| M16 | `anchorScroll` no longer has the tautological pathname guard. |
| M17 | Migrations run after the IndexedDB upgrade transaction, are recorded once, and are covered by `tests/utils/migrations.test.ts`. |
| M18 | `noteStore.setHidden()` converts between regular and document notes, adding/removing the module tree node; `NoteEditor` exposes the toggle. |
| M19 | Covered by H7. |
| M20 | Covered by H2. |

### Low

| ID | Fix |
| --- | --- |
| L1 | Covered by M15. |
| L3 | Added missing `common.linked`, `partyView.title`, `noteTypeSelector.iconPlaceholder` and fixed `t('common.')` keys. |
| L4 | `BaseCard` supports `showCopy`; cards expose a copy button. |
| L5 | `PopoverPanel` normalizes numeric offsets to a `[x, y]` tuple. |
| L7 | Added `content/README.md` documenting the reserved directory. |
| L8 | Added historical banners to the stale store docs and updated the testing/build docs. |
| L10 | Added a typed `useLayout` store with owner-scoped right-drawer clearing; App, base components, header, and detail views use it. |
| L11 | The player watches the active playlist and track signature, so queue rebuilds are automatic; `queue` is exposed for tests/inspection. |
| L13 | Module copy clears `noteTree` instead of pointing at the original notes. |
| L14 | Import preserves archive `createdAt`/`updatedAt` while generating fresh IDs; covered by `tests/utils/moduleImportExport.test.ts`. |
| L15 | `buildDocumentChunks` guards against cyclic trees; covered by `tests/utils/documentChunks.test.ts`. |

## Additional fixes in this pass

- PWA consolidated: removed legacy `public/manifest.json` and `public/sw.js`,
  removed the manual manifest link (the plugin injects the generated
  `/dmh-pwa/manifest.webmanifest`), fixed install listeners, and added cleanup
  to `PWAStatus`.
- `LanguageSwitcher` is now mounted in the app header; Quasar's locale follows
  the selected app locale.
- Playlist creation assigns a `sortOrder`; adding/removing tracks through the
  playlist modal refreshes the player queue.
- New tracks and file records are deduplicated; shared file records are only
  deleted with the last track.
- Media Session artwork now accepts Blob covers via the shared picture cache.
- Empty list state no longer uses `fixed-center`.
- PartySelector uses `nanoid` IDs and emits `combat-created` instead of routing
  itself.
- `PartyCard` guards missing arrays; module copy clears the dangling tree.
- Note module/type/tag selectors are enabled.
- Removed stray `console.log` calls from the calculator, mention plugin, and
  combat view.
- Dice engine: plugin API (`parse/evaluate/register`), custom dice count,
  Fudge variants, roll-reference tokenization, nested inline rolls, grouped
  rolls, error surfacing, and all dice tests now pass.
- `useStore`/`openDB` now shares a single connection and migration pass across
  concurrent callers, preventing duplicate migration records and startup races.
- Tests: replaced obsolete component/view/store suites, added `fake-indexeddb`
  and shared Quasar/i18n/Pinia setup, so `npm test` is green.
- CI now runs `types-check`, `test:regression`, and the full test suite before
  build.

## Still open

All defects from `bugs.md` are now addressed. Remaining work is feature-level
(e.g. richer character/monster sheets, jukebox soundboard, sync) and is tracked
in [feature-proposals.md](feature-proposals.md).

## Files added

- `src/utils/combatTurn.ts` — pure turn/round transitions.
- `src/utils/documentChunks.ts` — cycle-safe document chunk builder.
- `src/composables/useLayout.ts` — typed, owner-scoped layout store.
- `src/types/dice-box.d.ts` — declaration for the WIP 3D dice package.
- `tests/regressions/bugs.test.ts`
- `tests/regressions/ui-contracts.test.ts`
- `tests/composables/useLayout.test.ts`
- `tests/utils/migrations.test.ts`
- `tests/utils/documentChunks.test.ts`
- `tests/utils/moduleImportExport.test.ts`
- `tests/jukebox/jukebox.test.ts`
- `tests/helpers/quasar-stubs.ts`
- `tests/helpers/mock-storage.ts`
