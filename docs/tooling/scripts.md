# Scripts and Content Tooling

## Overview

The repository ships Node scripts plus an npm-exposed migration generator.
They support development, builds, feature verification, icon generation,
sound-pack packing, migration generation and Markdown benchmarks. Most are
standalone and are not part of the app bundle.

Script-related `package.json` entries:

```json
"dev": "node scripts/dev.mjs",
"dev:app": "vite",
"help:dev": "vitepress dev helpcenter --port 5174",
"help:build": "vitepress build helpcenter",
"build": "node scripts/clean-dist.mjs && npm run help:build && vite build",
"preview": "vite preview",
"types-check": "npx vue-tsc --noEmit -p tsconfig.json",
"test": "vitest run --printConsoleTrace=true --silent=false",
"test:regression": "vitest run tests/regressions --printConsoleTrace=true --silent=false",
"test:coverage": "vitest run --printConsoleTrace=true --silent=false --coverage",
"test:ui": "vitest --ui --printConsoleTrace=true --silent=false",
"test:watch": "vitest",
"test:probability-calculator": "vitest run src/utils/dice-probability-calculator",
"test:e2e": "playwright test",
"test:e2e:chromium": "playwright test --project=chromium",
"test:e2e:firefox": "playwright test --project=firefox",
"test:e2e:install": "playwright install chromium firefox",
"migration:generate": "node generate-migration.js",
"pack:sound": "node scripts/pack-sound-pack.js",
"unpack:sound": "node scripts/unpack-sound-pack.js",
"features:verify": "node scripts/verify-feature-builds.mjs",
"perf:markdown": "node scripts/perf-markdown.mjs",
"format": "npm run hook:format",
"lint": "npm run hook:lint \"{src,tools,test,migrations}/**/*.{js,jsx,mjs,cjs,ts,tsx,md,vue}\" --",
"lint:fix": "npm run lint -- --fix",
"hook:format": "npx prettier --ignore-path .gitignore --write \"{src,tools,test,migrations}/**/*.{js,jsx,mjs,cjs,ts,tsx,md,vue}\"",
"hook:lint": "npx eslint --ignore-path .gitignore",
"postinstall": "patch-package",
"prepare": "husky",
"commitlint": "commitlint --edit"
```

`generate-icon-list.js`, `generate-rpg-icon-paths.js` and
`svg-to-vue-icons.js` are run directly with `node`.

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

## `scripts/dev.mjs`

Starts the app Vite server (`npm run dev:app`) and the VitePress help server
(`npm run help:dev`) together. It forwards extra CLI arguments to the app
server, shuts both down if either exits, and is what `npm run dev` runs.

## `scripts/clean-dist.mjs`

Recursively removes `dist/`. Used as the first step of `npm run build` so the
help-center output and app build share a clean output directory.

## `scripts/verify-feature-builds.mjs`

Runs the production build once per feature-off configuration plus all-on and
all-off, with `FEATURE_AUDIT=1`, and checks that disabled feature code is absent
from the bundle and that the PWA manifest shortcut count matches the enabled
features. Exposed as `npm run features:verify`.

## `scripts/perf-markdown.mjs`

Starts Vite on port 4176, loads `benchmark.html`, runs the Markdown rendering
benchmark against `markdown-dataset`, and prints a table plus JSON. Options
include `--count`, `--max-chars` and `--sample=typical|spread`; results are
documented in
[architecture/markdown-rendering-performance.md](../architecture/markdown-rendering-performance.md).

## `scripts/generate-icon-list.js`

Scans `public/assets/icons/*/*.svg` and writes
`public/assets/icons/icons-list.json` with `{ name, publicPath }` entries. That
source directory (and therefore the generated list) is not currently present.
It is a standalone icon-picker data generator and is not part of the app build.

## `scripts/generate-rpg-icon-paths.js`

Reads the `rpg-awesome` CSS and SVG font from `node_modules` and generates
`src/maps/rpgIconPaths.ts` (`RPG_ICON_PATHS`). Map markers use those paths to
render RPG Awesome glyphs as SVG.

## `scripts/svg-to-vue-icons.js`

Converts SVGs under `public/assets/icons/` into Vue components in
`src/components/common/icons/`. It is not wired into the build and that output
directory is not currently present.

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
(`STORE_STANDARDIZATION_SUMMARY.md`) are historical design notes; the store
summary describes a `createBaseStore.ts` that does not exist and an `isLoading`
field that the current base store does not expose. Treat it as historical.
Dice-roller notation and architecture notes are consolidated in
[`features/dice-roller/README.md`](../features/dice-roller/README.md).

## `patches/`

`patch-package` runs on `postinstall`. The only patch fixes a filename casing
bug in `@3d-dice/dice-ui` (`GenesysResults` → `genesysResults`). `RollButton.vue`
(3D dice) is WIP and not mounted yet; the patch is still required when that
feature is connected.

## `public/`

Static assets copied as-is:

- icons (72–512 px) and `icon.svg`,
- `screenshots/app-desktop.png` and `screenshots/app-mobile.png` (PWA manifest
  screenshots),
- `browserconfig.xml`,
- `assets/dice-box/` (themes/ammo for `@3d-dice/dice-box`).

The legacy `manifest.json` and `sw.js` were removed; the PWA plugin is the
single source of the manifest and service worker.

## Recommendations

- Remove or document the unused icon-generation scripts.
- Delete or archive stale root-level design documents.
- Keep the WIP dice feature clearly marked rather than treating its current
  state as a defect.

## Probability calculator

The former `src/utils/probability-calculator-python/` reference port has been
removed. The maintained implementation is
`src/utils/dice-probability-calculator/`; its documentation lives in
[features/dice-probability-calculator/](../features/dice-probability-calculator/README.md).
