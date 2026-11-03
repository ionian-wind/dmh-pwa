import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type {
  ActiveLayer,
  GalleryAmbience,
  GalleryOneShot,
  LayerDef,
  NormalizedSoundPack,
  OneShotDef,
  SceneDef,
  SceneEntityLink,
  SceneLinkEntityType,
  SceneRef,
} from '../types';
import { audioEngine } from '../utils/audioEngine';
import * as packManager from '../utils/packManager';
import {
  getAudioFormat,
  getLayerVariations,
  getSceneMusicFile,
} from '../utils/packData';

const LINKS_STORAGE_KEY = 'dmh-ambient-scene-links';

function sceneKey(packId: string, sceneId: string): string {
  return `${packId}::${sceneId}`;
}

function audioKey(packId: string, path: string): string {
  return `${packId}:${path}`;
}

function layerKey(packId: string, ambienceId: string): string {
  return `${packId}:${ambienceId}`;
}

function oneShotKey(packId: string, oneShotId: string): string {
  return `oneShot:${packId}:${oneShotId}`;
}

function randomIndex(length: number): number {
  return length > 0 ? Math.floor(Math.random() * length) : 0;
}

const INTENSITY_STEP = 25;

function snapIntensity(value: number): number {
  const clamped = Math.max(0, Math.min(100, value));
  return Math.round(clamped / INTENSITY_STEP) * INTENSITY_STEP;
}

function loadLinks(): SceneEntityLink[] {
  try {
    const raw = localStorage.getItem(LINKS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SceneEntityLink[]) : [];
  } catch {
    return [];
  }
}

function saveLinks(links: SceneEntityLink[]): void {
  localStorage.setItem(LINKS_STORAGE_KEY, JSON.stringify(links));
}

