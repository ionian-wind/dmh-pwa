# Ambient Sound Configurator - Technical Specification

## 1. Overview

This document describes the Ambient Sound Configurator feature for DMH PWA, inspired by common tabletop ambience workflows. The feature enables Game Masters to create immersive soundscapes for tabletop RPG sessions by layering ambient sounds, triggering one-shot effects, and switching between package-defined scenes.

### 1.1 Current implementation requirements

- Ambient page route is `/ambient`; a scene view is `/ambient/<scene-id>` and is
  reloadable/shareable.
- Layout follows the jukebox: sticky page tabs and scrollable content. Playback
  controls live in the scene view under the mood block; there is no ambient
  player in the app footer.
- Packages are script-built and read-only in the app: import or remove only.
- Scene rows have no icon, play button or link-count metadata; clicking a row
  opens the scene view.
- Ambience groups use a shared `AmbienceItem` row with variation buttons and no
  package or scene-count metadata.
- One-shot entries are grouped category knobs. Each knob contains the icon and
  shows only the name below it. Knobs are read-only progress indicators with
  click/keyboard handled by a wrapper.
- Overlapping plays of the same one-shot are supported and shown as an `×N`
  badge; one-shots can sound at any time.
- Mood knobs start/switch mood music only; they never start scene ambience.
  Switching moods crossfades the music, and clicking the active mood does
  nothing. Temporary moods crossfade to the previous mood or fade out to Off.
- Only temporary mood knobs show playback progress.
- Opening a scene never starts playback. When nothing is playing, mood and
  ambience controls can start their own audio. While paused, those controls are
  disabled and only the footer play button resumes playback.
- Jukebox and ambient playback are mutually exclusive: starting one pauses the
  other; pausing/stopping never auto-resumes the other. One-shots are exempt.
- Intensity has five snapped levels: 0/25/50/75/100.
- Entity links use hashed package/scene IDs. Packaging derives entity IDs from
  metadata (all `id` keys excluded) plus file content hashes; files and packages
  are identified by SHA-256 hashes.

## 2. Core Concepts

### 2.1 Package

An ambient sound package (`.spk`) is a self-contained distributable content unit.
A package contains one or more of:

- **ambience entries** — loopable background layers;
- **one-shot entries** — triggerable effects;
- **scene configurations** — saved mixes owned by the package,

plus any **audio files** used by those elements. Packages with only ambiences,
only one-shots or only scenes are valid; a completely empty package is not.

A package is content, not a running mix. Importing or loading a package registers
its contents but does not start playback automatically. Imported package content
is immutable in the app: packages can only be imported or removed. Scenes,
ambiences and one-shots cannot be edited, added or deleted from the UI.

Scenes reference ambience and one-shot entries from the same package. A scene is
not an independent global preset that can mix entries from multiple packages.

### 2.2 Ambience entry

An ambience entry is a loopable background sound. Each entry has:

- a stable ID, name and category;
- an icon in the icon-picker format (`collection:name`, for example
  `fa-solid:cloud-rain`), rendered with Font Awesome;
- a default volume, loop flag and optional fade time;
- one or more **variations**;
- a **sample pool** for each variation.

Only one sample from the selected variation plays at a time. Switching variation
switches the active sample pool; switching the selected sample restarts only that
ambience layer. Multiple ambience entries can play together, both as part of a
scene and as additional gallery tracks layered on top. Weather is represented as
an ambience category, not as a separate weather system.

### 2.3 One-shot entry

A one-shot entry is a triggerable sound that plays once. Entries are categorized
(combat, exploration, environmental, weather, and so on), have an icon in the
icon-picker format (`collection:name`, for example `fa-solid:cloud-bolt`), a
volume and an optional cooldown. One-shot entries can be referenced by multiple scenes
from the same package.

One-shots are **independent of ambient playback state and mix settings**. They
can be triggered while ambient audio is paused, while no scene is active, while
music is disabled, while all ambience layers are muted, or while the ambient
master volume is zero. They use their own entry volume and are not attenuated by
the ambient master, music or ambience buses. A future dedicated one-shot bus may
control them, but it must remain separate from the ambient settings.

### 2.4 Scene

A scene is a saved playback configuration owned by a package. It defines:

- which ambience entries are active;
- which variation and volume each active ambience uses;
- which one-shot entries belong to the scene;
- the scene intensity and mix settings; intensity has five fixed levels:
  0, 25, 50, 75 and 100;
- the scene's own music.

Scenes have no cover art or icon in this model. The package icon represents the
package; a scene is identified by its name.

**Scene music is strictly bound to the scene.** A scene contains one or more
music presets by type — for example Explore, Combat and Victory. Each preset owns
one or more music variants; when the preset plays, one variant is selected
randomly and the next random variant follows when the track ends. Only one music
preset plays at a time, and the scene can switch it off entirely. There is no
shared mood-state music and no global music track that outlives the scene.

Presets may be **continual** or **temporary**. Temporary presets (for example
Victory) play once and then return to the previously played preset, or turn
scene music off when no preset was played before. The sample package marks every
`victory` preset as temporary.

### 2.5 Global gallery

After a package is loaded:

- its **scenes** are added to the **scenes list**;
- its **ambience entries** and **one-shot entries** are added to the **global
  gallery**.

The gallery is a read-only content browser, not a scene. Gallery entries cannot
be added to or removed from scenes in the app. They remain associated with their
source package and are removed if that package is removed.

### 2.6 Package lifecycle

1. The user imports a `.spk` file.
2. The manifest is validated and audio blobs are stored locally.
3. The package is registered.
4. Its scenes are inserted into the scenes list.
5. Its ambience and one-shot entries are inserted into the global gallery.
6. Nothing starts playing until the user starts mood music, an ambience
   variation, or a one-shot.
7. One-shot entries can be triggered regardless of whether ambient playback or a
   scene is active.

Removing a package removes its scenes, ambience entries and one-shot entries,
and stops playback if that package is currently active.

### 2.7 Scene-to-entity links

Scenes can be linked to local DMH entities:

- **locations** — map locations;
- **modules**;
- **encounters**;
- **characters**.

Links are local user associations, not package content. They are not stored in
`pack.json` and are not exported inside the `.spk` archive. A scene can be linked
to several entities, and one entity can show several linked scenes.

Links reference the scene by `packageId + sceneId`. They survive package reloads
as long as those IDs remain stable. Removing a package removes its scene links;
deleting a linked entity removes the corresponding links.

Links are shortcuts, not automatic playback rules: opening an entity shows its
linked scenes, and selecting one starts that scene. Automatic scene switching is
a separate opt-in feature.

## 3. Architecture

### 3.1 Directory Structure

