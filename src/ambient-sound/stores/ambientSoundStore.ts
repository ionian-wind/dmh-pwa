import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  SoundPackManifest,
  MoodState,
  ActiveLayer,
  LayerDef,
  OneShotDef,
} from '../types';
import { audioEngine } from '../utils/audioEngine';
import * as packManager from '../utils/packManager';
import {
  getLayerVariations,
  getMoodMode,
  getMoodMusicFiles,
} from '../utils/packData';

export const useAmbientSoundStore = defineStore('ambient-sound', () => {
  const currentPack = ref<SoundPackManifest | null>(null);
  const activeLayers = ref<Map<string, ActiveLayer>>(new Map());
  const layerVariationSelections = ref<Map<string, string>>(new Map());
  const currentMoodState = ref<MoodState>('explore');
  const previousMoodState = ref<MoodState | null>(null);
  const temporaryMusicActive = ref(false);
  const intensity = ref(50);
  const masterVolume = ref(80);
  const isPlaying = ref(false);
  const musicEnabled = ref(true);
  const storedPacks = ref<SoundPackManifest[]>([]);
  const loading = ref(false);
  const loadedAudioUrls = ref<Map<string, string>>(new Map());

  const hasActiveLayers = computed(() => activeLayers.value.size > 0);

  function layerByVariationId(layer: LayerDef) {
    const variations = getLayerVariations(layer);
    return variations.length > 0 ? variations : [];
  }

  function selectedVariation(layer: LayerDef) {
    const variations = layerByVariationId(layer);
    const selectedId = layerVariationSelections.value.get(layer.id);
    return (
      variations.find((variation) => variation.id === selectedId) ??
      variations[0] ??
      null
    );
  }

  function layerSampleUrl(
    layerId: string,
    variationId: string,
    sampleIndex: number,
  ) {
    return loadedAudioUrls.value.get(
      `layer:${layerId}:${variationId}:${sampleIndex}`,
    );
  }

  function loadLayerSample(
    layer: LayerDef,
    variationId: string,
    sampleIndex: number,
  ) {
    const url = layerSampleUrl(layer.id, variationId, sampleIndex);
    if (!url) return false;
    audioEngine.loadLayer(layer.id, url, true);
    return true;
  }

  function randomSampleIndex(samples: string[]) {
    return samples.length > 0 ? Math.floor(Math.random() * samples.length) : 0;
  }

  function musicSampleFor(state: MoodState) {
    const mood = currentPack.value?.moodStates.find(
      (entry) => entry.state === state,
    );
    if (!mood) return null;
    const files = getMoodMusicFiles(mood);
    if (files.length === 0) return null;
    const index = randomSampleIndex(files);
    return {
      mood,
      url: loadedAudioUrls.value.get(`music:${state}:${index}`),
      loop: getMoodMode(mood) !== 'temporary',
    };
  }

  function playMoodMusic(useTransition: boolean) {
    if (!isPlaying.value || !musicEnabled.value || !currentPack.value) return;
    const sample = musicSampleFor(currentMoodState.value);
    if (!sample?.url) return;

    if (useTransition) {
      audioEngine.transitionToMusic(
        currentMoodState.value,
        sample.url,
        intensity.value / 100,
        sample.loop,
      );
    } else {
      audioEngine.loadMusic(currentMoodState.value, sample.url, sample.loop);
      audioEngine.playMusic(intensity.value / 100);
    }
  }

  function applyMood(
    state: MoodState,
    rememberPrevious: boolean,
    useTransition: boolean,
  ) {
    if (!currentPack.value) return;
    const mood = currentPack.value.moodStates.find(
      (entry) => entry.state === state,
    );
    if (!mood) return;

    const previous = currentMoodState.value;
    currentMoodState.value = state;
    if (rememberPrevious) {
      previousMoodState.value =
        previous !== state ? previous : previousMoodState.value;
    } else {
      previousMoodState.value = null;
    }
    temporaryMusicActive.value =
      getMoodMode(mood) === 'temporary' && isPlaying.value;

    if (isPlaying.value && musicEnabled.value) {
      playMoodMusic(useTransition);
    }
  }

  function handleMusicEnd() {
    if (!temporaryMusicActive.value || !previousMoodState.value) return;
    const previous = previousMoodState.value;
    temporaryMusicActive.value = false;
    applyMood(previous, false, true);
  }

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
      layerVariationSelections.value.clear();
      currentMoodState.value = 'explore';
      previousMoodState.value = null;
      temporaryMusicActive.value = false;
      intensity.value = pack.defaultIntensity || 50;
      loadedAudioUrls.value.clear();

      const audioBlobs = await packManager.getPackAudioBlobs(pack.id);

      for (const layer of pack.layers) {
        const variations = getLayerVariations(layer);
        if (variations[0]) {
          layerVariationSelections.value.set(layer.id, variations[0].id);
        }
        for (const variation of variations) {
          variation.samples.forEach((sample, index) => {
            const blob = audioBlobs[`layers/${sample}`];
            if (blob) {
              loadedAudioUrls.value.set(
                `layer:${layer.id}:${variation.id}:${index}`,
                URL.createObjectURL(blob),
              );
            }
          });
        }
      }

      for (const sfx of pack.oneShots) {
        const blob = audioBlobs[`sfx/${sfx.file}`];
        if (blob) {
          loadedAudioUrls.value.set(`sfx:${sfx.id}`, URL.createObjectURL(blob));
        }
      }

      for (const mood of pack.moodStates) {
        getMoodMusicFiles(mood).forEach((musicFile, index) => {
          const blob = audioBlobs[`music/${musicFile}`];
          if (blob) {
            loadedAudioUrls.value.set(
              `music:${mood.state}:${index}`,
              URL.createObjectURL(blob),
            );
          }
        });
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
      layerVariationSelections.value.clear();
      currentPack.value = null;
      previousMoodState.value = null;
      temporaryMusicActive.value = false;
      isPlaying.value = false;
    }
  }

  function toggleLayer(layerId: string, variationId?: string): void {
    if (!currentPack.value) return;

    const layer = currentPack.value.layers.find(
      (entry) => entry.id === layerId,
    );
    if (!layer) return;

    const active = activeLayers.value.get(layerId);
    if (active) {
      activeLayers.value.delete(layerId);
      audioEngine.stopLayer(layerId);
      return;
    }

    const variation = variationId
      ? layerByVariationId(layer).find((entry) => entry.id === variationId)
      : selectedVariation(layer);
    if (!variation) return;

    const sampleIndex = randomSampleIndex(variation.samples);
    layerVariationSelections.value.set(layerId, variation.id);
    loadLayerSample(layer, variation.id, sampleIndex);

    const volume = layer.defaultVolume / 100;
    activeLayers.value.set(layerId, {
      layerId,
      variationId: variation.id,
      sampleIndex,
      volume,
      isPlaying: true,
    });
    if (isPlaying.value) {
      audioEngine.playLayer(layerId, volume);
    }
  }

  function setLayerVariation(layerId: string, variationId: string): void {
    const layer = currentPack.value?.layers.find(
      (entry) => entry.id === layerId,
    );
    if (!layer) return;
    const variation = layerByVariationId(layer).find(
      (entry) => entry.id === variationId,
    );
    if (!variation) return;

    layerVariationSelections.value.set(layerId, variation.id);
    const active = activeLayers.value.get(layerId);
    if (!active) return;

    audioEngine.stopLayer(layerId);
    const sampleIndex = randomSampleIndex(variation.samples);
    active.variationId = variation.id;
    active.sampleIndex = sampleIndex;
    loadLayerSample(layer, variation.id, sampleIndex);
    if (isPlaying.value) {
      audioEngine.playLayer(layerId, active.volume);
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
      audioEngine.playLayer(layerId, active.volume);
    }

    if (musicEnabled.value) {
      playMoodMusic(false);
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
    if (
      state === currentMoodState.value &&
      isPlaying.value &&
      musicEnabled.value
    ) {
      return;
    }
    applyMood(state, true, true);
  }

  function setIntensity(value: number): void {
    intensity.value = Math.max(0, Math.min(100, value));
    if (isPlaying.value && musicEnabled.value) {
      audioEngine.setMusicVolume(intensity.value / 100);
    }
  }

  function setMasterVolume(volume: number): void {
    masterVolume.value = Math.max(0, Math.min(100, volume));
    audioEngine.setMasterVolume(masterVolume.value / 100);
  }

  function setMusicEnabled(value: boolean): void {
    musicEnabled.value = value;
    if (!value) {
      audioEngine.stopMusic(false);
      return;
    }
    if (!isPlaying.value) return;
    playMoodMusic(false);
  }

  function toggleMusic(): void {
    setMusicEnabled(!musicEnabled.value);
  }

  function playOneShot(sfxId: string): void {
    if (!currentPack.value) return;

    const sfx = currentPack.value.oneShots.find((s) => s.id === sfxId);
    if (sfx) {
      audioEngine.playOneShot(sfxId, sfx.volume / 100);
    }
  }

  audioEngine.setMusicEndHandler(handleMusicEnd);

  return {
    currentPack,
    activeLayers,
    layerVariationSelections,
    currentMoodState,
    previousMoodState,
    temporaryMusicActive,
    intensity,
    masterVolume,
    isPlaying,
    musicEnabled,
    storedPacks,
    loading,
    hasActiveLayers,
    loadStoredPacks,
    loadPack,
    importPack,
    deletePack,
    unloadPack,
    toggleLayer,
    setLayerVariation,
    setLayerVolume,
    play,
    pause,
    togglePlayPause,
    setMoodState,
    setIntensity,
    setMasterVolume,
    setMusicEnabled,
    toggleMusic,
    playOneShot,
  };
});
