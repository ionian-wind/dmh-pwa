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

describe('dice probability calculator language features', () => {
  describe('built-in functions', () => {
    it('implements highest, lowest and middle of a pool', () => {
      expect(one('output [highest 1 of 2d6]').outcomes).toEqual(
        one('output 1@2d6').outcomes,
      );
      expect(one('output [lowest 1 of 2d6]').outcomes).toEqual(
        one('output 2@2d6').outcomes,
      );
      expect(one('output [middle 1 of 3d6]').outcomes).toEqual(
        one('output 2@3d6').outcomes,
      );
    });

    it('implements pairwise highest and lowest', () => {
      expect(one('output [highest of 1 and 5]').outcomes[0].value).toBe(5);
      expect(one('output [lowest of 1 and 5]').outcomes[0].value).toBe(1);
    });

    it('implements maximum, minimum and absolute', () => {
      expect(one('output [maximum of 2d6]').outcomes[0].value).toBe(12);
      expect(one('output [minimum of 2d6]').outcomes[0].value).toBe(2);
      expect(one('output [absolute -7]').outcomes[0].value).toBe(7);
    });

    it('implements contains and count', () => {
      expect(one('output [{1,2,3} contains 2]').outcomes[0].value).toBe(1);
      expect(one('output [{1,2,3} contains 5]').outcomes[0].value).toBe(0);
      expect(one('output [count {2,4} in {1,2,3,4}]').outcomes[0].value).toBe(
        2,
      );
    });

    it('implements reverse and sort', () => {
      expect(one('output 1@[reverse {1..4}]').outcomes[0].value).toBe(4);
      const sorted = one('output 1@[sort {1,4,2}]');
      expect(sorted.outcomes[0].value).toBe(4);
    });

    it('implements explode with the configured depth', () => {
      const output = one(`
        set "explode depth" to 1
        output [explode d6]
      `);
      expect(output.outcomes.map((outcome) => outcome.value)).toEqual([
        1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12,
      ]);
      for (const outcome of output.outcomes) {
        expect(outcome.probability).toBeCloseTo(
          outcome.value <= 5 ? 1 / 6 : 1 / 36,
        );
      }
    });

    it('expands a die passed to a number parameter', () => {
      const output = one('output [absolute 1d4 - 6]');
      expect(output.outcomes.map((outcome) => outcome.value)).toEqual([
        2, 3, 4, 5,
      ]);
      for (const outcome of output.outcomes) {
        expect(outcome.probability).toBeCloseTo(0.25);
      }
    });
  });

  describe('user-defined functions', () => {
    it('calls a function with a number parameter', () => {
      expect(
        one(`
          function: double N:n { result: N * 2 }
          output [double 3]
        `).outcomes[0].value,
      ).toBe(6);
    });

    it('expands a die passed to a number parameter', () => {
      const output = one(`
        function: double N:n { result: N * 2 }
        output [double d6]
      `);
      expect(output.outcomes.map((outcome) => outcome.value)).toEqual([
        2, 4, 6, 8, 10, 12,
      ]);
      for (const outcome of output.outcomes) {
        expect(outcome.probability).toBeCloseTo(1 / 6);
      }
    });

    it('expands multiple dice parameters independently', () => {
      const output = one(`
        function: add A:n B:n { result: A + B }
        output [add d4 d6]
      `);
      expect(output.outcomes).toEqual(one('output d4 + d6').outcomes);
    });

    it('passes sequences to sequence parameters', () => {
      const output = one(`
        function: highest of S:s { result: 1@S }
        output [highest of 2d6]
      `);
      expect(output.outcomes).toEqual(one('output 1@2d6').outcomes);
    });

    it('expands a die into weighted sorted sequences for sequence parameters', () => {
      const output = one(`
        function: first S:s { result: 1@S }
        output [first 2d2]
      `);
      expect(output.outcomes).toEqual(one('output 1@2d2').outcomes);
    });

    it('passes dice through die parameters', () => {
      const output = one(`
        function: plus one D:d { result: D + 1 }
        output [plus one d4]
      `);
      expect(output.outcomes.map((outcome) => outcome.value)).toEqual([
        2, 3, 4, 5,
      ]);
    });

    it('supports functions without arguments', () => {
      expect(
        one(`
          function: one { result: 1 }
          output [one]
        `).outcomes[0].value,
      ).toBe(1);
    });

    it('resolves overloads by the actual argument type', () => {
      const output = one(`
        function: pick N:n { result: N }
        function: pick D:d { result: 1@D }
        output [pick 3d6]
      `);
      expect(output.outcomes).toEqual(one('output 1@3d6').outcomes);
    });

    it('supports recursive function calls', () => {
      const output = one(`
        function: countdown N:n {
          if N = 0 { result: 0 }
          result: [countdown N - 1] + 1
        }
        output [countdown 5]
      `);
      expect(output.outcomes[0].value).toBe(5);
    });

    it('supports nested bracketed function calls', () => {
      const output = one(`
        output [count {1,2,3,4} in [lowest 1 of 2d4]]
      `);
      expect(output.outcomes.every((outcome) => outcome.value === 1)).toBe(
        true,
      );
    });

    it('stops executing a function at result', () => {
      const output = one(`
        function: sign N:n {
          if N > 0 { result: 1 }
          if N < 0 { result: -1 }
          result: 0
        }
        output [sign -3]
      `);
      expect(output.outcomes[0].value).toBe(-1);
    });
  });

  describe('control flow', () => {
    it('runs loops in sequence order', () => {
      const result = outputs(`
        loop P over {1..3} {
          output P
        }
      `);
      expect(result.map((output) => output.outcomes[0].value)).toEqual([
        1, 2, 3,
      ]);
    });

    it('keeps loop variables local to the iteration', () => {
      expect(outputs('loop P over {1..2} { output P }')).toHaveLength(2);
    });

    it('executes if / else if / else branches', () => {
      const source = (value: number) => `
        if ${value} = 1 { output 10 }
        else if ${value} = 2 { output 20 }
        else { output 30 }
      `;
      expect(one(source(1)).outcomes[0].value).toBe(10);
      expect(one(source(2)).outcomes[0].value).toBe(20);
      expect(one(source(3)).outcomes[0].value).toBe(30);
    });
  });

  describe('settings and named output', () => {
    it('uses the configured position order', () => {
      const output = one(`
        set "position order" to "lowest first"
        output 1@2d6
      `);
      expect(output.outcomes).toEqual(one('output 2@2d6').outcomes);
    });

    it('uses position order for number digits', () => {
      expect(one('output 1@246').outcomes[0].value).toBe(2);
      expect(
        one(`
          set "position order" to "lowest first"
          output 1@246
        `).outcomes[0].value,
      ).toBe(6);
      expect(
        one(`
          set "position order" to "lowest first"
          output {1,2,3}@246
        `).outcomes[0].value,
      ).toBe(12);
    });

    it('interpolates variables in output names', () => {
      expect(
        one(`
          A: 3
          output 1 named "[A] dice"
        `).name,
      ).toBe('3 dice');
    });

    it('keeps named outputs from functions', () => {
      expect(one('output 1 named "hello"').name).toBe('hello');
    });
  });

  describe('errors', () => {
    it('rejects unknown variables', () => {
      expect(() => calculate('output UNKNOWN')).toThrow(/Undefined variable/);
    });

    it('rejects unknown functions', () => {
      expect(() => calculate('output [does not exist]')).toThrow(
        /Unknown function/,
      );
    });

    it('reports parse errors', () => {
      expect(() => calculate('output 1 +')).toThrow(
        /Unexpected end of input\. Expected/i,
      );
    });
  });
});
