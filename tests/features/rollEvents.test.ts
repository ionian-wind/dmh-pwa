import { describe, expect, it } from 'vitest';
import {
  createDieRollEvent,
  createPoolRollEvent,
  dieLabel,
  dieNotation,
  dispatchRollEvent,
  ROLL_EVENT_NAME,
  type RollEventDie,
} from '../../src/utils/roll-events';

const die: RollEventDie = {
  id: 'a',
  sides: 6,
  value: 4,
  label: 'd6',
  notation: '1d6',
  explode: '!',
};

describe('unified roll events', () => {
  it('uses the bag-of-dice result shape for individual dice', () => {
    const event = createDieRollEvent(die, {
      id: 'die-a',
      createdAt: 10,
    });
    expect(event).toMatchObject({
      schemaVersion: 1,
      source: '3d-dice-tray',
      id: 'die-a',
      createdAt: 10,
      pool: false,
      total: 4,
      warnings: [],
    });
    expect(event.breakdown).toMatchObject({
      rawTotal: 4,
      finalTotal: 4,
    });
    expect(event.breakdown.groups[0]).toMatchObject({
      id: 'a',
      total: 4,
      modifierOrder: ['!'],
    });
    expect(event.breakdown.segments[0]).toMatchObject({
      kind: 'dice',
      result: 4,
    });
    expect(event.process.passes.map((pass) => pass.name)).toEqual([
      'expand',
      'roll',
      'physics',
    ]);
    expect(event.process.expansions).toEqual([]);
    expect(event.process.queries).toEqual([]);
    expect(event.process.inlineRolls).toEqual([]);
    expect(event.dice).toEqual([die]);
  });

  it('combines a pool and keeps explosion penalties', () => {
    const dice: RollEventDie[] = [
      { id: 'a', sides: 6, value: 6, notation: '1d6', explode: '!' },
      {
        id: 'b',
        sides: 6,
        value: 2,
        notation: '1d6',
        explode: '!',
        isExtra: true,
        penalty: 1,
        rootId: 'a',
      },
      { id: 'c', sides: 3, kind: 'fate', value: -1, label: 'FUDGE' },
    ];
    const event = createPoolRollEvent(dice, {
      id: 'pool-1',
      createdAt: 20,
      raw: '2d6! + 1dF',
      mode: '!',
    });
    expect(event.pool).toBe(true);
    expect(event.total).toBe(7);
    expect(event.breakdown.rawTotal).toBe(8);
    expect(event.process.raw).toBe('2d6! + 1dF');
    expect(event.dice).toHaveLength(3);
    expect(event.dice[1]).toMatchObject({ isExtra: true, penalty: 1 });
    expect(event.mode).toBe('!');
  });

  it('formats fallback notation and labels', () => {
    expect(dieNotation({ id: 'f', sides: 3, kind: 'fate', value: 0 })).toBe(
      '1dF',
    );
    expect(dieNotation({ id: 'd', sides: 8, value: 3 })).toBe('1d8');
    expect(dieLabel({ id: 'f', sides: 3, kind: 'fate', value: 0 })).toBe(
      'FUDGE',
    );
    expect(dieLabel({ id: 'd', sides: 8, value: 3 })).toBe('d8');
    expect(dieLabel({ id: 'l', sides: 8, value: 3, label: 'Damage' })).toBe(
      'Damage',
    );
    expect(ROLL_EVENT_NAME).toBe('dice-roller:roll');
  });

  it('honours expanded text, warnings and dispatch', () => {
    const received: unknown[] = [];
    const listener = (event: Event) => {
      received.push((event as CustomEvent).detail);
    };
    window.addEventListener(ROLL_EVENT_NAME, listener);
    const event = createPoolRollEvent([{ id: 'a', sides: 6, value: 6 }], {
      raw: '1d6!',
      expanded: '1d6! + 1d6',
      warnings: [{ code: 'LIMIT_EXPLOSION', message: 'cap', pass: 'roll' }],
    });
    dispatchRollEvent(event);
    window.removeEventListener(ROLL_EVENT_NAME, listener);
    expect(event.process.expanded).toBe('1d6! + 1d6');
    expect(event.warnings[0].code).toBe('LIMIT_EXPLOSION');
    expect(received).toEqual([event]);
  });
});
