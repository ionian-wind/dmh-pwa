import { Seq } from './seq';
import type { PositionOrder } from './types';

export interface DiePool {
  /** Number of independent dice in the collection. */
  count: number;
  /** Distribution of one die in the collection. */
  die: Die;
}

export interface RollSequence {
  values: number[];
  weight: bigint;
}

/** Safety limit for exhaustive sorted-roll enumeration. */
const MAX_ROLL_COMBINATIONS = 2_000_000;

const factorialCache: bigint[] = [1n];

function factorial(n: number): bigint {
  for (let i = factorialCache.length; i <= n; i++) {
    factorialCache[i] = factorialCache[i - 1] * BigInt(i);
  }
  return factorialCache[n];
}

function multinomial(values: readonly number[]): bigint {
  const counts = new Map<number, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  let denominator = 1n;
  for (const count of counts.values()) {
    denominator *= factorial(count);
  }
  return factorial(values.length) / denominator;
}

function addWeight(target: Map<number, bigint>, value: number, weight: bigint) {
  if (weight === 0n) return;
  target.set(value, (target.get(value) ?? 0n) + weight);
}

/**
 * A discrete probability distribution over integer outcomes.
 *
 * Weights are integers so operations such as convolution remain exact. A die
 * may also remember that it came from rolling a homogeneous pool (`NdX`). That
 * metadata is required for positional access such as `1@3d6`.
 */
export class Die {
  readonly weights: ReadonlyMap<number, bigint>;
  readonly pool?: DiePool;

  constructor(weights: Map<number, bigint>, pool?: DiePool) {
    this.weights = new Map(weights);
    this.pool = pool;
  }

  static constant(value: number): Die {
    return new Die(new Map([[value, 1n]]));
  }

  static empty(): Die {
    return new Die(new Map());
  }

  static uniform(sides: number): Die {
    if (!Number.isInteger(sides) || sides < 1) {
      throw new Error(
        `A die must have a positive number of sides, got ${sides}`,
      );
    }
    const weights = new Map<number, bigint>();
    for (let value = 1; value <= sides; value++) {
      weights.set(value, 1n);
    }
    return new Die(weights);
  }

  /** Convert a sequence to a die. Repeated values increase their weight. */
  static fromFaces(values: Iterable<number>): Die {
    const weights = new Map<number, bigint>();
    for (const value of values) {
      addWeight(weights, value, 1n);
    }
    return new Die(weights);
  }

  get totalWeight(): bigint {
    let total = 0n;
    for (const weight of this.weights.values()) total += weight;
    return total;
  }

  get isEmpty(): boolean {
    return this.weights.size === 0;
  }

  get minFace(): number {
    let min = Infinity;
    for (const value of this.weights.keys()) min = Math.min(min, value);
    return min === Infinity ? 0 : min;
  }

  get maxFace(): number {
    let max = -Infinity;
    for (const value of this.weights.keys()) max = Math.max(max, value);
    return max === -Infinity ? 0 : max;
  }

  /** Number of dice in the original collection, or 1 for a single die. */
  get collectionSize(): number {
    return this.pool?.count ?? 1;
  }

  outcomes(): Array<{ value: number; weight: bigint }> {
    return [...this.weights.entries()]
      .sort(([a], [b]) => a - b)
      .map(([value, weight]) => ({ value, weight }));
  }

  map(fn: (value: number) => number): Die {
    const weights = new Map<number, bigint>();
    for (const [value, weight] of this.weights) {
      addWeight(weights, fn(value), weight);
    }
    return new Die(weights);
  }

  combine(other: Die | number, fn: (a: number, b: number) => number): Die {
    const weights = new Map<number, bigint>();
    if (typeof other === 'number') {
      for (const [value, weight] of this.weights) {
        addWeight(weights, fn(value, other), weight);
      }
      return new Die(weights);
    }
    for (const [a, wa] of this.weights) {
      for (const [b, wb] of other.weights) {
        addWeight(weights, fn(a, b), wa * wb);
      }
    }
    return new Die(weights);
  }

  add(other: Die | number): Die {
    return this.combine(other, (a, b) => a + b);
  }

  sub(other: Die | number): Die {
    return this.combine(other, (a, b) => a - b);
  }

  mul(other: Die | number): Die {
    return this.combine(other, (a, b) => a * b);
  }

  div(other: Die | number): Die {
    return this.combine(other, (a, b) => {
      if (b === 0) throw new Error('Division by zero');
      return Math.trunc(a / b);
    });
  }

  pow(other: Die | number): Die {
    return this.combine(other, (a, b) => {
      if (!Number.isInteger(b) || b < 0) {
        throw new Error('Exponent must be a non-negative integer');
      }
      return Math.trunc(a ** b);
    });
  }

  compare(other: Die | number, op: '=' | '!=' | '<' | '>' | '<=' | '>='): Die {
    return this.combine(other, (a, b) => {
      switch (op) {
        case '=':
          return a === b ? 1 : 0;
        case '!=':
          return a !== b ? 1 : 0;
        case '<':
          return a < b ? 1 : 0;
        case '>':
          return a > b ? 1 : 0;
        case '<=':
          return a <= b ? 1 : 0;
        case '>=':
          return a >= b ? 1 : 0;
      }
    });
  }

  logicalAnd(other: Die | number): Die {
    return this.combine(other, (a, b) => (a !== 0 && b !== 0 ? 1 : 0));
  }

  logicalOr(other: Die | number): Die {
    return this.combine(other, (a, b) => (a !== 0 || b !== 0 ? 1 : 0));
  }

