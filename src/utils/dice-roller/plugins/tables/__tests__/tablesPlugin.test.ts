import { describe, it, expect } from 'vitest';
import { parseTableAst, extractTables, evaluateTableNode } from '../index';

// --- Parsing ---
describe('Tables Plugin > Parsing', () => {
  it('should parse a table roll', () => {
    const ast = parseTableAst('2t[loot-table]');
    expect(ast).toEqual({ type: 'table', name: 'loot-table', count: 2 });
  });
  it('should parse a table roll with default count', () => {
    const ast = parseTableAst('t[treasure]');
    expect(ast).toEqual({ type: 'table', name: 'treasure', count: 1 });
  });
  it('should throw on invalid table roll syntax', () => {
    expect(() => parseTableAst('2tloot-table')).toThrow(
      'Invalid table roll syntax',
    );
  });
});

// --- Extraction ---
describe('Tables Plugin > Extraction', () => {
  it('should extract table names from AST', () => {
    const ast = { type: 'table', name: 'loot-table', count: 2 };
    const tables = extractTables(ast);
    expect(tables).toEqual([{ name: 'loot-table', count: 2 }]);
  });
  it('should extract from nested AST', () => {
    const ast = {
      type: 'group',
      expressions: [
        { type: 'table', name: 'loot-table', count: 1 },
        { type: 'table', name: 'treasure', count: 3 },
      ],
    };
    const tables = extractTables(ast);
    expect(tables).toEqual([
      { name: 'loot-table', count: 1 },
      { name: 'treasure', count: 3 },
    ]);
  });
});

// --- Evaluation ---
describe('Tables Plugin > Evaluation', () => {
  it('should evaluate a table roll by selecting random entry', () => {
    const ast = { type: 'table', name: 'loot-table', count: 2 };
    const context: TestContext = {
      tableMap: { 'loot-table': ['Sword', 'Shield', 'Potion'] },
    };
    const result = evaluateTableNode(ast, context as any);
    const rolls = (result.rolls as any[]).filter((r) => typeof r === 'string');
    expect(rolls).toHaveLength(2);
    expect(['Sword', 'Shield', 'Potion']).toContain(rolls[0]);
    expect(['Sword', 'Shield', 'Potion']).toContain(rolls[1]);
    expect(result.details.table).toBe('loot-table');
    expect(result.details.count).toBe(2);
  });
  it('should support weighted entries by repetition', () => {
    // 'Sword' is twice as likely as 'Shield'
    const ast = { type: 'table', name: 'weighted', count: 1000 };
    const context: TestContext = {
      tableMap: { weighted: ['Sword', 'Sword', 'Shield'] },
    };
    const result = evaluateTableNode(ast, context as any);
    const rolls = (result.rolls as any[]).filter((r) => typeof r === 'string');
    const swords = rolls.filter((r) => r === 'Sword').length;
    const shields = rolls.filter((r) => r === 'Shield').length;
    expect(swords).toBeGreaterThan(shields);
    expect(result.details.weightedPoolSize).toBe(3);
  });
  it('should support weighted entries by object form', () => {
    // 'Sword' weight 3, 'Shield' weight 1
    const ast = { type: 'table', name: 'weightedObj', count: 1000 };
    const context: TestContext = {
      tableMap: {
        weightedObj: [
          { value: 'Sword', weight: 3 },
          { value: 'Shield', weight: 1 },
        ],
      },
    };
    const result = evaluateTableNode(ast, context as any);
    const rolls = (result.rolls as any[]).filter((r) => typeof r === 'string');
    const swords = rolls.filter((r) => r === 'Sword').length;
    const shields = rolls.filter((r) => r === 'Shield').length;
    expect(swords).toBeGreaterThan(shields * 2);
    expect(result.details.weightedPoolSize).toBe(4);
  });
  it('should throw if table not found', () => {
    const ast = { type: 'table', name: 'missing', count: 1 };
    const context: TestContext = { tableMap: {} };
    expect(() => evaluateTableNode(ast, context as any)).toThrow(
      "Table 'missing' not found or empty",
    );
  });
  it('should throw if table is empty', () => {
    const ast = { type: 'table', name: 'empty', count: 1 };
    const context: TestContext = { tableMap: { empty: [] } };
    expect(() => evaluateTableNode(ast, context as any)).toThrow(
      "Table 'empty' not found or empty",
    );
  });
  it('should throw for invalid count', () => {
    const ast = { type: 'table', name: 'loot-table', count: 0 };
    const context: TestContext = { tableMap: { 'loot-table': ['Sword'] } };
    expect(() => evaluateTableNode(ast, context as any)).toThrow(
      'Invalid roll count for table',
    );
  });
  it('should throw for non-array table', () => {
    const ast = { type: 'table', name: 'notArray', count: 1 };
    const context: TestContext = { tableMap: { notArray: 'Sword' as any } };
    expect(() => evaluateTableNode(ast, context as any)).toThrow(
      "Table 'notArray' not found or empty",
    );
  });
  it('should throw for table with no valid entries (object form)', () => {
    const ast = { type: 'table', name: 'badObj', count: 1 };
    const context: TestContext = {
      tableMap: { badObj: [{ foo: 'bar' } as any] },
    };
    expect(() => evaluateTableNode(ast, context as any)).toThrow(
      "Table 'badObj' has no valid entries",
    );
  });
});

// Helper type for test context
interface TestContext {
  tableMap: Record<string, any[]>;
}
