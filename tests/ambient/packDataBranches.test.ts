import { describe, expect, it } from 'vitest';
import {
  getLayerVariations,
  getMoodMusicFiles,
  getMoodMode,
  getVariation,
  findVariation,
  getGlobalVariations,
  getAudioFormat,
  getOneShotSamples,
  normalizeSoundPack,
} from '@/ambient-sound/utils/packData';

describe('packData branches', () => {
  it('normalizes layer variations', () => {
    expect(
      getLayerVariations({
        id: 'a',
        name: 'A',
        variations: [
          { id: 'v1', name: 'V1', samples: ['a.mp3', ''] },
          { id: 'v2', name: 'V2', samples: [] },
        ],
      } as any),
    ).toEqual([{ id: 'v1', name: 'V1', samples: ['a.mp3'] }]);
    expect(
      getLayerVariations({ id: 'a', name: 'A', samples: ['a.mp3', ''] } as any),
    ).toEqual([{ id: 'default', name: 'Default', samples: ['a.mp3'] }]);
    expect(
      getLayerVariations({ id: 'a', name: 'A', file: 'a.mp3' } as any),
    ).toEqual([{ id: 'default', name: 'Default', samples: ['a.mp3'] }]);
    expect(getLayerVariations({ id: 'a', name: 'A' } as any)).toEqual([]);
  });

  it('resolves mood metadata and variations', () => {
    expect(getMoodMusicFiles({ musicFiles: ['a.mp3', ''] } as any)).toEqual([
      'a.mp3',
    ]);
    expect(getMoodMusicFiles({ musicFile: 'a.mp3' } as any)).toEqual(['a.mp3']);
    expect(getMoodMusicFiles({} as any)).toEqual([]);
    expect(getMoodMode({ mode: 'temporary' } as any)).toBe('temporary');
    expect(getMoodMode({} as any)).toBe('continual');

    const ambience = {
      id: 'a',
      name: 'A',
      variations: [{ id: 'v1', name: 'V1', samples: ['a.mp3'] }],
    } as any;
    expect(getVariation(ambience, 'missing')?.id).toBe('v1');
    expect(getVariation(ambience, 'v1')?.id).toBe('v1');
    expect(getVariation({ id: 'a', name: 'A' } as any)).toBeNull();
    expect(findVariation(ambience, 'v1')?.id).toBe('v1');
    expect(findVariation(ambience, 'missing')).toBeNull();
  });

  it('builds global variations with defaults first', () => {
    const options = getGlobalVariations([
      {
        id: 'a',
        name: 'A',
        variations: [{ id: 'v', name: '', samples: ['a'] }],
      },
      {
        id: 'b',
        name: 'B',
        variations: [{ id: 'default', name: 'Default', samples: ['b'] }],
      },
    ] as any);
    expect(options[0]).toEqual({ id: 'default', name: 'Default' });
    expect(options[1]).toEqual({ id: 'v', name: 'v' });
  });

  it('derives audio formats and sample paths', () => {
    expect(getAudioFormat()).toBeUndefined();
    expect(getAudioFormat('song')).toBeUndefined();
    expect(getAudioFormat('song.mp3')).toEqual(['mp3']);
    expect(getAudioFormat('song.oga')).toEqual(['ogg']);
    expect(getOneShotSamples({ samples: ['a.mp3'] } as any)).toEqual(['a.mp3']);
    expect(getOneShotSamples({ samples: [] } as any)).toEqual([]);
  });

  it('normalizes legacy and modern manifests', () => {
    const legacy = normalizeSoundPack({
      version: '1',
      id: 'p',
      name: 'Pack',
      layers: [{ id: 'l', name: 'Layer', file: 'a.mp3' }],
      oneShots: [],
      moodStates: [],
    } as any);
    expect(legacy.ambiences).toHaveLength(1);
    const modern = normalizeSoundPack({
      version: '2',
      id: 'p',
      name: 'Pack',
      ambiences: [],
      oneShots: [],
      scenes: [],
    } as any);
    expect(modern.scenes).toEqual([]);
  });
});
