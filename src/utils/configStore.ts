import { defineStore } from "pinia";
import { type Ref, ref, watch } from "vue";
import { debug } from './debug';

const wrapKey = (key: string) => `dmh-config:${key}`;

const getValue = (key: string, def: unknown = null) => {
  const value = localStorage.getItem(wrapKey(key));
  const result = value ? JSON.parse(value) : def;
  
  debug('configStore - getValue', key, result);
  
  return result; 
};

const removeValue = (key: string) => {
  debug('configStore - removeValue', key);
  
  localStorage.removeItem(wrapKey(key));
};

const setValue = (key: string, value: unknown) => {
  if (typeof value === 'undefined') {
    return removeValue(key)
  }

  debug('configStore - setValue', key, value);

  return localStorage.setItem(wrapKey(key), JSON.stringify(value));
};

export enum JukeboxRepeatMode {
  off = 'off',
  list = 'list',
  track = 'track',
}

export type ConfigStore = {
  jukeboxLastTrackId: Ref<string | null>;
  jukeboxLastTrackProgress: Ref<number>;
  jukeboxLastVolume: Ref<number>;
  jukeboxActivePlaylistId: Ref<string | null>;
  jukeboxRepeatMode: Ref<JukeboxRepeatMode>;
  jukeboxShuffle: Ref<boolean>;
  savedLanguage: Ref<string>;
};

export const useConfigStore = defineStore<'config', ConfigStore>('config', (): ConfigStore => {
  // Define your state here
  const jukeboxLastTrackId = ref<string | null>(getValue('jukeboxLastTrackId', null));
  const jukeboxLastTrackProgress = ref<number>(getValue('jukeboxLastTrackProgress', 0));
  const jukeboxLastVolume = ref<number>(getValue('jukeboxLastVolume', 1));
  const jukeboxActivePlaylistId = ref<string | null>(getValue('jukeboxActivePlaylistId', null));
  const jukeboxRepeatMode = ref<JukeboxRepeatMode>(getValue('jukeboxRepeatMode', JukeboxRepeatMode.off));
  const jukeboxShuffle = ref<boolean>(getValue('jukeboxShuffle', false));
  const savedLanguage = ref<string>(getValue('savedLanguage', 'en'));
  
  const config: ConfigStore = {
    jukeboxLastTrackId,
    jukeboxLastTrackProgress,
    jukeboxLastVolume,
    jukeboxActivePlaylistId,
    jukeboxRepeatMode,
    jukeboxShuffle,
    savedLanguage,
  };
  
  Object.keys(config).forEach((key: string) => {
    watch(config[key as keyof ConfigStore], (value) => setValue(key, value));
  });
  
  debug('configStore', config);

  return config;
});