```
src/
├── ambient-sound/
│   ├── AmbientSoundView.vue          # Page layout, tabs and scene view switch
│   ├── components/
│   │   ├── SceneList.vue             # Package-owned scenes
│   │   ├── ScenePlayerView.vue       # In-page scene player
│   │   ├── AmbienceGallery.vue       # Global ambience browser
│   │   ├── AmbienceItem.vue          # Shared ambience row and variations
│   │   ├── OneShotGallery.vue        # Global one-shot knob grid
│   │   ├── OneShotControl.vue        # One-shot knob, icon and ×N badge
│   │   ├── MoodKnob.vue              # Mood selector/progress knob
│   │   ├── AmbientControls.vue       # Scene intensity slider
│   │   ├── AmbientIcon.vue           # Icon-picker / FA / RA icon renderer
│   │   ├── EntityScenesPanel.vue     # Linked scenes on entity views
│   │   └── SoundPackSidebar.vue      # Package list and import/remove
│   ├── stores/
│   │   └── ambientSoundStore.ts      # Scenes, gallery and playback state
│   ├── types.ts                      # Package/entry/scene interfaces
│   └── utils/
│       ├── audioEngine.ts            # Howler playback engine
│       ├── packData.ts               # Manifest normalization
│       └── packManager.ts            # Import, storage and archive export
├── components/common/
│   ├── EntityGroup.vue               # Grouped entity section layout
│   └── EntityTabs.vue                # Shared dense entity tab bar
├── maps/components/
│   └── EntityCreateDialog.vue        # Create related entity from link picker
├── utils/
│   └── playbackCoordinator.ts        # Jukebox/ambient mutual pause
├── assets/
│   └── sounds/                       # Optional built-in audio assets
```

### 3.2 Package File Format

Packages are distributed as `.spk` files (ZIP archives):

```
my-pack.spk
├── pack.json                 # Metadata, entries and scenes
├── icon.png                  # Package thumbnail (optional)
├── ambiences/                # Shared ambience sample pools
│   ├── rain-light.mp3
│   └── rain-heavy.mp3
├── one-shots/                # One-shot effects
│   └── thunder.mp3
└── scenes/
    ├── tavern/
    │   └── music/
    │       └── theme.mp3
    └── dungeon/
        └── music/
            └── ambience.mp3
```

Scene music lives under the owning scene. There is no package-wide `music/`
directory or mood-state track shared by scenes.

**Content identity and hashes**

Source packages may use readable IDs. The pack script replaces them with
content-derived SHA-256 identifiers when building the `.spk`:

- Every ambience, one-shot and scene gets its own hash. The hash covers the
  canonical metadata with **all `id` keys removed** plus the content hashes of
  its referenced files.
- Every audio file is stored under its content hash, preserving the extension:
  `ambiences/<file-hash>.mp3`, `one-shots/<file-hash>.mp3`, and
  `scenes/<scene-hash>/music/<file-hash>.mp3`.
- Scene references, `oneShotIds` and variations are rewritten to the computed
  hashes before the archive is written.
- The package ID is the SHA-256 of the combined, sorted ambience, one-shot and
  scene hashes. Re-importing identical content therefore produces the same
  package ID.
- Scene links and entity links use these hashed package/scene IDs.

**pack.json schema (source form):**

```json
{
  "version": "2.0",
  "id": "unique-package-id",
  "name": "Forest",
  "description": "Dense woodland with streams and wildlife",
  "author": "DMH Team",
  "category": "fantasy",
  "ambiences": [
    {
      "id": "rain",
      "name": "Rain",
      "icon": "fa-solid:cloud-rain",
      "category": "Weather",
      "defaultVolume": 45,
      "loop": true,
      "fadeTime": 0.8,
      "variations": [
        {
          "id": "light",
          "name": "Light rain",
          "samples": ["ambiences/rain-light.mp3"]
        },
        {
          "id": "heavy",
          "name": "Heavy rain",
          "samples": ["ambiences/rain-heavy.mp3"]
        }
      ]
    }
  ],
  "oneShots": [
    {
      "id": "thunder",
      "name": "Thunder",
      "icon": "fa-solid:cloud-bolt",
      "file": "one-shots/thunder.mp3",
      "category": "weather",
      "volume": 80,
      "cooldown": 500
    }
  ],
  "scenes": [
    {
      "id": "tavern",
      "name": "Tavern",
      "description": "A warm, busy roadside inn",
      "intensity": 60,
      "ambiences": [
        { "ambienceId": "rain", "variationId": "light", "volume": 35 }
      ],
      "oneShotIds": ["thunder"],
      "musicPresets": [
        {
          "id": "explore",
          "name": "Explore",
          "files": [
            "scenes/tavern/music/explore-1.mp3",
            "scenes/tavern/music/explore-2.mp3"
          ]
        },
        {
          "id": "combat",
          "name": "Combat",
          "files": ["scenes/tavern/music/combat.mp3"]
        },
        {
          "id": "victory",
          "name": "Victory",
          "files": ["scenes/tavern/music/victory.mp3"],
          "mode": "temporary"
        }
      ]
    }
  ]
}
```

**Archive layout**

- `pack.json` is required and must sit at the archive root.
- `ambiences/` holds the shared ambience sample pools referenced by
  `ambiences[].variations[].samples`.
- `one-shots/` holds one-shot files referenced by `oneShots[].file`.
- `scenes/<scene-id>/music/` holds music owned by that scene in the source
  package. A preset's `files` entries are resolved relative to the package
  root; the built archive writes them as
  `scenes/<scene-hash>/music/<file-hash>.<ext>`.
- `icon.png` is an optional package thumbnail. It is not the scene icon (scenes
  have no icon).
- Audio paths may be absolute from the package root or bare filenames; the
  importer normalizes them into the canonical folders. The pack script rewrites
  them to hash-based archive paths.
- Importing a package never starts audio. Playback begins only from an explicit
  play action.

**Top-level manifest fields**

| Field              | Required | Notes                                                         |
| ------------------ | -------- | ------------------------------------------------------------- |
| `version`          | yes      | Manifest format version.                                      |
| `id`               | yes      | Stable package ID. Re-importing with the same ID replaces it. |
| `name`             | yes      | Display name.                                                 |
| `description`      | yes      | Short summary.                                                |
| `author`           | no       | Attribution text.                                             |
| `icon`             | no       | Package icon value; not used for scene identity.              |
| `category`         | yes      | `fantasy`, `scifi`, `horror`, `modern` or `custom`.           |
| `defaultIntensity` | no       | Fallback scene intensity, snapped to 0/25/50/75/100.          |
| `ambiences`        | no       | Ambience entries (legacy `layers` is normalized here).        |
| `oneShots`         | no       | One-shot entries.                                             |
| `scenes`           | no       | Scene configurations.                                         |
| `moodStates`       | no       | Legacy mood music, normalized into single-preset scenes.      |
| `weatherSystems`   | no       | Legacy weather entries, normalized into ambience categories.  |

**Ambience entry**

| Field            | Required | Notes                                                               |
| ---------------- | -------- | ------------------------------------------------------------------- |
| `id`             | yes      | Stable ID, unique inside the package.                               |
| `name`           | yes      | Display name.                                                       |
| `icon`           | yes      | Icon-picker value such as `fa-solid:cloud-rain`.                    |
| `category`       | no       | Group heading (Weather, Nature, Interior, Crowd, …).                |
| `defaultVolume`  | yes      | 0–100.                                                              |
| `loop`           | yes      | Ambience layers normally loop.                                      |
| `fadeTime`       | no       | Fade duration in milliseconds.                                      |
| `variations`     | yes      | One or more named sample pools.                                     |
| `file`/`samples` | no       | Legacy single-file/flat sample forms; normalized into `variations`. |

