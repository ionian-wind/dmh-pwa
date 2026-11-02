import { describe, expect, it } from 'vitest';
import { calculate, type OutputResult } from '../index';

function outputs(script: string): OutputResult[] {
  return calculate(script).outputs;
}

function one(script: string): OutputResult {
  const result = outputs(script);
  expect(result).toHaveLength(1);
  return result[0];
}

function prob(output: OutputResult, value: number): number {
  return (
    output.outcomes.find((outcome) => outcome.value === value)?.probability ?? 0
  );
}

function expectRange(output: OutputResult, min: number, max: number) {
  expect(output.outcomes[0]?.value).toBe(min);
  expect(output.outcomes[output.outcomes.length - 1]?.value).toBe(max);
}

describe('official AnyDice documentation examples', () => {
  describe('The Basics', () => {
    it('performs integer division rounded toward zero', () => {
      expect(one('output 6 / 3').outcomes[0].value).toBe(2);
      expect(one('output 5 / 3').outcomes[0].value).toBe(1);
      expect(one('output -5 / 3').outcomes[0].value).toBe(-1);
    });

    it('supports variable reassignment and condition precedence', () => {
      const result = outputs(`
        X: 3
        output X named "It's a 3!"
        output X + 1 named "It's a 4!"
        X: X * 2
        output X named "It's a 6!"
        output 1 + 2 * 3 = 7
      `);
      expect(result.map((output) => output.name)).toEqual([
        "It's a 3!",
        "It's a 4!",
        "It's a 6!",
        undefined,
      ]);
      expect(result[3].outcomes[0].value).toBe(1);
    });
  });

  describe('Dice', () => {
    it('applies arithmetic and comparisons to every die face', () => {
      expectRange(one('output d6 + 10'), 11, 16);
      expectRange(one('output d6 * 10'), 10, 60);
      expectRange(one('output d6 / 2'), 0, 3);
      expectRange(one('output d6 > 3'), 0, 1);
    });

    it('combines two dice value by value', () => {
      expectRange(one('output d2 + d3'), 2, 5);
      expectRange(one('output d2 * d3'), 1, 6);
      expectRange(one('output d2 / d3'), 0, 2);
      expectRange(one('output d2 > d3'), 0, 1);
    });
  });

  describe('Arbitrary Dice', () => {
    it('creates dice from sequences, dice and empty sequences', () => {
      expectRange(one('output d{1..6}'), 1, 6);
      expectRange(one('output d{-1..1}'), -1, 1);
      expectRange(one('output d{2, 3, 3, 4}'), 2, 4);
      expectRange(one('output 2d(2d2)'), 4, 8);
      expect(one('output d{}').outcomes).toEqual([]);
    });
  });

  describe('Sequences', () => {
    it('supports ranges, repetitions and nesting', () => {
      expectRange(one('output {1..3}'), 1, 3);
      expect(one('output {1:4, 2, 3}').outcomes).toHaveLength(3);
      expectRange(one('output {1..3:2}'), 1, 3);
      expectRange(one('output {{1,2,4}:2, 5, 6}'), 1, 6);
    });

    it('sums sequences during mathematical operations', () => {
      expect(one('output {1,2,3} + 1').outcomes[0].value).toBe(7);
      expect(one('output {1,2,3} * 2').outcomes[0].value).toBe(12);
    });

    it('compares sequences using the documented rules', () => {
      expect(one('output {1,2,3} = 2').outcomes[0].value).toBe(1);
      expect(one('output {1,2,3} >= 2').outcomes[0].value).toBe(2);
      expect(one('output {9,1} > {9,0}').outcomes[0].value).toBe(1);
    });
  });

  describe('Introspection', () => {
    it('implements length and position access', () => {
      expect(one('output #{2,4,6}').outcomes[0].value).toBe(3);
      expect(one('output #(3d6)').outcomes[0].value).toBe(3);
      expect(one('output #(d6)').outcomes[0].value).toBe(1);
      expect(one('output #1234').outcomes[0].value).toBe(4);
      expect(one('output 1@{2,4,6}').outcomes[0].value).toBe(2);
      expect(one('output 3@{2,4,6}').outcomes[0].value).toBe(6);
      expect(one('output {1,3}@{2,4,6}').outcomes[0].value).toBe(8);
      expect(one('output 1@246').outcomes[0].value).toBe(2);
    });
  });

  describe('Strings with Variables', () => {
    it('interpolates numeric variables in names', () => {
      const output = one(`
        X: 4
        output X named "this is a [X]"
      `);
      expect(output.name).toBe('this is a 4');
      expect(output.outcomes[0].value).toBe(4);
    });
  });

  describe('Looping', () => {
    it('loops over a sequence and interpolates the loop variable', () => {
      const result = outputs(`
        loop N over {1..4} {
          output Nd4 named "[N]d4"
          output 1dN named "1d[N]"
        }
      `);
      expect(result).toHaveLength(8);
      const names = result.map((output) => output.name);
      expect(names).toContain('1d4');
      expect(names).toContain('4d4');
    });
  });

  describe('Conditional Blocks', () => {
    it('executes only the selected block', () => {
      const result = outputs(`
        X: 1
        if X = 1 {
          output 1
        }
        else {
          output 1d6
        }
      `);
      expect(result).toHaveLength(1);
      expect(result[0].outcomes[0].value).toBe(1);
    });
  });

  describe('Functions', () => {
    it('runs the documented add function examples', () => {
      const result = outputs(`
        function: add A to B {
          result: A + B
        }
        output [add 1 to 2]
        output [add d4 to 1]
        output [add d4 to d6]
      `);
      expect(result[0].outcomes[0].value).toBe(3);
      expectRange(result[1], 2, 5);
      expectRange(result[2], 2, 10);
    });

    it('supports number and sequence parameter conversion', () => {
      const result = outputs(`
        function: double A:n if above B:n {
          if A > B { result: A + A }
          result: A
        }
        output [double d6 if above 3]

        function: ROLL:s count fives and above and subtract ones {
          result: (ROLL >= 5) - (ROLL = 1)
        }
        output [3d6 count fives and above and subtract ones]
      `);
      expect(result[0].outcomes.map((outcome) => outcome.value)).toEqual([
        1, 2, 3, 8, 10, 12,
      ]);
      expectRange(result[1], -3, 3);
    });

    it('sums a sequence passed to a die parameter', () => {
      const output = one(`
        function: as die D:d { result: D }
        output [as die {1,2,3}]
      `);
      expect(output.outcomes).toEqual([
        { value: 6, weight: 1n, probability: 1 },
      ]);
    });

    it('keeps function variables local to the invocation', () => {
      const result = outputs(`
        X: 10
        function: change {
          X: 20
          result: X
        }
        output [change]
        output X
      `);
      expect(result[0].outcomes[0].value).toBe(20);
      expect(result[1].outcomes[0].value).toBe(10);
    });

    it('does not allow output or set inside a function', () => {
      expect(() =>
        calculate(`
          function: bad { output 1 }
          output [bad]
        `),
      ).toThrow(/output cannot be used inside a function/);

      expect(() =>
        calculate(`
          function: bad { set "explode depth" to 1 }
          output [bad]
        `),
      ).toThrow(/set cannot be used inside a function/);
    });

    it('returns the empty die when the function depth is exceeded', () => {
      const output = one(`
        function: depth { result: 1 + [depth] }
        set "maximum function depth" to 3
        output [depth]
      `);
      expect(output.outcomes).toEqual([]);
    });
  });

  describe('Function Library', () => {
    it('counts duplicate values multiple times', () => {
      const output = one(
        'output [count {4..6, 6} in d6] named "counting 6s double"',
      );
      expect(prob(output, 0)).toBeCloseTo(3 / 6);
      expect(prob(output, 1)).toBeCloseTo(2 / 6);
      expect(prob(output, 2)).toBeCloseTo(1 / 6);
    });

    it('supports the documented contains examples', () => {
      expect(one('output [{1..6} contains 4]').outcomes[0].value).toBe(1);
      const threeDice = one('output [3d6 contains 6]');
      expectRange(threeDice, 0, 1);
      expect(prob(threeDice, 1)).toBeCloseTo(1 - (5 / 6) ** 3);
      expectRange(one('output [{1..3} contains d6]'), 0, 1);
    });

    it('supports highest and lowest with multiple pools', () => {
      const highest = one('output [highest 3 of 3d6 and 1d8]');
      expectRange(highest, 3, 20);

      const lowest = one('output [lowest 3 of 3d6 and 1d8]');
      expectRange(lowest, 3, 18);

      const small = one('output [highest 1 of d2 and d4]');
      expect(small.outcomes).toEqual(
        one('output [highest of d2 and d4]').outcomes,
      );

      expect(one('output [highest 2 of d2 and d4]').outcomes).toEqual(
        one('output d2 + d4').outcomes,
      );
      expect(one('output [lowest 2 of d2 and d4]').outcomes).toEqual(
        one('output d2 + d4').outcomes,
      );

      expect(one('output [highest 2 of 2d6 and 1d6]').outcomes).toEqual(
        one('output [highest 2 of 3d6]').outcomes,
      );
      expect(one('output [lowest 2 of 2d6 and 1d6]').outcomes).toEqual(
        one('output [lowest 2 of 3d6]').outcomes,
      );
    });

    it('supports the documented middle examples', () => {
      expectRange(one('output [middle 1 of 3d6]'), 1, 6);
      expectRange(one('output [middle 2 of 3d6]'), 2, 12);
      expectRange(one('output [middle 1 of 4d6]'), 1, 6);
      expectRange(one('output [middle 2 of 4d4]'), 2, 8);
      expectRange(one('output [middle 3 of 4d6]'), 3, 18);
    });

    it('supports maximum of the empty die', () => {
      expect(one('output [maximum of d{}]').outcomes[0].value).toBe(0);
    });

    it('uses position order in sort', () => {
      expect(
        one('output 1 @ [sort {1, 2, 4, 6, 5, 3}]').outcomes[0].value,
      ).toBe(6);
      expect(
        one(`
          set "position order" to "lowest first"
          output 1 @ [sort {1, 2, 4, 6, 5, 3}]
        `).outcomes[0].value,
      ).toBe(1);
    });
  });
});
