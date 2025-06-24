import { macrosPlugin } from '../plugins/macros';
import { registerPlugin } from '../core';

describe('Macros Plugin', () => {
  beforeAll(() => {
    registerPlugin(macrosPlugin);
  });

  it('should extract macro names from AST', () => {
    const ast = { type: 'macro', name: 'attack' };
    const macros = macrosPlugin.extractMacros?.(ast);
    expect(macros).toContain('attack');
  });

  it('should throw on evaluateMacro (not implemented)', () => {
    expect(() => macrosPlugin.evaluateMacro?.({ type: 'macro', name: 'attack' }, {})).toThrow();
  });
}); 