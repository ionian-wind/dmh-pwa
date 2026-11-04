import type {
  LayerDef,
  LayerVariation,
  MoodStateDef,
  NormalizedSoundPack,
  OneShotDef,
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

/** Resolve a variation by id, falling back to the first available variation. */
export function getVariation(
  ambience: LayerDef,
  variationId?: string,
): LayerVariation | null {
  const variations = getLayerVariations(ambience);
  return (
    variations.find((variation) => variation.id === variationId) ??
    variations[0] ??
    null
  );
}

/** Resolve an exact variation; returns null when the ambience lacks it. */
export function findVariation(
  ambience: LayerDef,
  variationId: string,
): LayerVariation | null {
  return (
    getLayerVariations(ambience).find(
      (variation) => variation.id === variationId,
    ) ?? null
  );
}

export interface AmbienceVariationOption {
  id: string;
  name: string;
}

/**
 * Build the global variation list for a set of ambiences.
 * The default variation is preferred first so the initial view is useful.
 */
export function getGlobalVariations(
  ambiences: LayerDef[],
): AmbienceVariationOption[] {
  const variations = new Map<string, string>();
  for (const ambience of ambiences) {
    for (const variation of getLayerVariations(ambience)) {
      if (!variations.has(variation.id)) {
        variations.set(variation.id, variation.name || variation.id);
      }
    }
  }

  const options = [...variations].map(([id, name]) => ({ id, name }));
  const defaultIndex = options.findIndex((option) => option.id === 'default');
  if (defaultIndex > 0) {
    const [defaultOption] = options.splice(defaultIndex, 1);
    options.unshift(defaultOption);
  }
  return options;
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

/** Resolve all samples for a one-shot, including the legacy single-file form. */
export function getOneShotSamples(oneShot: OneShotDef): string[] {
  if (oneShot.samples?.length) return oneShot.samples.filter(Boolean);
  return oneShot.file ? [oneShot.file] : [];
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
  const oneShots = (manifest.oneShots ?? []).map((oneShot) => {
    const samples = getOneShotSamples(oneShot).map(normalizeOneShotPath);
    return {
      ...oneShot,
      samples,
      file: samples[0],
    };
  });
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
