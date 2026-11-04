import { describe, expect, it } from 'vitest';
import { calculate, type OutputResult } from '../index';

function one(script: string): OutputResult {
  const result = calculate(script);
  expect(result.outputs).toHaveLength(1);
  return result.outputs[0];
}

function prob(output: OutputResult, value: number): number {
  return (
    output.outcomes.find((outcome) => outcome.value === value)?.probability ?? 0
  );
}

function expectDistribution(
  output: OutputResult,
  expected: Record<number, number>,
) {
  expect(output.outcomes).toHaveLength(Object.keys(expected).length);
  for (const [value, probability] of Object.entries(expected)) {
    expect(prob(output, Number(value))).toBeCloseTo(probability, 10);
  }
  const total = output.outcomes.reduce(
    (sum, outcome) => sum + outcome.probability,
    0,
  );
  expect(total).toBeCloseTo(1, 10);
}

describe('dice probability calculator evaluator', () => {
  it('outputs a single d6', () => {
    const output = one('output 1d6');
    expectDistribution(output, {
      1: 1 / 6,
      2: 1 / 6,
      3: 1 / 6,
      4: 1 / 6,
      5: 1 / 6,
      6: 1 / 6,
    });
    expect(output.mean).toBeCloseTo(3.5);
  });

  it('sums independent dice', () => {
    const output = one('output 2d6');
    expectDistribution(output, {
      2: 1 / 36,
      3: 2 / 36,
      4: 3 / 36,
      5: 4 / 36,
      6: 5 / 36,
      7: 6 / 36,
      8: 5 / 36,
      9: 4 / 36,
      10: 3 / 36,
      11: 2 / 36,
      12: 1 / 36,
    });
    expect(output.mean).toBeCloseTo(7);
    expect(output.stddev).toBeCloseTo(Math.sqrt(35 / 6));
  });

  it('treats 1d6 + 1d6 like 2d6', () => {
    const summed = one('output 2d6');
    const added = one('output 1d6 + 1d6');
    expect(added.outcomes).toEqual(summed.outcomes);
  });

  it('supports arithmetic shifts, multiplication, division and powers', () => {
    expectDistribution(one('output 1d4 + 10'), {
      11: 0.25,
      12: 0.25,
      13: 0.25,
      14: 0.25,
    });
    expectDistribution(one('output 1d4 - 1'), {
      0: 0.25,
      1: 0.25,
      2: 0.25,
      3: 0.25,
    });
    expectDistribution(one('output 1d4 * 2'), {
      2: 0.25,
      4: 0.25,
      6: 0.25,
      8: 0.25,
    });
    expectDistribution(one('output 1d4 / 2'), {
      0: 0.25,
      1: 0.5,
      2: 0.25,
    });
    expectDistribution(one('output 1d4 ^ 2'), {
      1: 0.25,
      4: 0.25,
      9: 0.25,
      16: 0.25,
    });
  });

  it('converts comparisons to boolean dice', () => {
    const output = one('output 1d6 >= 5');
    expect(prob(output, 1)).toBeCloseTo(2 / 6);
    expect(prob(output, 0)).toBeCloseTo(4 / 6);
  });

  it('convolves dice vs dice comparisons', () => {
    const equal = one('output 1d2 = 1d2');
    expect(prob(equal, 1)).toBeCloseTo(2 / 4);
    expect(prob(equal, 0)).toBeCloseTo(2 / 4);

    const greater = one('output 1d2 > 1d2');
    expect(prob(greater, 1)).toBeCloseTo(1 / 4);
    expect(prob(greater, 0)).toBeCloseTo(3 / 4);
  });

  it('handles negative dice counts', () => {
    expectDistribution(one('output -1d6'), {
      [-6]: 1 / 6,
      [-5]: 1 / 6,
      [-4]: 1 / 6,
      [-3]: 1 / 6,
      [-2]: 1 / 6,
      [-1]: 1 / 6,
    });
    expect(one('output d-1').outcomes).toEqual([
      { value: -1, weight: 1n, probability: 1 },
    ]);
  });

  it('treats a single die as a one-element collection for @', () => {
    expect(one('output 1@d6').outcomes).toEqual(one('output d6').outcomes);
    expect(one('output 2@d6').outcomes[0].value).toBe(0);
  });

  it('selects order statistics from a dice pool', () => {
    expectDistribution(one('output 1@2d6'), {
      1: 1 / 36,
      2: 3 / 36,
      3: 5 / 36,
      4: 7 / 36,
      5: 9 / 36,
      6: 11 / 36,
    });
    expectDistribution(one('output 2@2d6'), {
      1: 11 / 36,
      2: 9 / 36,
      3: 7 / 36,
      4: 5 / 36,
      5: 3 / 36,
      6: 1 / 36,
    });
  });

  it('sums selected positions', () => {
    const selected = one('output {1,2}@2d6');
    const summed = one('output 2d6');
    expect(selected.outcomes).toEqual(summed.outcomes);
  });

  it('supports sequences, ranges, repetitions and nesting', () => {
    expectDistribution(one('output {1,2,3}'), {
      1: 1 / 3,
      2: 1 / 3,
      3: 1 / 3,
    });
    expectDistribution(one('output {1..3}'), {
      1: 1 / 3,
      2: 1 / 3,
      3: 1 / 3,
    });
    expectDistribution(one('output {1:3, 2}'), {
      1: 3 / 4,
      2: 1 / 4,
    });
    expectDistribution(one('output {{1,2}:2, 3}'), {
      1: 2 / 5,
      2: 2 / 5,
      3: 1 / 5,
    });
    expectDistribution(one('output {d4}'), {
      1: 0.25,
      2: 0.25,
      3: 0.25,
      4: 0.25,
    });
  });

  it('implements sequence introspection', () => {
    expect(one('output #(2d6)').outcomes).toEqual([
      { value: 2, weight: 1n, probability: 1 },
    ]);
    expect(one('output #(d6)').outcomes[0].value).toBe(1);
    expect(one('output #1234').outcomes[0].value).toBe(4);
    expect(one('output #3d6').outcomes[0].value).toBe(1);
    expect(one('output 1@246').outcomes[0].value).toBe(2);
    expect(one('output 2@246').outcomes[0].value).toBe(4);
  });

  it('compares sequences according to AnyDice rules', () => {
    expect(one('output {1,2,3} >= 2').outcomes[0].value).toBe(2);
    expect(one('output {1,2,3} = 2').outcomes[0].value).toBe(1);
    expect(one('output {9,1} > {9,0}').outcomes[0].value).toBe(1);
    expect(one('output {1,2} != {1,2}').outcomes[0].value).toBe(0);
  });

  it('uses integer division truncated toward zero', () => {
    expect(one('output -5 / 2').outcomes[0].value).toBe(-2);
  });

  it('supports d%, custom dice and arbitrary dice', () => {
    expect(one('output d%').outcomes).toHaveLength(100);
    expectDistribution(one('output d{1,2,2,3}'), {
      1: 0.25,
      2: 0.5,
      3: 0.25,
    });
    expectDistribution(one('output 2d(1d4)'), {
      2: 1 / 16,
      3: 2 / 16,
      4: 3 / 16,
      5: 4 / 16,
      6: 3 / 16,
      7: 2 / 16,
      8: 1 / 16,
    });
  });
});

