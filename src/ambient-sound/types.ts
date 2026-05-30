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

export type MoodState = 'explore' | 'combat' | 'victory' | 'rest';

export interface ActiveLayer {
  layerId: string;
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
  weatherActive: WeatherDef | null;
  storedPacks: SoundPackManifest[];
}
