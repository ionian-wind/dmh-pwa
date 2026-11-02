import type { ParamType, SignaturePart } from './ast';
import { Die } from './die';
import { Seq } from './seq';
import type { Settings, Value } from './types';

export interface BuiltinContext {
  settings: Settings;
}

export interface Builtin {
  signature: SignaturePart[];
  fn: (args: Value[], context: BuiltinContext) => Value;
}

export function toNumber(value: Value): number {
  if (typeof value === 'number') return value;
  if (value instanceof Seq) return value.sum();
  throw new Error('Expected a number');
}

export function toSequence(value: Value): Seq {
  if (value instanceof Seq) return value;
  if (typeof value === 'number') return new Seq([value]);
  throw new Error('Expected a sequence');
}

export function toDie(value: Value): Die {
  if (value instanceof Die) return value;
  if (typeof value === 'number') return Die.constant(value);
  if (value instanceof Seq) return Die.fromFaces(value.elements);
  throw new Error('Expected a die');
}

function word(value: string): SignaturePart {
  return { kind: 'word', value };
}

function param(name: string, type: ParamType): SignaturePart {
  return { kind: 'param', name, type };
}

function positions(from: number, to: number): number[] {
  const result: number[] = [];
  for (let i = from; i <= to; i++) result.push(i);
  return result;
}

export function explodeDie(die: Die, depth: number): Die {
  if (depth < 0 || die.isEmpty) return die;

  const max = die.maxFace;
  const maxWeight = die.weights.get(max) ?? 0n;
  const nonMax = [...die.weights.entries()].filter(([face]) => face !== max);
  const totalWeight = die.totalWeight;
  const weights = new Map<number, bigint>();

  const add = (value: number, weight: bigint) => {
    if (weight === 0n) return;
    weights.set(value, (weights.get(value) ?? 0n) + weight);
  };

  const totalToRemaining = (remaining: number): bigint => {
    let result = 1n;
    for (let i = 0; i < remaining; i++) result *= totalWeight;
    return result;
  };

  const visit = (prefix: number, weight: bigint, remaining: number) => {
    // Stopping on a non-maximum face leaves the remaining rolls unobserved.
    // Multiply by the size of that unobserved sample space so every outcome
    // shares one common denominator.
    const unobserved = totalToRemaining(remaining);
    for (const [face, faceWeight] of nonMax) {
      add(prefix + face, weight * faceWeight * unobserved);
    }
    if (remaining > 0) {
      visit(prefix + max, weight * maxWeight, remaining - 1);
    } else {
      add(prefix + max, weight * maxWeight);
    }
  };

  visit(0, 1n, depth);
  return new Die(weights);
}

export const builtins: Builtin[] = [
  {
    signature: [word('absolute'), param('NUMBER', 'n')],
    fn: ([number]) => Math.abs(toNumber(number)),
  },
  {
    signature: [param('SEQUENCE', 's'), word('contains'), param('NUMBER', 'n')],
    fn: ([sequence, number]) =>
      toSequence(sequence).contains(toNumber(number)) ? 1 : 0,
  },
  {
    signature: [
      word('count'),
      param('VALUES', 's'),
      word('in'),
      param('SEQUENCE', 's'),
    ],
    fn: ([values, sequence]) =>
      toSequence(sequence).count(toSequence(values).elements),
  },
  {
    signature: [word('explode'), param('DIE', 'd')],
    fn: ([die], context) =>
      explodeDie(toDie(die), context.settings.explodeDepth),
  },
  {
    signature: [
      word('highest'),
      param('NUMBER', 'n'),
      word('of'),
      param('DICE', 'd'),
    ],
    fn: ([number, dice], context) => {
      const count = toNumber(number);
      return toDie(dice).select(
        positions(1, count),
        context.settings.positionOrder,
      );
    },
  },
  {
    signature: [
      word('lowest'),
      param('NUMBER', 'n'),
      word('of'),
      param('DICE', 'd'),
    ],
    fn: ([number, dice], context) => {
      const count = toNumber(number);
      const pool = toDie(dice);
      return pool.select(
        positions(pool.collectionSize - count + 1, pool.collectionSize),
        context.settings.positionOrder,
      );
    },
  },
  {
    signature: [
      word('middle'),
      param('NUMBER', 'n'),
      word('of'),
      param('DICE', 'd'),
    ],
    fn: ([number, dice], context) => {
      const count = toNumber(number);
      const pool = toDie(dice);
      const size = pool.collectionSize;
      if (count === size) return pool;
      if (count === 1) {
        return pool.select(
          [1 + Math.floor((size - 1) / 2)],
          context.settings.positionOrder,
        );
      }
      const from = 1 + Math.floor((size - count) / 2);
      return pool.select(
        positions(from, from + count - 1),
        context.settings.positionOrder,
      );
    },
  },
  {
    signature: [
      word('highest'),
      word('of'),
      param('A', 'n'),
      word('and'),
      param('B', 'n'),
    ],
    fn: ([a, b]) => Math.max(toNumber(a), toNumber(b)),
  },
  {
    signature: [
      word('lowest'),
      word('of'),
      param('A', 'n'),
      word('and'),
      param('B', 'n'),
    ],
    fn: ([a, b]) => Math.min(toNumber(a), toNumber(b)),
  },
  {
    signature: [word('maximum'), word('of'), param('DIE', 'd')],
    fn: ([die]) => toDie(die).maxFace,
  },
  {
    signature: [word('minimum'), word('of'), param('DIE', 'd')],
    fn: ([die]) => toDie(die).minFace,
  },
  {
    signature: [word('reverse'), param('SEQUENCE', 's')],
    fn: ([sequence]) => toSequence(sequence).reverse(),
  },
  {
    signature: [word('sort'), param('SEQUENCE', 's')],
    fn: ([sequence], context) =>
      toSequence(sequence).sort(context.settings.positionOrder),
  },
];