  logicalNot(): Die {
    return this.map((value) => (value === 0 ? 1 : 0));
  }

  /**
   * Select positions from the original dice collection.
   *
   * `1@2d6` therefore evaluates the first order statistic of two d6, not a
   * position on the summed `2d6` distribution.
   */
  select(indices: readonly number[], order: PositionOrder): Die {
    for (const index of indices) {
      if (!Number.isInteger(index)) {
        throw new Error('A position selector must be an integer');
      }
    }

    const pool = this.pool ?? { count: 1, die: this };
    if (pool.count <= 0) return Die.empty();

    if (indices.length === 1) {
      return selectSingleOrderStatistic(
        pool.die,
        pool.count,
        indices[0],
        order,
      );
    }

    const weights = new Map<number, bigint>();
    for (const roll of enumerateRolls(pool.die, pool.count, order)) {
      let value = 0;
      for (const index of indices) {
        value += roll.values[index - 1] ?? 0;
      }
      addWeight(weights, value, roll.weight);
    }
    return new Die(weights);
  }

  /** Roll this die `count` times and return the summed distribution. */
  roll(count: number, order: PositionOrder): Die {
    if (!Number.isInteger(count) || count < 0) {
      throw new Error(
        `A die count must be a non-negative integer, got ${count}`,
      );
    }
    if (count === 0) return new Die(new Map([[0, 1n]]));

    let result = Die.constant(0);
    let factor: Die = this;
    let exponent = count;
    // Exponentiation by squaring keeps large pools reasonably fast.
    while (exponent > 0) {
      if (exponent & 1) result = result.add(factor);
      exponent >>= 1;
      if (exponent > 0) factor = factor.add(factor);
    }
    return new Die(new Map(result.weights), { count, die: this });
  }

  stats(): { mean: number; stddev: number } {
    const total = this.totalWeight;
    if (total === 0n) return { mean: 0, stddev: 0 };
    let sum = 0;
    let sumSquares = 0;
    for (const [value, weight] of this.weights) {
      const numericWeight = Number(weight);
      sum += value * numericWeight;
      sumSquares += value * value * numericWeight;
    }
    const mean = sum / Number(total);
    const variance = sumSquares / Number(total) - mean * mean;
    return { mean, stddev: Math.sqrt(Math.max(0, variance)) };
  }

  toSeq(): Seq {
    return new Seq(this.outcomes().map(({ value }) => value));
  }
}

function binomial(n: number, k: number): bigint {
  if (k < 0 || k > n) return 0n;
  return factorial(n) / (factorial(k) * factorial(n - k));
}

function bigPow(base: bigint, exponent: number): bigint {
  let result = 1n;
  let factor = base;
  let power = exponent;
  while (power > 0) {
    if (power & 1) result *= factor;
    power >>= 1;
    if (power > 0) factor *= factor;
  }
  return result;
}

/**
 * Distribution of the k-th order statistic without enumerating every roll.
 *
 * All probabilities are represented as integer weights over the common
 * denominator `totalWeight^count`, which keeps the computation exact.
 */
function selectSingleOrderStatistic(
  die: Die,
  count: number,
  index: number,
  order: PositionOrder,
): Die {
  // Convert the AnyDice position into the conventional k-th smallest value.
  const k = order === 'highest first' ? count - index + 1 : index;
  if (k < 1 || k > count) return Die.constant(0);

  const total = die.totalWeight;
  if (total === 0n) return Die.empty();

  const faces = [...die.weights.entries()].sort(([a], [b]) => a - b);
  const weights = new Map<number, bigint>();
  let cumulative = 0n;

  for (const [face, faceWeight] of faces) {
    const less = cumulative;
    const equal = faceWeight;
    const greater = total - cumulative - equal;
    cumulative += equal;

    let weight = 0n;
    for (let j = 0; j <= count - k; j++) {
      const choose = binomial(count, j);
      weight +=
        choose *
        (bigPow(greater, j) * bigPow(less + equal, count - j) -
          bigPow(equal + greater, j) * bigPow(less, count - j));
    }
    addWeight(weights, face, weight);
  }

  return new Die(weights);
}

/**
 * Enumerate every sorted roll of `count` independent copies of `die`.
 *
 * The weight is the number of arrangements (multinomial coefficient) times the
 * product of the individual face weights.
 */
export function enumerateRolls(
  die: Die,
  count: number,
  order: PositionOrder,
): RollSequence[] {
  if (count === 0) return [{ values: [], weight: 1n }];

  const faces = [...die.weights.entries()].sort(([a], [b]) =>
    order === 'highest first' ? b - a : a - b,
  );
  if (faces.length === 0) return [];

  let produced = 0;
  const result: RollSequence[] = [];
  const current: number[] = [];

  const visit = (
    startIndex: number,
    remaining: number,
    weight: bigint,
  ): void => {
    if (remaining === 0) {
      produced++;
      if (produced > MAX_ROLL_COMBINATIONS) {
        throw new Error(
          `Too many possible rolls (${MAX_ROLL_COMBINATIONS} combinations); ` +
            'reduce the pool size or use a smaller die',
        );
      }
      result.push({
        values: [...current],
        weight: multinomial(current) * weight,
      });
      return;
    }

    for (let i = startIndex; i < faces.length; i++) {
      const [face, faceWeight] = faces[i];
      current.push(face);
      visit(i, remaining - 1, weight * faceWeight);
      current.pop();
    }
  };

  visit(0, count, 1n);
  return result;
}
