import type { Rng } from './contracts';
import { fail } from './errors';

/**
 * Deterministic RNG for tests. The sequence may be an array of values or a
 * factory. The RNG exposes snapshot/restore so replay tests can rewind it.
 */
export interface SequenceRng extends Rng {
  readonly draws: number;
  remaining(): number;
  snapshot(): { index: number };
  restore(state: unknown): void;
}

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
 * Production RNG backed by the platform crypto source. It never falls back to
 * Math.random: a missing crypto implementation is a hard error.
 */
export function cryptoRng(): Rng {
  return {
    next() {
      const source = globalThis.crypto;
      if (!source || typeof source.getRandomValues !== 'function') {
        fail('RNG_FAILURE', 'crypto.getRandomValues is unavailable', {
          pass: 'rng',
          plugin: 'rng',
        });
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

/** Validate a raw RNG draw and raise `RNG_FAILURE` on invalid output. */
export function nextRandom(rng: Rng, context = 'rng'): number {
  let value: number;
  try {
    value = rng.next();
  } catch (error) {
    fail('RNG_FAILURE', 'RNG threw while producing a value', {
      pass: context,
      plugin: 'rng',
      cause: error,
    });
  }
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    fail('RNG_FAILURE', 'RNG returned a value outside [0, 1)', {
      pass: context,
      plugin: 'rng',
      params: { value },
    });
  }
  return value;
}

/** Uniform integer in `[1, sides]`. */
export function rollDie(rng: Rng, sides: number, context = 'dice'): number {
  return Math.floor(nextRandom(rng, context) * sides) + 1;
}

export interface RollReplayState {
  rngStateBefore?: unknown;
  rngStateAfter?: unknown;
}

export function captureRngState(rng: Rng): RollReplayState {
  if (typeof rng.snapshot !== 'function') {
    return {};
  }
  return { rngStateBefore: rng.snapshot() };
}

export function finishRngState(
  rng: Rng,
  state: RollReplayState,
): RollReplayState {
  if (typeof rng.snapshot !== 'function') {
    return state;
  }
  return { ...state, rngStateAfter: rng.snapshot() };
}

export function restoreRngState(rng: Rng, state: unknown): void {
  if (typeof rng.restore !== 'function') {
    throw new Error('RNG does not support restore');
  }
  rng.restore(state);
}
