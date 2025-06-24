import { rollQueriesPlugin } from '../plugins/roll-queries';
import { registerPlugin } from '../core';

describe('Roll Queries Plugin', () => {
  beforeAll(() => {
    registerPlugin(rollQueriesPlugin);
  });

  it('should extract roll queries from AST', () => {
    const ast = { type: 'roll-query', prompt: 'Bonus?', default: 0 };
    const queries = rollQueriesPlugin.extractQueries?.(ast);
    expect(queries).toEqual([{ prompt: 'Bonus?', default: 0 }]);
  });

  it('should throw on evaluateRollQuery (not implemented)', () => {
    expect(() => rollQueriesPlugin.evaluateRollQuery?.({ type: 'roll-query', prompt: 'Bonus?' }, {})).toThrow();
  });
}); 