Each variation has `id`, `name` and `samples[]`. Each sample is a path relative
to the package root. The folder is normally `ambiences/`.

**One-shot entry**

| Field      | Required | Notes                                                              |
| ---------- | -------- | ------------------------------------------------------------------ |
| `id`       | yes      | Stable ID, unique inside the package.                              |
| `name`     | yes      | Display name.                                                      |
| `icon`     | yes      | Icon-picker value such as `fa-solid:cloud-bolt`.                   |
| `file`     | yes      | Audio path relative to the package root, normally `one-shots/...`. |
| `category` | yes      | `combat`, `exploration`, `environmental` or `weather`.             |
| `volume`   | yes      | 0–100. One-shots use their own volume and ignore ambient buses.    |
| `cooldown` | no       | Optional cooldown in seconds.                                      |

**Scene**

| Field          | Required | Notes                                                              |
| -------------- | -------- | ------------------------------------------------------------------ |
| `id`           | yes      | Stable ID, unique inside the package.                              |
| `name`         | yes      | Display name.                                                      |
| `description`  | no       | Preview text.                                                      |
| `intensity`    | yes      | One of 0, 25, 50, 75 or 100 (snapped on load).                     |
| `ambiences`    | yes      | Active ambience selections: `ambienceId`, `variationId`, `volume`. |
| `oneShotIds`   | yes      | One-shot IDs available in the scene.                               |
| `musicPresets` | yes      | Scene-owned music presets.                                         |

**Scene music preset**

| Field   | Required | Notes                                                                 |
| ------- | -------- | --------------------------------------------------------------------- |
| `id`    | yes      | Preset type such as `explore`, `combat`, `victory` or `rest`.         |
| `name`  | yes      | Display name.                                                         |
| `files` | yes      | One or more variants; one is picked randomly each time.               |
| `mode`  | no       | `continual` (default) or `temporary`. Temporary presets return to the |
|         |          | previously played preset, or Off when none (sample: `victory`).       |

At least one of `ambiences`, `oneShots` or `scenes` must contain an entry; the
pack script rejects completely empty packages. Scenes have no `icon` field.
Unknown fields are ignored. Scene music is owned by the scene; there is no
package-wide music folder.

### 3.3 Data Models

```typescript
// src/ambient-sound/types.ts

export interface SoundPackageManifest {
  version: string;
  id: string;
  name: string;
  description: string;
  author?: string;
  icon?: string;
  category: 'fantasy' | 'scifi' | 'horror' | 'modern' | 'custom';
  ambiences: AmbienceDef[];
  oneShots: OneShotDef[];
  scenes: SceneDef[];
}

export interface AmbienceVariation {
  id: string;
  name: string;
  /** Sample paths relative to the package root. */
  samples: string[];
}

export interface AmbienceDef {
  id: string;
  name: string;
  /** Icon-picker format, e.g. `fa-solid:cloud-rain`. */
  icon: string;
  category?: string;
  defaultVolume: number;
  loop: boolean;
  fadeTime?: number;
  variations: AmbienceVariation[];
}

export interface OneShotDef {
  id: string;
  name: string;
  /** Icon-picker format, e.g. `fa-solid:cloud-bolt`. */
  icon: string;
  file: string;
  category: 'combat' | 'exploration' | 'environmental' | 'weather';
  volume: number;
  cooldown?: number;
}

export interface SceneAmbience {
  ambienceId: string;
  variationId: string;
  volume: number;
}

export interface SceneMusicPreset {
  id: string;
  name: string;
  files: string[];
  /** `continual` (default) or `temporary` (returns to the previous played preset or Off). */
  mode?: 'continual' | 'temporary';
}

export interface SceneDef {
  id: string;
  name: string;
  description?: string;
  /** One of 0, 25, 50, 75 or 100. */
  intensity: number;
  ambiences: SceneAmbience[];
  oneShotIds: string[];
  /** Music presets owned by this scene; each has one or more variants. */
  musicPresets: SceneMusicPreset[];
}

/** Local user data; never stored inside the package manifest. */
export type SceneLinkEntityType =
  | 'location'
  | 'module'
  | 'encounter'
  | 'character';

export interface SceneEntityLink {
  id: string;
  packageId: string;
  sceneId: string;
  entityType: SceneLinkEntityType;
  entityId: string;
  createdAt: number;
  updatedAt: number;
}
```

> Sections 5–12 below are earlier implementation sketches. Where they conflict
> with the package, gallery and scene rules in Sections 2–4, Sections 2–4 are
> authoritative.

## 4. User Interface

### 4.1 Layout and navigation

The ambient-sound section is a first-class app page with a package sidebar:

```
┌──────────────────────────────────────────────────────────────┐
│ Header: Ambient Sound                              [sidebar]  │
├───────────────────────────────────────────┬──────────────────┤
│ Tabs: Scenes | Ambiences | One-shots       │ Packages         │
│                                           │ ──────────────── │
│ Content for the selected tab              │ All packages     │
│                                           │ Forest           │
│                                           │ Tavern           │
│                                           │ ...              │
│                                           │ ──────────────── │
│                                           │ Import package   │
├───────────────────────────────────────────┴──────────────────┤
│ Intensity slider · play/pause · volume                       │
└──────────────────────────────────────────────────────────────┘
```

- Use the existing shared components: `ViewHeader`, `QCard`, `EntityTabs`,
  `SidebarItem`, `BaseModal` and `EmptyState`.
- The package sidebar is the right drawer. The main page owns the left content.
- The Scenes / Ambiences / One-shots tabs use the shared dense `EntityTabs` bar
  and stay sticky below the app header while the list scrolls.
- The ambient page has no bottom player panel. Scene playback controls
  (intensity, play/pause, volume) live in the scene view under the mood block.
- “All packages” is the default filter. Selecting a package filters the active
  tab to that package; selecting it again clears the filter.
- Package rows show a category icon and the package name. Each row has a
  remove action.
- Import is the only pinned footer action. Package creation/editing happens
  outside the app through the sound-pack script.

### 4.2 Scenes tab

The Scenes tab is the default landing view.

**Toolbar**

There is no in-page toolbar. The right sidebar's package filter narrows the
list.

**Scene row/card**

Each scene is a row in a `QCard`/list, not a cover grid. It shows:

- scene name and description preview;
- package name;
- a “Playing” badge while the scene is playing.

Clicking the row opens the scene player view. The list has no icon or play
button; playback starts from the scene view.

**States**

- No packages: empty state with “Import package”.
- Packages but no scenes: “This package has no scenes”.
- Loading/importing: page-level spinner.

### 4.3 Ambiences tab

A global content gallery for ambience entries from all loaded packages.

**Grouping**

- Package filter synced with the right sidebar. There is no category selector.
- Entries are grouped by category; each group has a title and separator.

