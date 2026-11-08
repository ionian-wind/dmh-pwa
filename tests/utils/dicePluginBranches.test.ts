import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  evaluateDiceNode,
  parseDiceAst,
} from '@/utils/dice-roller/plugins/dice/dicePlugin';

const dice = (modifiers: any[] = []) => ({
  type: 'dice' as const,
  count: 2,
  sides: 6,
  modifiers,
});

describe('dice plugin branch coverage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  it('applies reroll modifier operators', () => {
    for (const operator of ['>', '<', '>=', '<=', '=', '!=']) {
      const result = evaluateDiceNode(
        dice([{ type: 'r', value: '2', operator }]),
        {},
      );
      expect(result.rolls).toHaveLength(2);
    }
    const capped = evaluateDiceNode(
      dice([{ type: 'r', value: '4', operator: '=' }]),
      {},
    );
    expect(capped.warnings?.[0]).toContain('Reroll limit reached');
  });

  it('applies reroll-once and reroll-until modifiers', () => {
    for (const operator of ['>', '<', '>=', '<=', '=', '!=']) {
      const result = evaluateDiceNode(
        dice([{ type: 'ro', value: '2', operator }]),
        {},
      );
      expect(result.rolls).toHaveLength(2);
    }
    expect(
      evaluateDiceNode(dice([{ type: 'ra', value: '1' }]), {
        allowInfinite: false,
      }).warnings,
    ).toContain('Infinite reroll disabled for safety');
    expect(
      evaluateDiceNode(dice([{ type: 'ra', value: '1' }]), {
        allowInfinite: true,
      }).rolls,
    ).toHaveLength(2);
  });

  it('applies recursive explosions with targets and limits', () => {
    const result = evaluateDiceNode(
      dice([
        {
          type: 'explode',
          value: 'recursive',
          target: 3,
          operator: '>',
          limit: 2,
        },
        { type: 'lt', value: '5' },
      ]),
      {},
    );
    expect(result.rolls?.length).toBeGreaterThanOrEqual(2);
    expect(
      evaluateDiceNode(dice([{ type: 'explode', value: 'recursive' }]), {})
        .rolls?.length,
    ).toBeGreaterThanOrEqual(2);
    expect(
      evaluateDiceNode(
        dice([
          { type: 'explode', value: 'recursive', target: 2, operator: '<' },
        ]),
        {},
      ).rolls?.length,
    ).toBeGreaterThanOrEqual(2);
  });

  it('applies success, failure, critical and matching modifiers', () => {
    for (const modifier of [
      { type: 's', value: '3', operator: '>=' },
      { type: 'f', value: '3', operator: '<' },
      { type: 'cs', value: '6', operator: '=' },
      { type: 'cf', value: '1', operator: '=' },
      { type: 'eq', target: 3 },
      { type: 'gt', target: 3 },
      { type: 'lt', target: 3 },
      { type: 'success', value: '3' },
      { type: 'm' },
      { type: 'o' },
    ]) {
      const result = evaluateDiceNode(dice([modifier]), {});
      expect(result.total).toBeTypeOf('number');
    }
  });

  it('handles exhaustive modifier warnings', () => {
    expect(evaluateDiceNode(dice([{ type: 'e' }]), {}).warnings).toContain(
      'Exhaustive (e) operator requires a preceding success/eq/gt/lt/cs/cf modifier',
    );
    expect(
      evaluateDiceNode(dice([{ type: 's' }, { type: 'e' }]), {}).warnings,
    ).toContain('Exhaustive operator missing target');
  });

  it('handles unary, arithmetic, group and unknown nodes', () => {
    expect(
      evaluateDiceNode(
        {
          type: 'unary',
          op: '+',
          operand: { type: 'number', value: 2 },
        } as any,
        {},
      ).total,
    ).toBe(2);
    expect(
      evaluateDiceNode(
        {
          type: 'arithmetic',
          op: '?',
          left: { type: 'number', value: 2 },
          right: { type: 'number', value: 3 },
        } as any,
        {},
      ).total,
    ).toBe(0);
    expect(() =>
      evaluateDiceNode(
        {
          type: 'arithmetic',
          op: '/',
          left: { type: 'number', value: 2 },
          right: { type: 'number', value: 0 },
        } as any,
        {},
      ),
    ).toThrow('Division by zero');
    expect(() =>
      evaluateDiceNode(
        {
          type: 'arithmetic',
          op: '%',
          left: { type: 'number', value: 2 },
          right: { type: 'number', value: 0 },
        } as any,
        {},
      ),
    ).toThrow('Modulo by zero');
    expect(
      evaluateDiceNode(
        {
          type: 'group',
          expressions: [
            { type: 'number', value: 1 },
            { type: 'number', value: 2 },
          ],
        } as any,
        {},
      ).total,
    ).toBe(3);
    expect(() =>
      evaluateDiceNode({ type: 'function', name: 'nope', args: [] } as any, {}),
    ).toThrow('Unknown function: nope');
    expect(() =>
      evaluateDiceNode({ type: 'table', name: 'loot' } as any, {}),
    ).toThrow("Table 'loot' not found or not expanded");
    expect(
      evaluateDiceNode({ type: 'crit-mod', mod: 2 } as any, {}).warnings,
    ).toContain('Crit-mod node should be handled by parent');
    expect(evaluateDiceNode({ type: 'unknown' } as any, {}).total).toBe(0);
  });

  it('rejects invalid custom and fudge dice', () => {
    expect(() =>
      evaluateDiceNode(
        { type: 'custom-dice', count: 0, sides: [1], modifiers: [] } as any,
        {},
      ),
    ).toThrow('Dice count must be positive');
    expect(() =>
      evaluateDiceNode(
        {
          type: 'fudge-dice',
          count: 0,
          variant: 'basic',
          modifiers: [],
        } as any,
        {},
      ),
    ).toThrow('Dice count must be positive');
  });

  it('covers macro and inline node delegation', () => {
    expect(() =>
      evaluateDiceNode({ type: 'macro', name: 'attack' } as any, {}),
    ).toThrow();
    expect(parseDiceAst('[[1d6]]')).toBeTruthy();
  });
});
