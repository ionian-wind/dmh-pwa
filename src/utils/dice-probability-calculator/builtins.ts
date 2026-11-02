import type { ParamType, SignaturePart } from './ast';
import { Die } from './die';
import { Seq } from './seq';
import type { Settings, Value } from './types';

export interface BuiltinContext {
  settings: Settings;
}

export interface Builtin {
  signature: SignaturePart[];
  /** Additional repeated `and <pool>` arguments, for the multi-pool variants. */
  variadicTail?: SignaturePart[];
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
  // Official AnyDice documentation: when a die parameter receives a
  // sequence, the sequence is summed and treated as a constant die.
  if (value instanceof Seq) return Die.constant(value.sum());
  if (typeof value === 'number') return Die.constant(value);
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

const MAX_MULTI_POOL_COMBINATIONS = 2_000_000;

/**
 * Sum the highest or lowest `count` values from one or more dice pools.
 *
 * A single homogeneous pool uses the exact order-statistic path. Mixed pools
 * such as `3d6 and 1d8` are enumerated because their dice have different
 * distributions.
 */
function selectFromPools(
  pools: Die[],
  count: number,
  mode: 'highest' | 'lowest',
): Die {
  if (count <= 0 || pools.length === 0) return Die.constant(0);

  if (pools.length === 1 && pools[0].pool) {
    return pools[0].select(
      positions(1, count),
      mode === 'highest' ? 'highest first' : 'lowest first',
    );
  }

  const dice: Die[] = [];
  for (const pool of pools) {
    if (pool.pool && pool.pool.count > 0) {
      for (let i = 0; i < pool.pool.count; i++) dice.push(pool.pool.die);
    } else {
      dice.push(pool);
    }
  }

  if (dice.length === 0) return Die.constant(0);

  if (count >= dice.length) {
    let sum = Die.constant(0);
    for (const die of dice) sum = sum.add(die);
    return sum;
  }

  const choices = dice.map((die) => die.outcomes());
  let combinations = 1;
  for (const faces of choices) combinations *= faces.length;
  if (combinations > MAX_MULTI_POOL_COMBINATIONS) {
    throw new Error(
      `Too many mixed-pool rolls (${combinations} combinations); ` +
        'reduce the pool size',
    );
  }

  const weights = new Map<number, bigint>();
  const current = new Array<number>(dice.length).fill(0);

  const add = (value: number, weight: bigint) => {
    weights.set(value, (weights.get(value) ?? 0n) + weight);
  };

  const sortDirection =
    mode === 'highest'
      ? (a: number, b: number) => b - a
      : (a: number, b: number) => a - b;

  const visit = (index: number, weight: bigint) => {
    if (index === dice.length) {
      const sorted = [...current].sort(sortDirection);
      let total = 0;
      for (let i = 0; i < count; i++) total += sorted[i] ?? 0;
      add(total, weight);
      return;
    }
    for (const outcome of choices[index]) {
      current[index] = outcome.value;
      visit(index + 1, weight * outcome.weight);
    }
  };

  visit(0, 1n);
  return new Die(weights);
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
    variadicTail: [word('and'), param('DICE', 'd')],
    fn: ([number, ...dice], context) => {
      const count = toNumber(number);
      return selectFromPools(dice.map(toDie), count, 'highest');
    },
  },
  {
    signature: [
      word('lowest'),
      param('NUMBER', 'n'),
      word('of'),
      param('DICE', 'd'),
    ],
    variadicTail: [word('and'), param('DICE', 'd')],
    fn: ([number, ...dice], context) => {
      const count = toNumber(number);
      return selectFromPools(dice.map(toDie), count, 'lowest');
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
