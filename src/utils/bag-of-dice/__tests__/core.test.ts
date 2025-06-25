import { describe, it, expect } from 'vitest';
import { BagOfDice } from '../index';
import { arithmeticPlugin } from '../plugins/arithmetic';
import { dicePlugin } from '../plugins/dice';

// Deterministic RNG for testing
const fakeRng = (() => {
  let i = 0;
  const seq = [0.1, 0.5, 0.9, 0.2, 0.7, 0.3, 0.8, 0.4, 0.6, 0.0];
  return () => {
    const v = seq[i % seq.length];
    i++;
    return v;
  };
})();

describe('BagOfDice core', () => {
  it('should construct with plugins in order', () => {
    const engine = new BagOfDice({ plugins: [dicePlugin, arithmeticPlugin] });
    expect(engine.plugins[0].name).toBe('dice');
    expect(engine.plugins[1].name).toBe('arithmetic');
  });

  it('should parse arithmetic expression', () => {
    const engine = new BagOfDice({ plugins: [arithmeticPlugin] });
    const ast = engine.parse('1+2');
    expect(ast).toEqual({
      type: 'Add',
      left: { type: 'NumberLiteral', value: 1, plugin: 'arithmetic' },
      right: { type: 'NumberLiteral', value: 2, plugin: 'arithmetic' },
      plugin: 'arithmetic',
    });
  });

  it('should evaluate arithmetic expression', () => {
    const engine = new BagOfDice({ plugins: [arithmeticPlugin] });
    const ast = engine.parse('1+2');
    const result = engine.evaluate(ast, {});
    expect(result).toEqual({ result: 3, warnings: [] });
  });

  it('should throw on syntax error by default', () => {
    const engine = new BagOfDice({ plugins: [arithmeticPlugin] });
    expect(() => engine.parse('1+')).toThrow();
  });

  it('should not throw on syntax error if strict=false', () => {
    const engine = new BagOfDice({ plugins: [arithmeticPlugin] });
    expect(() => engine.parse('1+', false)).not.toThrow();
    const ast = engine.parse('1+', false);
    expect(ast === null || ast === undefined || typeof ast === 'object').toBe(true);
  });

  it('should default to arithmeticPlugin if plugins not provided', () => {
    const engine = new BagOfDice();
    expect(() => engine.parse('1+')).toThrow();
    expect(() => engine.parse('1+', false)).not.toThrow();
    const ast = engine.parse('1+', false);
    expect(ast === null || ast === undefined || typeof ast === 'object').toBe(true);
  });
}); 