import { T_ifsr, T_ifs, MetaRV, MetaSeq } from './typings';
import { RV } from './randvar';
import { Seq, get_seq } from './factory';
import { register_reset_callback } from './settings';

const _MEMOIZED_ROLLS = new Map<string, RV>();

export function _clear_roll_cache(): void {
  _MEMOIZED_ROLLS.clear();
}

register_reset_callback(_clear_roll_cache);

export function roll(n: T_ifsr | string, d?: T_ifsr | string | null): MetaRV {
  if (typeof n === 'string') {
    if (d !== undefined && d !== null) {
      throw new Error('if n is a string, then d must be None');
    }
    const [nn, dd] = _parse_from_str(n);
    return roll(nn, dd);
  }

  if (typeof d === 'string') {
    return roll(n, get_seq(d as string));
  }

  if (d === undefined || d === null) {
    return roll(1, n);
  }

  if (typeof n === 'number' && n < 0 && typeof d === 'number' && d < 0) {
    return roll(-n, -d as number);
  }

  if (typeof d === 'number') {
    if (d > 0) {
      d = RV.from_seq(range(1, d + 1));
    } else if (d === 0) {
      d = RV.from_const(0);
    } else {
      d = RV.from_seq(range(d, 0));
    }
  }

  let nVal: number | MetaSeq | RV = n as number;
  let dVal: number | MetaSeq | RV = d as number;

  if (typeof nVal === 'number' && nVal < 0 && dVal instanceof RV) {
    return roll(-nVal, dVal).__neg__();
  }

  if (typeof nVal === 'number' && nVal < 0) {
    return roll(-nVal, dVal).__mul__().__neg__();
  }

  if (typeof nVal === 'number' && nVal === 0) {
    return RV.from_const(0);
  }

  if (typeof nVal === 'number' && nVal === 1 && dVal instanceof RV) {
    return dVal;
  }

  if (nVal instanceof RV && dVal instanceof RV) {
    const dies = nVal.vals.map((v) => roll(v as number, dVal as RV));
    const result = RV.from_rvs(dies, nVal.probs);
    result.set_source(1, dVal as RV);
    return result;
  }

  if (nVal instanceof RV && typeof dVal === 'number') {
    const dies = nVal.vals.map((v) => roll(v as number, dVal));
    const result = RV.from_rvs(dies, nVal.probs);
    result.set_source(1, RV.from_const(dVal));
    return result;
  }

  if (nVal instanceof RV) {
    const seq = nVal as unknown as MetaSeq;
    const s = seq.sum();
    if (typeof s === 'number') {
      return roll(s, dVal);
    }
  }

  if (typeof nVal === 'number' && dVal instanceof RV) {
    const nn = Math.ceil(nVal);
    const result = _roll_int_rv(nn, dVal);
    result._str_LHS_RHS = _setup_str_LHS_RHS(nVal, dVal);
    return result;
  }

  return new RV([], []);
}

function _roll(n: number, d: RV): RV {
  if (n === 0) {
    return RV.from_const(0);
  }
  if (n === 1) {
    return d;
  }
  return _roll_int_rv(n, d);
}

function _roll_int_rv(n: number, d: RV): RV {
  const nn = Math.floor(n);
  if (nn < 0) {
    return _roll_int_rv(-nn, d).__neg__();
  }
  if (nn === 0) {
    return RV.from_const(0);
  }
  if (nn === 1) {
    return d;
  }

  const key = `${nn}-${d.vals.join(',')}-${d.probs.join(',')}`;
  const cached = _MEMOIZED_ROLLS.get(key);
  if (cached) {
    return cached;
  }

  const half = _roll_int_rv(Math.floor(nn / 2), d);
  let full = half.__add__(half);

  if (nn % 2 === 1) {
    full = full.__add__(d);
  }

  full.set_source(nn, d);
  _MEMOIZED_ROLLS.set(key, full as RV);
  return full as RV;
}

function _parse_from_str(s: string): [number, number] {
  const parts = s.split('d');
  const nn = parts[0] === '' ? 1 : parseInt(parts[0], 10);
  const dd = parseInt(parts[1], 10);
  return [nn, dd];
}

function _setup_str_LHS_RHS(n: unknown, d: unknown): [unknown, unknown] {
  let _LHS: unknown;
  if (typeof n === 'number') {
    _LHS = n;
  } else if (n && typeof n === 'object' && 'sum' in n) {
    _LHS = (n as { sum: () => number }).sum();
  } else {
    _LHS = 0;
  }

  let _RHS: unknown;
  if (typeof d === 'number') {
    _RHS = d;
  } else if (d && typeof d === 'object' && '_seq' in d) {
    const seq = d as unknown as { _seq: { length: number } };
    _RHS = seq._seq.length === 0 ? '{}' : '{?}';
  } else if (d && typeof d === 'object' && 'vals' in d) {
    const rv = d as unknown as { _str_LHS_RHS: [unknown, unknown] };
    const [_d_LHS, _d_RHS] = rv._str_LHS_RHS;
    _RHS = _d_LHS === 1 && typeof _d_RHS === 'number' ? _d_RHS : '{?}';
  } else {
    _RHS = '{?}';
  }

  return [_LHS, _RHS];
}

export function roller(rv: T_ifsr, count?: number | null): unknown {
  const r = get_rv(rv as any);
  if (count === undefined || count === null) {
    const vals = r.vals;
    const probs = r.probs;
    const total = probs.reduce((a, b) => a + b, 0);
    let random = Math.random() * total;
    for (let i = 0; i < vals.length; i++) {
      random -= probs[i];
      if (random <= 0) {
        return vals[i];
      }
    }
    return vals[vals.length - 1];
  }

  const results: unknown[] = [];
  for (let i = 0; i < count; i++) {
    results.push(roller(rv));
  }
  return results;
}

function get_rv(source: T_ifsr): RV {
  if (typeof source === 'number' || typeof source === 'boolean') {
    return RV.from_const(source);
  }
  if (source && typeof source === 'object' && Symbol.iterator in source) {
    return RV.from_seq(source as Iterable<T_ifs>);
  }
  if (source instanceof RV) {
    return source;
  }
  return RV.from_const(0);
}

function* range(start: number, end: number): Generator<number> {
  const s = Math.ceil(start);
  const e = Math.floor(end) - 1; // Python range is exclusive
  if (s <= e) {
    for (let i = s; i <= e; i++) {
      yield i;
    }
  } else {
    for (let i = s; i >= e; i--) {
      yield i;
    }
  }
}

export const myrange = range;
