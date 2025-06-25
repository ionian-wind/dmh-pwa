import { describe, it, expect } from 'vitest';
import { parseDiceExpression } from '../parser';
import { diceCstToAstHandlers, DiceAST } from '../converters';
import { evaluateDiceAst } from '../evaluator';
import { cstToAst } from '../../../utils/cstAstConverter';

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

describe('dice plugin', () => {
  describe('parsing', () => {
    it('parses NdX', () => {
      const cst = parseDiceExpression('3d6');
      expect(cst).toBeTruthy();
    });
    it('parses dX', () => {
      const cst = parseDiceExpression('d8');
      expect(cst).toBeTruthy();
    });
    it('parses d%', () => {
      const cst = parseDiceExpression('d%');
      expect(cst).toBeTruthy();
    });
    it('parses dF, dF.1, dF.3', () => {
      expect(parseDiceExpression('dF')).toBeTruthy();
      expect(parseDiceExpression('dF.1')).toBeTruthy();
      expect(parseDiceExpression('dF.3')).toBeTruthy();
    });
    it('parses custom dice', () => {
      expect(parseDiceExpression('2d[1,2,3,5,8]')).toBeTruthy();
    });
    it('parses computed dice', () => {
      expect(parseDiceExpression('(2)d6')).toBeTruthy();
      expect(parseDiceExpression('2d(6)')).toBeTruthy();
    });
    it('parses grouping', () => {
      expect(parseDiceExpression('{1d6,2d8}')).toBeTruthy();
    });
  });

  describe('AST conversion', () => {
    it('converts NdX to AST', () => {
      const cst = parseDiceExpression('3d6');
      const ast = cstToAst(cst, diceCstToAstHandlers);
      expect(ast).toMatchObject({ type: 'Dice', count: 3, sides: 6 });
    });
    it('converts d% to AST', () => {
      const cst = parseDiceExpression('d%');
      const ast = cstToAst(cst, diceCstToAstHandlers);
      expect(ast).toMatchObject({ type: 'Dice', sides: 100 });
    });
    it('converts dF.3 to AST', () => {
      const cst = parseDiceExpression('dF.3');
      const ast = cstToAst(cst, diceCstToAstHandlers);
      expect(ast).toMatchObject({ type: 'Dice', fudge: 3 });
    });
    it('converts custom dice to AST', () => {
      const cst = parseDiceExpression('2d[1,2,3]');
      const ast = cstToAst(cst, diceCstToAstHandlers);
      expect(ast).toMatchObject({ type: 'Dice', count: 2, custom: [1,2,3] });
    });
    it('converts grouping to AST', () => {
      const cst = parseDiceExpression('{1d6,2d8}');
      const ast = cstToAst(cst, diceCstToAstHandlers);
      expect(ast).toMatchObject({ type: 'Group' });
      expect(ast.items.length).toBe(2);
    });
  });

  describe('evaluation', () => {
    it('evaluates NdX', () => {
      const cst = parseDiceExpression('3d6');
      const ast = cstToAst(cst, diceCstToAstHandlers) as DiceAST;
      const result = evaluateDiceAst(ast, fakeRng);
      expect(result.length).toBe(3);
      expect(result).toEqual([1, 4, 6]); // 0.1*6+1=1.6, 0.5*6+1=4, 0.9*6+1=6.4
    });
    it('evaluates d%', () => {
      const cst = parseDiceExpression('d%');
      const ast = cstToAst(cst, diceCstToAstHandlers) as DiceAST;
      const result = evaluateDiceAst(ast, fakeRng);
      expect(result.length).toBe(1);
      expect(result[0]).toBeGreaterThanOrEqual(1);
      expect(result[0]).toBeLessThanOrEqual(100);
    });
    it('evaluates dF.3', () => {
      const cst = parseDiceExpression('2dF.3');
      const ast = cstToAst(cst, diceCstToAstHandlers) as DiceAST;
      const result = evaluateDiceAst(ast, fakeRng);
      expect(result.length).toBe(2);
      expect([-1, 0, 1]).toContain(result[0]);
    });
    it('evaluates custom dice', () => {
      const cst = parseDiceExpression('2d[1,2,3]');
      const ast = cstToAst(cst, diceCstToAstHandlers) as DiceAST;
      const result = evaluateDiceAst(ast, fakeRng);
      expect(result.length).toBe(2);
      expect([1,2,3]).toContain(result[0]);
      expect([1,2,3]).toContain(result[1]);
    });
    it('evaluates grouping', () => {
      const cst = parseDiceExpression('{1d6,2d8}');
      const ast = cstToAst(cst, diceCstToAstHandlers) as DiceAST;
      const result = evaluateDiceAst(ast, fakeRng);
      expect(result.length).toBe(2);
      expect(Array.isArray(result[0])).toBe(true);
      expect(Array.isArray(result[1])).toBe(true);
    });
  });
}); 