describe('dice probability calculator edge coverage', () => {
  it('throws on invalid arithmetic', () => {
    expect(() => calculate('output 1 / 0')).toThrow('Division by zero');
    expect(() => calculate('output 2 ^ -1')).toThrow(
      'Exponent must be a non-negative integer',
    );
  });

  it('handles zero and negative die faces', () => {
    expect(one('output d0').outcomes.map((outcome) => outcome.value)).toEqual([
      0,
    ]);
    expect(one('output d-1').outcomes.map((outcome) => outcome.value)).toEqual([
      -1,
    ]);
  });

  it('handles sequence operators', () => {
    expect(one('output # {1,2,3}').outcomes[0].value).toBe(3);
    expect(one('output {1,2} = {1,2}').outcomes[0].value).toBe(1);
    expect(one('output {1,2} < 2').outcomes[0].value).toBe(1);
    expect(one('output ! 1d6').outcomes).toHaveLength(1);
    expect(one('output # 1d6').outcomes[0].value).toBe(1);
    expect(one('output - 1d6').outcomes[0].value).toBe(-6);
    expect(() => calculate('output 1d6 @ 1')).toThrow(
      'A die cannot be used as a position selector',
    );
  });
});

describe('dice probability calculator sequences and settings', () => {
  it.each([
    'output {1..3}',
    'output {3..1}',
    'output {1..2, 4..5}',
    'output {} @ 1',
    'output 1d6 + {}',
    'output {} = {}',
    'output {} < {}',
    'output [highest 0 of 2d6]',
    'output [highest 3 of 2d6]',
    'output [count 6 in 0d6]',
    'output [maximum of {}]',
  ])('supports %s', (script) => {
    expect(calculate(script).outputs.length).toBeGreaterThan(0);
  });

  it('rejects invalid settings and position selectors', () => {
    expect(() => calculate('set "explode depth" to 0\noutput 1')).toThrow(
      'explode depth',
    );
    expect(() =>
      calculate('set "maximum function depth" to 0\noutput 1'),
    ).toThrow('maximum function depth');
    expect(() => calculate('set "unknown" to 1\noutput 1')).toThrow(
      'Unknown setting',
    );
    expect(() => calculate('output 1d6 @ 0')).toThrow(
      'A die cannot be used as a position selector',
    );
  });
});