**Ambience row**

- Icon, name and category.
- Available variations are shown as variation buttons.
- Variation buttons: clicking a variation on an inactive entry starts it,
  clicking another variation on an active entry swaps its sample pool, and
  clicking the active variation stops it. Several entries can play together.
- The active row is highlighted.
- The row layout is shared with the scene player through `AmbienceItem`.

### 4.4 One-shots tab

A global content gallery for one-shot entries.

- Package filter behaves like the Ambiences tab. There is no category selector.
- Knob entries are grouped by category; every group has a title and separator.
  A group can contain entries from multiple packages.
- Each entry is a Quasar knob with the one-shot icon in the knob slot.
- The knob is a round button with a read-only progress arc. It cannot be dragged
  to scrub; clicking it plays the one-shot.
- Clicking the knob again retriggers the one-shot; overlapping instances are
  allowed, and the knob tracks progress of the most recent still-playing
  instance.
- The knob is highlighted while any instance of the one-shot is playing.
- When the same one-shot is playing more than once at the same time, the knob
  shows an `×N` badge with the active instance count.
- Knobs bind progress with `v-model` in the 0–100 range, use `min=0` / `max=100`,
  `instant-feedback`, and disable pointer events on the knob itself. A wrapping
  control handles clicks and keyboard activation.
- Each entry shows only its name below the knob; the knob slot contains the
  one-shot icon. Package, category and scene-count metadata are not displayed.
- Triggering a one-shot from the scene player/playback panel is independent of
  ambient playback, scene music and ambient volume settings.
- One-shot entries remain visible and playable even when no scene is active.

### 4.5 Read-only package content

Package content is imported, not authored in the app.

- Scenes cannot be edited, duplicated or deleted.
- Ambience and one-shot entries cannot be added to or removed from a scene.
- The only package actions are **Import** and **Remove package**.
- Scene-to-entity links are local user data and remain editable.
- Scene music presets and variants come from the package and are read-only.

### 4.6 Scene player view

Opening a scene row replaces the ambient page content with the scene player
view while the package sidebar stays in place. The scene content is rendered
directly in the page rather than inside a card. The scene view URL is
`/ambient/<scene-id>`, so the hashed scene ID is shareable and survives a
reload. Playback starts only from an explicit action. A Back button in the view
header returns to the scene/gallery tabs. If the scene's package is removed
while the scene is open, the app redirects to `/ambient`. The view contains:

- **Mood knobs** — labelled “Mood” in English and “Атмосфера” in Russian.
  A knob row containing Off plus one knob per scene music preset (for example
  Explore, Combat, Victory). Clicking a mood knob starts only that
  mood music when nothing is playing, or crossfades to the active preset while
  playing; it never starts the scene's ambience layers. Clicking the preset that
  is already active does nothing. Ambience starts only when a variation button
  is clicked. Only one preset can be active; Off stops scene music without
  stopping ambiences. Within a preset the next music variant is chosen randomly
  and crossfaded in just before the current track ends. Temporary presets such
  as Victory play once, then crossfade back to the previously played preset or
  fade out to Off when there was none. Only temporary
  presets show playback progress on their knob; the knob is read-only and acts
  as a round button.
- **Playback controls** — play/pause and master volume sit at the far right of
  the scene title line. The five-step intensity control sits directly under the
  mood block: its label is at the left edge and the slider is centered in the
  remaining row, up to a maximum width. Play/pause resumes the active scene
  after a pause.
- **Control gating** — while paused, the intensity slider, mood knobs and
  ambience variation buttons are disabled. They are enabled again when the
  scene play/pause control resumes, or when nothing has been started yet.
- **Ambiences tab** — linked ambiences grouped by category. Each row shows the
  ambience name and a toggle group of its variations. Only one variation per
  ambience plays at a time; clicking the active variation stops the ambience.
- **Entity tabs** — the scene uses the same dense `EntityTabs` component as the
  main ambient page and module entity views.
- **One-shots tab** — linked one-shots as knob controls grouped by category,
  with a title and separator per group. The one-shot icon sits inside the knob
  and the arc shows playback progress.
  Clicking the knob plays the one-shot immediately, independent of music or
  ambience state.

The Back button returns to the list without stopping playback; the active scene
remains available from the scene list (with its Playing badge).

### 4.7 Entity views: linked scenes

The same reusable `EntityScenesPanel` appears in the side panel/detail area of:

- locations (`LocationView`);
- modules (`ModuleView`);
- encounters (`EncounterView`);
- characters (`CharacterView`).

Panel contents:

- header “Scenes” with an add action;
- list of linked scenes: name, package, active state;
- play/pause action for each linked scene;
- remove-link action;
- empty state: “No scenes linked”;
- current scene highlighted.

The scene picker lists unlinked scenes from all packages. Selecting a scene adds
the link; it does not start playback. Deleting the entity or its package removes
the affected links.

### 4.8 Scene playback controls

Playback controls are part of the scene view and are not rendered in the app
footer.

- Play/pause and master volume sit at the far right of the scene title line.
- Five-step intensity slider (0/25/50/75/100) with snapping and tick marks sits
  under the mood block. The label stays at the left edge and the slider is
  centered in the remaining row up to a maximum width.
- Master volume opens a popup, including mouse-wheel adjustment. The shared
  `VolumeControl` component is reused from the jukebox player.
- Play/pause is disabled while no mood preset or ambience layer is active; a
  paused scene with active content can still be resumed.
- No scene icon, cover art, “Now playing” caption or stop button.

**Playback behavior**

- One-shots are triggered from the galleries or the scene view.
- One-shots use their own entry volume and are independent of ambient playback
  and volume state.
- A single one-shot may be retriggered while already playing. There is no
  active-instance cap; the UI shows an `×N` badge while instances overlap.

**Playback exclusivity**

- Jukebox playback and ambient scene/ambience playback are mutually exclusive:
  starting one pauses the other.
- Pausing or stopping one never resumes the other automatically; the user must
  start it again.
- One-shots are exempt: they can sound while ambient is paused, while the
  jukebox is playing, or with no scene active.

### 4.9 Responsive behavior

**Desktop (≥1024 px)**

- Right package sidebar persistent.
- Scenes use a single-column list; one-shots use an auto-fill knob grid.
- Scene player view spans the full page-content width.
- Tabs stay sticky below the app header; the lists scroll independently.

**Tablet (600–1023 px)**

- Package sidebar becomes an overlay drawer.
- Scene cards/rows remain list-first; gallery uses 2 columns.
- Scene player view uses the full page width and scrolls with the page.

**Mobile (<600 px)**

- Tabs stay sticky below the app header and shrink to fit narrow screens;
  the package sidebar opens as a drawer.
- Scenes are full-width rows; gallery is a single-column list.
- Scene player view uses the full page width with the Back button pinned to the
  top of the content.
- Touch targets are at least 44×44 px.

### 4.10 Feedback, accessibility and edge states

- Package import uses the page loading state; invalid packages are rejected by
  the import routine.
- Package delete: confirmation names the package.
- Active scene: visible “Playing” badge and pulsing headphones icon in the app
  menu.
