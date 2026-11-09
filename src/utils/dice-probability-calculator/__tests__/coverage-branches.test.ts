import { describe, expect, it } from 'vitest';
import type { Expression, Program } from '../ast';
import {
  explodeDie,
  toDie,
  toNumber,
  toSequence,
  builtins,
  type BuiltinContext,
} from '../builtins';
import { Die, enumerateRolls } from '../die';
import { calculate, Evaluator, Seq } from '../index';
import { DEFAULT_SETTINGS } from '../types';

function one(script: string) {
  const result = calculate(script);
  expect(result.outputs).toHaveLength(1);
  return result.outputs[0];
}

const numberNode = (value: unknown) =>
  ({ kind: 'number', value }) as Expression;

function outputProgram(value: Expression): Program {
  return { statements: [{ kind: 'output', value }] };
}

function evaluate(value: Expression) {
  return new Evaluator().calculate(outputProgram(value));
}

function builtin(name: string, variadic = false) {
  const match = builtins.find(
    (candidate) =>
      candidate.signature[0].kind === 'word' &&
      candidate.signature[0].value === name &&
      Boolean(candidate.variadicTail) === variadic,
  );
  if (!match) throw new Error(`Missing builtin ${name}`);
  return match;
}

const context: BuiltinContext = { settings: { ...DEFAULT_SETTINGS } };