export const useAmbientSoundStore = defineStore('ambient-sound', () => {
  const storedPacks = ref<NormalizedSoundPack[]>([]);
  const selectedPackId = ref<string | null>(null);
  const activeSceneKey = ref<string | null>(null);
  const activeLayers = ref<Map<string, ActiveLayer>>(new Map());
  const sceneLinks = ref<SceneEntityLink[]>(loadLinks());
  const isPlaying = ref(false);
  const musicEnabled = ref(true);
  const activeMusicPresetId = ref<string | null>(null);
  const intensity = ref(50);
  const masterVolume = ref(80);
  const loading = ref(false);
  const loadedPackIds = ref<Set<string>>(new Set());
  const loadedAudioUrls = ref<Map<string, string>>(new Map());
  const previewLayerId = ref<string | null>(null);
  const playingOneShotCounts = ref<Map<string, number>>(new Map());

  const selectedPack = computed(
    () =>
      storedPacks.value.find((pack) => pack.id === selectedPackId.value) ??
      null,
  );

  const allScenes = computed(() =>
    storedPacks.value.flatMap((pack) =>
      pack.scenes.map((scene) => ({ pack, scene })),
    ),
  );

  const galleryAmbiences = computed<GalleryAmbience[]>(() =>
    storedPacks.value.flatMap((pack) =>
      pack.ambiences.map((ambience) => ({
        packageId: pack.id,
        pack,
        ambience,
      })),
    ),
  );

  const galleryOneShots = computed<GalleryOneShot[]>(() =>
    storedPacks.value.flatMap((pack) =>
      pack.oneShots.map((oneShot) => ({
        packageId: pack.id,
        pack,
        oneShot,
      })),
    ),
  );

  const activeScene = computed(() => {
    if (!activeSceneKey.value) return null;
    return (
      allScenes.value.find(
        ({ pack, scene }) =>
          sceneKey(pack.id, scene.id) === activeSceneKey.value,
      ) ?? null
    );
  });

  const hasActiveLayers = computed(() => activeLayers.value.size > 0);

  function findPack(packId: string): NormalizedSoundPack | null {
    return storedPacks.value.find((pack) => pack.id === packId) ?? null;
  }

  function findScene(packId: string, sceneId: string) {
    const pack = findPack(packId);
    const scene = pack?.scenes.find((entry) => entry.id === sceneId);
    return pack && scene ? { pack, scene } : null;
  }

  function findAmbience(packId: string, ambienceId: string) {
    const pack = findPack(packId);
    const ambience = pack?.ambiences.find((entry) => entry.id === ambienceId);
    return ambience ?? null;
  }

  function findOneShot(packId: string, oneShotId: string) {
    const pack = findPack(packId);
    return pack?.oneShots.find((entry) => entry.id === oneShotId) ?? null;
  }

  function audioUrl(packId: string, path: string): string | undefined {
    return loadedAudioUrls.value.get(audioKey(packId, path));
  }

  function getVariation(ambience: LayerDef, variationId?: string) {
    const variations = getLayerVariations(ambience);
    return (
      variations.find((variation) => variation.id === variationId) ??
      variations[0] ??
      null
    );
  }

  async function ensurePackAudio(pack: NormalizedSoundPack): Promise<void> {
    if (loadedPackIds.value.has(pack.id)) return;

    const blobs = await packManager.getPackAudioBlobs(pack.id);

    for (const ambience of pack.ambiences) {
      for (const variation of getLayerVariations(ambience)) {
        for (const sample of variation.samples) {
          const blob = blobs[sample];
          if (blob) {
            loadedAudioUrls.value.set(
              audioKey(pack.id, sample),
              URL.createObjectURL(blob),
            );
          }
        }
      }
    }

    for (const oneShot of pack.oneShots) {
      const blob = blobs[oneShot.file];
      if (blob) {
        const url = URL.createObjectURL(blob);
        loadedAudioUrls.value.set(audioKey(pack.id, oneShot.file), url);
        audioEngine.loadOneShot(
          oneShotKey(pack.id, oneShot.id),
          url,
          getAudioFormat(oneShot.file),
        );
      }
    }

    for (const scene of pack.scenes) {
      for (const preset of scene.musicPresets) {
        for (const file of preset.files) {
          const path = getSceneMusicFile(scene.id, file);
          const blob = blobs[path] ?? blobs[file];
          if (blob) {
            loadedAudioUrls.value.set(
              audioKey(pack.id, path),
              URL.createObjectURL(blob),
            );
          }
        }
      }
    }

    loadedPackIds.value = new Set([...loadedPackIds.value, pack.id]);
  }

  function stopLayer(key: string): void {
    audioEngine.stopLayer(key);
    activeLayers.value.delete(key);
  }

  function startAmbience(
    packId: string,
    ambience: LayerDef,
    variationId: string | undefined,
    volumePercent: number,
  ): boolean {
    const variation = getVariation(ambience, variationId);
    if (!variation?.samples.length) return false;

    const index = randomIndex(variation.samples.length);
    const sample = variation.samples[index];
    const url = audioUrl(packId, sample);
    if (!url) return false;

    const key = layerKey(packId, ambience.id);
    audioEngine.loadLayer(key, url, true, getAudioFormat(sample));
    const volume = Math.max(0, Math.min(1, volumePercent / 100));
    activeLayers.value.set(key, {
      layerId: ambience.id,
      variationId: variation.id,
      sampleIndex: index,
      volume,
      isPlaying: true,
    });
    if (isPlaying.value) audioEngine.playLayer(key, volume);
    return true;
  }

  function activeMusicPreset(scene: SceneDef) {
    return (
      scene.musicPresets.find(
        (preset) => preset.id === activeMusicPresetId.value,
      ) ?? null
    );
  }

  function startSceneMusic(
    packId: string,
    scene: SceneDef,
    replace = false,
  ): void {
    const preset = activeMusicPreset(scene);
    if (!musicEnabled.value || !preset?.files.length) {
      audioEngine.stopMusic(false);
      return;
    }

    const index = randomIndex(preset.files.length);
    const rawFile = preset.files[index];
    const path = getSceneMusicFile(scene.id, rawFile);
    const url = audioUrl(packId, path) ?? audioUrl(packId, rawFile);
    if (!url) return;

    audioEngine.loadMusic(
      `${sceneKey(packId, scene.id)}::${preset.id}`,
      url,
      false,
      getAudioFormat(rawFile),
      replace,
    );
    audioEngine.playMusic(intensity.value / 100);
  }

  function handleSceneMusicEnd(): void {
    if (
      !isPlaying.value ||
      !musicEnabled.value ||
      !activeMusicPresetId.value ||
      !activeScene.value
    ) {
      return;
    }
    startSceneMusic(activeScene.value.pack.id, activeScene.value.scene, true);
  }

  async function playScene(packId: string, sceneId: string): Promise<void> {
    const found = findScene(packId, sceneId);
    if (!found) return;

    const key = sceneKey(packId, sceneId);
    if (activeSceneKey.value === key && isPlaying.value) return;

    loading.value = true;
    try {
      await ensurePackAudio(found.pack);
      activeSceneKey.value = key;
      intensity.value = snapIntensity(found.scene.intensity);
      activeMusicPresetId.value = found.scene.musicPresets[0]?.id ?? null;
      musicEnabled.value = !!activeMusicPresetId.value;
      activeLayers.value.clear();
      audioEngine.stopAll();

      for (const selection of found.scene.ambiences) {
        const ambience = findAmbience(packId, selection.ambienceId);
        if (ambience) {
          startAmbience(
            packId,
            ambience,
            selection.variationId,
            selection.volume,
          );
        }
      }

      isPlaying.value = true;
      startSceneMusic(packId, found.scene);
      for (const [layer, active] of activeLayers.value) {
        audioEngine.playLayer(layer, active.volume);
      }
    } finally {
      loading.value = false;
    }
  }

  async function selectScene(packId: string, sceneId: string): Promise<void> {
    const key = sceneKey(packId, sceneId);
    if (activeSceneKey.value === key && isPlaying.value) return;
    await playScene(packId, sceneId);
  }

  function pause(): void {
    isPlaying.value = false;
    audioEngine.pauseAll();
  }

  function play(): void {
    if (!activeScene.value && activeLayers.value.size === 0) return;
    isPlaying.value = true;
    for (const [layer, active] of activeLayers.value) {
      audioEngine.playLayer(layer, active.volume);
    }
    if (activeScene.value && musicEnabled.value && activeMusicPresetId.value) {
      audioEngine.playMusic(intensity.value / 100);
    }
  }

  function togglePlayPause(): void {
    if (isPlaying.value) pause();
    else play();
  }

  function stop(): void {
    audioEngine.stopAll();
    activeLayers.value.clear();
    activeSceneKey.value = null;
    activeMusicPresetId.value = null;
    isPlaying.value = false;
  }

  async function toggleAmbience(
    packId: string,
    ambienceId: string,
    variationId?: string,
  ): Promise<void> {
    const key = layerKey(packId, ambienceId);
    if (activeLayers.value.has(key)) {
      stopLayer(key);
      if (activeLayers.value.size === 0 && !activeScene.value) {
        isPlaying.value = false;
      }
      return;
    }

    const pack = findPack(packId);
    const ambience = findAmbience(packId, ambienceId);
    if (!pack || !ambience) return;
    await ensurePackAudio(pack);
    const shouldResume = !isPlaying.value;
    isPlaying.value = true;
    startAmbience(packId, ambience, variationId, ambience.defaultVolume ?? 50);
    if (shouldResume) play();
  }

  async function setAmbienceVariation(
    packId: string,
    ambienceId: string,
    variationId: string,
  ): Promise<void> {
    const key = layerKey(packId, ambienceId);
    const active = activeLayers.value.get(key);
    if (!active) return;

    const pack = findPack(packId);
    const ambience = findAmbience(packId, ambienceId);
    if (!pack || !ambience) return;
    await ensurePackAudio(pack);
    stopLayer(key);
    startAmbience(packId, ambience, variationId, active.volume * 100);
  }

  function setAmbienceVolume(
    packId: string,
    ambienceId: string,
    volume: number,
  ): void {
    const key = layerKey(packId, ambienceId);
    const active = activeLayers.value.get(key);
    if (!active) return;
    active.volume = Math.max(0, Math.min(1, volume));
    audioEngine.setLayerVolume(key, active.volume);
  }

  function setIntensity(value: number): void {
    intensity.value = snapIntensity(value);
    if (isPlaying.value && musicEnabled.value) {
      audioEngine.setMusicVolume(intensity.value / 100);
    }
  }

  function setMasterVolume(value: number): void {
    masterVolume.value = Math.max(0, Math.min(100, value));
    audioEngine.setMasterVolume(masterVolume.value / 100);
  }

  function setMusicEnabled(value: boolean): void {
    if (!value) {
      musicEnabled.value = false;
      audioEngine.stopMusic(false);
      return;
    }
    musicEnabled.value = true;
    if (!activeScene.value) return;
    if (!activeMusicPresetId.value) {
      activeMusicPresetId.value =
        activeScene.value.scene.musicPresets[0]?.id ?? null;
    }
    startSceneMusic(activeScene.value.pack.id, activeScene.value.scene, true);
  }

  function setMusicPreset(presetId: string | null): void {
    if (!presetId) {
      activeMusicPresetId.value = null;
      musicEnabled.value = false;
      audioEngine.stopMusic(false);
      return;
    }
    activeMusicPresetId.value = presetId;
    musicEnabled.value = true;
    if (!activeScene.value) return;
    startSceneMusic(activeScene.value.pack.id, activeScene.value.scene, true);
  }

  function toggleMusic(): void {
    setMusicEnabled(!musicEnabled.value);
  }

  async function playOneShot(packId: string, oneShotId: string): Promise<void> {
    const pack = findPack(packId);
    const oneShot = findOneShot(packId, oneShotId);
    if (!pack || !oneShot) return;
    await ensurePackAudio(pack);
    const key = oneShotKey(packId, oneShot.id);
    if (!audioEngine.playOneShot(key, oneShot.volume / 100)) return;
    const count = playingOneShotCounts.value.get(key) ?? 0;
    playingOneShotCounts.value.set(key, count + 1);
  }

  function isOneShotPlaying(packId: string, oneShotId: string): boolean {
    return (
      (playingOneShotCounts.value.get(oneShotKey(packId, oneShotId)) ?? 0) > 0
    );
  }

  function handleOneShotEnd(key: string): void {
    const count = playingOneShotCounts.value.get(key) ?? 0;
    if (count <= 1) {
      playingOneShotCounts.value.delete(key);
      return;
    }
    playingOneShotCounts.value.set(key, count - 1);
  }

  async function previewAmbience(
    packId: string,
    ambienceId: string,
    variationId?: string,
  ): Promise<void> {
    const pack = findPack(packId);
    const ambience = findAmbience(packId, ambienceId);
    if (!pack || !ambience) return;
    await ensurePackAudio(pack);

    if (previewLayerId.value) {
      audioEngine.stopLayer(previewLayerId.value, false);
      previewLayerId.value = null;
    }

    const variation = getVariation(ambience, variationId);
    if (!variation?.samples.length) return;
    const sample = variation.samples[0];
    const url = audioUrl(packId, sample);
    if (!url) return;
    const key = `preview:${packId}:${ambience.id}`;
    previewLayerId.value = key;
    audioEngine.loadLayer(key, url, true, getAudioFormat(sample));
    audioEngine.playLayer(key, (ambience.defaultVolume ?? 50) / 100);
  }

  function stopPreview(): void {
    if (!previewLayerId.value) return;
    audioEngine.stopLayer(previewLayerId.value, false);
    previewLayerId.value = null;
  }

  async function loadStoredPacks(): Promise<void> {
    loading.value = true;
    try {
      storedPacks.value = await packManager.getStoredPacks();
      sceneLinks.value = loadLinks();
      if (
        selectedPackId.value &&
        !storedPacks.value.some((pack) => pack.id === selectedPackId.value)
      ) {
        selectedPackId.value = null;
      }
    } finally {
      loading.value = false;
    }
  }

  async function importPack(file: File): Promise<void> {
    loading.value = true;
    try {
      const pack = await packManager.importSoundPack(file);
      clearPackAudio(pack.id);
      await loadStoredPacks();
      selectedPackId.value = pack.id;
    } finally {
      loading.value = false;
    }
  }

  function clearPackAudio(packId: string): void {
    for (const [key, url] of loadedAudioUrls.value) {
      if (key.startsWith(`${packId}:`)) {
        URL.revokeObjectURL(url);
        loadedAudioUrls.value.delete(key);
      }
    }
    loadedPackIds.value = new Set(
      [...loadedPackIds.value].filter((id) => id !== packId),
    );
  }

  async function deletePack(packId: string): Promise<void> {
    await packManager.deletePack(packId);
    if (activeScene.value?.pack.id === packId) stop();
    clearPackAudio(packId);
    if (selectedPackId.value === packId) selectedPackId.value = null;
    sceneLinks.value = sceneLinks.value.filter(
      (link) => link.packageId !== packId,
    );
    saveLinks(sceneLinks.value);
    await loadStoredPacks();
  }

  function selectPack(packId: string | null): void {
    selectedPackId.value = selectedPackId.value === packId ? null : packId;
  }

  function addSceneLink(
    packageId: string,
    sceneId: string,
    entityType: SceneLinkEntityType,
    entityId: string,
  ): void {
    const existing = sceneLinks.value.find(
      (link) =>
        link.packageId === packageId &&
        link.sceneId === sceneId &&
        link.entityType === entityType &&
        link.entityId === entityId,
    );
    if (existing) return;

    const now = Date.now();
    sceneLinks.value = [
      ...sceneLinks.value,
      {
        id: `${packageId}-${sceneId}-${entityType}-${entityId}`,
        packageId,
        sceneId,
        entityType,
        entityId,
        createdAt: now,
        updatedAt: now,
      },
    ];
    saveLinks(sceneLinks.value);
  }

  function removeSceneLink(linkId: string): void {
    sceneLinks.value = sceneLinks.value.filter((link) => link.id !== linkId);
    saveLinks(sceneLinks.value);
  }

  function linksForScene(packageId: string, sceneId: string) {
    return sceneLinks.value.filter(
      (link) => link.packageId === packageId && link.sceneId === sceneId,
    );
  }

  function linksForEntity(
    entityType: SceneLinkEntityType,
    entityId: string,
  ): SceneRef[] {
    return sceneLinks.value
      .filter(
        (link) => link.entityType === entityType && link.entityId === entityId,
      )
      .map((link) => ({ packageId: link.packageId, sceneId: link.sceneId }));
  }

  audioEngine.setMusicEndHandler(handleSceneMusicEnd);
  audioEngine.setOneShotEndHandler(handleOneShotEnd);

  return {
    storedPacks,
    selectedPackId,
    selectedPack,
    allScenes,
    galleryAmbiences,
    galleryOneShots,
    activeSceneKey,
    activeScene,
    activeLayers,
    sceneLinks,
    isPlaying,
    musicEnabled,
    activeMusicPresetId,
    intensity,
    masterVolume,
    loading,
    hasActiveLayers,
    loadStoredPacks,
    importPack,
    deletePack,
    selectPack,
    playScene,
    selectScene,
    pause,
    play,
    togglePlayPause,
    stop,
    toggleAmbience,
    setAmbienceVariation,
    setAmbienceVolume,
    setIntensity,
    setMasterVolume,
    setMusicEnabled,
    setMusicPreset,
    toggleMusic,
    playOneShot,
    isOneShotPlaying,
    previewAmbience,
    stopPreview,
    addSceneLink,
    removeSceneLink,
    linksForScene,
    linksForEntity,
  };
});
