# Ambient Sound Configurator - Technical Specification

## 1. Overview

This document describes the Ambient Sound Configurator feature for DMH PWA, inspired by reference applications Syrinscape, Tabletone, and Pocket Bard. The feature enables Game Masters to create immersive soundscapes for tabletop RPG sessions by layering ambient sounds, triggering one-shot effects, and managing mood states.

## 2. Core Concepts

### 2.1 Sound Pack (Scene)

A Sound Pack is a pre-defined collection of audio assets organized around a location or theme. Examples:

- Forest, Tavern, Dungeon, City, Cave, Beach, Graveyard, Castle, etc.

Each Sound Pack contains:

- **Ambient Layers**: Looping background sounds (rain, wind, birds, fire crackling)
- **One-Shot Effects**: Triggerable sound effects (door creak, footsteps, combat sounds)
- **Mood States**: Different musical contexts (Explore, Combat, Victory)
- **Weather Systems**: Context-aware weather that adapts to location

### 2.2 Ambient Layer

A continuous audio loop that plays in the background. Users can:

- Toggle layer on/off
- Adjust individual volume (0-100%)
- Layer multiple sounds simultaneously
- Fade in/out smoothly

Example layers for "Forest":

- Birds chirping
- Wind through trees
- Stream/water flowing
- Distant wildlife
- Insects/crickets

### 2.3 One-Shot Sound Effect

A triggered sound that plays once and stops. Used for:

- Combat: sword swing, spell cast, arrow fired, monster roar
- Exploration: door creak, footstep, key jangle, chest opening
- Environmental: thunder crack, glass breaking, waterfall splash

### 2.4 Mood State

A mode that changes the musical context. Standard states:

- **Explore**: Calm, ambient music for exploration
- **Combat**: Intense, dramatic music for battles
- **Victory**: Triumphant music after combat
- **Rest**: Peaceful music for breaks/camping

Transitions between states should be seamless (crossfade).

### 2.5 Intensity

A slider (0-100%) that dynamically affects audio complexity:

- Low intensity: Simple, minimal arrangement
- High intensity: Full, complex musical arrangement
- Works with both music and ambient layers
- Changes audio dynamically without stopping playback

## 3. Architecture

### 3.1 Directory Structure

```
src/
├── ambient-sound/
│   ├── AmbientSoundView.vue          # Main view
│   ├── components/
│   │   ├── SoundPackSelector.vue     # Pack/scene picker
│   │   ├── AmbientMixer.vue           # Layer mixer panel (includes LayerCard)
│   │   ├── MoodStateControl.vue       # State buttons (Explore/Combat)
│   │   ├── OneShotPanel.vue          # Grid of SFX buttons (includes SFXButton)
│   │   ├── IntensitySlider.vue       # Intensity control
│   │   ├── WeatherPanel.vue          # Weather system toggle
│   │   └── MasterVolumeControl.vue   # Integrated in header
│   ├── stores/
│   │   └── ambientSoundStore.ts      # Pinia store
│   ├── types.ts                      # TypeScript interfaces
│   └── utils/
│       ├── audioEngine.ts            # Howler.js wrapper
│       └── packManager.ts            # IndexedDB pack storage
├── assets/
│   └── sounds/                       # Built-in pack assets (optional)
│       └── (loaded from IndexedDB instead)
```

### 3.2 Sound Pack File Format

Sound packs are distributed as `.spk` files (ZIP archives):

```
my-pack.spk
├── pack.json           # Metadata and configuration
├── icon.png            # Pack thumbnail (optional)
├── layers/             # Ambient loop sounds
│   ├── birds.mp3
│   ├── wind.mp3
│   └── stream.mp3
├── sfx/                # One-shot effects
│   ├── branch_break.mp3
│   └── door_creak.mp3
└── music/              # Mood state music tracks
    ├── explore.mp3
    ├── combat.mp3
    ├── victory.mp3
    └── rest.mp3
```

**pack.json schema:**

```json
{
  "version": "1.0",
  "id": "unique-pack-id",
  "name": "Forest",
  "description": "Dense woodland with streams and wildlife",
  "author": "DMH Team",
  "category": "fantasy",
  "defaultIntensity": 50,
  "layers": [
    {
      "id": "birds",
      "name": "Birds",
      "icon": "🐦",
      "file": "layers/birds.mp3",
      "defaultVolume": 60,
      "loop": true,
      "fadeTime": 0.5
    }
  ],
  "oneShots": [
    {
      "id": "branch_break",
      "name": "Branch Break",
      "icon": "🌿",
      "file": "sfx/branch_break.mp3",
      "category": "exploration",
      "volume": 80,
      "cooldown": 500
    }
  ],
  "weatherSystems": [
    {
      "id": "rain",
      "name": "Rain",
      "icon": "🌧️",
      "file": "weather/rain.mp3",
      "affectsLayers": ["birds", "wind"]
    }
  ],
  "moodStates": [
    {
      "state": "explore",
      "name": "Explore",
      "icon": "🔍",
      "musicFile": "music/explore.mp3"
    }
  ]
}
```

### 3.3 Data Models

