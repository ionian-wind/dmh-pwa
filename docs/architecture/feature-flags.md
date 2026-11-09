# Build-time Feature Flags

The app can be compiled without any main-menu entity or tool. Flags are resolved
at build time; there is no runtime switching.

## Flags

| Feature                | Environment variable       | Hard dependencies          |
| ---------------------- | -------------------------- | -------------------------- |
| Notes                  | `VITE_FEATURE_NOTES`       | —                          |
| Characters             | `VITE_FEATURE_CHARACTERS`  | —                          |
| Parties                | `VITE_FEATURE_PARTIES`     | characters                 |
| Pawns                  | `VITE_FEATURE_PAWNS`       | —                          |
| Encounters + combat    | `VITE_FEATURE_ENCOUNTERS`  | pawns, characters, parties |
| Maps/locations         | `VITE_FEATURE_MAPS`        | —                          |
| Dice roller            | `VITE_FEATURE_DICE_ROLLER` | —                          |
| Jukebox                | `VITE_FEATURE_JUKEBOX`     | —                          |
| Ambient sound          | `VITE_FEATURE_AMBIENT`     | —                          |
| Timers                 | `VITE_FEATURE_TIMERS`      | —                          |
| Calculator             | `VITE_FEATURE_CALCULATOR`  | —                          |
| Probability calculator | `VITE_FEATURE_PROBABILITY` | —                          |
| Help center links      | `VITE_FEATURE_HELP`        | —                          |

Missing values default to on. Accepted values are `true`/`false` and `1`/`0`.
Unknown `VITE_FEATURE_*` keys or a dependent enabled without its prerequisite
abort the build.

## Ownership

`scripts/feature-catalog.mjs` records the source paths owned by each feature.
The feature-build audit uses these prefixes, plus `src/features/<id>/`, to prove
that a disabled feature’s modules are absent from the emitted bundle. The main
ownership groups are:

| Feature                | Ownership prefixes                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------ |
| Notes                  | `src/notes/`, `src/stores/notes.ts`, `src/schemas/note.schema.json`                              |
| Dice roller            | `src/features/dice-roller/`, `src/components/DiceRollerPanel.vue`                                |
| Characters             | `src/characters/`, `src/stores/characters.ts`, `src/schemas/character.schema.json`               |
| Parties                | `src/parties/`, `src/stores/parties.ts`, `src/schemas/party.schema.json`                         |
| Pawns                  | `src/pawns/`, `src/stores/pawns.ts`, `src/schemas/pawn.schema.json`                              |
| Encounters + combat    | `src/encounters/`, `src/stores/encounters.ts`, `src/stores/combats.ts`, encounter/combat schemas |
| Maps/locations         | `src/maps/`                                                                                      |
| Jukebox                | `src/jukebox/`                                                                                   |
| Ambient sound          | `src/ambient-sound/`                                                                             |
| Timers                 | `src/timers/`, `src/stores/timers.ts`, `src/schemas/timer.schema.json`                           |
| Calculator             | `src/calculator/`                                                                                |
| Probability calculator | `src/probability-calculator/`, `src/utils/dice-probability-calculator/`                          |
| Help center links      | `src/features/help/`                                                                             |

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
- `virtual:feature-entity-panels` (currently only the ambient `EntityScenesPanel`)
- `virtual:feature-flags`

`src/router.ts`, `App.vue` and `HomeView.vue` consume these modules instead of
importing feature views directly. Disabled integrations are never resolved, so
their routes, chunks, stores, icons, CSS and feature-only dependencies are not
emitted. Detail views import `virtual:feature-entity-panels`; when ambient is
disabled it exports `undefined`.

Cross-feature surfaces use `featureLinkKinds` from `virtual:feature-links` and
`useFeatureStores()` instead of statically importing every domain store. This
keeps mentions, drag targets, entity linking and note validation
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

The verifier builds 14 configurations:

1. all features on;
2. all features off;
3. each of the 12 features off with its dependent closure off.

Each build also checks that the generated PWA manifest contains the expected
Notes/Timers/Jukebox/Help shortcuts. With `FEATURE_AUDIT=1`, the Vite plugin
inspects the emitted module graph and fails if a module under a disabled
feature’s ownership prefix appears. The disabled route then falls through to the
normal 404 page.

Shared infrastructure remains in the bundle by design: storage/migrations,
backup, settings, help, PWA shell, and shared file/link utilities.
