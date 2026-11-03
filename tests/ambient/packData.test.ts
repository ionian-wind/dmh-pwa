import { describe, expect, it } from 'vitest';
import {
  getSceneMusicFile,
  getSceneMusicName,
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
    expect(pack.scenes[0].music.files).toEqual([
      'scenes/mood-explore/music/explore.mp3',
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
          file: 'sfx/bell.mp3',
          category: 'environmental',
          volume: 70,
        },
      ],
      scenes: [
        {
          id: 'grove',
          name: 'Grove',
          icon: 'ra-tree',
          intensity: 50,
          ambiences: [],
          oneShotIds: [],
          music: {
            files: ['scenes/grove/music/theme.mp3'],
            loop: false,
          },
        },
      ],
      moodStates: [],
    });

    expect(pack.ambiences[0].variations?.[0].samples).toEqual([
      'layers/wind.mp3',
    ]);
    expect(pack.oneShots[0].file).toBe('sfx/bell.mp3');
    expect(pack.scenes[0].music).toEqual({
      files: ['scenes/grove/music/theme.mp3'],
      loop: false,
    });
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
