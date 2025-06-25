import { describe, it, expect, beforeEach } from 'vitest';
import { parseDiceExpression } from '../parser';
import { diceCstToAstHandlers, DiceAST } from '../converters';
import { evaluateDiceAst } from '../evaluator';
import { cstToAst } from '../../../utils/cstAstConverter';

const fakeRng = (() => {
  let i = 0;
  const seq = [0.7, 0.2, 0.9, 0.4, 0.1, 0.5, 0.8, 0.3, 0.6, 0.0];
  return {
    next: () => {
      const v = seq[i % seq.length];
      i++;
      return v;
    },
    reset: () => { i = 0; }
  };
})();

describe('Dice Modifiers', () => {
  beforeEach(() => {
    fakeRng.reset();
  });

  describe('Parsing and AST', () => {
    it('parses single modifier', () => {
      const cst = parseDiceExpression('4d6kh3');
      expect(cst).toBeTruthy();
    });

    it('parses multiple modifiers', () => {
      const cst = parseDiceExpression('4d6kh3ro1!>5sd');
      expect(cst).toBeTruthy();
    });

    it('converts to AST with single modifier', () => {
      const cst = parseDiceExpression('4d6kh3');
      const ast = cstToAst(cst, diceCstToAstHandlers) as DiceAST;
      expect(ast.modifiers!.length).toBe(1);
      expect(ast.modifiers!.map((m: any) => m.type)).toEqual(['Kh']);
    });

    it('converts to AST with multiple modifiers', () => {
      const cst = parseDiceExpression('4d6kh3ro1!>5sd');
      const ast = cstToAst(cst, diceCstToAstHandlers) as DiceAST;
      expect(ast.modifiers!.length).toBe(4);
      expect(ast.modifiers!.map((m: any) => m.type)).toEqual(['Kh', 'Reroll', 'Explode', 'Sd']);
    });

    it('parses khN modifier', () => {
      const cst = parseDiceExpression('4d6kh2');
      const ast = cstToAst(cst, diceCstToAstHandlers) as DiceAST;
      expect(ast.modifiers).toEqual([{ type: 'Kh', value: 'kh2' }]);
    });

    it('parses klN modifier', () => {
      const cst = parseDiceExpression('4d6kl2');
      const ast = cstToAst(cst, diceCstToAstHandlers) as DiceAST;
      expect(ast.modifiers).toEqual([{ type: 'Kl', value: 'kl2' }]);
    });

    it('parses dhN modifier', () => {
      const cst = parseDiceExpression('4d6dh2');
      const ast = cstToAst(cst, diceCstToAstHandlers) as DiceAST;
      expect(ast.modifiers).toEqual([{ type: 'Dh', value: 'dh2' }]);
    });

    it('parses dlN modifier', () => {
      const cst = parseDiceExpression('4d6dl2');
      const ast = cstToAst(cst, diceCstToAstHandlers) as DiceAST;
      expect(ast.modifiers).toEqual([{ type: 'Dl', value: 'dl2' }]);
    });

    it('parses sa modifier', () => {
      const cst = parseDiceExpression('4d6sa');
      const ast = cstToAst(cst, diceCstToAstHandlers) as DiceAST;
      expect(ast.modifiers).toEqual([{ type: 'Sa', value: 'sa' }]);
    });

    it('parses sd modifier', () => {
      const cst = parseDiceExpression('4d6sd');
      const ast = cstToAst(cst, diceCstToAstHandlers) as DiceAST;
      expect(ast.modifiers).toEqual([{ type: 'Sd', value: 'sd' }]);
    });
  });

  describe('Evaluation', () => {
    it('khN keeps highest N dice', () => {
      const ast = { type: 'Dice', count: 4, sides: 6, modifiers: [{ type: 'Kh', value: 'kh2' }] } as DiceAST;
      const result = evaluateDiceAst(ast, fakeRng.next);
      // rolls: [5, 2, 6, 3], sorted desc: [6, 5, 3, 2], kept: [6, 5]
      expect(result).toEqual([6, 5]);
    });

    it('klN keeps lowest N dice', () => {
      const ast = { type: 'Dice', count: 4, sides: 6, modifiers: [{ type: 'Kl', value: 'kl2' }] } as DiceAST;
      const result = evaluateDiceAst(ast, fakeRng.next);
      // rolls: [5, 2, 6, 3], sorted asc: [2, 3, 5, 6], kept: [2, 3]
      expect(result).toEqual([2, 3]);
    });

    it('dhN drops highest N dice', () => {
      const ast = { type: 'Dice', count: 4, sides: 6, modifiers: [{ type: 'Dh', value: 'dh2' }] } as DiceAST;
      const result = evaluateDiceAst(ast, fakeRng.next);
      // rolls: [5, 2, 6, 3], sorted desc: [6, 5, 3, 2], dropped [6, 5], remaining: [3, 2]
      expect(result).toEqual([3, 2]);
    });

    it('dlN drops lowest N dice', () => {
      const ast = { type: 'Dice', count: 4, sides: 6, modifiers: [{ type: 'Dl', value: 'dl2' }] } as DiceAST;
      const result = evaluateDiceAst(ast, fakeRng.next);
      // rolls: [5, 2, 6, 3], sorted asc: [2, 3, 5, 6], dropped [2, 3], remaining: [5, 6]
      expect(result).toEqual([5, 6]);
    });

    it('sa sorts ascending', () => {
      const ast = { type: 'Dice', count: 4, sides: 6, modifiers: [{ type: 'Sa', value: 'sa' }] } as DiceAST;
      const result = evaluateDiceAst(ast, fakeRng.next);
      // rolls: [5, 2, 6, 3], sorted asc: [2, 3, 5, 6]
      expect(result).toEqual([2, 3, 5, 6]);
    });

    it('sd sorts descending', () => {
      const ast = { type: 'Dice', count: 4, sides: 6, modifiers: [{ type: 'Sd', value: 'sd' }] } as DiceAST;
      const result = evaluateDiceAst(ast, fakeRng.next);
      // rolls: [5, 2, 6, 3], sorted desc: [6, 5, 3, 2]
      expect(result).toEqual([6, 5, 3, 2]);
    });
  });
});