describe('evaluator branch gaps', () => {
  it('assigns through enclosing scopes inside a loop', () => {
    expect(
      one(`
        X: 1
        loop I over {1..2} { X: I }
        output X
      `).outcomes[0].value,
    ).toBe(2);
  });

  it('propagates result statements out of loops', () => {
    expect(
      one(`
        function: firstresult {
          loop I over {1..3} {
            result: I
          }
        }
        output [firstresult]
      `).outcomes[0].value,
    ).toBe(1);
  });

  it('returns an empty die from a function without a result', () => {
    const output = one(`
      function: nothing { X: 1 }
      output [nothing]
    `);
    expect(output.outcomes).toEqual([]);
    expect(output.totalWeight).toBe(0n);
  });

  it('rejects non-integer dice counts and invalid faces', () => {
    expect(() =>
      evaluate({ kind: 'dice', count: numberNode(1.5), faces: numberNode(6) }),
    ).toThrow('The number of dice must be an integer');

    expect(() =>
      evaluate({
        kind: 'dice',
        count: null,
        faces: numberNode('not a die face'),
      }),
    ).toThrow('Invalid die definition');
  });

  it('rejects invalid sequence members, ranges and repetitions', () => {
    expect(() =>
      evaluate({
        kind: 'sequence',
        elements: [{ value: numberNode('nope') }],
      }),
    ).toThrow('A sequence can only contain numbers');

    expect(() =>
      evaluate({
        kind: 'sequence',
        elements: [{ value: numberNode(1), rangeEnd: numberNode(2.5) }],
      }),
    ).toThrow('A sequence range must use integers');

    expect(() =>
      evaluate({
        kind: 'sequence',
        elements: [{ value: numberNode(1.5), rangeEnd: numberNode(3) }],
      }),
    ).toThrow('A sequence range must use integers');

    expect(() =>
      evaluate({
        kind: 'sequence',
        elements: [{ value: numberNode(1), repeat: numberNode(1.5) }],
      }),
    ).toThrow('A sequence repetition count must be a non-negative integer');

    expect(() => calculate('output {1:-1}')).toThrow(
      'A sequence repetition count must be a non-negative integer',
    );
  });

  it('rejects a loop over a non-numeric value', () => {
    expect(() =>
      new Evaluator().calculate({
        statements: [
          {
            kind: 'loop',
            variable: 'I',
            range: numberNode('not a sequence'),
            body: [],
          },
        ],
      }),
    ).toThrow('A loop range must be a sequence of numbers');
  });

  it('converts sequences and rejects strings for typed parameters', () => {
    expect(one('output [absolute {1,2,3}]').outcomes[0].value).toBe(6);
    expect(one('output [maximum of 5]').outcomes[0].value).toBe(5);

    const call = (items: any[]): Expression => ({ kind: 'call', items });
    const word = (value: string) => ({ kind: 'word', value });
    const argument = (value: Expression) => ({ kind: 'expression', value });

    expect(() =>
      evaluate(call([word('absolute'), argument(numberNode('x'))])),
    ).toThrow('Parameter "NUMBER" expects a number');

    expect(() =>
      evaluate(call([word('reverse'), argument(numberNode('x'))])),
    ).toThrow('Parameter "SEQUENCE" expects a sequence');
  });

  it('rejects a die as a boolean condition and handles string values', () => {
    expect(() => calculate('if 1d6 { output 1 }')).toThrow(
      'A die cannot be used as a boolean condition',
    );

    expect(one('output 1 named "[UNSET]"').name).toBe('');

    const stringProgram: Program = {
      statements: [
        { kind: 'assignment', name: 'TEXT', value: numberNode('hello') },
        { kind: 'output', value: numberNode(1), name: '[TEXT]' },
      ],
    };
    expect(new Evaluator().calculate(stringProgram).outputs[0].name).toBe(
      'hello',
    );

    expect(() => evaluate(numberNode('not outputtable'))).toThrow(
      'A string cannot be output',
    );
  });

  it('handles unary operators applied to dice and strings', () => {
    expect(one('output !(1d6)').outcomes[0].value).toBe(0);
    expect(one('output +(1d6)').outcomes).toHaveLength(6);
    expect(one('output -(1d6)').outcomes[0].value).toBe(-6);

    expect(() =>
      evaluate({
        kind: 'unary',
        operator: '#',
        operand: numberNode('not a number'),
      }),
    ).toThrow('The # operator requires a number, sequence or die');
  });

  it('treats non-integer digit positions as zero', () => {
    const result = evaluate({
      kind: 'binary',
      operator: '@',
      left: numberNode(1.5),
      right: numberNode(246),
    });
    expect(result.outputs[0].outcomes[0].value).toBe(0);
  });

  it('finalizes zero-weight outcomes without dividing by zero', () => {
    const result = evaluate(numberNode(new Die(new Map([[5, 0n]]))));
    expect(result.outputs[0].totalWeight).toBe(0n);
    expect(result.outputs[0].outcomes).toEqual([
      { value: 5, weight: 0n, probability: 0 },
    ]);
  });

  it('formats sequences and dice in named outputs', () => {
    expect(
      one(`
        X: {1,2}
        output 1 named "[X]"
      `).name,
    ).toBe('{1, 2}');

    expect(
      one(`
        X: 1d6
        output 1 named "[X]"
      `).name,
    ).toBe('{1, 2, 3, 4, 5, 6}');
  });

  it('covers numeric powers, division by zero and die exponents', () => {
    expect(one('output 2 ^ 3').outcomes[0].value).toBe(8);
    expect(() => calculate('output 1 / d{0,1}')).toThrow('Division by zero');
    expect(() => calculate('output 2 ^ d{-1,1}')).toThrow(
      'Exponent must be a non-negative integer',
    );

    const fractional = new Die(new Map([[1.5, 1n]]));
    expect(() =>
      evaluate({
        kind: 'binary',
        operator: '^',
        left: numberNode(2),
        right: numberNode(fractional),
      }),
    ).toThrow('Exponent must be a non-negative integer');

    expect(one('output 2 ^ d{1,2}').outcomes.map((o) => o.value)).toEqual([
      2, 4,
    ]);
    expect(one('output 1d2 ^ 1d2').outcomes.map((o) => o.value)).toEqual([
      1, 2, 4,
    ]);
  });

  it('covers every logical operator path with and without dice', () => {
    expect(one('output d{0,1} & 1').outcomes.map((o) => o.value)).toEqual([
      0, 1,
    ]);
    expect(one('output 0 & 1d6').outcomes.map((o) => o.value)).toEqual([0]);
    expect(one('output 1 & d{0,1}').outcomes.map((o) => o.value)).toEqual([
      0, 1,
    ]);
    expect(one('output 1d6 | 0').outcomes.map((o) => o.value)).toEqual([1]);
    expect(one('output 0 | d{0,1}').outcomes.map((o) => o.value)).toEqual([
      0, 1,
    ]);
  });

  it('covers comparison operators that are not exercised elsewhere', () => {
    expect(one('output 1 <= 2').outcomes[0].value).toBe(1);
    expect(one('output 1 != 1').outcomes[0].value).toBe(0);

    expect(one('output 1 < {1,2}').outcomes[0].value).toBe(1);
    expect(one('output 1 > {1,2}').outcomes[0].value).toBe(0);
    expect(one('output 1 <= {1,2}').outcomes[0].value).toBe(2);
    expect(one('output 1 >= {1,2}').outcomes[0].value).toBe(1);
  });

  it('scores other parameter types and names expression calls', () => {
    expect(() => calculate('output [does 1]')).toThrow(
      'Unknown function [does <expression>]',
    );
  });

  it('handles variadic signatures with malformed tails', () => {
    expect(() => calculate('output [highest 1 of d2 and]')).toThrow(
      'Unknown function',
    );
    expect(() => calculate('output [highest 1 of d2 then d4]')).toThrow(
      'Unknown function',
    );
    expect(() => calculate('output [highest 1 of d2 and foo]')).toThrow(
      'Unknown function',
    );
  });
});

