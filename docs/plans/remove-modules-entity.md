# Remove the Modules entity

**Status:** completed (historical record; re-verified against the current tree
on 2026-11-09).

The Modules entity was removed completely so the concept can be rethought. This
removes module code, module links on other entities, module data, schemas,
migrations, import/export and backup support.

## Scope

- [x] Remove the Modules feature and standalone module code
- [x] Remove module links from notes, characters, parties, pawns and encounters
- [x] Remove module links from playlists, maps, locations and ambient sound scenes
- [x] Remove module link kinds from drag-and-drop, mentions and entity creation
- [x] Remove module storage, schemas, migrations and backup support
- [x] Purge stored module data and `moduleIds` fields on upgrade
- [x] Remove module strings from both locales and update module docs
- [x] Update tests, run type checks, full suite and production build

## Notes

- Module document notes used `hidden`; the flag is removed and migration 13
  strips it from existing notes.
- Existing databases get migration 12 (`remove_module_data`) that strips
  `moduleIds`, removes `kind: 'module'` map/mention references, deletes
  module-owned bookmarks and purges module scene links from local storage. The
  `modules` store is dropped by the Dexie schema version bump to 13.
- Backups no longer include `modules`, and restoring an older backup ignores
  its `modules` payload.
- Notes no longer carry the module-only `hidden` flag; migration 13 strips it
  from existing records.

## Verification

- `npm run types-check` passes.
- Full suite at re-verification: 207 files / 1615 tests pass.
- `npm run build` passes; no module routes, stores or document code remain in
  `dist`.
- `npm run features:verify`: all 14 build configurations pass.
