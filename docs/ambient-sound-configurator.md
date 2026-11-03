# Ambient Sound Configurator - Technical Specification

## 1. Overview

This document describes the Ambient Sound Configurator feature for DMH PWA, inspired by common tabletop ambience workflows. The feature enables Game Masters to create immersive soundscapes for tabletop RPG sessions by layering ambient sounds, triggering one-shot effects, and switching between package-defined scenes.

## 2. Core Concepts

### 2.1 Package

An ambient sound package (`.spk`) is a self-contained distributable content unit.
A package contains:

- **audio files** used by its entries and scenes;
- **ambience entries** — loopable background layers;
- **one-shot entries** — triggerable effects;
- **scene configurations** — saved mixes owned by the package.

A package is content, not a running mix. Importing or loading a package registers
its contents but does not start playback automatically. Imported packages are
read-only: their scenes cannot be edited. Imported packages, scenes and gallery
entries are marked with a small light import icon.

Scenes reference ambience and one-shot entries from the same package. A scene is
not an independent global preset that can mix entries from multiple packages.

### 2.2 Ambience entry

An ambience entry is a loopable background sound. Each entry has:

- a stable ID, name, icon and category;
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
(combat, exploration, environmental, weather, and so on), have an icon, a volume
and an optional cooldown. One-shot entries can be referenced by multiple scenes
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
- the scene intensity and mix settings;
- the scene's own music.

Scenes have no cover art in this model. The package icon represents the package;
a scene is identified by its name and icon.

**Scene music is strictly bound to the scene.** A scene contains one or more
music presets by type — for example Explore, Combat and Victory. Each preset owns
one or more music variants; when the preset plays, one variant is selected
randomly and the next random variant follows when the track ends. Only one music
preset plays at a time, and the scene can switch it off entirely. There is no
shared mood-state music and no global music track that outlives the scene.

### 2.5 Global gallery

After a package is loaded:

- its **scenes** are added to the **scenes list**;
- its **ambience entries** and **one-shot entries** are added to the **global
  gallery**.

The gallery is a content browser, not a scene. Adding a gallery entry to a scene
creates a reference from that scene to the package entry. Gallery entries remain
associated with their source package and are removed if that package is removed.

### 2.6 Package lifecycle

1. The user imports a `.spk` file.
2. The manifest is validated and audio blobs are stored locally.
3. The package is registered.
4. Its scenes are inserted into the scenes list.
5. Its ambience and one-shot entries are inserted into the global gallery.
6. Nothing starts playing until the user starts a scene or manually previews
   content.
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
│   ├── AmbientSoundView.vue          # Scenes list / playback view
│   ├── components/
│   │   ├── SceneList.vue             # Package-owned scenes
│   │   ├── GlobalGallery.vue         # Ambience + one-shot content browser
│   │   ├── AmbientMixer.vue          # Ambience layer controls
│   │   ├── OneShotPanel.vue          # One-shot trigger grid
│   │   ├── IntensitySlider.vue       # Scene intensity
│   │   └── NowPlayingPanel.vue       # Persistent playback / quick controls
│   ├── stores/
│   │   └── ambientSoundStore.ts      # Scenes, gallery and playback state
│   ├── types.ts                      # Package/entry/scene interfaces
│   └── utils/
│       ├── audioEngine.ts            # Howler.js wrapper
│       ├── packData.ts               # Manifest normalization
│       └── packManager.ts            # IndexedDB package storage
├── assets/
│   └── sounds/                       # Built-in assets (optional)
│       └── (loaded from IndexedDB instead)
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

**pack.json schema:**

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
      "icon": "ra-rain",
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
      "icon": "ra-bell",
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
      "icon": "ra-beer",
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
        }
      ]
    }
  ]
}
```

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
}

export interface SceneDef {
  id: string;
  name: string;
  description?: string;
  icon: string;
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
│ Header: Ambient Sound                    [search] [sidebar]  │
├───────────────────────────────────────────┬──────────────────┤
│ Tabs: Scenes | Ambiences | One-shots       │ Packages         │
│                                           │ ──────────────── │
│ Content for the selected tab              │ All packages     │
│                                           │ Forest           │
│                                           │ Tavern           │
│                                           │ ...              │
│                                           │ ──────────────── │
│                                           │ Create pack      │
│                                           │ Import pack      │
├───────────────────────────────────────────┴──────────────────┤
│ Now Playing / sound control panel                            │
└──────────────────────────────────────────────────────────────┘
```

