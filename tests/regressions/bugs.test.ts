import { describe, it, expect } from 'vitest';
import { computed } from 'vue';

import router from '@/router';
import { MAIN_STORE_NAMES } from '@/utils/storage';
import {
  getColor,
  getPalette,
} from '@/utils/files/worker/color-from-image';
import {
  getGradientContrastColor,
  useAnimatedGradient,
} from '@/jukebox/useAnimatedGradient';
import {
  registerValidationSchema,
  validateArray,
} from '@/utils/schemaValidator';
import { parseMarkdown } from '@/utils/markdownParser';
import { remapImportedModule } from '@/utils/moduleImportExport';
import { advanceTurn, rewindTurn } from '@/utils/combatTurn';
import type { Combat, Combatant } from '@/types';

function combatant(id: string, overrides: Partial<Combatant> = {}): Combatant {
  return {
    id,
    name: id,
    type: 'player',
    initiative: 10,
    hasActed: false,
    isPostponed: false,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe('regression: known bugs', () => {
  it('backs up every persisted store (timers, jukebox, mentions included)', () => {
    expect(MAIN_STORE_NAMES).toEqual(
      expect.arrayContaining([
        'timers',
        'jukebox_playlists',
        'jukebox_tracks',
        'jukebox_files',
        'indexations_mentions',
      ]),
    );
  });

  it('has a /combats fallback route', () => {
    expect(router.getRoutes().some((route) => route.path === '/combats')).toBe(
      true,
    );
  });

  it('returns a hex color when requested', () => {
    const color = getColor(new Uint8ClampedArray([255, 0, 0, 255]), {
      format: 'hex',
      sample: 1,
    });
    expect(typeof color).toBe('string');
    expect(color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('extracts four palette colours from album image data', () => {
    const colors = [
      [240, 0, 0],
      [0, 240, 0],
      [0, 0, 240],
      [120, 120, 0],
    ];
    const pixels: number[] = [];
    for (let repeat = 0; repeat < 4; repeat += 1) {
      for (const [r, g, b] of colors) {
        pixels.push(r, g, b, 255);
      }
    }

    const palette = getPalette(new Uint8ClampedArray(pixels), {
      amount: 4,
      sample: 1,
      group: 30,
      format: 'hex',
    });

    expect(Array.isArray(palette)).toBe(true);
    expect(palette).toHaveLength(4);
    expect(palette).toEqual(
      expect.arrayContaining(['#f00000', '#00f000', '#0000f0', '#787800']),
    );
  });

  it('does not emit NaN gradient stops for a one-colour palette', () => {
    const style = useAnimatedGradient(
      computed(() => true),
      () => ['#ff0000'],
    ).value as Record<string, string>;
    expect(style['--custom-gradient']).toBeTruthy();
    expect(style['--custom-gradient']).not.toContain('NaN');
  });

  it('builds one radial blob per palette colour for the morph gradient', () => {
    const style = useAnimatedGradient(
      computed(() => true),
      () => ['#112233', '#445566', '#778899', '#aabbcc'],
    ).value as Record<string, string>;
    const gradient = style['--custom-gradient'];

    expect(gradient.match(/radial-gradient/g)).toHaveLength(4);
    expect(gradient).toContain('linear-gradient');
    expect(gradient).toContain('#112233');
    expect(gradient).not.toContain('NaN');
  });

  it('builds a default blob gradient without a palette', () => {
    const style = useAnimatedGradient(
      computed(() => true),
      () => undefined,
    ).value as Record<string, string>;

    expect(style['--custom-gradient']).toContain('radial-gradient');
    expect(style['--custom-gradient']).toContain('linear-gradient');
  });

  it('expands short hex colors and passes other colors through', () => {
    const style = useAnimatedGradient(
      computed(() => true),
      () => ['#abc', 'rgb(1, 2, 3)'],
    ).value as Record<string, string>;

    expect(style['--custom-gradient']).toContain('#aabbcca6');
    expect(style['--custom-gradient']).toContain('rgb(1, 2, 3)');
    expect(style['--custom-gradient']).toContain('#aabbcc40');
  });

  it('returns no style when the gradient is disabled', () => {
    const enabled = computed(() => false);
    const style = useAnimatedGradient(enabled, () => ['#ffffff']).value;

    expect(style).toEqual({});
  });

  it('chooses control colours that contrast with the gradient palette', () => {
    expect(getGradientContrastColor(['#f8f8f8', '#ffe9a8'])).toBe('#111827');
    expect(getGradientContrastColor(['#101020', '#22223a'])).toBe('#ffffff');
    expect(getGradientContrastColor([])).toBe('#111827');
  });

  it('reports an invalid item inside validateArray', async () => {
    registerValidationSchema('test-array-schema', {
      type: 'object',
      required: ['x'],
      properties: { x: { type: 'number' } },
    });

    await expect(validateArray('test-array-schema', [{ x: 1 }])).resolves.toBe(
      true,
    );
    await expect(
      validateArray('test-array-schema', [{ x: 1 }, { y: 2 }]),
    ).resolves.toBe(false);
  });

  it('strips executable HTML from rendered markdown', () => {
    const html = parseMarkdown(
      '<img src="x" onerror="alert(1)"><script>alert(2)</script>',
    );
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('<script');
  });

  it('remaps module and note IDs on import so archives do not overwrite', () => {
    const input = {
      module: { id: 'old-module', name: 'Module' },
      tree: [{ noteId: 'old-note', children: [] }],
      notes: [
        {
          id: 'old-note',
          title: 'Note',
          content: 'Body',
          typeId: null,
          tags: [],
          moduleId: 'old-module',
          hidden: true,
        },
      ],
    };

    const result = remapImportedModule(input as any);

    expect(result.module.id).not.toBe('old-module');
    expect(result.notes[0].id).not.toBe('old-note');
    expect(result.notes[0].moduleId).toBe(result.module.id);
    expect(result.tree[0].noteId).toBe(result.notes[0].id);
    expect(result.tree[0].children).toEqual([]);
  });
});

describe('regression: combat turn state', () => {
  const combat: Combat = {
    id: 'c',
    encounterId: 'e',
    partyId: 'p',
    status: 'active',
    currentRound: 1,
    currentTurn: 0,
    combatants: [
      combatant('a'),
      combatant('b'),
      combatant('c', { isPostponed: true }),
    ],
    createdAt: 0,
    updatedAt: 0,
  };

  it('marks the current combatant as acted and advances', () => {
    const next = advanceTurn(combat);
    expect(next.currentTurn).toBe(1);
    expect(next.currentRound).toBe(1);
    expect(next.combatants[0].hasActed).toBe(true);
  });

  it('starts a new round when no combatant is left', () => {
    const endOfRound: Combat = {
      ...combat,
      currentTurn: 1,
      combatants: [
        combatant('a', { hasActed: true }),
        combatant('b', { hasActed: true }),
        combatant('c', { isPostponed: true }),
      ],
    };
    const next = advanceTurn(endOfRound);
    expect(next.currentRound).toBe(2);
    expect(next.currentTurn).toBe(0);
    expect(next.combatants.every((c) => !c.hasActed)).toBe(true);
    expect(next.combatants.every((c) => !c.isPostponed)).toBe(true);
  });

  it('rewinds to the previous turn/round', () => {
    const next = rewindTurn({
      ...combat,
      currentTurn: 0,
      currentRound: 2,
    });
    expect(next.currentRound).toBe(1);
    expect(next.currentTurn).toBe(2);
  });
});
