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
import {
  pauseJukeboxForAmbient,
  setAmbientPauseHandler,
} from '@/utils/playbackCoordinator';
import * as packManager from '../utils/packManager';
import {
  findVariation,
  getAudioFormat,
  getLayerVariations,
  getOneShotSamples,
  getSceneMusicFile,
  getVariation,
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
  const previousMusicPresetId = ref<string | null>(null);
  const intensity = ref(50);
  const masterVolume = ref(80);
  const moodVolume = ref(100);
  const ambienceVolume = ref(100);
  const oneShotVolume = ref(100);
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
      const urls = [];
      for (const sample of getOneShotSamples(oneShot)) {
        const blob = blobs[sample];
        if (!blob) continue;
        const url = URL.createObjectURL(blob);
        loadedAudioUrls.value.set(audioKey(pack.id, sample), url);
        urls.push(url);
      }
      if (urls.length > 0) {
        audioEngine.loadOneShot(
          oneShotKey(pack.id, oneShot.id),
          urls,
          getAudioFormat(getOneShotSamples(oneShot)[0]),
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
    sampleIndex?: number,
  ): boolean {
    const variation = getVariation(ambience, variationId);
    if (!variation?.samples.length) return false;

    const index =
      sampleIndex !== undefined &&
      sampleIndex >= 0 &&
      sampleIndex < variation.samples.length
        ? sampleIndex
        : randomIndex(variation.samples.length);
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
    if (isPlaying.value) {
      pauseJukeboxForAmbient();
      audioEngine.playLayer(key, volume);
    }
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
    if (isPlaying.value) {
      pauseJukeboxForAmbient();
      audioEngine.playMusic(intensity.value / 100);
    }
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

    const scene = activeScene.value.scene;
    const active = activeMusicPreset(scene);
    if (active?.mode === 'temporary') {
      const previousId = previousMusicPresetId.value;
      previousMusicPresetId.value = null;
      const previous = previousId
        ? (scene.musicPresets.find(
            (preset) => preset.id === previousId && preset.mode !== 'temporary',
          ) ?? null)
        : null;
      activeMusicPresetId.value = previous?.id ?? null;
      if (!previous) {
        musicEnabled.value = false;
        audioEngine.stopMusic(true);
        deactivateSceneIfSilent();
        return;
      }
      startSceneMusic(activeScene.value.pack.id, scene, true);
      return;
    }

    startSceneMusic(activeScene.value.pack.id, scene, true);
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
      const firstPreset = found.scene.musicPresets[0] ?? null;
      activeMusicPresetId.value = firstPreset?.id ?? null;
      previousMusicPresetId.value = null;
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
      pauseJukeboxForAmbient();
      startSceneMusic(packId, found.scene);
      for (const [layer, active] of activeLayers.value) {
        audioEngine.playLayer(layer, active.volume);
      }
    } finally {
      loading.value = false;
    }
  }

  async function playSceneMusic(
    packId: string,
    sceneId: string,
    presetId: string,
  ): Promise<void> {
    const found = findScene(packId, sceneId);
    const preset = found?.scene.musicPresets.find(
      (entry) => entry.id === presetId,
    );
    if (!found || !preset) return;

    await ensurePackAudio(found.pack);
    const key = sceneKey(packId, sceneId);
    if (activeSceneKey.value !== key) {
      if (activeSceneKey.value) {
        activeLayers.value.clear();
        audioEngine.stopAll();
      }
      activeSceneKey.value = key;
    }

    intensity.value = snapIntensity(found.scene.intensity);
    activeMusicPresetId.value = presetId;
    previousMusicPresetId.value = null;
    musicEnabled.value = true;
    isPlaying.value = true;
    pauseJukeboxForAmbient();
    startSceneMusic(packId, found.scene, true);
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
    pauseJukeboxForAmbient();
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
    previousMusicPresetId.value = null;
    isPlaying.value = false;
  }

  async function toggleAmbience(
    packId: string,
    ambienceId: string,
    variationId?: string,
    sampleIndex?: number,
  ): Promise<void> {
    const key = layerKey(packId, ambienceId);
    if (activeLayers.value.has(key)) {
      stopLayer(key);
      deactivateSceneIfSilent();
      return;
    }

    const pack = findPack(packId);
    const ambience = findAmbience(packId, ambienceId);
    if (!pack || !ambience) return;
    await ensurePackAudio(pack);
    const shouldResume = !isPlaying.value;
    isPlaying.value = true;
    startAmbience(
      packId,
      ambience,
      variationId,
      ambience.defaultVolume ?? 50,
      sampleIndex,
    );
    if (shouldResume) play();
  }

  async function selectAmbienceSample(
    packId: string,
    ambienceId: string,
    variationId: string,
    sampleIndex: number,
    sceneId?: string,
  ): Promise<void> {
    const key = layerKey(packId, ambienceId);
    const active = activeLayers.value.get(key);

    if (
      active?.variationId === variationId &&
      active.sampleIndex === sampleIndex
    ) {
      stopLayer(key);
      deactivateSceneIfSilent();
      return;
    }

    if (!active) {
      await toggleAmbience(packId, ambienceId, variationId, sampleIndex);
    } else {
      const pack = findPack(packId);
      const ambience = findAmbience(packId, ambienceId);
      if (!pack || !ambience) return;
      await ensurePackAudio(pack);
      stopLayer(key);
      startAmbience(
        packId,
        ambience,
        variationId,
        active.volume * 100,
        sampleIndex,
      );
    }

    if (
      sceneId &&
      activeLayers.value.has(key) &&
      activeSceneKey.value === null
    ) {
      activeSceneKey.value = sceneKey(packId, sceneId);
    }
  }

  async function retuneAmbienceVariation(
    variationId: string,
    packId?: string,
  ): Promise<void> {
    const activeEntries = [...activeLayers.value.entries()];
    for (const [key, active] of activeEntries) {
      const activePackId = key.slice(0, key.indexOf(':'));
      if (packId && activePackId !== packId) continue;
      if (active.variationId === variationId) continue;

      const pack = findPack(activePackId);
      const ambience = findAmbience(activePackId, active.layerId);
      if (!pack || !ambience) continue;
      const variation = findVariation(ambience, variationId);
      if (!variation?.samples.length) continue;

      await ensurePackAudio(pack);
      const sampleIndex = Math.max(
        0,
        Math.min(active.sampleIndex, variation.samples.length - 1),
      );
      stopLayer(key);
      startAmbience(
        activePackId,
        ambience,
        variationId,
        active.volume * 100,
        sampleIndex,
      );
    }
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

  function setLayerVolume(
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
    masterVolume.value = Math.round(Math.max(0, Math.min(100, value)));
    audioEngine.setMasterVolume(masterVolume.value / 100);
  }

  function setMoodVolume(value: number): void {
    moodVolume.value = Math.round(Math.max(0, Math.min(100, value)));
    audioEngine.setMoodVolume(moodVolume.value / 100);
  }

  function setAmbienceVolume(value: number): void {
    ambienceVolume.value = Math.round(Math.max(0, Math.min(100, value)));
    audioEngine.setAmbienceVolume(ambienceVolume.value / 100);
  }

  function setOneShotVolume(value: number): void {
    oneShotVolume.value = Math.round(Math.max(0, Math.min(100, value)));
    audioEngine.setOneShotVolume(oneShotVolume.value / 100);
  }

  function deactivateSceneIfSilent(): void {
    if (activeLayers.value.size > 0) return;
    if (musicEnabled.value && activeMusicPresetId.value) return;
    isPlaying.value = false;
    activeSceneKey.value = null;
  }

  function setMusicEnabled(value: boolean): void {
    if (!value) {
      musicEnabled.value = false;
      audioEngine.stopMusic(false);
      deactivateSceneIfSilent();
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
      previousMusicPresetId.value = null;
      musicEnabled.value = false;
      audioEngine.stopMusic(false);
      deactivateSceneIfSilent();
      return;
    }

    if (presetId === activeMusicPresetId.value && musicEnabled.value) {
      return;
    }

    const scene = activeScene.value?.scene ?? null;
    const preset = scene?.musicPresets.find((item) => item.id === presetId);
    if (preset?.mode === 'temporary') {
      const current = activeMusicPresetId.value;
      if (!current) {
        previousMusicPresetId.value = null;
      } else if (current !== presetId) {
        const currentPreset = scene?.musicPresets.find(
          (item) => item.id === current,
        );
        if (currentPreset && currentPreset.mode !== 'temporary') {
          previousMusicPresetId.value = current;
        }
      }
    } else {
      previousMusicPresetId.value = null;
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

  function oneShotPlayCount(packId: string, oneShotId: string): number {
    return playingOneShotCounts.value.get(oneShotKey(packId, oneShotId)) ?? 0;
  }

  function oneShotProgress(packId: string, oneShotId: string): number {
    return audioEngine.getOneShotProgress(oneShotKey(packId, oneShotId));
  }

  function musicProgress(): number {
    return audioEngine.getMusicProgress();
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
  audioEngine.setMusicNearEndHandler(handleSceneMusicEnd);
  audioEngine.setOneShotEndHandler(handleOneShotEnd);
  setAmbientPauseHandler(pause);

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
    moodVolume,
    ambienceVolume,
    oneShotVolume,
    loading,
    hasActiveLayers,
    loadStoredPacks,
    importPack,
    deletePack,
    selectPack,
    playScene,
    playSceneMusic,
    selectScene,
    pause,
    play,
    togglePlayPause,
    stop,
    toggleAmbience,
    selectAmbienceSample,
    retuneAmbienceVariation,
    setAmbienceVariation,
    setLayerVolume,
    setIntensity,
    setMasterVolume,
    setMoodVolume,
    setAmbienceVolume,
    setOneShotVolume,
    setMusicEnabled,
    setMusicPreset,
    toggleMusic,
    playOneShot,
    isOneShotPlaying,
    oneShotPlayCount,
    oneShotProgress,
    musicProgress,
    previewAmbience,
    stopPreview,
    addSceneLink,
    removeSceneLink,
    linksForScene,
    linksForEntity,
  };
}, {
  // Runtime-only audio state contains Maps and Sets that cannot be serialized
  // safely across tabs by pinia-shared-state.
  share: { enable: false },
});
