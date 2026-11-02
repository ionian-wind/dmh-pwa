import type { Die } from './die';
import type { Seq } from './seq';

/**
 * A value in the AnyDice-like expression language.
 *
 * - numbers are scalar integers
 * - sequences are ordered collections of numbers
 * - dice are discrete probability distributions
 * - strings are only used by directives such as `set` and named output
 */
export type Value = number | Seq | Die | string;

export type PositionOrder = 'highest first' | 'lowest first';

export interface Settings {
  /** Maximum depth for user function calls. */
  maxFunctionDepth: number;
  /** Maximum depth used by `[explode DIE]`. */
  explodeDepth: number;
  /** Order used for sequences and positional access. */
  positionOrder: PositionOrder;
}

export const DEFAULT_SETTINGS: Settings = {
  maxFunctionDepth: 10,
  explodeDepth: 8,
  positionOrder: 'highest first',
};

export interface Outcome {
  value: number;
  weight: bigint;
  probability: number;
}

export interface OutputResult {
  name?: string;
  outcomes: Outcome[];
  mean: number;
  stddev: number;
  totalWeight: bigint;
}

export interface CalculationResult {
  outputs: OutputResult[];
  settings: Settings;
}

/** Internal representation produced by the parser. */
export interface RawOutput {
  value: Value;
  name?: string;
}
