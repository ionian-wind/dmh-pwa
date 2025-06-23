import { defineStore } from "pinia";
import {Ref, ref, watch} from "vue";

const wrapKey = (key: string) => `dmh-config:${key}`;

const getValue = (key: string, def: unknown = null) => {
  const value = localStorage.getItem(wrapKey(key));
  const result = value ? JSON.parse(value) : def;
  
  console.log('configStore - getValue', key, result);
  
  return result; 
};

const removeValue = (key: string) => {
  console.log('configStore - removeValue', key);
  
  localStorage.removeItem(wrapKey(key));
};

const setValue = (key: string, value: unknown) => {
  if (typeof value === 'undefined') {
    return removeValue(key)
  }

  console.log('configStore - setValue', key, value);

  return localStorage.setItem(wrapKey(key), JSON.stringify(value));
};

export const useConfigStore = defineStore('config', () => {
  // Define your state here
  const currentModuleFilter = ref<string | null>(getValue('currentModuleFilter', null));
  
  // Jukebox state
  const lastTrackId = ref<string | null>(getValue('lastTrackId', null));
  const lastTrackProgress = ref<number>(getValue('lastTrackProgress', 0));
  const lastVolume = ref<number>(getValue('lastVolume', 1));
  const activePlaylistId = ref<string | null>(getValue('activePlaylistId', null));

  const config: Record<string, Ref> = {
    currentModuleFilter,
    lastTrackId,
    lastTrackProgress,
    lastVolume,
    activePlaylistId,
  };
  
  Object.keys(config).forEach((key: string) => {
    watch(config[key], (value) => setValue(key, value));
  });
  
  return config;
});
