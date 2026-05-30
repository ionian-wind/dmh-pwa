import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  SoundPackManifest,
  MoodState,
  ActiveLayer,
  WeatherDef,
  LayerDef,
  OneShotDef,
  MoodStateDef,
} from '../types';
import { audioEngine } from '../utils/audioEngine';
import * as packManager from '../utils/packManager';

export const useAmbientSoundStore = defineStore('ambient-sound', () => {
  const currentPack = ref<SoundPackManifest | null>(null);
  const activeLayers = ref<Map<string, ActiveLayer>>(new Map());
  const currentMoodState = ref<MoodState>('explore');
  const intensity = ref(50);
  const masterVolume = ref(80);
  const isPlaying = ref(false);
  const weatherActive = ref<WeatherDef | null>(null);
  const storedPacks = ref<SoundPackManifest[]>([]);
  const loading = ref(false);
  const loadedAudioUrls = ref<Map<string, string>>(new Map());

  const hasActiveLayers = computed(() => activeLayers.value.size > 0);

  async function loadStoredPacks(): Promise<void> {
    storedPacks.value = await packManager.getStoredPacks();
  }

  async function loadPack(pack: SoundPackManifest): Promise<void> {
    if (currentPack.value?.id === pack.id) {
      return;
    }

    loading.value = true;

    try {
      currentPack.value = pack;
      activeLayers.value.clear();
      currentMoodState.value = 'explore';
      intensity.value = pack.defaultIntensity || 50;
      weatherActive.value = null;
      loadedAudioUrls.value.clear();

      const audioBlobs = await packManager.getPackAudioBlobs(pack.id);

      for (const layer of pack.layers) {
        const blobKey = `layers/${layer.file}`;
        if (audioBlobs[blobKey]) {
          const url = URL.createObjectURL(audioBlobs[blobKey]);
          loadedAudioUrls.value.set(`layer:${layer.id}`, url);
          audioEngine.loadLayer(layer.id, url);
        }
      }

      for (const sfx of pack.oneShots) {
        const blobKey = `sfx/${sfx.file}`;
        if (audioBlobs[blobKey]) {
          const url = URL.createObjectURL(audioBlobs[blobKey]);
          loadedAudioUrls.value.set(`sfx:${sfx.id}`, url);
          audioEngine.loadOneShot(sfx.id, url);
        }
      }

      const exploreMood = pack.moodStates.find((m) => m.state === 'explore');
      if (exploreMood?.musicFile) {
        const blobKey = `music/${exploreMood.musicFile}`;
        if (audioBlobs[blobKey]) {
          const url = URL.createObjectURL(audioBlobs[blobKey]);
          loadedAudioUrls.value.set(`music:explore`, url);
          audioEngine.loadMusic('explore', url);
        }
      }

      if (pack.weatherSystems && pack.weatherSystems.length > 0) {
        const weather = pack.weatherSystems[0];
        if (weather.file) {
          const blobKey = `weather/${weather.file}`;
          if (audioBlobs[blobKey]) {
            const url = URL.createObjectURL(audioBlobs[blobKey]);
            loadedAudioUrls.value.set(`weather:${weather.id}`, url);
            audioEngine.loadWeather(weather.id, url);
          }
        }
      }

      audioEngine.setMasterVolume(masterVolume.value / 100);
    } finally {
      loading.value = false;
    }
  }

  async function importPack(file: File): Promise<void> {
    loading.value = true;
    try {
      const manifest = await packManager.importSoundPack(file);
      storedPacks.value = await packManager.getStoredPacks();
      await loadPack(manifest);
    } finally {
      loading.value = false;
    }
  }

  async function deletePack(packId: string): Promise<void> {
    await packManager.deletePack(packId);
    if (currentPack.value?.id === packId) {
      unloadPack();
    }
    storedPacks.value = await packManager.getStoredPacks();
  }

  function unloadPack(): void {
    if (currentPack.value) {
      for (const [, url] of loadedAudioUrls.value) {
        URL.revokeObjectURL(url);
      }
      loadedAudioUrls.value.clear();
      audioEngine.stopAll();
      activeLayers.value.clear();
      currentPack.value = null;
      weatherActive.value = null;
      isPlaying.value = false;
    }
  }

  function toggleLayer(layerId: string): void {
    if (!currentPack.value) return;

    const layer = currentPack.value.layers.find((l) => l.id === layerId);
    if (!layer) return;

    const active = activeLayers.value.get(layerId);
    if (active) {
      activeLayers.value.delete(layerId);
      audioEngine.stopLayer(layerId);
    } else {
      activeLayers.value.set(layerId, {
        layerId,
        volume: layer.defaultVolume / 100,
        isPlaying: true,
      });
      if (isPlaying.value) {
        audioEngine.playLayer(layerId, layer.defaultVolume / 100);
      }
    }
  }

  function setLayerVolume(layerId: string, volume: number): void {
    const active = activeLayers.value.get(layerId);
    if (active) {
      active.volume = volume;
      audioEngine.setLayerVolume(layerId, volume);
    }
  }

  function play(): void {
    if (!currentPack.value) return;

    isPlaying.value = true;

    for (const [layerId, active] of activeLayers.value) {
      const layer = currentPack.value.layers.find((l) => l.id === layerId);
      if (layer) {
        audioEngine.playLayer(layerId, active.volume);
      }
    }

    const exploreMood = currentPack.value.moodStates.find(
      (m) => m.state === currentMoodState.value,
    );
    if (exploreMood?.musicFile) {
      audioEngine.playMusic(intensity.value / 100);
    }

    if (weatherActive.value) {
      audioEngine.playWeather(0.5);
    }
  }

  function pause(): void {
    isPlaying.value = false;
    audioEngine.pauseAll();
  }

  function togglePlayPause(): void {
    if (isPlaying.value) {
      pause();
    } else {
      play();
    }
  }

  function setMoodState(state: MoodState): void {
    if (!currentPack.value) return;

    currentMoodState.value = state;

    if (!isPlaying.value) return;

    const mood = currentPack.value.moodStates.find((m) => m.state === state);
    if (mood?.musicFile) {
      const musicKey = `music:${state}`;
      const url = loadedAudioUrls.value.get(musicKey);
      if (url) {
        audioEngine.transitionToMusic(state, url, intensity.value / 100);
      } else {
        packManager.getPackAudioBlobs(currentPack.value.id).then((blobs) => {
          const blobKey = `music/${mood.musicFile}`;
          if (blobs[blobKey]) {
            const newUrl = URL.createObjectURL(blobs[blobKey]);
            loadedAudioUrls.value.set(musicKey, newUrl);
            audioEngine.transitionToMusic(state, newUrl, intensity.value / 100);
          }
        });
      }
    }
  }

  function setIntensity(value: number): void {
    intensity.value = Math.max(0, Math.min(100, value));
    if (isPlaying.value) {
      audioEngine.setMusicVolume(intensity.value / 100);
    }
  }

  function setMasterVolume(volume: number): void {
    masterVolume.value = Math.max(0, Math.min(100, volume));
    audioEngine.setMasterVolume(masterVolume.value / 100);
  }

  function toggleWeather(weather: WeatherDef | null): void {
    if (!currentPack.value) return;

    if (weatherActive.value?.id === weather?.id) {
      weatherActive.value = null;
      audioEngine.stopWeather();
    } else {
      weatherActive.value = weather;
      if (isPlaying.value && weather) {
        const weatherKey = `weather:${weather.id}`;
        const url = loadedAudioUrls.value.get(weatherKey);
        if (url) {
          audioEngine.playWeather(0.5);
        }
      }
    }
  }

  function playOneShot(sfxId: string): void {
    if (!currentPack.value) return;

    const sfx = currentPack.value.oneShots.find((s) => s.id === sfxId);
    if (sfx) {
      audioEngine.playOneShot(sfxId, sfx.volume / 100);
    }
  }

  return {
    currentPack,
    activeLayers,
    currentMoodState,
    intensity,
    masterVolume,
    isPlaying,
    weatherActive,
    storedPacks,
    loading,
    hasActiveLayers,
    loadStoredPacks,
    loadPack,
    importPack,
    deletePack,
    unloadPack,
    toggleLayer,
    setLayerVolume,
    play,
    pause,
    togglePlayPause,
    setMoodState,
    setIntensity,
    setMasterVolume,
    toggleWeather,
    playOneShot,
  };
});
