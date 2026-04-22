import { T_if, T_ifs, T_ifsr } from './typings';
import { Seq } from './seq';
import { SETTINGS } from './settings';
import { BlankRV } from './blackrv';
import { get_seq } from './factory';
import { factorial } from './utils';
import { accumulate } from './utils';

function gcd(a: number, ...rest: number[]): number {
  const gcd2 = (x: number, y: number): number => (y === 0 ? x : gcd2(y, x % y));
  let result = a;
  for (const n of rest) {
    result = gcd2(result, n);
  }
  return result;
}

function nCr(n: number, r: number): number {
  if (r < 0 || r > n) return 0;
  if (r === 0 || r === n) return 1;
  if (r > n / 2) r = n - r;
  let result = 1;
  for (let i = 0; i < r; i++) {
    result = result * (n - i) / (i + 1);
  }
  return Math.round(result);
}

function arraysEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export class RV {
  vals: number[] = [];
  probs: number[] = [];
  sum_probs: number | null = null;
  _source_roll = 1;
  _source_die: RV = this;
  _str_LHS_RHS: [T_if, T_if | string] = [1, '{?}'];

  constructor(vals: Iterable<number>, probs: Iterable<number>, truncate?: boolean | null) {
    const valsArr = [...vals];
    const probsArr = [...probs];

    if (truncate || (truncate === undefined && SETTINGS.RV_TRUNC)) {
      this.vals = valsArr.map(v => Math.trunc(v));
    } else {
      this.vals = valsArr;
    }
    this.probs = [...probsArr];

    const sorted = RV._sort_and_group(
      this.vals,
      this.probs,
      SETTINGS.RV_IGNORE_ZERO_PROBS,
      true
    );
    this.vals = sorted[0];
    this.probs = sorted[1];

    if (this.vals.length === 0) {
      this.vals = [0];
      this.probs = [1];
    }
  }

  static _sort_and_group(
    vals: Iterable<number>,
    probs: Iterable<number>,
    skip_zero_probs: boolean,
    normalize: boolean
  ): [number[], number[]] {
    const valsArr = [...vals];
    const probsArr = [...probs];

    if (valsArr.length !== probsArr.length) {
      throw new Error('vals and probs must be the same length');
    }

    for (const p of probsArr) {
      if (!Number.isInteger(p) || p < 0) {
        throw new Error('probs must be non-negative integers');
      }
    }

    const zipped = valsArr.map((v, i) => [v, probsArr[i]] as [number, number]);
    zipped.sort((a, b) => b[0] - a[0]);

    const newzipped: [number, number][] = [];
    for (let i = zipped.length - 1; i > 0; i--) {
      if (zipped[i][0] === zipped[i - 1][0]) {
        zipped[i - 1] = [zipped[i - 1][0], zipped[i - 1][1] + zipped[i][1]];
      } else {
        newzipped.push(zipped[i]);
      }
    }
    if (zipped.length > 0) {
      newzipped.push(zipped[0]);
    }

    if (skip_zero_probs) {
      const filtered: [number, number][] = [];
      for (const [v, p] of newzipped) {
        if (p !== 0) {
          filtered.push([v, p]);
        }
      }
      newzipped.length = 0;
      newzipped.push(...filtered);
    }

    const finalVals = newzipped.map(([v]) => v);
    let finalProbs = newzipped.map(([, p]) => p);

    if (normalize && finalProbs.length > 0) {
      const gcdVal = gcd(...finalProbs);
      if (gcdVal > 1) {
        finalProbs = finalProbs.map(p => Math.floor(p / gcdVal));
      }
    }

    return [finalVals, finalProbs];
  }

  static from_const(val: T_if): RV {
    const numVal = typeof val === 'boolean' ? (val ? 1 : 0) : Number(val);
    return new RV([numVal], [1]);
  }

  static from_seq(s: Iterable<T_ifs>): RV {
    const seq = get_seq(s);
    if (seq._seq.length === 0) {
      return new RV([0], [1]);
    }
    return new RV(seq._seq, new Array(seq._seq.length).fill(1));
  }

  static from_rvs(rvs: Iterable<T_ifs | null>, weights?: Iterable<number> | null): RV {
    const rvsArr = [...rvs];
    let weightsArr = weights ? [...weights] : new Array(rvsArr.length).fill(1);

    const blankInds = new Set<number>();
    rvsArr.forEach((x, i) => {
      if (x === null || x instanceof BlankRV) {
        blankInds.add(i);
      }
    });

    const filteredRvs = rvsArr.filter((_, i) => !blankInds.has(i));
    const filteredWeights = weightsArr.filter((_, i) => !blankInds.has(i));

    if (filteredRvs.length === 0) {
      return new BlankRV() as unknown as RV;
    }

    if (filteredWeights.length !== filteredRvs.length) {
      throw new Error('Length mismatch');
    }

    const probSums = filteredRvs.map(r => {
      if (r instanceof RV) {
        return r._get_sum_probs();
      }
      return 1;
    });

    const PROD = probSums.reduce((acc, p) => acc * p, 1);

    const resVals: number[] = [];
    const resProbs: number[] = [];

    filteredRvs.forEach((r, i) => {
      const weight = filteredWeights[i];
      const probSum = probSums[i];
      const factor = PROD / probSum;

      if (r instanceof RV) {
        r.vals.forEach(v => resVals.push(v));
        r.probs.forEach(p => resProbs.push(p * weight * factor));
      } else {
        resVals.push(r as number);
        resProbs.push(weight * PROD);
      }
    });

    const result = new RV(resVals, resProbs);
    return _INTERNAL_PROB_LIMIT_VALS(result);
  }

  set_source(roll: number, die: RV): void {
    this._source_roll = roll;
    this._source_die = die;
  }

  _get_sum_probs(force = false): number {
    if (this.sum_probs === null || force) {
      this.sum_probs = this.probs.reduce((a, b) => a + b, 0);
    }
    return this.sum_probs;
  }

  mean(): number | null {
    const s = this._get_sum_probs();
    if (s === 0) {
      return null;
    }
    let sum = 0;
    for (let i = 0; i < this.vals.length; i++) {
      sum += this.vals[i] * this.probs[i];
    }
    return sum / s;
  }

  std(): number | null {
    const s = this._get_sum_probs();
    if (s === 0) {
      return null;
    }
    const ex2 = (this as any).__pow__(2).mean();
    const ex = this.mean();
    if (ex2 === null || ex === null) {
      return null;
    }
    const variance = ex2 - ex * ex;
    return variance >= 0 ? Math.sqrt(variance) : 0;
  }

  filter(obj: T_ifsr): RV {
    const toFilter = new Set([...get_seq(obj)._seq]);
    const vp: [number, number][] = [];
    for (let i = 0; i < this.vals.length; i++) {
      if (!toFilter.has(this.vals[i])) {
        vp.push([this.vals[i], this.probs[i]]);
      }
    }
    if (vp.length === 0) {
      return RV.from_const(0);
    }
    const vals = vp.map(v => v[0]);
    const probs = vp.map(v => v[1]) as number[];
    return new RV(vals, probs);
  }

  get_vals_probs(cdf_cut = 0): [unknown, number][] {
    if (cdf_cut < 0 || cdf_cut >= 1) {
      throw new Error('cdf_cut must be in [0, 1)');
    }

    const s = this._get_sum_probs();
    const vals_probs: [unknown, number][] = this.vals.map((v, i) => {
      let displayVal: unknown = v;
      if (typeof v === 'object' && v !== null && 'is_number' in v) {
        const strVal = v as unknown as { is_number: () => boolean };
        if (strVal.is_number()) {
          displayVal = `"${v}"`;
        } else {
          displayVal = `${v}`;
        }
      }
      return [displayVal, this.probs[i] / s];
    });

    if (cdf_cut > 0) {
      const sortedValsProbs = [...vals_probs].sort((a, b) => a[1] - b[1]);
      const accumulatedProbs: [unknown, number][] = [];
      let runningProb = 0;
      for (const [v, p] of sortedValsProbs) {
        runningProb += p;
        accumulatedProbs.push([v, runningProb]);
      }
      const valsToCut = new Set<unknown>();
      for (const [v, p] of accumulatedProbs) {
        if (p < cdf_cut) {
          valsToCut.add(v);
        }
      }
      return vals_probs.filter(([v]) => !valsToCut.has(v));
    }

    return vals_probs;
  }

  get_cdf(): RV {
    const cdfVals: number[] = [...this.vals];
    const cdfProbs: number[] = [];
    let running = 0;
    for (let i = 0; i < this.vals.length; i++) {
      running += this.probs[i];
      cdfProbs.push(running);
    }
    const result = Object.create(RV.prototype);
    result.vals = cdfVals;
    result.probs = cdfProbs;
    result.sum_probs = null;
    result._source_roll = 1;
    result._source_die = result;
    result._str_LHS_RHS = [1, '{?}'];
    return result;
  }

  _get_expanded_possible_rolls(): [Iterable<Seq>[], number[]] {
    const N = this._source_roll;
    const D = this._source_die;

    if (N === 1) {
      return [D.vals.map(i => get_seq([i])), D.probs];
    }

    const pdfDict = new Map<number, number>();
    for (let i = 0; i < D.vals.length; i++) {
      pdfDict.set(D.vals[i], D.probs[i]);
    }

    const vals: Seq[] = [];
    const probs: number[] = [];
    const FACTORIAL_N = factorial(N);

    const combinations = generateCombinationsWithReplacement([...D.vals].reverse(), N);

    for (const roll of combinations) {
      vals.push(get_seq([...roll]));

      let curRollProbs = 1;
      const counts = new Map<number, number>();
      let combWithReplDenominator = 1;

      for (const v of roll) {
        curRollProbs *= pdfDict.get(v) || 1;
        const count = (counts.get(v) || 0) + 1;
        counts.set(v, count);
        combWithReplDenominator *= count;
      }

      const curRollCombinationCount = FACTORIAL_N / combWithReplDenominator;
      probs.push(curRollCombinationCount * curRollProbs);
    }

    return [vals, probs];
  }

  _apply_operation(operation: (x: number) => number): RV {
    return new RV(this.vals.map(operation), this.probs);
  }

  _convolve(other: T_ifsr, operation: (x: number, y: number) => number): RV {
    if (other instanceof BlankRV) {
      return new BlankRV(other._special_null) as unknown as RV;
    }

    let otherVal: number | RV;

    if (typeof other === 'number') {
      otherVal = other;
    } else if (other instanceof RV) {
      return this._rvConvolve(other, operation);
    } else if (other && typeof other === 'object' && '_seq' in other) {
      const seq = other as unknown as { sum: () => number };
      otherVal = seq.sum();
    } else if (other && typeof other === 'object' && Symbol.iterator in other) {
      otherVal = get_seq(other as Iterable<unknown>).sum();
    } else {
      otherVal = other as number;
    }

    if (typeof otherVal === 'number') {
      const newVals = this.vals.map(v => operation(v, otherVal as number));
      const result = new RV(newVals, [...this.probs]);
      return _INTERNAL_PROB_LIMIT_VALS(result);
    }

    return this._rvConvolve(otherVal as RV, operation);
  }

  private _rvConvolve(other: RV, operation: (x: number, y: number) => number): RV {
    const [newVals, newProbs] = _rdict.fast_convolve(
      [this.vals, this.probs],
      [other.vals, other.probs],
      operation
    );
    const result = new RV(newVals, newProbs);
    return _INTERNAL_PROB_LIMIT_VALS(result);
  }

  _rconvolve(other: T_ifsr, operation: (x: number, y: number) => number): RV {
    if (other instanceof BlankRV) {
      return new BlankRV(other._special_null) as unknown as RV;
    }

    let otherVal: number;

    if (typeof other === 'number') {
      otherVal = other;
    } else if (other && typeof other === 'object' && '_seq' in other) {
      const seq = other as unknown as { sum: () => number };
      otherVal = seq.sum();
    } else if (other && typeof other === 'object' && Symbol.iterator in other) {
      otherVal = get_seq(other as Iterable<unknown>).sum();
    } else {
      otherVal = other as number;
    }

    const newVals = this.vals.map(v => operation(otherVal, v));
    return new RV(newVals, [...this.probs]);
  }

  __matmul__(_other: T_ifs): unknown {
    throw new TypeError('A position selector must be either a number or a sequence');
  }

  __rmatmul__(other: T_ifs): unknown {
    if (typeof other === 'number') {
      return this._source_die._get_kth_order_statistic(this._source_roll, other as number);
    }
    return _sum_at(this, other);
  }

  _get_kth_order_statistic(draws: number, k: number): RV {
    const cdfObj = this.get_cdf();
    const cdf = cdfObj.probs;
    const sum_probs = this._get_sum_probs();

    const p1 = this.probs.map((p, i) => cdf[i] - p);
    const p2 = this.probs;
    const p3 = cdf.map(cdf_x => sum_probs - cdf_x);

    const N = draws;
    let kk = k;
    if (SETTINGS['position order'] === 'highest first') {
      kk = N - k + 1;
    }
    if (kk < 1 || kk > N) {
      return RV.from_const(0);
    }

    const res_prob: number[] = [];
    for (let xi = 0; xi < this.vals.length; xi++) {
      let sum = 0;
      for (let j = 0; j < N - kk + 1; j++) {
        const comb1 = nCr(N, j);
        const term1 = Math.pow(p3[xi], j) * Math.pow(p1[xi] + p2[xi], N - j);
        const term2 = Math.pow(p2[xi] + p3[xi], j) * Math.pow(p1[xi], N - j);
        sum += comb1 * (term1 - term2);
      }
      res_prob.push(sum);
    }

    const res = new RV(this.vals, res_prob);
    return _INTERNAL_PROB_LIMIT_VALS(res);
  }

  // Arithmetic operators
  __add__(other: T_ifsr): RV {
    return this._convolve(other as any, (x, y) => x + y);
  }

  __radd__(other: T_ifsr): RV {
    return this._rconvolve(other as any, (x, y) => x + y);
  }

  __sub__(other: T_ifsr): RV {
    return this._convolve(other as any, (x, y) => x - y);
  }

  __rsub__(other: T_ifsr): RV {
    return this._rconvolve(other as any, (x, y) => x - y);
  }

  __mul__(other: T_ifsr): RV {
    return this._convolve(other as any, (x, y) => x * y);
  }

  __rmul__(other: T_ifsr): RV {
    return this._rconvolve(other as any, (x, y) => x * y);
  }

  __floordiv__(other: T_ifsr): RV {
    return this._convolve(other as any, (x, y) => Math.floor(x / y));
  }

  __rfloordiv__(other: T_ifsr): RV {
    return this._rconvolve(other as any, (x, y) => Math.floor(x / y));
  }

  __truediv__(other: T_ifsr): RV {
    return this._convolve(other as any, (x, y) => x / y);
  }

  __rtruediv__(other: T_ifsr): RV {
    return this._rconvolve(other as any, (x, y) => x / y);
  }

  __pow__(other: T_ifsr): RV {
    return this._convolve(other as any, (x, y) => Math.pow(x, y));
  }

  __rpow__(other: T_ifsr): RV {
    return this._rconvolve(other as any, (x, y) => Math.pow(x, y));
  }

  __mod__(other: T_ifsr): RV {
    return this._convolve(other as any, (x, y) => x % y);
  }

  __rmod__(other: T_ifsr): RV {
    return this._rconvolve(other as any, (x, y) => x % y);
  }

  // Comparison operators
  __eq__(other: T_ifsr): RV {
    return this._convolve(other as any, (x, y) => (x === y) ? 1 : 0);
  }

  __ne__(other: T_ifsr): RV {
    return this._convolve(other as any, (x, y) => (x !== y) ? 1 : 0);
  }

  __lt__(other: T_ifsr): RV {
    return this._convolve(other as any, (x, y) => (x < y) ? 1 : 0);
  }

  __le__(other: T_ifsr): RV {
    return this._convolve(other as any, (x, y) => (x <= y) ? 1 : 0);
  }

  __gt__(other: T_ifsr): RV {
    return this._convolve(other as any, (x, y) => (x > y) ? 1 : 0);
  }

  __ge__(other: T_ifsr): RV {
    return this._convolve(other as any, (x, y) => (x >= y) ? 1 : 0);
  }

  // Boolean operators
  __or__(other: T_ifsr): RV {
    return this._convolve(other as any, (x, y) => (x || y) ? 1 : 0);
  }

  __ror__(other: T_ifsr): RV {
    return this._rconvolve(other as any, (x, y) => (x || y) ? 1 : 0);
  }

  __and__(other: T_ifsr): RV {
    return this._convolve(other as any, (x, y) => (x && y) ? 1 : 0);
  }

  __rand__(other: T_ifsr): RV {
    return this._rconvolve(other as any, (x, y) => (x && y) ? 1 : 0);
  }

  __bool__(): boolean {
    throw new TypeError('Boolean values can only be numbers, but you provided RV');
  }

  __len__(): number {
    return this._source_roll;
  }

  __hash__(): number {
    let hash = 0;
    for (const v of this.vals) {
      hash = ((hash << 5) - hash) + v;
      hash |= 0;
    }
    for (const p of this.probs) {
      hash = ((hash << 5) - hash) + p;
      hash |= 0;
    }
    return hash;
  }

  __pos__(): RV {
    return this;
  }

  __neg__(): RV {
    return RV.from_const(0).__sub__(this);
  }

  __invert__(): RV {
    if (this.vals.length === 1 && this.vals[0] === 0 && this.probs[0] === 1) {
      return RV.from_const(1);
    }
    return RV.from_const(0);
  }

  __abs__(): RV {
    return this._apply_operation(Math.abs);
  }

  __round__(n = 0): RV {
    return this._apply_operation(x => Math.round(x * Math.pow(10, n)) / Math.pow(10, n));
  }

  __floor__(): RV {
    return this._apply_operation(Math.floor);
  }

  __ceil__(): RV {
    return this._apply_operation(Math.ceil);
  }

  __trunc__(): RV {
    return this._apply_operation(Math.trunc);
  }

  __str__(): string {
    const [s, d] = this._str_LHS_RHS;
    if (typeof s === 'number' && typeof d === 'number') {
      return 'd{?}';
    }

    const absS = s !== null && Math.abs(s) > 1 ? String(Math.abs(s)) : '';
    if (typeof d === 'number') {
      const sign = s * d >= 0 ? '' : '-';
      const rhs = s * d === 0 ? '{0..0}' : String(Math.abs(d));
      return sign + absS + 'd' + rhs;
    }
    if (d === '{}') {
      return 'd{}';
    }
    if (s === 0) {
      return 'd{0..0}';
    }
    return absS + 'd{?}';
  }

  __repr__(): string {
    return this.output(print_ = false) as string;
  }

  static dices_are_equal(d1: T_ifsr, d2: T_ifsr): boolean {
    const rv1 = d1 instanceof RV ? d1 : (d1 === null || d1 === undefined ? new BlankRV() : RV.from_seq([d1 as any]));
    const rv2 = d2 instanceof RV ? d2 : (d2 === null || d2 === undefined ? new BlankRV() : RV.from_seq([d2 as any]));

    if (rv1 instanceof BlankRV && rv2 instanceof BlankRV) {
      return true;
    }
    if (rv1 instanceof BlankRV || rv2 instanceof BlankRV) {
      return false;
    }

    const r1 = rv1 as RV;
    const r2 = rv2 as RV;
    return arraysEqual(r1.vals, r2.vals) && arraysEqual(r1.probs, r2.probs);
  }
}

