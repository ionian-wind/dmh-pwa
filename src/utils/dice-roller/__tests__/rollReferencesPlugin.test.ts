import { rollReferencesPlugin } from '../plugins/roll-references';
import { registerPlugin } from '../core';

describe('Roll References Plugin', () => {
  beforeAll(() => {
    registerPlugin(rollReferencesPlugin);
  });

  it('should extract roll references from AST', () => {
    const ast = { type: 'roll-reference', ref: 'attackRoll' };
    const refs = rollReferencesPlugin.extractRolls?.(ast);
    expect(refs).toContain('attackRoll');
  });

  it('should throw on evaluateRollReference (not implemented)', () => {
    expect(() => rollReferencesPlugin.evaluateRollReference?.({ type: 'roll-reference', ref: 'attackRoll' }, {})).toThrow();
  });
}); 