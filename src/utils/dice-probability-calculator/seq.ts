import type { PositionOrder } from './types';

/**
 * An immutable sequence of numbers.
 *
 * AnyDice keeps sequences ordered. Sequence literals are ordered using the
 * current `position order` setting; operations such as `reverse` intentionally
 * bypass sorting because their result is defined by their input order.
 */
export class Seq {
  readonly elements: readonly number[];

  constructor(elements: Iterable<number>) {
    this.elements = Object.freeze([...elements]);
  }

  /** Create a sequence ordered according to the current position setting. */
  static ordered(elements: Iterable<number>, order: PositionOrder): Seq {
    const values = [...elements];
    values.sort(order === 'highest first' ? (a, b) => b - a : (a, b) => a - b);
    return new Seq(values);
  }

  get length(): number {
    return this.elements.length;
  }

  get isEmpty(): boolean {
    return this.elements.length === 0;
  }

  sum(): number {
    return this.elements.reduce((sum, value) => sum + value, 0);
  }

  /** 1-indexed access. Missing positions evaluate to 0, matching AnyDice. */
  get(index: number): number {
    if (!Number.isInteger(index) || index < 1) return 0;
    return this.elements[index - 1] ?? 0;
  }

  contains(value: number): boolean {
    return this.elements.includes(value);
  }

  count(values: Iterable<number>): number {
    const wanted = new Set(values);
    return this.elements.filter((value) => wanted.has(value)).length;
  }

  reverse(): Seq {
    return new Seq([...this.elements].reverse());
  }

  sort(order: PositionOrder): Seq {
    return Seq.ordered(this.elements, order);
  }

  toArray(): number[] {
    return [...this.elements];
  }

  toString(): string {
    return `{${this.elements.join(', ')}}`;
  }
}
