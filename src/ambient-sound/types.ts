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