- Use the existing `ViewHeader`, `QCard`, `TabGroup`, `BaseModal`,
  `SidebarItem`, `IconPicker` and `EmptyState` components.
- The package sidebar is the right drawer. The main page owns the left content.
- “All packages” is the default filter. Selecting a package filters the active
  tab to that package; selecting it again clears the filter.
- Package rows show package icon, name and category. Hover/focus shows delete.
- Create/Import are pinned footer actions, matching the map sidebar pattern.
- The global sound panel is mounted in the app shell, not inside the page.

### 4.2 Scenes tab

The Scenes tab is the default landing view.

**Toolbar**

- Search by scene name, package name or description.
- Filter chips: All packages / current package / linked only.
- Sort: recently updated, name, package.
- “New scene” action is enabled only when a package is selected.

**Scene row/card**

Each scene is a row in a `QCard`/list, not a cover grid. It shows:

- scene icon, name and description preview;
- package name;
- link count (for example, “3 links”);
- last updated time;
- active badge and playing/paused state;
- actions: play/pause, edit, duplicate, delete.

Clicking the row opens the scene editor/read-only detail. Clicking the play
button starts the scene. Clicking the active scene must not restart its music;
it toggles play/pause instead.

**States**

- No packages: empty state with “Import package”.
- Packages but no scenes: “This package has no scenes”.
- No search results: compact empty state with “Clear filters”.
- Loading/importing: spinner and disabled package actions.

### 4.3 Ambiences tab

A global content gallery for ambience entries from all loaded packages.

**Toolbar**

- Search by name, package or category.
- Package filter (synced with the sidebar filter).
- Category chips built from the available categories; include “All”.
- View toggle: grouped list (default) or compact table.

**Ambience row**

- Icon, name and category.
- Package name.
- Number of variations and total samples.
- “Used in N scenes” badge.
- Play/pause toggle; toggling one entry starts it without stopping other active
  ambience entries, so several tracks can play together.
- Variation dropdown; changing it while active swaps that track's sample pool.
- “Add to scene” action.
- Active-in-current-scene indicator.

Preview plays a short, low-volume audition and does not modify the active scene.
“Add to scene” opens the scene picker described in 4.6. Removing an entry from a
scene never deletes it from the gallery.

### 4.4 One-shots tab

A global content gallery for one-shot entries.

- Search and package/category filters behave like the Ambiences tab.
- Group by package, then by category.
- Each row/card shows icon, name, category, package and “Used in N scenes”.
- Primary action is “Preview”; secondary action is “Add to scene”.
- Imported entries show a light import icon.
- Triggering a one-shot from the scene editor/playback panel is independent of
  ambient playback, scene music and ambient volume settings.
- One-shot rows remain visible and playable even when no scene is active.

### 4.5 Scene editor

The scene editor is a standard tabbed `BaseModal` opened from the Scenes tab.
It edits one package-owned scene. Scenes from imported packages are read-only:
the editor hides Save and shows an import warning.

**Tabs**

| Tab           | Fields and controls                                                                        |
| ------------- | ------------------------------------------------------------------------------------------ |
| **Main**      | Name (required), description, icon via `IconPicker`, intensity slider, package (read-only) |
| **Ambiences** | Selected ambience entries, variation selector, volume slider, remove, add entry            |
| **One-shots** | Selected one-shot entries, category grouping, preview, remove, add entry                   |
| **Music**     | Scene-owned music presets by type; variants, add/remove preset and variants                |
| **Links**     | Linked locations, modules, encounters and characters; add/remove links                     |

**Ambiences tab**

- Only ambience entries from the scene’s package can be added.
- Each selected row shows icon, name, variation dropdown, volume slider and
  remove action.
- Volume uses 0–100 with the existing wheel adjustment behavior.
- “Add ambience” opens a filtered gallery picker. Already-selected entries are
  disabled or shown as selected.
- Empty state: “No ambiences in this scene”.
- A variation change swaps the sample pool for that ambience only.

