export function flatten<T>(items: Iterable<T> | string): T[] {
  const result: T[] = [];
  if (items === null || items === undefined) {
    return result;
  }
  if (typeof items === 'string') {
    return [items as unknown as T];
  }
  if (typeof items !== 'object' && typeof items !== 'string') {
    return [items];
  }
  // Check if it's a plain object (not an RV or other special object)
  if (typeof items === 'object' && !Symbol.iterator in items) {
    // Check for RV-like objects (have vals and probs but not iterables)
    const obj = items as unknown as { vals?: number[], probs?: number[] };
    if (obj.vals && obj.probs && !Symbol.iterator in obj) {
      return result;
    }
    return [items as unknown as T];
  }
  for (const x of items as Iterable<T>) {
    if (x === null || x === undefined) {
      continue;
    }
    // Don't recurse into RV objects
    const xObj = x as unknown as { vals?: number[], probs?: number[] };
    if (xObj.vals && xObj.probs) {
      result.push(x as T);
      continue;
    }
    if (typeof x === 'string') {
      result.push(x as unknown as T);
    } else if (x && typeof x === 'object' && Symbol.iterator in x) {
      for (const subX of flatten(x as unknown as Iterable<T>)) {
        result.push(subX);
      }
    } else {
      result.push(x);
    }
  }
  return result;
}

const _memoized: Record<number, number> = {};

export function factorial(n: number): number {
  if (n <= 1) {
    return 1;
  }
  if (!(n in _memoized)) {
    _memoized[n] = n * factorial(n - 1);
  }
  return _memoized[n];
}

export function mymatmul(a: unknown, b: unknown): unknown {
  if (typeof a === 'number' && typeof b === 'number') {
    const strB = String(b);
    const idx = a - 1;
    if (idx >= 0 && idx < strB.length) {
      return parseInt(strB[idx], 10);
    }
    return 0;
  }
  return (a as any).__matmul__(b);
}

export function mylen(a: unknown): number {
  if (typeof a === 'number') {
    return String(Math.abs(a)).length;
  }
  if (a && typeof a === 'object' && 'length' in a) {
    return (a as { length: number }).length;
  }
  return 0;
}

export function myinvert(a: unknown): unknown {
  if (typeof a === 'number') {
    return a === 0 ? 1 : 0;
  }
  return (a as any).__invert__?.();
}

export function myand(a: unknown, b: unknown): unknown {
  if (typeof a === 'number' && typeof b === 'number') {
    return (a && b) ? 1 : 0;
  }
  return (a as any).__and__?.(b) ?? (b as any).__rand__?.(a) ?? 0;
}

export function myor(a: unknown, b: unknown): unknown {
  if (typeof a === 'number' && typeof b === 'number') {
    return (a || b) ? 1 : 0;
  }
  return (a as any).__or__?.(b) ?? (b as any).__ror__?.(a) ?? 0;
}

export function true_div(a: number, b: number): number {
  return a / b;
}

export function accumulate(arr: number[]): number[] {
  const result: number[] = [];
  let sum = 0;
  for (const p of arr) {
    sum += p;
    result.push(sum);
  }
  return result;
}