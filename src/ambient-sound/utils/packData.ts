import type { LayerDef, LayerVariation, MoodStateDef } from '../types';

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