```typescript
// src/ambient-sound/types.ts

export interface AmbientSoundPack {
  id: string;
  name: string;
  description: string;
  icon: string;
  categories: AmbientCategory[];
  weatherSystems: WeatherSystem[];
  moodStates: MoodStateConfig[];
  defaultIntensity: number;
}

export interface AmbientCategory {
  id: string;
  name: string;
  layers: AmbientLayer[];
  oneShots: OneShotEffect[];
}

export interface AmbientLayer {
  id: string;
  name: string;
  icon: string;
  audioUrl: string;
  defaultVolume: number;
  loop: boolean;
  fadeTime?: number; // seconds for fade in/out
}

export interface OneShotEffect {
  id: string;
  name: string;
  icon: string;
  audioUrl: string;
  category: 'combat' | 'exploration' | 'environmental' | 'weather';
  volume: number;
  cooldown?: number; // ms between triggers
}

export interface WeatherSystem {
  id: string;
  name: string;
  icon: string;
  layers: AmbientLayer[]; // weather-specific layers
  affectsLocations: string[]; // which ambient layers it modifies
}

export interface MoodStateConfig {
  state: MoodState;
  name: string;
  icon: string;
  musicTrack?: MusicTrack;
  transitionsTo?: MoodState[];
}

export type MoodState = 'explore' | 'combat' | 'victory' | 'rest';

export interface ActiveLayer {
  layerId: string;
  volume: number;
  isPlaying: boolean;
  currentTime: number;
}

export interface AmbientSoundState {
  currentPack: AmbientSoundPack | null;
  activeLayers: Map<string, ActiveLayer>;
  currentMoodState: MoodState;
  intensity: number;
  masterVolume: number;
  isPlaying: boolean;
  weatherActive: WeatherSystem | null;
}
```

## 4. User Interface

### 4.1 Main Layout

```
┌─────────────────────────────────────────────────────┐
│  [Sound Pack Dropdown]              [Master Vol]   │
├─────────────────────────────────────────────────────┤
│  Mood States:  [Explore] [Combat] [Victory] [Rest] │
├─────────────────────────────────────────────────────┤
│  Intensity: ═══════════●═══════  [75%]             │
├─────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────┐   │
│  │  AMBIENT LAYERS                              │   │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐            │   │
│  │  │ 🌧️  │ │ 🔥  │ │ 🌲  │ │ 💧  │  [+]        │   │
│  │  │ Rain│ │ Fire│ │Forest│ │Stream│            │   │
│  │  │ ████│ │ ████│ │  ██  │ │  ██  │            │   │
│  │  │ Vol │ │ Vol │ │ Vol  │ │ Vol  │            │   │
│  │  └─────┘ └─────┘ └─────┘ └─────┘            │   │
│  └─────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────┐   │
│  │  ONE-SHOT EFFECTS              [Weather: 🌧️]│   │
│  │  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐       │   │
│  │  │ 🚪 │ │ 👣 │ │ ⚔️ │ │ ✨  │ │ 🔔  │       │   │
│  │  └────┘ └────┘ └────┘ └────┘ └────┘       │   │
│  │  Door  Foot  Attack  Spell  Bell          │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### 4.2 Component Specifications

#### Sound Pack Selector

- Dropdown showing all available packs
- Search/filter functionality
- Show pack thumbnail/icon
- Display category (Fantasy, Sci-Fi, Horror)
- "Custom" option for user-created mixes

#### Mood State Control

- Four large buttons: Explore, Combat, Victory, Rest
- Visual indication of active state (highlighted)
- Smooth transition animation when switching
- Optional: custom mood states per pack

#### Intensity Slider

- Range: 0-100%
- Shows numeric value
- Affects: music arrangement complexity, layer density
- Real-time update without audio interruption

#### Ambient Mixer Panel

- Grid of layer cards
- Each card shows:
  - Icon
  - Name
  - Volume slider
  - Toggle on/off
  - Play/pause individual
- "Add Layer" button for custom combinations

#### One-Shot Panel

- Grid of SFX buttons
- Categorized tabs: Combat, Exploration, Environmental, Weather
- Visual feedback on trigger (flash/pulse)
- Cooldown indicator for limited triggers
- Long-press for volume adjustment

#### Weather System Toggle

- Dropdown or toggle buttons
- Shows currently active weather
- Weather affects specific ambient layers
- Example: Rain in Forest = muffled birds, dripping sounds

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
- The main page injects `ViewHeader` through `useLayout`; Create Pack and
  Import Pack live in the application header alongside other page actions.
- Page content uses the project's `QCard`/`QCardSection` layout, `TabGroup`,
  tabler icons, CSS theme variables and localized text rather than standalone
  page-level styling.
- A dedicated **Overall control** card owns global play/pause and master volume;
  ambient layers keep their own layer toggles and volume sliders.
- Sound-pack management lives in the right sidebar. **Create Pack** and
  **Import Pack** are pinned bottom `QItem` controls with side icons, matching
  the map sidebar's bottom control pattern.
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

### Creating Packs

To create a sound pack:

1. Create directory `sound-packs/<pack-name>/`
2. Add `pack.json` with metadata
3. Add audio files in layers/, sfx/, music/, weather/ folders
4. Run `npm run pack:sound` to generate `.spk` file
5. Import the `.spk` file in the app