**One-shots tab**

- Only one-shot entries from the scene’s package can be added.
- Rows are grouped by category; each has preview and remove.
- Empty state: “No one-shots in this scene”.
- Adding a one-shot does not start ambient playback.

**Music tab**

- Lists music presets by type (Explore, Combat, Victory) and the variants inside
  each preset.
- Add preset: choose a type and create it.
- Add music: upload one or more variants into a preset.
- Each variant has remove; presets can be removed as a whole.
- Music from another scene or from a global gallery is not selectable.
- There is no shared “music mood” selector; scene music is part of the scene.
- Empty state: “This scene has no music”.

**Links tab**

- Four sections: Locations, Modules, Encounters, Characters.
- “Add link” opens an entity picker with search, grouped by entity type.
- Linked items show type icon, entity name and remove action.
- Entity names link to the entity view.
- Empty state per section: “No linked locations”, etc.

**Footer and validation**

- Save is disabled when the scene name is empty.
- Cancel discards unsaved changes after the standard unsaved-changes guard.
- Duplicate copies the scene configuration and music references but not local
  entity links.
- Delete asks for confirmation, removes links and stops the scene if active.

### 4.6 Scene player dialog

Opening a scene row opens the scene player dialog and starts the scene. It
contains:

- **Global play/pause** — controls the scene music and linked ambiences. It does
  not block one-shots.
- **Music preset bar** — an Off button plus one button per scene music preset
  (for example Explore, Combat, Victory). Only one preset can be active; the Off
  button stops scene music without stopping ambiences. Within a preset the next
  music variant is chosen randomly when the current track ends.
- **Ambiences tab** — linked ambiences grouped by category. Each row shows the
  ambience name and a toggle group of its variations. Only one variation per
  ambience plays at a time; clicking the active variation stops the ambience.
- **One-shots tab** — linked one-shots as cards grouped by category. Clicking a
  card plays that one-shot immediately, independent of music or ambience state.

The dialog closes without stopping playback; the scene remains available from
the Now Playing surface.

### 4.7 Add-to-scene picker

Used from Ambiences and One-shots galleries.

- Modal/dialog with search.
- Lists scenes from the same package only.
- Shows scene icon, name and whether the entry is already present.
- Already-present entries are disabled.
- If the package has no scenes, show “Create a scene first” with a shortcut.
- Confirming adds the reference and closes the picker; a toast confirms the
  action.
- Does not copy audio and does not change the currently playing scene.

### 4.8 Entity views: linked scenes

The same reusable `EntityScenesPanel` appears in the side panel/detail area of:

- locations (`LocationView`);
- modules (`ModuleView`);
- encounters (`EncounterView`);
- characters (`CharacterView`).

Panel contents:

- header “Scenes” with an add action;
- list of linked scenes: scene icon, name, package, active state;
- play/pause action for each linked scene;
- remove-link action;
- empty state: “No scenes linked”;
- current scene highlighted.

The scene picker searches all loaded packages and groups scenes by package.
Selecting a scene starts it; it does not navigate away from the entity view.
Deleting the entity or its package removes the affected links.

### 4.9 Global sound panel

A persistent panel, available on every page, showing the current scene.

**Docked mode**

- Anchored to the bottom, width equal to the page-content area.
- Shows scene icon, scene name, package name and play/pause state.
- Play/pause, stop, master volume, music/ambience/one-shot volume access.
- “Open ambient page” action.
- Quick one-shot tray for the active scene’s one-shots.
- No scene cover art; scene identity is icon + name.

**Floating dialog mode**

- Dragging the panel up detaches it into a centred floating dialog.
- The dialog header centre is positioned under the pointer at detach.
- Detaching begins after a 5 px upward drag.
- The snap/dock zone is 10 px from the page bottom, measured from the dialog’s
  bottom edge.
- The snap catcher arms only after the dialog leaves the bottom zone.
- Docking ends the drag gesture.
- The floating dialog is draggable anywhere on the page and remains within a
  usable viewport area.
- Closing the panel returns it to the docked state.

**One-shot behavior in the panel**

- The quick one-shot tray remains usable when ambient playback is paused.
- Triggering a one-shot does not change the active scene, music or ambience mix.
- One-shots are attenuated by the one-shot bus only, never by ambient master,
  music or ambience buses.

