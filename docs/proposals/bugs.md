# Current Known Defects

**Status: no known application defects (reviewed 2026-11-09).**

All defects that were previously tracked in this file have been fixed and
verified. Their history, severity, and remediation notes are preserved in
[fixes-applied.md](fixes-applied.md) instead of being kept here as open items.
The current suite reports **207 files / 1615 tests passing**.

## What was fixed

The fixed set covered:

- PWA install/update flow and duplicate manifest/worker assets
- combat turn/round/postpone persistence
- module import ID remapping, schema validation, and mention indexing
  (historical; the Modules entity was removed later)
- backup/restore coverage for timers, jukebox, files, and mentions
- Markdown/HTML sanitization
- entity sidebar props and layout slot forwarding; shared `EntityInfoDialog`
- module book rebuilds, bookmarks, TOC anchors, and module export
  (historical; removed with the Modules entity)
- search/filter wiring and note tag/type controls (the module control was
  removed later with the Modules entity)
- jukebox colors, artwork cache, queue refresh, permissions, and duplicate files
- timer polling lifecycle
- modal/input/select contracts
- migration execution and idempotency
- hidden/visible note conversion (historical; the hidden flag was removed with
  the Modules entity)
- import timestamp preservation (historical; module import was removed)
- typed layout/right-drawer ownership

## Regression guards

The current suite protects the fixed behavior:

- `tests/regressions/bugs.test.ts` — persistence, routing, sanitization,
  import remapping, combat turns
- `tests/regressions/ui-contracts.test.ts` — PWA, sidebar props, slots, inputs,
  modal contracts
- `tests/stores/` — current store CRUD, filtering, and mention indexing
- `tests/utils/migrations.test.ts` — migration recording/idempotency
- `tests/utils/storage.test.ts` / `tests/utils/storageStores.test.ts` — store
  persistence and backup/restore coverage
- `tests/composables/useLayout.test.ts` — owner-scoped right drawer
- `tests/jukebox/jukebox.test.ts` — queue construction and auto refresh
- `src/utils/dice-roller/**/__tests__` — dice parser/evaluator/plugins
- `tests/components/` and `tests/views/` — current component/view smoke and
  interaction coverage

Run:

```bash
npm test
npm run test:regression
npm run types-check
```

## Reporting a new defect

If a new issue is found, add it here with:

- a short title and severity,
- the affected file/route,
- reproduction steps,
- expected vs. actual behavior,
- a failing test (preferred) or a clear manual reproduction.

Do not re-add fixed items from `fixes-applied.md` as open defects.