- Paused: play icon is shown and the footer play button resumes playback.
- Empty states cover: no packages, no scenes, no gallery entries, no linked
  entities, no music.
- All icon buttons have `title`/`aria-label`; sliders have accessible labels and
  current values.
- Keyboard: tab order follows the visual order; Escape closes modal dialogs;
  the scene view returns with its Back button; sliders support arrow keys.
- Respect `prefers-reduced-motion` for pulsing icons and scene transitions.
- Package import and link changes update the sidebar and entity panels
  immediately.

### 4.11 Component and state mapping

| UI component        | Responsibility                                                | Main state/actions                           |
| ------------------- | ------------------------------------------------------------- | -------------------------------------------- |
| `AmbientSoundView`  | Page layout, sticky tabs, package filter, content             | `currentPackage`, `activeTab`, `activeScene` |
| `SoundPackSidebar`  | Package list, import/delete, filter                           | `packages`, `selectedPackageId`              |
| `SceneList`         | Scene rows and opening the player                             | `scenes`, `activeSceneId`                    |
| `ScenePlayerView`   | In-page scene player with Back, music, ambience and one-shots | `packId`, `sceneId`, `activeTab`             |
| `AmbienceGallery`   | Ambience browsing, variations and layered playback            | `galleryAmbiences`, `activeLayers`           |
| `AmbienceItem`      | Shared ambience row, metadata and variation buttons           | `ambience`, `activeVariationId`, `disabled`  |
| `OneShotGallery`    | One-shot knob grid and playing/progress state                 | `galleryOneShots`, `groups`                  |
| `OneShotControl`    | Quasar knob with icon slot and playback progress              | `packId`, `oneShot`, `progress`              |
| `EntityScenesPanel` | Linked scenes in location/module/encounter/character          | `links`, `add/remove`, `play`                |
| `AmbientControls`   | Scene intensity slider                                        | `intensity`                                  |

The implementation should keep scene content (package-owned) separate from
local links and playback state. UI components read from the store selectors and
emit intent actions rather than mutating package manifests directly.

## 5. Audio Engine

### 5.1 Using Howler.js (already in dependencies)

The app already has Howler.js installed. Use it for audio management:

```typescript
// src/ambient-sound/utils/audioEngine.ts
import { Howl, Howler } from 'howler';

export class AudioEngine {
  private layers: Map<string, Howl> = new Map();
  private musicTrack: Howl | null = null;

  // Layer management
  loadLayer(layerId: string, audioUrl: string): void {
    const howl = new Howl({
      src: [audioUrl],
      loop: true,
      volume: 0.5,
      html5: true, // for large files
    });
    this.layers.set(layerId, howl);
  }

  playLayer(layerId: string, volume: number = 1): void {
    const layer = this.layers.get(layerId);
    if (layer) {
      layer.volume(volume);
      layer.fade(0, volume, 500); // 500ms fade in
      layer.play();
    }
  }

  stopLayer(layerId: string, fadeOut: boolean = true): void {
    const layer = this.layers.get(layerId);
    if (layer) {
      if (fadeOut) {
        layer.fade(layer.volume(), 0, 500);
        setTimeout(() => layer.stop(), 500);
      } else {
        layer.stop();
      }
    }
  }

  setLayerVolume(layerId: string, volume: number): void {
    const layer = this.layers.get(layerId);
    if (layer) {
      layer.fade(layer.volume(), volume, 100);
    }
  }

  // One-shot SFX
  playOneShot(audioUrl: string, volume: number = 1): void {
    const sfx = new Howl({
      src: [audioUrl],
      volume,
    });
    sfx.play();
    sfx.on('end', () => sfx.unload());
  }

  // Mood state music
  playMusic(trackUrl: string, intensity: number): void {
    this.musicTrack?.fade(this.musicTrack.volume(), 0, 1000);
    setTimeout(() => {
      this.musicTrack?.stop();
      this.musicTrack = new Howl({
        src: [trackUrl],
        loop: true,
        volume: 0.5,
        html5: true,
      });
      this.musicTrack.play();
    }, 1000);
  }

  // Master volume
  setMasterVolume(volume: number): void {
    Howler.volume(volume);
  }

  // Cleanup
  dispose(): void {
    this.layers.forEach((layer) => layer.unload());
    this.musicTrack?.unload();
    this.layers.clear();
  }
}
```

### 5.2 Audio Caching Strategy

- Cache frequently used sounds in IndexedDB
- Preload pack assets when user selects a pack
- Lazy load less common effects
- Use Service Worker for offline audio files

## 6. Pack Manager

### 6.1 Pack Storage (IndexedDB)

Packs are stored in IndexedDB using the existing `idb` package:

```typescript
// src/ambient-sound/utils/packManager.ts
import { openDB, type IDBPDatabase } from 'idb';
import JSZip from 'jszip';
import type { SoundPackData, SoundPackManifest } from '../types';

const DB_NAME = 'dmh-ambient-sound';
const STORE_NAME = 'sound-packs';

interface AmbientSoundDB extends IDBPDatabase {
  soundPacks: {
    key: string;
    value: {
      id: string;
      manifest: SoundPackManifest;
      audioBlobs: Map<string, Blob>;
      addedAt: number;
    };
    indexes: { 'by-addedAt': number };
  };
}

async function getDB(): Promise<AmbientSoundDB> {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      const store = db.createObjectStore('soundPacks', { keyPath: 'id' });
      store.createIndex('by-addedAt', 'addedAt');
    },
  });
}

export async function importSoundPack(
  spkFile: File,
): Promise<SoundPackManifest> {
  const arrayBuffer = await spkFile.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  const manifestFile = zip.file('pack.json');
  if (!manifestFile) {
    throw new Error('Invalid sound pack: missing pack.json');
  }

  const manifest: SoundPackManifest = JSON.parse(
    await manifestFile.async('string'),
  );

  const audioBlobs = new Map<string, Blob>();

  for (const layer of manifest.layers) {
    const file = zip.file(`layers/${layer.file}`);
    if (file) {
      audioBlobs.set(`layers/${layer.file}`, await file.async('blob'));
    }
  }

  for (const sfx of manifest.oneShots) {
    const file = zip.file(`sfx/${sfx.file}`);
    if (file) {
      audioBlobs.set(`sfx/${sfx.file}`, await file.async('blob'));
    }
  }

  for (const mood of manifest.moodStates) {
    if (mood.musicFile) {
      const file = zip.file(`music/${mood.musicFile}`);
      if (file) {
        audioBlobs.set(`music/${mood.musicFile}`, await file.async('blob'));
      }
    }
  }

  if (manifest.weatherSystems) {
    for (const weather of manifest.weatherSystems) {
      if (weather.file) {
        const file = zip.file(`weather/${weather.file}`);
        if (file) {
          audioBlobs.set(`weather/${weather.file}`, await file.async('blob'));
        }
      }
    }
  }

  const db = await getDB();
  await db.put('soundPacks', {
    id: manifest.id,
    manifest,
    audioBlobs,
    addedAt: Date.now(),
  });

  return manifest;
}

export async function getStoredPacks(): Promise<SoundPackManifest[]> {
  const db = await getDB();
  const packs = await db.getAll('soundPacks');
  return packs.map((p) => p.manifest);
}

export async function getPackAudio(packId: string): Promise<Map<string, Blob>> {
  const db = await getDB();
  const pack = await db.get('soundPacks', packId);
  return pack?.audioBlobs || new Map();
}

export async function deletePack(packId: string): Promise<void> {
  const db = await getDB();
  await db.delete('soundPacks', packId);
}

export function createObjectURL(blob: Blob): string {
  return URL.createObjectURL(blob);
}

export function revokeObjectURL(url: string): void {
  URL.revokeObjectURL(url);
}
```

