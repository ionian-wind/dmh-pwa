import { describe, expect, it, vi } from 'vitest';
import {
  parseTableAst,
  extractTables,
  evaluateTableNode,
  tablesPlugin,
} from '@/utils/dice-roller/plugins/tables';
import {
  extractMacros,
  evaluateMacroNode,
  macrosPlugin,
} from '@/utils/dice-roller/plugins/macros';
import { registerPlugin } from '@/utils/dice-roller/core';
import { dicePlugin } from '@/utils/dice-roller/plugins/dice/dicePlugin';

describe('tables plugin coverage', () => {
  it('parses and extracts table nodes', () => {
    expect(parseTableAst('2t[loot]')).toEqual({
      type: 'table',
      name: 'loot',
      count: 2,
    });
    expect(() => parseTableAst('invalid')).toThrow('Invalid table roll syntax');
    expect(
      extractTables({
        type: 'group',
        children: [
          { type: 'table', name: 'loot', count: 2 },
          { type: 'nested', child: { type: 'table', name: 'gear' } },
        ],
      } as any),
    ).toEqual([
      { name: 'loot', count: 2 },
      { name: 'gear', count: 1 },
    ]);
    expect(
      tablesPlugin.extractTables?.({ type: 'table', name: 'x' } as any),
    ).toEqual(['x']);
    expect(
      tablesPlugin.extractTables?.({ type: 'table-roll', table: 'y' } as any),
    ).toEqual(['y']);
    expect(
      tablesPlugin.extractTables?.({
        type: 'group',
        child: { type: 'table', name: 'z' },
      } as any),
    ).toEqual(['z']);
  });

  it('evaluates weighted and classic tables', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(
      evaluateTableNode(
        { type: 'table', name: 'loot', count: 2 } as any,
        {
          tableMap: { loot: ['gold', 'gem'] },
        } as any,
      ),
    ).toMatchObject({ rolls: ['gold', 'gold'] });
    expect(
      evaluateTableNode(
        { type: 'table', name: 'loot', count: 1 } as any,
        {
          tableMap: {
            loot: [
              { value: 'gold', weight: 2 },
              { value: 'gem', weight: 1 },
            ],
          },
        } as any,
      ),
    ).toMatchObject({ rolls: ['gold'] });
    expect(() => evaluateTableNode({ type: 'dice' } as any, {})).toThrow(
      'Expected table node',
    );
    expect(() =>
      evaluateTableNode(
        { type: 'table', name: 'missing', count: 1 } as any,
        {},
      ),
    ).toThrow("Table 'missing' not found or empty");
    expect(() =>
      evaluateTableNode(
        { type: 'table', name: 'empty', count: 1 } as any,
        {
          tableMap: { empty: [{}] },
        } as any,
      ),
    ).toThrow("Table 'empty' has no valid entries");
    expect(() =>
      evaluateTableNode(
        { type: 'table', name: 'loot', count: 0 } as any,
        {
          tableMap: { loot: ['gold'] },
        } as any,
      ),
    ).toThrow("Invalid roll count for table 'loot': 0");
    vi.restoreAllMocks();
  });
});

describe('macros plugin coverage', () => {
  it('extracts macro nodes and plugin variants', () => {
    expect(
      extractMacros({
        type: 'group',
        children: [
          { type: 'macro', name: 'attack' },
          { type: 'nested', child: { type: 'macro', name: 'damage' } },
        ],
      } as any),
    ).toEqual([{ name: 'attack' }, { name: 'damage' }]);
    expect(
      macrosPlugin.extractMacros?.({ type: 'macro', name: 'x' } as any),
    ).toEqual(['x']);
    expect(
      macrosPlugin.extractMacros?.({ type: 'macro-call', macro: 'y' } as any),
    ).toEqual(['y']);
    expect(
      macrosPlugin.extractMacros?.({
        type: 'group',
        child: { type: 'macro', name: 'z' },
      } as any),
    ).toEqual(['z']);
  });

  it('evaluates macros and guards recursion and missing macros', () => {
    expect(() =>
      evaluateMacroNode({ type: 'number', value: 1 } as any, {}),
    ).toThrow('Expected macro node');
    expect(() =>
      evaluateMacroNode(
        { type: 'macro', name: 'x' } as any,
        {
          nestingLevel: 2,
          maxNesting: 2,
        } as any,
      ),
    ).toThrow('Macro recursion limit exceeded (2 levels)');
    expect(() =>
      evaluateMacroNode(
        { type: 'macro', name: 'missing' } as any,
        {
          macroMap: {},
        } as any,
      ),
    ).toThrow("Macro 'missing' not found");
    registerPlugin(dicePlugin);
    expect(
      evaluateMacroNode(
        { type: 'macro', name: 'attack' } as any,
        {
          macroMap: { attack: { type: 'number', value: 5 } },
        } as any,
      ),
    ).toMatchObject({
      total: 5,
      details: { macro: 'attack', nestingLevel: 1 },
    });
  });
});
