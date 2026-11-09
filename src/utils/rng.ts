/**
 * Shared random-number and weighted-sampling utilities.
 *
 * Both the bag-of-dice roller and the probability calculator use this module.
 * The dice engine receives a crypto-backed RNG by default; tests inject a
 * deterministic `sequenceRng`. No call site silently falls back to
 * `Math.random`.
 */

export interface Rng {
  /** Must return a finite number in `[0, 1)`. */
  next(): number;
  snapshot?(): unknown;
  restore?(state: unknown): void;
  /** Optional stable seed recorded in replay metadata. */
  seed?: string;
}

export interface SequenceRng extends Rng {
  readonly draws: number;
  remaining(): number;
  snapshot(): { index: number };
  restore(state: unknown): void;
}

export class RngError extends Error {
  readonly code = 'RNG_FAILURE' as const;
  readonly context: string;

  constructor(message: string, context: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'RngError';
    this.context = context;
  }
}

/** Deterministic RNG for tests. Values repeat when the sequence is exhausted. */
export function sequenceRng(values: Iterable<number>): SequenceRng {
  const buffer = Array.from(values);
  if (buffer.length === 0) {
    throw new Error('sequenceRng requires at least one value');
  }
  let index = 0;
  return {
    get draws() {
      return index;
    },
    next() {
      const value = buffer[index % buffer.length];
      index += 1;
      return value;
    },
    remaining() {
      return Math.max(0, buffer.length - index);
    },
    snapshot() {
      return { index };
    },
    restore(state: unknown) {
      if (typeof state !== 'object' || state === null) {
        throw new Error('invalid sequenceRng snapshot');
      }
      const next = (state as { index?: unknown }).index;
      if (typeof next !== 'number' || !Number.isInteger(next) || next < 0) {
        throw new Error('invalid sequenceRng snapshot');
      }
      index = next;
    },
  };
}

/**
 * Production RNG backed by the platform crypto source. A missing crypto
 * implementation is a hard error.
 */
export function cryptoRng(): Rng {
  return {
    next() {
      const source = globalThis.crypto;
      if (!source || typeof source.getRandomValues !== 'function') {
        throw new RngError('crypto.getRandomValues is unavailable', 'rng');
      }
      const words = new Uint32Array(2);
      source.getRandomValues(words);
      // 53 significant bits from two 32-bit words.
      const high = words[0] >>> 5; // 27 bits
      const low = words[1] >>> 6; // 26 bits
      return (high * 67108864 + low) / 9007199254740992;
    },
  };
}

/** Validate a raw RNG draw and raise `RngError` on invalid output. */
export function nextRandom(rng: Rng, context = 'rng'): number {
  let value: number;
  try {
    value = rng.next();
  } catch (error) {
    if (error instanceof RngError) throw error;
    throw new RngError('RNG threw while producing a value', context, {
      cause: error,
    });
  }
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RngError('RNG returned a value outside [0, 1)', context);
  }
  return value;
}

/** Uniform integer in `[1, sides]`. */
export function rollDie(rng: Rng, sides: number, context = 'dice'): number {
  return Math.floor(nextRandom(rng, context) * sides) + 1;
}

/** Uniform integer in `[0, maxExclusive)`. */
export function randomInt(
  rng: Rng,
  maxExclusive: number,
  context = 'rng',
): number {
  return Math.floor(nextRandom(rng, context) * maxExclusive);
}

/**
 * Pick an index from numeric weights. Returns `-1` when no positive weight
 * exists. One RNG draw is consumed per selection.
 */
export function pickWeightedIndex(
  weights: readonly number[],
  rng: Rng,
  context = 'rng',
): number {
  let total = 0;
  let lastPositive = -1;
  for (let index = 0; index < weights.length; index += 1) {
    const weight = weights[index];
    if (!Number.isFinite(weight) || weight <= 0) continue;
    total += weight;
    lastPositive = index;
  }
  if (total <= 0 || lastPositive === -1) return -1;

  let target = nextRandom(rng, context) * total;
  for (let index = 0; index < weights.length; index += 1) {
    const weight = weights[index];
    if (!Number.isFinite(weight) || weight <= 0) continue;
    target -= weight;
    if (target <= 0) return index;
  }
  return lastPositive;
}

/**
 * Pick an index from bigint weights. Returns `-1` when no positive weight
 * exists. The numeric scaling is only used to choose a sample; the probability
 * calculator's exact distribution arithmetic remains bigint.
 */
export function pickWeightedBigIntIndex(
  weights: readonly bigint[],
  rng: Rng,
  context = 'rng',
): number {
  let total = 0n;
  let lastPositive = -1;
  for (let index = 0; index < weights.length; index += 1) {
    const weight = weights[index];
    if (weight <= 0n) continue;
    total += weight;
    lastPositive = index;
  }
  if (total <= 0n || lastPositive === -1) return -1;

  let target = nextRandom(rng, context) * Number(total);
  for (let index = 0; index < weights.length; index += 1) {
    const weight = weights[index];
    if (weight <= 0n) continue;
    target -= Number(weight);
    if (target <= 0) return index;
  }
  return lastPositive;
}

/** Pick one item by numeric weight. */
export function pickWeighted<T>(
  items: readonly T[],
  weightOf: (item: T) => number,
  rng: Rng,
  context = 'rng',
): T | undefined {
  const weights = items.map(weightOf);
  const index = pickWeightedIndex(weights, rng, context);
  return index === -1 ? undefined : items[index];
}

/** Draw `amount` items with replacement. */
export function sampleWeighted<T>(
  items: readonly T[],
  weightOf: (item: T) => number,
  amount: number,
  rng: Rng,
  context = 'rng',
): T[] {
  const result: T[] = [];
  if (amount <= 0 || items.length === 0) return result;
  const weights = items.map(weightOf);
  for (let draw = 0; draw < amount; draw += 1) {
    const index = pickWeightedIndex(weights, rng, context);
    if (index === -1) break;
    result.push(items[index]);
  }
  return result;
}

export interface RollReplayState {
  rngStateBefore?: unknown;
  rngStateAfter?: unknown;
  seed?: string;
}

/** Capture the before-state when the RNG exposes snapshots. */
export function captureRngState(rng: Rng): RollReplayState {
  const state: RollReplayState =
    typeof rng.snapshot === 'function'
      ? { rngStateBefore: rng.snapshot() }
      : {};
  if (rng.seed !== undefined) state.seed = rng.seed;
  return state;
}

/** Capture the after-state when the RNG exposes snapshots. */
export function finishRngState(
  rng: Rng,
  state: RollReplayState,
): RollReplayState {
  return typeof rng.snapshot === 'function'
    ? { ...state, rngStateAfter: rng.snapshot() }
    : state;
}

export function restoreRngState(rng: Rng, state: unknown): void {
  if (typeof rng.restore !== 'function') {
    throw new Error('RNG does not support restore');
  }
  rng.restore(state);
}