### 6.2 Types for Pack Manager

```typescript
// src/ambient-sound/types.ts (additions)

export interface SoundPackManifest {
  version: string;
  id: string;
  name: string;
  description: string;
  author?: string;
  category: 'fantasy' | 'scifi' | 'horror' | 'modern' | 'custom';
  defaultIntensity: number;
  layers: LayerDef[];
  oneShots: OneShotDef[];
  weatherSystems?: WeatherDef[];
  moodStates: MoodStateDef[];
}

export interface LayerDef {
  id: string;
  name: string;
  icon: string;
  file: string;
  defaultVolume: number;
  loop: boolean;
  fadeTime?: number;
}

export interface OneShotDef {
  id: string;
  name: string;
  icon: string;
  file: string;
  category: 'combat' | 'exploration' | 'environmental' | 'weather';
  volume: number;
  cooldown?: number;
}

export interface WeatherDef {
  id: string;
  name: string;
  icon: string;
  file: string;
  affectsLayers: string[];
}

export interface MoodStateDef {
  state: MoodState;
  name: string;
  icon: string;
  musicFile?: string;
  transitionsTo?: MoodState[];
}
```

### 6.3 Packaging Script

Add to `package.json`:

```json
{
  "scripts": {
    "pack:sound": "node scripts/pack-sound-pack.js",
    "unpack:sound": "node scripts/unpack-sound-pack.js"
  }
}
```

**scripts/pack-sound-pack.js:**

```javascript
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const PACK_DIR = path.join(rootDir, 'sound-packs');
const OUTPUT_DIR = path.join(rootDir, 'dist/sound-packs');

function getPacks() {
  return fs
    .readdirSync(PACK_DIR)
    .filter((f) => fs.statSync(path.join(PACK_DIR, f)).isDirectory());
}

async function packSoundPack(packName) {
  const packPath = path.join(PACK_DIR, packName);
  const outputPath = path.join(OUTPUT_DIR, `${packName}.spk`);

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      console.log(`Packed: ${packName}.spk (${archive.pointer()} bytes)`);
      resolve();
    });

    archive.on('error', reject);
    archive.pipe(output);

    archive.directory(packPath, false);
    archive.finalize();
  });
}

async function main() {
  const packs = getPacks();
  console.log(`Found ${packs.length} sound packs to pack`);

  for (const pack of packs) {
    await packSoundPack(pack);
  }

  console.log('Done!');
}

main().catch(console.error);
```

**scripts/unpack-sound-pack.js:**

```javascript
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import extract from 'extract-zip';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const INPUT_DIR = path.join(rootDir, 'sound-packs/incoming');
const OUTPUT_DIR = path.join(rootDir, 'sound-packs');

async function unpackSoundPack(fileName) {
  const inputPath = path.join(INPUT_DIR, fileName);
  const packName = fileName.replace('.spk', '');
  const outputPath = path.join(OUTPUT_DIR, packName);

  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }

  await extract(inputPath, { dir: outputPath });
  console.log(`Unpacked: ${fileName} to ${packName}/`);
}

async function main() {
  if (!fs.existsSync(INPUT_DIR)) {
    fs.mkdirSync(INPUT_DIR, { recursive: true });
  }

  const files = fs.readdirSync(INPUT_DIR).filter((f) => f.endsWith('.spk'));
  console.log(`Found ${files.length} files to unpack`);

  for (const file of files) {
    await unpackSoundPack(file);
  }

  console.log('Done!');
}

main().catch(console.error);
```

Add dependencies:

```bash
npm install archiver extract-zip
```

### 6.4 Creating a Sound Pack

Directory structure for a new pack:

```
sound-packs/
└── fantasy-forest/
    ├── pack.json
    ├── icon.png
    ├── layers/
    │   ├── birds.mp3
    │   ├── wind.mp3
    │   └── stream.mp3
    ├── sfx/
    │   ├── branch_break.mp3
    │   └── door_creak.mp3
    ├── music/
    │   ├── explore.mp3
    │   ├── combat.mp3
    │   ├── victory.mp3
    │   └── rest.mp3
    └── weather/
        └── rain.mp3
```

Run packaging:

```bash
npm run pack:sound -- sound-packs/fantasy-forest
```

Output:

```
sound-packs/fantasy-forest.spk
```

## 7. State Management

### 6.1 Pinia Store

```typescript
// src/ambient-sound/stores/ambientSoundStore.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  AmbientSoundPack,
  MoodState,
  ActiveLayer,
  WeatherSystem,
} from '../types';

export const useAmbientSoundStore = defineStore('ambient-sound', () => {
  // State
  const currentPack = ref<AmbientSoundPack | null>(null);
  const activeLayers = ref<Map<string, ActiveLayer>>(new Map());
  const currentMoodState = ref<MoodState>('explore');
  const intensity = ref(50);
  const masterVolume = ref(80);
  const isPlaying = ref(false);
  const weatherActive = ref<WeatherSystem | null>(null);
  const loadedPacks = ref<Set<string>>(new Set());

  // Actions
  function selectPack(pack: AmbientSoundPack): void {
    currentPack.value = pack;
    activeLayers.value.clear();
    currentMoodState.value = 'explore';
  }

  function toggleLayer(layerId: string): void {
    const active = activeLayers.value.get(layerId);
    if (active) {
      activeLayers.value.delete(layerId);
    } else {
      activeLayers.value.set(layerId, {
        layerId,
        volume: 50,
        isPlaying: true,
        currentTime: 0,
      });
    }
  }

  function setLayerVolume(layerId: string, volume: number): void {
    const active = activeLayers.value.get(layerId);
    if (active) {
      active.volume = volume;
    }
  }

  function setMoodState(state: MoodState): void {
    currentMoodState.value = state;
  }

  function setIntensity(value: number): void {
    intensity.value = Math.max(0, Math.min(100, value));
  }

  function setMasterVolume(volume: number): void {
    masterVolume.value = Math.max(0, Math.min(100, volume));
  }

  function toggleWeather(weather: WeatherSystem | null): void {
    weatherActive.value = weather;
  }

  function play(): void {
    isPlaying.value = true;
  }

  function pause(): void {
    isPlaying.value = false;
  }

  // Persistence
  const persist = true; // Save to localStorage

  return {
    // State
    currentPack,
    activeLayers,
    currentMoodState,
    intensity,
    masterVolume,
    isPlaying,
    weatherActive,
    loadedPacks,
    // Actions
    selectPack,
    toggleLayer,
    setLayerVolume,
    setMoodState,
    setIntensity,
    setMasterVolume,
    toggleWeather,
    play,
    pause,
  };
});
```