function _sum_at(orig: unknown, locs: unknown): unknown {
  const origRV = orig as RV;
  let locsArray: number[] = [];
  
  if (locs instanceof Seq) {
    locsArray = [...(locs as unknown as { _seq: number[] })._seq];
  } else if (locs && typeof locs === 'object' && '_seq' in locs) {
    locsArray = [...(locs as { _seq: number[] })._seq];
  } else if (typeof locs === 'number') {
    locsArray = [locs];
  } else if (Array.isArray(locs)) {
    locsArray = locs as number[];
  } else {
    locsArray = [locs as number];
  }
  
  // Sum the kth order statistics for each position
  let total: RV = RV.from_const(0);
  for (const i of locsArray) {
    const kth = origRV._get_kth_order_statistic(origRV._source_roll, i as number);
    total = total.__add__(kth) as RV;
  }
  return total;
}

class _rdict {
  d: Map<string, number> = new Map();

  setItem(key: string, value: number): void {
    const existing = this.d.get(key);
    if (existing !== undefined) {
      this.d.set(key, existing + value);
    } else {
      this.d.set(key, value);
    }
  }

  to_tuples(): [number[], number[]] {
    const sorted = [...this.d.entries()].sort((a, b) => Number(a[0]) - Number(b[0]));
    if (sorted.length === 0) {
      return [[], []];
    }
    return [sorted.map(([k]) => Number(k)), sorted.map(([, v]) => v)];
  }

