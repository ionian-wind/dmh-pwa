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
  const intensity = ref(50);
  const masterVolume = ref(80);
  const loading = ref(false);
  const loadedPackIds = ref<Set<string>>(new Set());
  const loadedAudioUrls = ref<Map<string, string>>(new Map());
  const previewLayerId = ref<string | null>(null);

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
      for (const file of scene.music.files) {
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

  function startSceneMusic(packId: string, scene: SceneDef): void {
    if (!musicEnabled.value || scene.music.files.length === 0) {
      audioEngine.stopMusic(false);
      return;
    }

    const index = randomIndex(scene.music.files.length);
    const rawFile = scene.music.files[index];
    const path = getSceneMusicFile(scene.id, rawFile);
    const url = audioUrl(packId, path) ?? audioUrl(packId, rawFile);
    if (!url) return;

    audioEngine.loadMusic(
      sceneKey(packId, scene.id),
      url,
      scene.music.loop,
      getAudioFormat(rawFile),
    );
    audioEngine.playMusic(intensity.value / 100);
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
      intensity.value = found.scene.intensity;
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
    if (activeScene.value && musicEnabled.value) {
      startSceneMusic(activeScene.value.pack.id, activeScene.value.scene);
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
    intensity.value = Math.max(0, Math.min(100, value));
    if (isPlaying.value && musicEnabled.value) {
      audioEngine.setMusicVolume(intensity.value / 100);
    }
  }

  function setMasterVolume(value: number): void {
    masterVolume.value = Math.max(0, Math.min(100, value));
    audioEngine.setMasterVolume(masterVolume.value / 100);
  }

  function setMusicEnabled(value: boolean): void {
    musicEnabled.value = value;
    if (!value) {
      audioEngine.stopMusic(false);
      return;
    }
    if (activeScene.value) {
      startSceneMusic(activeScene.value.pack.id, activeScene.value.scene);
    }
  }

  function toggleMusic(): void {
    setMusicEnabled(!musicEnabled.value);
  }

  async function playOneShot(packId: string, oneShotId: string): Promise<void> {
    const pack = findPack(packId);
    const oneShot = findOneShot(packId, oneShotId);
    if (!pack || !oneShot) return;
    await ensurePackAudio(pack);
    audioEngine.playOneShot(
      oneShotKey(packId, oneShot.id),
      oneShot.volume / 100,
    );
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

  async function saveScene(
    packId: string,
    scene: SceneDef,
    audioFiles: Map<string, Blob> = new Map(),
  ): Promise<void> {
    const pack = findPack(packId);
    if (!pack) return;

    const scenes = pack.scenes.some((entry) => entry.id === scene.id)
      ? pack.scenes.map((entry) => (entry.id === scene.id ? scene : entry))
      : [...pack.scenes, scene];
    const manifest = { ...pack, scenes };

    if (audioFiles.size > 0) {
      const existing = await packManager.getPackAudioBlobs(packId);
      const merged = new Map<string, Blob>(Object.entries(existing));
      for (const [path, blob] of audioFiles) merged.set(path, blob);
      await packManager.saveSoundPack(manifest, merged);
      clearPackAudio(packId);
    }

    const updated = await packManager.updatePackManifest(packId, manifest);
    storedPacks.value = storedPacks.value.map((entry) =>
      entry.id === packId ? updated : entry,
    );
    if (activeSceneKey.value === sceneKey(packId, scene.id)) {
      activeSceneKey.value = sceneKey(packId, scene.id);
    }
  }

  async function deleteScene(packId: string, sceneId: string): Promise<void> {
    const pack = findPack(packId);
    if (!pack) return;
    if (activeSceneKey.value === sceneKey(packId, sceneId)) stop();
    const scenes = pack.scenes.filter((scene) => scene.id !== sceneId);
    const updated = await packManager.updatePackManifest(packId, {
      ...pack,
      scenes,
    });
    storedPacks.value = storedPacks.value.map((entry) =>
      entry.id === packId ? updated : entry,
    );
    sceneLinks.value = sceneLinks.value.filter(
      (link) => !(link.packageId === packId && link.sceneId === sceneId),
    );
    saveLinks(sceneLinks.value);
  }

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
    toggleMusic,
    playOneShot,
    previewAmbience,
    stopPreview,
    addSceneLink,
    removeSceneLink,
    linksForScene,
    linksForEntity,
    saveScene,
    deleteScene,
  };
});
