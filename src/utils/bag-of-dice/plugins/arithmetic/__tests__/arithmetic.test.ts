import { describe, it, expect } from 'vitest';
import { BagOfDice } from '../../../index';
import { arithmeticPlugin } from '../index';

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

const engine = new BagOfDice({ plugins: [arithmeticPlugin], rng: fakeRng });

describe('Arithmetic Plugin', () => {
  describe('parsing', () => {
    function ast(expr: string) {
      return engine.parse(expr);
    }

    it('produces AST for addition and subtraction', () => {
      expect(ast('1+2')).toEqual({
        type: 'Add',
        left: { type: 'NumberLiteral', value: 1, plugin: 'arithmetic' },
        right: { type: 'NumberLiteral', value: 2, plugin: 'arithmetic' },
        plugin: 'arithmetic',
      });
      expect(ast('5-3')).toEqual({
        type: 'Sub',
        left: { type: 'NumberLiteral', value: 5, plugin: 'arithmetic' },
        right: { type: 'NumberLiteral', value: 3, plugin: 'arithmetic' },
        plugin: 'arithmetic',
      });
    });

    it('produces AST for multiplication, division, modulus', () => {
      expect(ast('2*3')).toEqual({
        type: 'Mul',
        left: { type: 'NumberLiteral', value: 2, plugin: 'arithmetic' },
        right: { type: 'NumberLiteral', value: 3, plugin: 'arithmetic' },
        plugin: 'arithmetic',
      });
      expect(ast('8/2')).toEqual({
        type: 'Div',
        left: { type: 'NumberLiteral', value: 8, plugin: 'arithmetic' },
        right: { type: 'NumberLiteral', value: 2, plugin: 'arithmetic' },
        plugin: 'arithmetic',
      });
      expect(ast('7%4')).toEqual({
        type: 'Mod',
        left: { type: 'NumberLiteral', value: 7, plugin: 'arithmetic' },
        right: { type: 'NumberLiteral', value: 4, plugin: 'arithmetic' },
        plugin: 'arithmetic',
      });
    });

    it('produces AST for exponentiation', () => {
      expect(ast('2**3')).toEqual({
        type: 'Pow',
        left: { type: 'NumberLiteral', value: 2, plugin: 'arithmetic' },
        right: { type: 'NumberLiteral', value: 3, plugin: 'arithmetic' },
        plugin: 'arithmetic',
      });
    });

    it('produces AST for unary plus and minus', () => {
      expect(ast('-5')).toEqual({
        type: 'UnaryMinus',
        value: { type: 'NumberLiteral', value: 5, plugin: 'arithmetic' },
        plugin: 'arithmetic',
      });
      expect(ast('+5')).toEqual({
        type: 'UnaryPlus',
        value: { type: 'NumberLiteral', value: 5, plugin: 'arithmetic' },
        plugin: 'arithmetic',
      });
      expect(ast('-(2+3)')).toEqual({
        type: 'UnaryMinus',
        value: {
          type: 'Add',
          left: { type: 'NumberLiteral', value: 2, plugin: 'arithmetic' },
          right: { type: 'NumberLiteral', value: 3, plugin: 'arithmetic' },
          plugin: 'arithmetic',
        },
        plugin: 'arithmetic',
      });
    });

    it('produces AST for math functions', () => {
      expect(ast('floor(2.9)')).toEqual({
        type: 'Floor',
        arg: { type: 'NumberLiteral', value: 2.9, plugin: 'arithmetic' },
        plugin: 'arithmetic',
      });
      expect(ast('ceil(2.1)')).toEqual({
        type: 'Ceil',
        arg: { type: 'NumberLiteral', value: 2.1, plugin: 'arithmetic' },
        plugin: 'arithmetic',
      });
      expect(ast('round(2.5)')).toEqual({
        type: 'Round',
        arg: { type: 'NumberLiteral', value: 2.5, plugin: 'arithmetic' },
        plugin: 'arithmetic',
      });
      expect(ast('abs(-5)')).toEqual({
        type: 'Abs',
        arg: { type: 'UnaryMinus', value: { type: 'NumberLiteral', value: 5, plugin: 'arithmetic' }, plugin: 'arithmetic' },
        plugin: 'arithmetic',
      });
    });

    it('produces AST for parenthesized expressions', () => {
      expect(ast('(1+2)')).toEqual({
        type: 'Add',
        left: { type: 'NumberLiteral', value: 1, plugin: 'arithmetic' },
        right: { type: 'NumberLiteral', value: 2, plugin: 'arithmetic' },
        plugin: 'arithmetic',
      });
    });

    it('throws on invalid syntax', () => {
      expect(() => engine.parse('2+*3')).toThrow();
      expect(() => engine.parse('floor(2.9')).toThrow();
    });
  });

  describe('evaluation', () => {
    function evalExpr(expr: string) {
      const ast = engine.parse(expr);
      return engine.evaluate(ast);
    }

    it('evaluates addition and subtraction', () => {
      expect(evalExpr('1+2')).toBe(3);
      expect(evalExpr('5-3')).toBe(2);
      expect(evalExpr('1+2-3')).toBe(0);
    });

    it('evaluates multiplication, division, modulus', () => {
      expect(evalExpr('2*3')).toBe(6);
      expect(evalExpr('8/2')).toBe(4);
      expect(evalExpr('7%4')).toBe(3);
    });

    it('evaluates exponentiation', () => {
      expect(evalExpr('2**3')).toBe(8);
      expect(evalExpr('4**0.5')).toBe(2);
    });

    it('respects order of operations', () => {
      expect(evalExpr('2+3*4')).toBe(14);
      expect(evalExpr('(2+3)*4')).toBe(20);
      expect(evalExpr('2**2*3')).toBe(12);
      expect(evalExpr('2*2**3')).toBe(16);
    });

    it('evaluates math functions', () => {
      expect(evalExpr('floor(2.9)')).toBe(2);
      expect(evalExpr('ceil(2.1)')).toBe(3);
      expect(evalExpr('round(2.5)')).toBe(3);
      expect(evalExpr('abs(-5)')).toBe(5);
    });

    it('evaluates unary plus and minus', () => {
      expect(evalExpr('-5')).toBe(-5);
      expect(evalExpr('+5')).toBe(5);
      expect(evalExpr('-(2+3)')).toBe(-5);
    });

    it('throws on division by zero', () => {
      expect(() => evalExpr('1/0')).toThrow();
      expect(() => evalExpr('1%0')).toThrow();
    });
  });
}); 