describe('Comprehensive Modifier Tests', () => {
  beforeEach(() => {
    fakeRng.reset();
  });

  it('miN sets minimum per die', () => {
    const cst = parseDiceExpression('4d6mi4');
    const ast = cstToAst(cst, diceCstToAstHandlers) as DiceAST;
    expect(ast.modifiers).toEqual([{ type: 'Mi', value: 'mi4' }]);
    const result = evaluateDiceAst(ast, fakeRng.next);
    // rolls: [5,2,6,3] -> min 4: [5,4,6,4]
    expect(result).toEqual([5,4,6,4]);
  });

  it('maN sets maximum per die', () => {
    const cst = parseDiceExpression('4d6ma4');
    const ast = cstToAst(cst, diceCstToAstHandlers) as DiceAST;
    expect(ast.modifiers).toEqual([{ type: 'Ma', value: 'ma4' }]);
    const result = evaluateDiceAst(ast, fakeRng.next);
    // rolls: [5,2,6,3] -> max 4: [4,2,4,3]
    expect(result).toEqual([4,2,4,3]);
  });

  it('=N counts dice equal to N', () => {
    const ast = { type: 'Dice', count: 4, sides: 6, modifiers: [{ type: 'Equal', value: '=5' }] } as DiceAST;
    const result = evaluateDiceAst(ast, fakeRng.next);
    // rolls: [5,2,6,3] -> 1 die is 5
    expect(result).toBe(1);
  });

  it('>N counts dice above N', () => {
    const ast = { type: 'Dice', count: 4, sides: 6, modifiers: [{ type: 'Success', value: '>4' }] } as DiceAST;
    const result = evaluateDiceAst(ast, fakeRng.next);
    // rolls: [5,2,6,3] -> 5,6 > 4: 2
    expect(result).toBe(2);
  });

  it('<N counts dice below N', () => {
    const ast = { type: 'Dice', count: 4, sides: 6, modifiers: [{ type: 'Failure', value: '<4' }] } as DiceAST;
    const result = evaluateDiceAst(ast, fakeRng.next);
    // rolls: [5,2,6,3] -> 2,3 < 4: 2
    expect(result).toBe(2);
  });

  it('s modifier (success) after >N', () => {
    const ast = { type: 'Dice', count: 4, sides: 6, modifiers: [{ type: 'Success', value: '>4' }, { type: 'S', value: 's' }] } as DiceAST;
    const result = evaluateDiceAst(ast, fakeRng.next);
    expect(result).toBe(2);
  });

  it('f modifier (failure) after <N', () => {
    const ast = { type: 'Dice', count: 4, sides: 6, modifiers: [{ type: 'Failure', value: '<4' }, { type: 'F', value: 'f' }] } as DiceAST;
    const result = evaluateDiceAst(ast, fakeRng.next);
    expect(result).toBe(2);
  });

  it('cs>=N counts critical successes', () => {
    const ast = { type: 'Dice', count: 4, sides: 6, modifiers: [{ type: 'Cs', value: 'cs>=6' }] } as DiceAST;
    const result = evaluateDiceAst(ast, fakeRng.next);
    // rolls: [5,2,6,3] -> 6 >= 6: 1
    expect(result).toBe(1);
  });

  it('cf<=N counts critical failures', () => {
    const ast = { type: 'Dice', count: 4, sides: 6, modifiers: [{ type: 'Cf', value: 'cf<=2' }] } as DiceAST;
    const result = evaluateDiceAst(ast, fakeRng.next);
    // rolls: [5,2,6,3] -> 2 <= 2: 1
    expect(result).toBe(1);
  });

  it('k>N keeps dice above N', () => {
    const ast = { type: 'Dice', count: 4, sides: 6, modifiers: [{ type: 'Kgt', value: 'k>3' }] } as DiceAST;
    const result = evaluateDiceAst(ast, fakeRng.next);
    // rolls: [5,2,6,3] -> 5,6 > 3: [5,6]
    expect(result).toEqual([5,6]);
  });

  it('k<N keeps dice below N', () => {
    const ast = { type: 'Dice', count: 4, sides: 6, modifiers: [{ type: 'Klt', value: 'k<4' }] } as DiceAST;
    const result = evaluateDiceAst(ast, fakeRng.next);
    // rolls: [5,2,6,3] -> 2,3 < 4: [2,3]
    expect(result).toEqual([2,3]);
  });

  it('m finds matching dice', () => {
    const ast = { type: 'Dice', count: 6, sides: 3, modifiers: [{ type: 'M', value: 'm' }] } as DiceAST;
    const result = evaluateDiceAst(ast, fakeRng.next);
    // rolls: [3,1,3,2,3,2] -> using fakeRng: [1,2,3,1,3,2]
    // counts: { '1': 2, '2': 2, '3': 2 }
    // sorted: [ { value: 3, count: 2 }, { value: 2, count: 2 }, { value: 1, count: 2 } ]
    expect(result).toEqual([
      { value: 3, count: 2 },
      { value: 2, count: 2 },
      { value: 1, count: 2 },
    ]);
  });

  it('e counts unique dice results', () => {
    const ast = { type: 'Dice', count: 6, sides: 3, modifiers: [{ type: 'E', value: 'e' }] } as DiceAST;
    const result = evaluateDiceAst(ast, fakeRng.next);
    // rolls: [3,1,3,2,3,2] -> unique: 1,2,3 = 3
    expect(result).toBe(3);
  });

  it('chained modifiers: miN, >N, s', () => {
    const ast = { type: 'Dice', count: 4, sides: 6, modifiers: [
      { type: 'Mi', value: 'mi4' },
      { type: 'Success', value: '>4' },
      { type: 'S', value: 's' }
    ] } as DiceAST;
    const result = evaluateDiceAst(ast, fakeRng.next);
    // rolls: [5,2,6,3] -> mi4: [5,4,6,4] -> >4: 5,6 -> 2
    expect(result).toBe(2);
  });

  it('chained modifiers: maN, <N, f', () => {
    const ast = { type: 'Dice', count: 4, sides: 6, modifiers: [
      { type: 'Ma', value: 'ma4' },
      { type: 'Failure', value: '<4' },
      { type: 'F', value: 'f' }
    ] } as DiceAST;
    const result = evaluateDiceAst(ast, fakeRng.next);
    // rolls: [5,2,6,3] -> ma4: [4,2,4,3] -> <4: 2,3 -> 2
    expect(result).toBe(2);
  });

  it('o (roll once) modifier reuses identical rolls in a group', () => {
    const cst = parseDiceExpression('{2d6, 1d8, 2d6}o');
    const ast = cstToAst(cst, diceCstToAstHandlers) as DiceAST;
    const result = evaluateDiceAst(ast, fakeRng.next);
    // 2d6 is rolled once: [5,2] (from 0.7, 0.2)
    // 1d8 is rolled once: [8] (from 0.9)
    // 2d6 is reused: [5,2]
    expect(result).toEqual([
      [5, 2],
      [8],
      [5, 2],
    ]);
  });
});
 