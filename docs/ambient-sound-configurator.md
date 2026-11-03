# Ambient Sound Configurator - Technical Specification

## 1. Overview

This document describes the Ambient Sound Configurator feature for DMH PWA, inspired by reference applications Syrinscape, Tabletone, and Pocket Bard. The feature enables Game Masters to create immersive soundscapes for tabletop RPG sessions by layering ambient sounds, triggering one-shot effects, and switching between package-defined scenes.

## 2. Core Concepts

### 2.1 Package

An ambient sound package (`.spk`) is a self-contained distributable content unit.
A package contains:

- **audio files** used by its entries and scenes;
- **ambience entries** — loopable background layers;
- **one-shot entries** — triggerable effects;
- **scene configurations** — saved mixes owned by the package.

A package is content, not a running mix. Importing or loading a package registers
its contents but does not start playback automatically.

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
ambience layer. Weather is represented as an ambience category, not as a separate
weather system.

### 2.3 One-shot entry

A one-shot entry is a triggerable sound that plays once. Entries are categorized
(combat, exploration, environmental, weather, and so on), have an icon, a volume
and an optional cooldown. One-shot entries can be referenced by multiple scenes
from the same package.

### 2.4 Scene

A scene is a saved playback configuration owned by a package. It defines:

- which ambience entries are active;
- which variation and volume each active ambience uses;
- which one-shot entries belong to the scene;
- the scene intensity and mix settings;
- the scene's own music.

**Scene music is strictly bound to the scene.** There is no shared mood-state
music and no global music track that outlives the scene. When a scene becomes
active, its music is the music for that scene. Switching scenes stops the old
scene music and starts the new scene's music. A scene may own one or more music
files, but those files are only used by that scene.

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

Removing a package removes its scenes, ambience entries and one-shot entries,
and stops playback if that package is currently active.

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
    │   ├── cover.png         # Scene thumbnail (optional)
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
      "cover": "scenes/tavern/cover.png",
      "intensity": 60,
      "ambiences": [
        { "ambienceId": "rain", "variationId": "light", "volume": 35 }
      ],
      "oneShotIds": ["thunder"],
      "music": {
        "files": ["scenes/tavern/music/theme.mp3"],
        "loop": true
      }
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

export interface SceneMusic {
  files: string[];
  loop: boolean;
}

export interface SceneDef {
  id: string;
  name: string;
  description?: string;
  icon: string;
  cover?: string;
  intensity: number;
  ambiences: SceneAmbience[];
  oneShotIds: string[];
  /** Music owned by this scene; never shared with another scene. */
  music: SceneMusic;
}
```

> Sections 5–12 below are earlier implementation sketches. Where they conflict
> with the package, gallery and scene rules in Sections 2–4, Sections 2–4 are
> authoritative.

## 4. User Interface

### 4.1 Main layout

The ambient-sound area has three primary surfaces:

- **Scenes list** — all scenes from loaded packages. Selecting a scene applies
  its configuration and starts its scene-bound music.
- **Global gallery** — all ambience and one-shot entries from loaded packages,
  grouped by package and category. Entries are content; they do not play just
  because they are visible.
- **Scene detail/editor** — the mix for one package-owned scene: active
  ambience entries, variations, volumes, one-shot selection, intensity, cover
  and music.

A persistent **Now Playing / sound control panel** shows the current scene and
provides playback, quick volume and expand/detach controls.

### 4.2 Scenes list

- Shows package scenes with cover, name, package name and last updated time.
- Selecting a scene starts it; selecting the active scene does not restart its
  music.
- Scene actions: play, edit, duplicate (as a new scene in the same package) and
  delete.
- Removing a package removes its scenes from this list.

### 4.3 Global gallery

- Combines ambience and one-shot entries from all loaded packages.
- Groups by package and then by entry category.
- Supports search, preview and “add to scene”.
- Adding an entry to a scene creates a reference; it does not copy audio.
- Entries remain bound to their source package.

### 4.4 Scene editor

- Main info: name, description, cover, intensity.
- Ambience tab: selected ambience entries, variation, volume per entry.
- One-shots tab: selected one-shot entries available to trigger in the scene.
- Music tab: files owned by this scene. Music is always scene-bound; it cannot
  be reused as a global mood track.
- Uses the standard tabbed `BaseModal`/editor pattern and the shared
  `IconPicker`.

### 4.5 Playback controls

- Scene play/pause and stop.
- Master, music, ambience and one-shot volume buses.
- Per-ambience toggle and volume; one sample per ambience plays at a time.
- One-shot trigger grid.
- Scene switching crossfades or stops the old scene music and starts the new
  scene's music.

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
- **Scene Transitions**: Link sound pack to campaign locations/notes
- **Timer Integration**: Auto-change mood states on encounter timer
- **Hotkeys**: Keyboard shortcuts for common SFX
- **Mobile Optimization**: Larger touch targets, haptic feedback on SFX

## 11. Acceptance Criteria

1. ✅ User can select from multiple sound packs (Forest, Tavern, Dungeon, etc.)
2. ✅ User can toggle ambient layers on/off with individual volume control
3. ✅ User can switch between mood states (Explore/Combat/Victory/Rest)
4. ✅ One-shot SFX play immediately on button press
5. ✅ Intensity slider affects audio complexity in real-time
6. ✅ Weather system modifies ambient sounds appropriately
7. ✅ Audio continues playing in background (when navigating away)
8. ✅ Settings persist across sessions
9. ✅ Works offline with cached audio
10. ✅ Smooth audio transitions (no abrupt cuts)

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
   and scene-owned covers/music under `scenes/<scene-id>/`.
4. Run `npm run pack:sound` to generate the `.spk` file.
5. Import the `.spk` file in the app; its scenes appear in the scenes list and
   its entries appear in the global gallery.

## 14. Pocket Bard-Inspired Proposals

> **Status:** proposal only — none of this section is implemented yet.
> Based on the reference screenshots in `content/pocketbard/` and the current
> ambient-sound implementation.

### 14.1 What to borrow from Pocket Bard

The screenshots show a scene-centric product rather than a pack-centric mixer:

- **Scenes** are the primary library object, with cover art, description,
  Preview/Play and last-updated metadata.
- **Ambiences** and **One-shots** are separate libraries with category chips.
- **Scene editing** is a checklist: “Added to scene”, grouped by category, with
  Remove All and a clear empty/complete state.
- **Table controls** are fast: mood pills, an intensity slider, per-layer
  I/II/III buttons and a variation dropdown.
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
  cover?: string;
  intensity: number;
  ambiences: Array<{
    ambienceId: string;
    variationId: string;
    volume: number;
  }>;
  oneShotIds: string[];
  music: {
    files: string[];
    loop: boolean;
  };
}
```