### 4.10 Responsive behavior

**Desktop (≥1024 px)**

- Right package sidebar persistent.
- Scenes and gallery rows in a comfortable 1–2 column layout.
- Scene editor max width around 900 px.
- Docked sound panel matches the page-content width.

**Tablet (600–1023 px)**

- Package sidebar becomes an overlay drawer.
- Scene cards/rows remain list-first; gallery uses 2 columns.
- Scene editor uses most of the viewport height.

**Mobile (<600 px)**

- Tabs scroll horizontally; package sidebar opens as a drawer.
- Scenes are full-width rows; gallery is a single-column list.
- Scene editor opens full-screen or as a bottom sheet.
- Sound panel docks as a bottom sheet; floating mode uses the available width.
- Touch targets are at least 44×44 px; hover-only actions are also available from
  an overflow menu.

### 4.11 Feedback, accessibility and edge states

- Package import: loading spinner, validation error message, retry action.
- Package delete: confirmation includes the number of scenes and entries removed.
- Active scene: visible badge and pulsing state in the app menu/sound panel.
- Paused: play icon and “Paused” status; music disabled: muted music indicator.
- Empty states cover: no packages, no scenes, no gallery entries, no search
  results, no linked entities, no music.
- All icon buttons have `title`/`aria-label`; sliders have accessible labels and
  current values.
- Keyboard: tab order follows the visual order; Escape closes modals/dialogs;
  sliders support arrow keys.
- Respect `prefers-reduced-motion` for pulsing icons and scene transitions.
- Toasts confirm add/remove link, add-to-scene, package import and duplicate.

### 4.12 Component and state mapping

| UI component        | Responsibility                                       | Main state/actions                            |
| ------------------- | ---------------------------------------------------- | --------------------------------------------- |
| `AmbientSoundView`  | Page layout, tabs, package filter, now-playing slot  | `currentPackage`, `activeScene`, `play/pause` |
| `PackageSidebar`    | Package list, import/create/delete, filter           | `packages`, `selectedPackageId`               |
| `SceneList`         | Scene rows, search, sort, actions                    | `scenes`, `activeSceneId`                     |
| `SceneEditor`       | Tabbed scene configuration                           | `draftScene`, `save/cancel/duplicate`         |
| `GlobalGallery`     | Ambience/one-shot browsing                           | `galleryEntries`, `search`, `category`        |
| `AddToScenePicker`  | Add gallery entry to a package scene                 | `entryId`, `scenes`                           |
| `EntityScenesPanel` | Linked scenes in location/module/encounter/character | `links`, `add/remove`, `play`                 |
| `SoundControlPanel` | Docked/floating playback and quick one-shots         | `activeScene`, `playback`, `volumes`          |

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
npm run pack:sound
```

Output:

```
dist/sound-packs/fantasy-forest.spk
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
  path: '/ambient-sound',
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
- Mood states support `continual` and `temporary` modes. Temporary music returns
  to the previous mood after the track ends; continual music keeps looping.
  Each mood can have several music files and one is chosen randomly. Clicking
  the active mood does not restart its music.
- One-shot effects are grouped by category. The pack editor is a standard
  tabbed `BaseModal` with separate tabs for main info, ambient layers,
  one-shots and mood states. Layer, one-shot and mood icons use the shared
  `IconPicker` with the RPG Awesome icon set.
- Sound-pack management lives in the right sidebar. Packs are `SidebarItem`
  rows; clicking a pack loads it and clicking the active pack unloads it.
  Each row has a hover delete action with confirmation. **Create Pack** and
  **Import Pack** are pinned bottom `QItem` controls with side icons, matching
  the map sidebar's bottom control pattern. No empty-library hint is shown.
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
4. Run `npm run pack:sound` to generate the `.spk` file.
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

- scene icon, scene name and playing/paused state;
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
| **P1**   | Scene model + save/load/duplicate; scene library grid; scene detail checklist              | 1–2 weeks    |
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
3. Do we need scene icons beyond the shared icon picker?
4. Is Party EQ required, or is simple music ducking during one-shots enough?
5. Should scene changes participate in undo/redo, or is a simple confirmation
   dialog sufficient?
