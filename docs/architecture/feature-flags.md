# Build-time Feature Flags

The app can be compiled without any main-menu entity or tool. Flags are resolved
at build time; there is no runtime switching.

## Flags

| Feature                | Environment variable       | Hard dependencies             |
| ---------------------- | -------------------------- | ----------------------------- |
| Notes                  | `VITE_FEATURE_NOTES`       | —                             |
| Characters             | `VITE_FEATURE_CHARACTERS`  | —                             |
| Parties                | `VITE_FEATURE_PARTIES`     | characters                    |
| Monsters               | `VITE_FEATURE_MONSTERS`    | —                             |
| Encounters + combat    | `VITE_FEATURE_ENCOUNTERS`  | monsters, characters, parties |
| Modules                | `VITE_FEATURE_MODULES`     | notes, ambient                |
| Maps/locations         | `VITE_FEATURE_MAPS`        | —                             |
| Jukebox                | `VITE_FEATURE_JUKEBOX`     | —                             |
| Ambient sound          | `VITE_FEATURE_AMBIENT`     | —                             |
| Timers                 | `VITE_FEATURE_TIMERS`      | —                             |
| Calculator             | `VITE_FEATURE_CALCULATOR`  | —                             |
| Probability calculator | `VITE_FEATURE_PROBABILITY` | —                             |
| Help center links      | `VITE_FEATURE_HELP`        | —                             |

Missing values default to on. Accepted values are `true`/`false` and `1`/`0`.
Unknown `VITE_FEATURE_*` keys or a dependent enabled without its prerequisite
abort the build.

## Architecture

```text
scripts/feature-catalog.mjs       # flags, dependencies, ownership
scripts/feature-flags-plugin.mjs  # virtual modules + bundle audit
src/features/<id>/integration.ts  # routes, nav, home card, links, globals
```

The Vite plugin generates virtual modules that import only enabled feature
integrations:

- `virtual:feature-routes`
- `virtual:feature-navigation`
- `virtual:feature-home-cards`
- `virtual:feature-home-actions`
- `virtual:feature-globals`
- `virtual:feature-links`
- `virtual:feature-entity-panels`
- `virtual:feature-flags`

`src/router.ts`, `App.vue` and `HomeView.vue` consume these modules instead of
importing feature views directly. Disabled integrations are never resolved, so
their routes, chunks, stores, icons, CSS and feature-only dependencies are not
emitted.

Cross-feature surfaces use `featureLinkKinds` from `virtual:feature-links` and
`useFeatureStores()` instead of statically importing every domain store. This
keeps mentions, drag targets, entity linking, module views and note validation
working with whatever subset is enabled.

## Data and backup

The help-center static pages are always built into `dist/help`; `VITE_FEATURE_HELP`
only removes the in-app Help menu and links to those pages.

Feature flags do not change the database schema. All Dexie stores and migrations
remain available, and campaign backups continue to include every store. Disabled
feature data is preserved for a later build that re-enables it.

## Verification

```bash
npm run features:verify
```

The verifier builds:

1. all features on;
2. all features off;
3. each feature off with its dependent closure off.

With `FEATURE_AUDIT=1`, the Vite plugin inspects the emitted module graph and
fails if a module under a disabled feature’s ownership prefix appears. The
disabled route then falls through to the normal 404 page.

Shared infrastructure remains in the bundle by design: storage/migrations,
backup, settings, help, PWA shell, and shared file/link utilities.