Scene music is always owned by the scene. There is no shared mood-state music
track and no cross-scene music selection. Loading a package registers its scenes
in the scenes list and its ambience/one-shot entries in the global gallery.

### 14.3 Proposed experience

#### Persistent Now Playing bar

Present on all pages, not only the ambient page:

- scene cover, scene name and playing/paused state;
- play/pause, stop with fade and a quick master volume;
- tap to open the full mixer;
- optional previous/next scene once a scene queue exists.

The bar belongs in the app shell, above the bottom navigation on mobile. This
makes ambient audio feel integrated with the rest of the DMH instead of being a
separate destination.

#### Ambient page as a three-tab library

Replace the current vertical control stack with:

- **Scenes** — cover grid, search, last updated, Preview/Play.
- **Ambiences** — grouped rows with icon, name, category and active state.
- **One-shots** — category grid with large touch targets and a Manage action.

Reuse the existing `TabGroup`, `QCard`, `EmptyState`, `SidebarItem` and
`BaseModal` patterns. On mobile, scene details should open as a bottom sheet
rather than a large centred modal.

#### Scene detail and scene editing

Mirror the Pocket Bard scene detail screen:

- cover, description and last updated;
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

Pocket Bard stops at scenes. DMH can connect them to the session workflow:

- attach a scene to an **encounter** and offer “Start scene” when combat begins;
- attach a scene to a **map location** or **note**;
- offer mood transitions on combat start, combat end and victory;
- always ask for confirmation before an automatic switch.

This is the main differentiator and should be treated as a later phase, after
the scene model is stable.

### 14.5 Suggested delivery order

| Priority | Work                                                                                       | Rough effort |
| -------- | ------------------------------------------------------------------------------------------ | ------------ |
| **P0**   | Now Playing bar; library tabs/category chips; 3-state layer controls; audio settings buses | 3–5 days     |
| **P1**   | Scene model + save/load/duplicate; scene library grid; scene detail checklist              | 1–2 weeks    |
| **P2**   | Pack credits; search/favourites; drag reorder; scene crossfade                             | ~1 week      |
| **P3**   | Encounter/map/note scene links; Party EQ/ducking; scene export/import                      | later        |

### 14.6 Architectural notes

- Extend the package manifest with optional `credits` and `licence` fields while
  keeping existing manifests readable during migration.
- Parse scenes from the package manifest into the scenes list on load, and
  register ambience/one-shot entries in the global gallery.
- Keep scene references package-local: a scene may only reference entries from
  its own package.
- Store scene covers and music as package assets; scene music is never shared
  between scenes.
- Extend `AudioEngine` with independent music, ambience and one-shot gains and
  scene-level fade/crossfade helpers.
- Mount the Now Playing bar in the layout shell, not inside
  `AmbientSoundView.vue`, so it survives route changes.
- Keep the local-first model: no marketplace, accounts or remote scene sharing
  in the first iteration.

### 14.7 Explicitly not planned

- A Discover/Profile-style marketplace navigation. The application is
  local-first; Packs and Scenes are enough unless shared content is introduced.
- Copying Pocket Bard’s exact parchment visual style. The layout and hierarchy
  can be borrowed while keeping the existing dark Quasar theme.
- Automatic scene switching without user confirmation.

### 14.8 Open questions

1. Should a scene be allowed to reference entries from multiple packages, or
   stay strictly package-local? The current model keeps scenes package-local.
2. Should “Preview” play the scene quietly in place, or temporarily replace the
   current playback and restore it on stop?
3. Do we need user-created scene covers, or can covers be generated from the
   linked map/location image?
4. Is Party EQ required, or is simple music ducking during one-shots enough?
5. Should scene changes participate in undo/redo, or is a simple confirmation
   dialog sufficient?