  static fast_convolve(
    items1: [number[], number[]],
    items2: [number[], number[]],
    operation: (x: number, y: number) => number
  ): [number[], number[]] {
    const d = new _rdict();
    const [vals1, probs1] = items1;
    const [vals2, probs2] = items2;

    for (let i = 0; i < vals1.length; i++) {
      for (let j = 0; j < vals2.length; j++) {
        const key = String(operation(vals1[i], vals2[j]));
        const value = probs1[i] * probs2[j];
        d.setItem(key, value);
      }
    }

    return d.to_tuples();
  }

  private static _fast_convolve_op_add(
    items1: [number[], number[]],
    items2: [number[], number[]]
  ): [number[], number[]] {
    const d = new _rdict();
    const [vals1, probs1] = items1;
    const [vals2, probs2] = items2;

    for (let i = 0; i < vals1.length; i++) {
      for (let j = 0; j < vals2.length; j++) {
        const key = String(vals1[i] + vals2[j]);
        const value = probs1[i] * probs2[j];
        d.setItem(key, value);
      }
    }

    return d.to_tuples();
  }
}

function _INTERNAL_PROB_LIMIT_VALS(rv: RV, sum_limit = 1e30): RV {
  const sum = rv._get_sum_probs();
  if (sum <= sum_limit) {
    return rv;
  }

  const normalizingConst = Math.floor(1e10 * Math.floor(sum / sum_limit));
  const newProbs = rv.probs.map(p => Math.floor(p / normalizingConst));
  rv.probs = newProbs as number[];
  rv._get_sum_probs(true);
  return rv;
}

function* generateCombinationsWithReplacement<T>(arr: T[], n: number): Generator<T[]> {
  const indices = new Array(n).fill(0);
  const len = arr.length;

  while (true) {
    yield indices.map(i => arr[i]);

    let i = n - 1;
    while (i >= 0 && indices[i] === len - 1) {
      i--;
    }
    if (i < 0) break;

    indices[i]++;
    for (let j = i + 1; j < n; j++) {
      indices[j] = indices[i];
    }
  }
}

let print_ = false;