import type {
  LayerDef,
  LayerVariation,
  MoodStateDef,
  NormalizedSoundPack,
  SceneDef,
  SceneMusicPreset,
  SoundPackManifest,
} from '../types';

const DEFAULT_VARIATION_ID = 'default';

/** Normalize legacy single-file layers into the variations model. */
export function getLayerVariations(layer: LayerDef): LayerVariation[] {
  if (layer.variations?.length) {
    return layer.variations
      .map((variation) => ({
        id: variation.id,
        name: variation.name,
        samples: variation.samples.filter(Boolean),
      }))
      .filter((variation) => variation.samples.length > 0);
  }
  if (layer.samples?.length) {
    return [
      {
        id: DEFAULT_VARIATION_ID,
        name: 'Default',
        samples: layer.samples.filter(Boolean),
      },
    ];
  }
  if (layer.file) {
    return [
      {
        id: DEFAULT_VARIATION_ID,
        name: 'Default',
        samples: [layer.file],
      },
    ];
  }
  return [];
}

export function getMoodMusicFiles(mood: MoodStateDef): string[] {
  if (mood.musicFiles?.length) return mood.musicFiles.filter(Boolean);
  return mood.musicFile ? [mood.musicFile] : [];
}

export function getMoodMode(mood: MoodStateDef): 'temporary' | 'continual' {
  return mood.mode === 'temporary' ? 'temporary' : 'continual';
}

/** Howler needs an explicit format for extensionless blob URLs. */
export function getAudioFormat(file?: string): string[] | undefined {
  const extension = file?.split('.').pop()?.toLowerCase();
  if (!extension || extension === file?.toLowerCase()) return undefined;
  return [extension === 'oga' ? 'ogg' : extension];
}

function normalizeAmbienceSample(sample: string): string {
  if (sample.startsWith('ambiences/') || sample.startsWith('layers/')) {
    return sample;
  }
  return `ambiences/${sample}`;
}

function normalizeOneShotPath(file: string): string {
  if (file.startsWith('one-shots/') || file.startsWith('sfx/')) return file;
  return `one-shots/${file}`;
}

function normalizeSceneMusicPath(sceneId: string, file: string): string {
  if (file.startsWith('scenes/')) return file;
  const name = file.split('/').pop() || file;
  return `scenes/${sceneId}/music/${name}`;
}

function normalizeSceneMusicPresets(scene: SceneDef): SceneMusicPreset[] {
  const presets = scene.musicPresets?.length
    ? scene.musicPresets
    : scene.music?.files?.length
      ? [{ id: 'default', name: 'Default', files: scene.music.files }]
      : [];

  return presets
    .map(
      (preset): SceneMusicPreset => ({
        id: preset.id || 'default',
        name: preset.name || preset.id || 'Default',
        files: (preset.files ?? [])
          .filter(Boolean)
          .map((file) => normalizeSceneMusicPath(scene.id, file)),
        mode: preset.mode === 'temporary' ? 'temporary' : 'continual',
      }),
    )
    .filter((preset) => preset.files.length > 0);
}

/** Convert legacy manifests into the package/scene model. */
export function normalizeSoundPack(
  manifest: SoundPackManifest,
): NormalizedSoundPack {
  const ambiences = (manifest.ambiences ?? manifest.layers ?? []).map(
    (ambience) => ({
      ...ambience,
      variations: getLayerVariations(ambience).map((variation) => ({
        ...variation,
        samples: variation.samples.map(normalizeAmbienceSample),
      })),
      samples: ambience.samples?.map(normalizeAmbienceSample),
      file: ambience.file ? normalizeAmbienceSample(ambience.file) : undefined,
    }),
  );
  const oneShots = (manifest.oneShots ?? []).map((oneShot) => ({
    ...oneShot,
    file: normalizeOneShotPath(oneShot.file),
  }));
  const legacyScenes = (manifest.moodStates ?? []).map((mood) => {
    const files = getMoodMusicFiles(mood);
    return {
      id: `mood-${mood.state}`,
      name: mood.name,
      description: '',
      intensity: manifest.defaultIntensity ?? 50,
      ambiences: ambiences.map((ambience) => ({
        ambienceId: ambience.id,
        variationId: getLayerVariations(ambience)[0]?.id ?? 'default',
        volume: ambience.defaultVolume,
      })),
      oneShotIds: oneShots.map((oneShot) => oneShot.id),
      musicPresets: [
        {
          id: mood.state,
          name: mood.name,
          files: files.map((file) =>
            normalizeSceneMusicPath(`mood-${mood.state}`, file),
          ),
          mode: getMoodMode(mood),
        },
      ],
    } satisfies SceneDef;
  });

  const scenes = (manifest.scenes?.length ? manifest.scenes : legacyScenes).map(
    (scene) => ({
      ...scene,
      intensity: scene.intensity ?? manifest.defaultIntensity ?? 50,
      ambiences: scene.ambiences ?? [],
      oneShotIds: scene.oneShotIds ?? [],
      musicPresets: normalizeSceneMusicPresets(scene),
    }),
  );

  return {
    ...manifest,
    defaultIntensity: manifest.defaultIntensity ?? 50,
    ambiences,
    layers: ambiences,
    scenes,
    oneShots,
  };
}

export function getSceneMusicFile(sceneId: string, file: string): string {
  if (file.startsWith('scenes/') || file.startsWith('music/')) return file;
  return `scenes/${sceneId}/music/${file}`;
}

export function getSceneMusicName(file: string): string {
  return file.split('/').pop() || file;
}
