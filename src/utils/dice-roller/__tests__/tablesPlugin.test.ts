import { tablesPlugin } from '../plugins/tables';
import { registerPlugin } from '../core';

describe('Tables Plugin', () => {
  beforeAll(() => {
    registerPlugin(tablesPlugin);
  });

  it('should extract table names from AST', () => {
    const ast = { type: 'table-roll', table: 'loot-table' };
    const tables = tablesPlugin.extractTables?.(ast);
    expect(tables).toContain('loot-table');
  });

  it('should throw on evaluateTable (not implemented)', () => {
    expect(() =>
      tablesPlugin.evaluateTable?.(
        { type: 'table-roll', table: 'loot-table' },
        {},
      ),
    ).toThrow();
  });
});
