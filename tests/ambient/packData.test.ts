import { describe, expect, it } from 'vitest';
import {
  findVariation,
  getGlobalVariations,
  getLayerVariations,
  getSceneMusicFile,
  getSceneMusicName,
  getVariation,
  normalizeSoundPack,
} from '@/ambient-sound/utils/packData';
import type { SoundPackManifest } from '@/ambient-sound/types';

const legacy: SoundPackManifest = {
  version: '1',
  id: 'legacy',
  name: 'Legacy',
  description: '',
  category: 'fantasy',
  layers: [
    {
      id: 'rain',
      name: 'Rain',
      icon: 'ra-rain',
      file: 'rain.mp3',
      defaultVolume: 40,
      loop: true,
    },
  ],
  oneShots: [],
  moodStates: [
    {
      state: 'explore',
      name: 'Explore',
      icon: 'ra-search',
      musicFile: 'explore.mp3',
    },
  ],
};

describe('ambient pack data', () => {
  it('normalizes legacy layers and mood music into a scene', () => {
    const pack = normalizeSoundPack(legacy);
    expect(pack.ambiences[0].variations?.[0].samples).toEqual([
      'ambiences/rain.mp3',
    ]);
    expect(pack.scenes[0].musicPresets[0].files).toEqual([
      'scenes/mood-explore/music/explore.mp3',
    ]);
  });

  it('derives global variations with the default first', () => {
    const ambiences = [
      {
        id: 'rain',
        name: 'Rain',
        icon: 'ra-rain',
        defaultVolume: 40,
        loop: true,
        variations: [
          { id: 'light', name: 'Light rain', samples: ['light.mp3'] },
          { id: 'heavy', name: 'Heavy rain', samples: ['heavy.mp3'] },
        ],
      },
      {
        id: 'wind',
        name: 'Wind',
        icon: 'ra-wind',
        defaultVolume: 30,
        loop: true,
        variations: [{ id: 'default', name: 'Default', samples: ['wind.mp3'] }],
      },
    ];

    expect(getGlobalVariations(ambiences)).toEqual([
      { id: 'default', name: 'Default' },
      { id: 'light', name: 'Light rain' },
      { id: 'heavy', name: 'Heavy rain' },
    ]);
    expect(getVariation(ambiences[0] as any, 'heavy')?.samples).toEqual([
      'heavy.mp3',
    ]);
    expect(getVariation(ambiences[0] as any, 'missing')?.id).toBe('light');
    expect(findVariation(ambiences[0] as any, 'missing')).toBeNull();
    expect(findVariation(ambiences[0] as any, 'heavy')?.samples).toEqual([
      'heavy.mp3',
    ]);
  });

  it('normalizes already-canonical paths and empty scene music', () => {
    const pack = normalizeSoundPack({
      ...legacy,
      ambiences: [
        {
          id: 'wind',
          name: 'Wind',
          icon: 'ra-wind',
          defaultVolume: 30,
          loop: true,
          variations: [
            {
              id: 'soft',
              name: 'Soft',
              samples: ['layers/wind.mp3'],
            },
          ],
        },
      ],
      oneShots: [
        {
          id: 'bell',
          name: 'Bell',
          icon: 'ra-bell',
          samples: ['sfx/bell.mp3'],
          category: 'environmental',
          volume: 70,
        },
      ],
      scenes: [
        {
          id: 'grove',
          name: 'Grove',
          intensity: 50,
          ambiences: [],
          oneShotIds: [],
          musicPresets: [
            {
              id: 'explore',
              name: 'Explore',
              files: ['scenes/grove/music/theme.mp3'],
            },
          ],
        },
      ],
      moodStates: [],
    });

    expect(pack.ambiences[0].variations?.[0].samples).toEqual([
      'layers/wind.mp3',
    ]);
    expect(pack.oneShots[0].samples).toEqual(['sfx/bell.mp3']);
    expect(pack.scenes[0]).not.toHaveProperty('icon');
    expect(pack.scenes[0].musicPresets[0]).toEqual({
      id: 'explore',
      name: 'Explore',
      files: ['scenes/grove/music/theme.mp3'],
      mode: 'continual',
    });
  });

  it('normalizes flat samples and legacy scene music', () => {
    const pack = normalizeSoundPack({
      ...legacy,
      layers: [
        {
          id: 'flat',
          name: 'Flat',
          icon: 'fa-solid:cloud-rain',
          defaultVolume: 40,
          loop: true,
          samples: ['flat.mp3'],
        },
        {
          id: 'legacy',
          name: 'Legacy',
          icon: 'fa-solid:wind',
          defaultVolume: 20,
          loop: true,
          file: 'legacy.mp3',
        },
      ],
      ambiences: undefined,
      moodStates: [],
      scenes: [
        {
          id: 'grove',
          name: 'Grove',
          intensity: 50,
          ambiences: [],
          oneShotIds: [],
          musicPresets: [],
          music: { files: ['theme.mp3'], loop: true },
        },
      ],
    });

    expect(pack.ambiences[0].variations?.[0].samples).toEqual([
      'ambiences/flat.mp3',
    ]);
    expect(pack.ambiences[1].variations?.[0].samples).toEqual([
      'ambiences/legacy.mp3',
    ]);
    expect(pack.scenes[0].musicPresets[0]).toEqual({
      id: 'default',
      name: 'Default',
      files: ['scenes/grove/music/theme.mp3'],
      mode: 'continual',
    });
  });

  it('keeps only non-empty modern music presets', () => {
    const pack = normalizeSoundPack({
      ...legacy,
      moodStates: [],
      scenes: [
        {
          id: 'grove',
          name: 'Grove',
          intensity: 50,
          ambiences: [],
          oneShotIds: [],
          musicPresets: [
            { id: 'empty', name: 'Empty', files: [] },
            {
              id: 'explore',
              name: 'Explore',
              files: ['scenes/grove/music/a.mp3', ''],
            },
          ],
        },
      ],
    });

    expect(pack.scenes[0].musicPresets).toEqual([
      {
        id: 'explore',
        name: 'Explore',
        files: ['scenes/grove/music/a.mp3'],
        mode: 'continual',
      },
    ]);
  });

  it('handles packages without entries and empty variations', () => {
    const empty = normalizeSoundPack({
      ...legacy,
      layers: undefined,
      ambiences: undefined,
      oneShots: undefined as any,
      moodStates: [],
    });
    expect(empty.ambiences).toEqual([]);
    expect(empty.oneShots).toEqual([]);
    expect(empty.scenes).toEqual([]);
    expect(
      getLayerVariations({
        id: 'empty',
        name: 'Empty',
        icon: '',
        defaultVolume: 0,
        loop: true,
        variations: [],
      }),
    ).toEqual([]);
  });

  it('builds and labels scene music paths', () => {
    expect(getSceneMusicFile('tavern', 'theme.mp3')).toBe(
      'scenes/tavern/music/theme.mp3',
    );
    expect(getSceneMusicFile('tavern', 'scenes/tavern/music/theme.mp3')).toBe(
      'scenes/tavern/music/theme.mp3',
    );
    expect(getSceneMusicName('scenes/tavern/music/theme.mp3')).toBe(
      'theme.mp3',
    );
  });
});