describe('dice probability calculator builtins', () => {
  it.each([
    'output [highest 1 of 2d6]',
    'output [lowest 1 of 2d6]',
    'output [count 6 in 3d6]',
    'output [maximum of 2d6]',
    'output [minimum of 2d6]',
    'output {}',
    'output {1,2,3} @ 3',
    'output 1 @ 1d6',
    'output {1,2} @ {1,2}',
    'output 1 < 2 & 3 > 2',
  ])('supports %s', (script) => {
    expect(calculate(script).outputs.length).toBeGreaterThan(0);
  });

  it('rejects invalid settings', () => {
    expect(() =>
      calculate('set "position order" to "sideways"\noutput 1d6'),
    ).toThrow('The "position order" setting must be');
  });
});

describe('dice probability calculator branch coverage', () => {
  it.each([
    'output d%',
    'output d{1,2,3}',
    'output d(1d3)',
    'output 2d{1,2}',
    'loop I over {1,2} { output I }',
    'loop I over 1d3 { output I }',
    'loop I over 2 { output I }',
    'set "position order" to "lowest first"\noutput 1d6',
    'set "explode depth" to 2\noutput 1d6',
    'set "maximum function depth" to 2\noutput 1d6',
    'output 1 = 1',
    'output 1 != 2',
    'output 1d6 = 1d6',
    'output {1,2} = 1',
    'output 1 = {1,2}',
    'output {1,2} > {1,2}',
    'output !0',
    'output !{1,2}',
    'output # 5',
    'output +5',
    'output 1d6 + 1d6',
    'output 1d6 - 1d6',
    'output 1d6 * 1d6',
    'output 1d6 / 1d6',
    'output 1d6 ^ 2',
    'output 2 ^ 1d6',
    'output 1 + 1d6',
    'output 1 - 1d6',
    'output 1 * 1d6',
    'output 1 / 1d6',
    'output 1d6 = 3',
    'output 3 = 1d6',
    'output 1d6 < 3',
    'output 3 < 1d6',
    'output 1d6 & 1',
    'output 1 & 1d6',
    'output 1 @ 1',
    'output {1,2,3} @ 2',
  ])('evaluates %s', (script) => {
    expect(calculate(script).outputs.length).toBeGreaterThan(0);
  });
});

describe('dice probability calculator operator coverage', () => {
  it('evaluates die comparisons, logical operators and powers', () => {
    expect(one('output 1d6 = 3').outcomes[0].value).toBeTypeOf('number');
    expect(one('output 3 = 1d6').outcomes[0].value).toBeTypeOf('number');
    expect(one('output 1d6 & 1d6').outcomes[0].value).toBeTypeOf('number');
    expect(one('output 1d6 & 0').outcomes[0].value).toBeTypeOf('number');
    expect(one('output 1d6 ^ 2').outcomes[0].value).toBeTypeOf('number');
    expect(one('output 2 / 1d6').outcomes[0].value).toBeTypeOf('number');
  });
});
