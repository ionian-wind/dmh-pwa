# Scripts and Content Tooling

## Overview

The repository ships Node scripts plus an npm-exposed migration generator.
They support icon generation, sound-pack packing, and build verification. Most
are standalone and are not part of the app bundle.

`package.json` scripts:

```json
"migration:generate": "node generate-migration.js",
"pack:sound": "node scripts/pack-sound-pack.js",
"unpack:sound": "node scripts/unpack-sound-pack.js"
```

`generate-icon-list.js` and `svg-to-vue-icons.js` are run directly with `node`.

## `generate-migration.js`

```bash
npm run migration:generate add_my_field
```

- Validates the name (`^[a-z0-9_]+$`).
- Reads `src/migrations`, sorts filenames, and computes the next version from
  the last numeric prefix.
- Writes `src/migrations/<padded version>_<name>.ts` with:

```ts
export const <name>Migration: Migration = {
  version: N,
  name: '<name>',
  affectedStores: [],
  go: async () => { /* TODO */ },
};
```

- Prints follow-up instructions (implement logic, add to index, test).

Caveats:

- The template's follow-up text says "implement in the `up()` method", but the
  interface uses `go()`.
- Filenames with the same numeric prefix sort lexically; the next version
  calculation only reads the last file, so gaps/duplicates are not detected.
- It does not edit `src/migrations/index.ts`.

## `scripts/generate-icon-list.js`

Generates a list of icon names (for a picker). Likely reads icon packages and
writes a JS/TS list. It is not referenced by the app build.

## `scripts/svg-to-vue-icons.js`

Converts SVG files into Vue icon components, presumably for the custom icon
set. Not wired into the build.

## `scripts/pack-sound-pack.js` / `unpack-sound-pack.js`

Used by `npm run pack:sound` / `unpack:sound` for the implemented ambient-sound
feature. Both scripts are thin CLI wrappers around
`scripts/sound-pack-archive.js`, which provides reusable recursive packing,
archive writing and safe unpacking helpers. Covered by
`tests/scripts/soundPackArchive.test.ts`. `public/assets/dice-box` is unrelated
(3D dice assets).

Build a specific package directory:

```bash
npm run pack:sound -- content/sample-ambient-pack
```

This writes `content/sample-ambient-pack.spk`. With no arguments the script packs
every directory under `sound-packs/` into `dist/sound-packs/`. Package creation and
editing are intentionally script-only; there is no in-app package editor.

At pack time the script assigns SHA-256 content IDs: each ambience, one-shot and
scene is hashed from its metadata (with all `id` keys excluded) and its files,
each audio file is named by its content hash, and the package ID is the hash of
the combined entity hashes. References are rewritten before the archive is
written. Ambiences, one-shots and scenes are optional, but at least one entry is
required; completely empty packages are rejected. Every ambience must provide
at least one sample for every variation used anywhere in the package, so the
global variation filter never hides a playable ambience.

## `content/`

Git-ignored local content area. The ambient-sound sample pack is generated here
with `sample-ambient-pack/` plus `sample-ambient-pack.spk`; see its
`ATTRIBUTION.md` and `README.md`. Nothing in this directory is versioned.

## `docs/`

Contains this documentation plus the pre-existing
`ambient-sound-configurator.md` specification. Root-level Markdown files
(`dice_notation.md`, `dice_notation_proposal.md`,
`STORE_STANDARDIZATION_SUMMARY.md`) are design notes; the store summary
describes a `createBaseStore.ts` that does not exist and an `isLoading` field
that the current base store does not expose. Treat it as historical.

## `patches/`

`patch-package` runs on `postinstall`. The only patch fixes a filename casing
bug in `@3d-dice/dice-ui` (`GenesysResults` → `genesysResults`). `RollButton.vue`
(3D dice) is WIP and not mounted yet; the patch is still required when that
feature is connected.

## `public/`

Static assets copied as-is:

- icons (72–512 px) and `icon.svg`,
- `browserconfig.xml`,
- `assets/dice-box/` (themes/ammo for `@3d-dice/dice-box`).

The legacy `manifest.json` and `sw.js` were removed; the PWA plugin is the
single source of the manifest and service worker.

## Recommendations

- Remove or document the unused icon/sound scripts.
- Delete or archive stale root-level design documents.
- Keep the WIP dice feature clearly marked rather than treating its current
  state as a defect.

## Probability calculator

The former `src/utils/probability-calculator-python/` reference port has been
removed. The maintained implementation is
`src/utils/dice-probability-calculator/`; its documentation lives in
[features/dice-probability-calculator/](../features/dice-probability-calculator/README.md).
