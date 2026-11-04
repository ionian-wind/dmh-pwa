export interface SoundPackManifest {
  version: string;
  id: string;
  name: string;
  description: string;
  author?: string;
  icon?: string;
  category: 'fantasy' | 'scifi' | 'horror' | 'modern' | 'custom';
  defaultIntensity?: number;
  /** New package model: ambience entries. */
  ambiences?: LayerDef[];
  /** New package model: scene configurations. */
  scenes?: SceneDef[];
  /** Legacy field, normalized into `ambiences`. */
  layers?: LayerDef[];
  oneShots?: OneShotDef[];
  /** Legacy pre-scene music model, normalized into scenes. */
  moodStates?: MoodStateDef[];
  /** Legacy weather entries, normalized into ambience categories. */
  weatherSystems?: WeatherDef[];
}

export type AmbienceDef = LayerDef;

export interface SceneAmbience {
  ambienceId: string;
  variationId: string;
  volume: number;
}

export interface SceneMusicPreset {
  id: string;
  name: string;
  files: string[];
  /** `temporary` presets return to the previous preset when their track ends. */
  mode?: MoodMode;
}

/** Legacy scene music shape; normalized into `musicPresets`. */
export interface SceneMusic {
  files: string[];
  loop: boolean;
}

export interface SceneDef {
  id: string;
  name: string;
  description?: string;
  intensity: number;
  ambiences: SceneAmbience[];
  oneShotIds: string[];
  /** Music presets owned by this scene; each preset selects one music type. */
  musicPresets: SceneMusicPreset[];
  /** Legacy scene music shape, normalized into `musicPresets`. */
  music?: SceneMusic;
}

export interface NormalizedSoundPack extends SoundPackManifest {
  ambiences: LayerDef[];
  layers: LayerDef[];
  oneShots: OneShotDef[];
  scenes: SceneDef[];
  /** Set by local storage, never exported inside the package manifest. */
  origin?: 'imported' | 'created';
}

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

export interface SceneRef {
  packageId: string;
  sceneId: string;
}

export interface GalleryAmbience {
  packageId: string;
  pack: NormalizedSoundPack;
  ambience: LayerDef;
}

export interface GalleryOneShot {
  packageId: string;
  pack: NormalizedSoundPack;
  oneShot: OneShotDef;
}

export interface LayerVariation {
  id: string;
  name: string;
  /** File paths relative to the pack's `layers/` directory. */
  samples: string[];
}

export interface LayerDef {
  id: string;
  name: string;
  icon: string;
  /** Group heading used by the ambient mixer. */
  category?: string;
  defaultVolume: number;
  loop: boolean;
  fadeTime?: number;
  /** Legacy single-file layer. */
  file?: string;
  /** Multiple samples for a single flat variation. */
  samples?: string[];
  /** Named variations; each variation has its own sample pool. */
  variations?: LayerVariation[];
}

export interface OneShotDef {
  id: string;
  name: string;
  icon: string;
  /** Legacy single sample; normalized into `samples`. */
  file?: string;
  /** One or more samples; one is picked randomly for each play. */
  samples?: string[];
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

export type MoodMode = 'temporary' | 'continual';

export interface MoodStateDef {
  state: MoodState;
  name: string;
  icon: string;
  /** Temporary music switches back to the previous mood when it ends. */
  mode?: MoodMode;
  /** Legacy single music file. */
  musicFile?: string;
  /** Several files are picked randomly. */
  musicFiles?: string[];
  transitionsTo?: MoodState[];
}

export type MoodState = 'explore' | 'combat' | 'victory' | 'rest';

export interface ActiveLayer {
  layerId: string;
  variationId: string;
  sampleIndex: number;
  volume: number;
  isPlaying: boolean;
}

export interface SoundPackData {
  manifest: SoundPackManifest;
  loaded: boolean;
  loading: boolean;
  layers: Map<string, string>;
  oneShots: Map<string, string>;
  music: Map<string, string>;
  weather: Map<string, string>;
}

export interface AmbientSoundState {
  currentPack: SoundPackManifest | null;
  packData: SoundPackData | null;
  activeLayers: Map<string, ActiveLayer>;
  currentMoodState: MoodState;
  intensity: number;
  masterVolume: number;
  isPlaying: boolean;
  storedPacks: SoundPackManifest[];
}
