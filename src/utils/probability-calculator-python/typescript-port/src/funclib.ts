import { T_N, T_S, T_D } from './typings';
import { Seq } from './seq';
import { RV } from './randvar';

export function absolute(NUMBER: T_N, ...args: unknown[]): number {
  return Math.abs(NUMBER as number);
}

export function X_contains_X(SEQUENCE: T_S, NUMBER: T_N, ...args: unknown[]): number {
  const seq = SEQUENCE as unknown as Seq;
  return seq._seq.includes(NUMBER as number) ? 1 : 0;
}

export function count_X_in_X(VALUES: T_S, SEQUENCE: T_S, ...args: unknown[]): number {
  const values = VALUES as unknown as Seq;
  const seq = SEQUENCE as unknown as Seq;
  let count = 0;
  for (const v of values._seq) {
    if (seq._seq.includes(v)) count++;
  }
  return count;
}

export function explode_X(DIE: T_D, ...args: unknown[]): RV {
  return new RV([], []);
}

export function highest_X_of_X(NUMBER: T_N, DICE: T_D, ...args: unknown[]): unknown {
  const n = NUMBER as number;
  const dice = DICE as unknown as RV;
  return (dice as unknown as RV).__rmatmul__(n);
}

export function lowest_X_of_X(NUMBER: T_N, DICE: T_D, ...args: unknown[]): unknown {
  const n = NUMBER as number;
  const dice = DICE as unknown as RV;
  const sorted = [...dice.vals].sort((a, b) => b - a);
  return (dice.__rmatmul__(n) as RV);
}

export function middle_X_of_X(NUMBER: T_N, DICE: T_D, ...args: unknown[]): unknown {
  const n = NUMBER as number;
  const dice = DICE as unknown as RV;
  return dice;
}

export function highest_of_X_and_X(A: T_N, B: T_N, ...args: unknown[]): unknown {
  return null;
}

export function lowest_of_X_and_X(A: T_N, B: T_N, ...args: unknown[]): unknown {
  return null;
}

export function maximum_of_X(DIE: T_D, ...args: unknown[]): unknown {
  const dice = DIE as unknown as RV;
  return Math.max(...dice.vals);
}

export function reverse_X(SEQUENCE: T_S, ...args: unknown[]): unknown {
  if (SEQUENCE instanceof RV) {
    return SEQUENCE;
  }
  const seq = SEQUENCE as unknown as Seq;
  return new Seq([...seq._seq].reverse());
}

export function sort_X(SEQUENCE: T_S, ...args: unknown[]): unknown {
  const seq = SEQUENCE as unknown as Seq;
  return new Seq([...seq._seq].sort((a, b) => a - b));
}