describe('builtin helper branches', () => {
  it('converts and rejects helper values', () => {
    expect(toNumber(new Seq([1, 2, 3]))).toBe(6);
    expect(() => toNumber(Die.constant(1))).toThrow('Expected a number');

    expect(toSequence(4).toArray()).toEqual([4]);
    expect(() => toSequence(Die.constant(1))).toThrow('Expected a sequence');

    expect(toDie(5).maxFace).toBe(5);
    expect(toDie(new Seq([1, 2, 3])).maxFace).toBe(6);
    expect(() => toDie('nope' as never)).toThrow('Expected a die');
  });

  it('explodes empty dice and tolerates a negative depth', () => {
    expect(explodeDie(Die.empty(), 1).isEmpty).toBe(true);
    const die = Die.uniform(2);
    expect(explodeDie(die, -1)).toBe(die);
  });

  it('selects from mixed pools including unpooled dice', () => {
    expect(
      one('output [highest 1 of d2 + 1 and d4 + 1]').outcomes.length,
    ).toBeGreaterThan(0);

    const die = Die.constant(1);
    const emptyPool = new Die(new Map(die.weights), { count: 0, die });
    const highest = builtin('highest', true);
    expect(
      (highest.fn([1, die, Die.constant(2)], context) as Die).maxFace,
    ).toBe(2);
    expect(
      (highest.fn([1, emptyPool, emptyPool], context) as Die).maxFace,
    ).toBe(1);
  });

  it('rejects mixed pools that exceed the combination limit', () => {
    expect(() => calculate('output [highest 1 of d2000 and d2000]')).toThrow(
      'Too many mixed-pool rolls',
    );
  });

  it('returns the pool when middle count equals its size', () => {
    expect(one('output [middle 3 of 3d6]').outcomes).toEqual(
      one('output 3d6').outcomes,
    );
  });
});

describe('Die helper branches', () => {
  it('ignores zero weight entries and handles zero logical operands', () => {
    const zero = new Die(new Map([[0, 0n]]));
    expect(zero.map((value) => value).isEmpty).toBe(true);

    expect(Die.constant(0).logicalOr(0).maxFace).toBe(0);
    expect(Die.constant(0).logicalOr(Die.constant(0)).maxFace).toBe(0);
    expect(Die.constant(0).logicalNot().maxFace).toBe(1);
  });

  it('returns an empty die from an empty pool', () => {
    const die = Die.constant(1);
    const emptyPool = new Die(new Map(die.weights), { count: 0, die });
    expect(emptyPool.select([1], 'highest first').isEmpty).toBe(true);
  });

  it('guards against too many enumerated rolls', () => {
    expect(() => enumerateRolls(Die.uniform(10), 16, 'highest first')).toThrow(
      'Too many possible rolls',
    );
  }, 30000);
});