## 8. Routing Integration

Add route to router:

```typescript
// src/router/index.ts (add to routes array)
{
  path: '/ambient',
  name: 'ambient-sound',
  component: () => import('@/ambient-sound/AmbientSoundView.vue'),
  meta: { title: 'Ambient Sound', icon: 'music' },
},
```

## 9. Offline Support

- Audio files should be cached via Service Worker
- Use IndexedDB to store user-created sound pack configurations
- Preload pack on first selection, then use cached version
- Show loading indicator during initial load

## 10. Future Enhancements

- **Custom Packs**: Users create their own ambient mixes
- **Audio File Import**: Upload custom sounds (integrate with existing jukebox)
- **Scene Links**: Link scenes to locations, modules, encounters and characters
- **Timer Integration**: Opt-in auto-start of a linked scene on encounter start
- **Hotkeys**: Keyboard shortcuts for common SFX
- **Mobile Optimization**: Larger touch targets, haptic feedback on SFX

## 11. Acceptance Criteria

1. ✅ Importing a package adds its scenes to the scenes list and its ambience and
   one-shot entries to the global gallery.
2. ✅ Selecting a scene applies its ambience variations, volumes, one-shot
   selection and intensity.
3. ✅ Scene music is owned by the scene and never shared with another scene.
4. ✅ One-shot SFX play immediately on button press regardless of ambient
   play/pause, scene, music or ambient-volume state.
5. ✅ A scene can be linked to locations, modules, encounters and characters.
6. ✅ Linked scenes appear from both the scene side and the entity side.
7. ✅ Audio continues playing in background when navigating away.
8. ✅ Settings and local scene links persist across sessions.
9. ✅ Works offline with cached audio.
10. ✅ Scene switches use smooth audio transitions.

## 12. Implementation Notes

- Use existing `howler` package already in dependencies
- Follow existing code style from jukebox module
- Leverage existing Pinia store patterns with persistence
- The main page injects `ViewHeader` through `useLayout`; pack management lives
  in the right sidebar, and the Ambient Sound item sits under **Tools** in the
  main menu.
- Page content uses the project's `QCard`/`QCardSection` layout, `TabGroup`,
  tabler icons, CSS theme variables and localized text rather than standalone
  page-level styling.
- When a pack is selected, an untitled overall-control card owns global
  play/pause, a separate music on/off button, and master volume; ambient layers
  keep their own layer toggles and volume sliders. With no pack selected, only
  the shared empty state is shown (no overall-control card or surrounding card).
- Ambient music can be disabled independently of ambient layers using the music
  switch in the mood-state block. Disabling it immediately stops the currently
  playing music track; re-enabling it resumes the current mood music while
  playback is active.
- Ambient layers are grouped by category. Each layer has one or more variations,
  each with its own sample pool; selecting a variation switches the samples used
  and only one sample per layer plays at a time. Weather is represented as a
  normal ambient layer category rather than a separate panel.
- Mood states support `continual` and `temporary` modes. Temporary music
  crossfades back to the previous mood as the track ends, or fades out to Off
  when there was none; continual music keeps playing by crossfading into
  another randomly chosen variant. Each mood can
  have several music files. Clicking the active mood does not restart its
  music.
- Packages are built and edited by script, not in the app. The sidebar only
  imports, filters and removes packages.
- Sound-pack management lives in the right sidebar. Packs are `SidebarItem`
  rows; clicking a pack filters content to it and clicking the active package
  clears the filter. Each row has a hover delete action with confirmation.
  **Import Package** is the only pinned bottom `QItem` control.
- Master and active-layer volume sliders respond to the mouse wheel, matching
  the jukebox player volume control.
- While ambient playback is active, the main-menu headphones icon smoothly
  pulses with a larger/smaller bounce animation.
- Integrate with existing file handling for custom audio upload

## 13. Free Sound Sources

All sources below are free for commercial and non-commercial use. Check individual licenses for attribution requirements.

### CC0 / Public Domain

| Source                          | URL                                                               | Description                |
| ------------------------------- | ----------------------------------------------------------------- | -------------------------- |
| kmontesdev Fantasy SFX          | https://kmontesdev.itch.io/fantasy-ambient-sound-effects-pack-cc0 | 2GB of fantasy sounds, CC0 |
| OpenGameArt CC0 SFX             | https://opengameart.org/content/cc0-sound-fx                      | 80+ RPG sounds, CC0        |
| OpenGameArt CC0 Creatures       | https://opengameart.org/content/cc0-creature-sfx                  | 80+ monster sounds, CC0    |
| OpenGameArt CC0 RPG             | https://opengameart.org/content/cc0-rpg-sfx                       | 80+ RPG effects, CC0       |
| OpenGameArt Nature Sounds       | https://opengameart.org/content/nature-sounds-cc0                 | Nature ambient sounds, CC0 |
| OpenGameArt Background Ambience | https://opengameart.org/content/cc0-background-ambience           | Background loops, CC0      |
| OpenGameArt Dark Cavern         | https://opengameart.org/content/dark-cavern-ambient               | Dungeon ambience, CC0      |
| Kronbits 200 Free SFX           | https://kronbits.itch.io/200-free-sfx                             | Game sounds, CC0           |
| Clutch Assets 200+ RPG Sounds   | https://clutch-assets.itch.io/200-free-rpg-sounds                 | RPG sounds, free to use    |

### CC BY 4.0 (Attribution Required)

| Source              | URL                                                      | Description                     |
| ------------------- | -------------------------------------------------------- | ------------------------------- |
| Audio Elk Ambience  | https://audioelk.itch.io/free-sounds-ambience-collection | Field recordings, CC BY-SA 4.0  |
| OpenGameArt Music   | https://opengameart.org/content/music-for-rpg-ambience   | RPG background music, CC BY 3.0 |
| OpenGameArt Ambient | https://opengameart.org/content/rpgaudioambiance         | RPG ambiences, CC BY 3.0        |

### Pixabay (No Attribution Required)

| Source                | URL                                | Description                      |
| --------------------- | ---------------------------------- | -------------------------------- |
| Pixabay Sound Effects | https://pixabay.com/sound-effects/ | 120,000+ sounds, Pixabay License |
| Pixabay Music         | https://pixabay.com/music/         | Royalty-free music               |

### Open Source Apps (Integration Reference)

| Source             | URL                                | Description                        |
| ------------------ | ---------------------------------- | ---------------------------------- |
| Tabletop Audio     | https://tabletopaudio.com/         | Free ambiences & music             |
| Ambora             | http://ambora.app/                 | Open source (MIT), desktop app     |
| Ambiance Architect | https://ambiancearchitect.itch.io/ | Free to use, Freesound integration |

### Creating Packages

To create an ambient sound package:

1. Create directory `sound-packs/<package-name>/`.
2. Add `pack.json` with package metadata, `ambiences`, `oneShots` and `scenes`.
3. Add ambience samples under `ambiences/`, one-shot files under `one-shots/`,
   and scene-owned music under `scenes/<scene-id>/music/`.
4. Build the package with the script:

   ```bash
   npm run pack:sound -- content/my-pack
   ```

   This writes `content/my-pack.spk` next to the package directory. Running
   `npm run pack:sound` without arguments packs every directory under
   `sound-packs/` into `dist/sound-packs/`.

5. Import the `.spk` file in the app; its scenes appear in the scenes list and
   its entries appear in the global gallery.

## 14. Scene-Centric UX Proposals

> **Status:** proposal only — none of this section is implemented yet.
> Based on the package, gallery and scene model described above.

### 14.1 Adopted scene-centric patterns

The intended experience is scene-centric rather than a pack-centric mixer:

- **Scenes** are the primary library object, with description, Preview/Play and
  last-updated metadata. DMH does not use scene cover art.
- **Ambiences** and **One-shots** are separate libraries with category chips.
- **Scene editing** is a checklist: “Added to scene”, grouped by category, with
  Remove All and a clear empty/complete state.
- **Table controls** are fast: scene music controls, an intensity slider,
  per-layer I/II/III buttons and a variation dropdown.
- **A persistent now-playing bar** keeps the current scene visible everywhere.
- **Audio settings are global**: master/music/ambience/one-shots volume, presets,
  reset and an optional Party EQ.
- **Credits belong to content**: composer/artist attribution is visible on the
  scene detail screen.

### 14.2 Scene-centric package model

Scenes are part of the package, not separate global presets. A package owns its
ambience entries, one-shot entries and scenes together:

- **Package** — distributable content and scene definitions.
- **Global gallery** — browsable ambience and one-shot entries from loaded
  packages.
- **Scene** — a package-owned playback configuration referencing entries from
  the same package.

```typescript
interface SceneDef {
  id: string;
  name: string;
  description?: string;
  intensity: number;
  ambiences: Array<{
    ambienceId: string;
    variationId: string;
    volume: number;
  }>;
  oneShotIds: string[];
  musicPresets: Array<{
    id: string;
    name: string;
    files: string[];
  }>;
}
```

Scene music is always owned by the scene. Each scene provides music presets of
different types, and each preset can hold several randomly sequenced variants.
There is no shared mood-state music track and no cross-scene music selection.
Loading a package registers its scenes in the scenes list and its
ambience/one-shot entries in the global gallery. One-shots are always directly
triggerable and are not gated by ambient playback or scene state.

### 14.3 Proposed experience

#### Persistent Now Playing bar

Present on all pages, not only the ambient page:

- scene name and playing/paused state;
- play/pause, stop with fade and a quick master volume;
- tap to open the full mixer;
- optional previous/next scene once a scene queue exists.

The bar belongs in the app shell, above the bottom navigation on mobile. This
makes ambient audio feel integrated with the rest of the DMH instead of being a
separate destination.

#### Ambient page as a three-tab library

Replace the current vertical control stack with:

- **Scenes** — list/grid with name, package, last updated, Preview/Play.
- **Ambiences** — grouped rows with icon, name, category and active state.
- **One-shots** — category grid with large touch targets and a Manage action.

Reuse the existing `TabGroup`, `QCard`, `EmptyState`, `SidebarItem` and
`BaseModal` patterns. On mobile, scene details should open as a bottom sheet
rather than a large centred modal.

#### Scene detail and scene editing

The scene detail/editor should provide:

- description and last updated;
- Preview and Play buttons;
- grouped checklists for layers and one-shots;
- Remove All;
- a useful complete state instead of a dead “Added all ambiences” message;
- composer/artist credits and licence information from the pack manifest.

#### Quick layer controls

Keep the existing sliders for fine control, but add a compact three-state
control per layer:

- **I / II / III** = low / medium / high volume (soft / normal / prominent);
- explicit mute and solo affordances later;
- variation selection remains a separate dropdown.

This is substantially faster at the table, especially on a phone. Keep the
wheel-adjusted sliders as a desktop/expanded option.

#### Global audio settings

Move global audio controls into one `BaseModal` or bottom sheet:

- mix preset dropdown;
- master, music, ambience and one-shot volumes;
- reset to defaults;
- optional Party EQ / voice-friendly mode;
- persisted audio settings.

The audio engine needs separate buses for music, ambience and one-shots before
scenes and per-layer controls feel coherent.

### 14.4 DMH-specific extension: link scenes to entities

DMH connects package scenes to local campaign data:

- **locations** — map locations;
- **modules**;
- **encounters**;
- **characters**.

A scene can be linked to multiple entities, and an entity can list multiple
linked scenes. Links are local user data stored outside the package, keyed by
`packageId + sceneId`. Selecting a linked scene starts it; automatic switching
on entity open or combat start is a separate opt-in feature.

### 14.5 Suggested delivery order

| Priority | Work                                                                                       | Rough effort |
| -------- | ------------------------------------------------------------------------------------------ | ------------ |
| **P0**   | Now Playing bar; library tabs/category chips; 3-state layer controls; audio settings buses | 3–5 days     |
| **P1**   | Scene model + player; music presets; scene list and global gallery                         | 1–2 weeks    |
| **P2**   | Pack credits; search/favourites; drag reorder; scene crossfade                             | ~1 week      |
| **P3**   | Location/module/encounter/character scene links; Party EQ/ducking; scene export/import     | later        |

### 14.6 Architectural notes

- Extend the package manifest with optional `credits` and `licence` fields while
  keeping existing manifests readable during migration.
- Parse scenes from the package manifest into the scenes list on load, and
  register ambience/one-shot entries in the global gallery.
- Keep scene references package-local: a scene may only reference entries from
  its own package.
- Store scene music as a package asset; scene music is never shared between
  scenes.
- Extend `AudioEngine` with independent music, ambience and one-shot gains and
  scene-level fade/crossfade helpers.
- Mount the Now Playing bar in the layout shell, not inside
  `AmbientSoundView.vue`, so it survives route changes.
- Store scene-to-entity links locally, outside the package manifest, keyed by
  `packageId + sceneId` and the target entity type/id.
- Keep the local-first model: no marketplace, accounts or remote scene sharing
  in the first iteration.

### 14.7 Explicitly not planned

- A Discover/Profile-style marketplace navigation. The application is
  local-first; Packs and Scenes are enough unless shared content is introduced.
- Copying a third-party visual style. Keep the existing dark Quasar theme and
  use the layout and hierarchy described above.
- Automatic scene switching without user confirmation.

### 14.8 Open questions

1. Should a scene be allowed to reference entries from multiple packages, or
   stay strictly package-local? The current model keeps scenes package-local.
2. Should “Preview” play the scene quietly in place, or temporarily replace the
   current playback and restore it on stop?
3. Is Party EQ required, or is simple music ducking during one-shots enough?
4. Should scene changes participate in undo/redo, or is a simple confirmation
   dialog sufficient?
