import { T_if, T_ifs, T_ifsr, MetaSeq } from './typings';
import { flatten } from './utils';
import { get_seq, is_rv } from './factory';

export class Seq implements MetaSeq {
  _seq: number[] = [];
  _sum: number | null = null;
  _one_indexed = 1;

  constructor(...source: T_ifsr[]) {
    const flat = [...flatten(source)];
    const flatRvs = flat.filter(x => is_rv(x));
    const flatRvVals: number[] = [];
    for (const rv of flatRvs) {
      const r = rv as unknown as { vals: number[] };
      flatRvVals.push(...r.vals);
    }
    const flatElse: number[] = [];
    for (const x of flat) {
      if (!is_rv(x)) {
        if (typeof x === 'number') {
          flatElse.push(x);
        }
      }
    }
    this._seq = flatElse.concat(flatRvVals);
  }

  sum(): number {
    if (this._sum === null) {
      this._sum = this._seq.reduce((a, b) => a + b, 0);
    }
    return this._sum;
  }

  set_one_indexed(one_indexed: boolean): void {
    this._one_indexed = one_indexed ? 1 : 0;
  }

  __str__(): string {
    return '{?}';
  }

  __repr__(): string {
    return `Seq(${JSON.stringify(this._seq)})`;
  }

  [Symbol.iterator](): Iterator<number> {
    return this._seq[Symbol.iterator]();
  }

  __len__(): number {
    return this._seq.length;
  }

  __invert__(): number {
    return this.sum() === 0 ? 1 : 0;
  }

  __getitem__(i: number): T_if {
    const idx = i - this._one_indexed;
    if (idx >= 0 && idx < this._seq.length) {
      return this._seq[idx];
    }
    return 0;
  }

  __matmul__(other: T_ifsr): unknown {
    if (is_rv(other)) {
      return (other as unknown as { __rmatmul__: (s: Seq) => unknown }).__rmatmul__(this);
    }

    let otherSeq: Seq;
    if (typeof other === 'number') {
      otherSeq = get_seq(parseInt(String(other), 10).toString().split('').map(Number));
    } else {
      otherSeq = get_seq(other as any);
    }

    for (const i of this._seq) {
      if (typeof i !== 'number' || !Number.isInteger(i)) {
        throw new Error('indices must be integers');
      }
    }

    let total = 0;
    for (const i of this._seq) {
      total += otherSeq.__getitem__(i as number);
    }
    return total;
  }

  __rmatmul__(other: T_ifs): unknown {
    if (is_rv(other)) {
      throw new TypeError('A position selector must be either a number or a sequence');
    }

    if (typeof other === 'number') {
      return this.__getitem__(other);
    }

    const otherSeq = get_seq(other as any);
    let total = 0;
    for (const i of otherSeq._seq) {
      if (typeof i !== 'number' || !Number.isInteger(i)) {
        throw new Error('indices must be integers');
      }
      total += this.__getitem__(i as number);
    }
    return total;
  }

  // operators
  __add__(other: T_ifsr): unknown {
    const s = this.sum();
    if (typeof other === 'number') {
      return s + other;
    }
    if (is_rv(other)) {
      return (other as unknown as { __radd__: (n: T_ifsr) => unknown }).__radd__(s);
    }
    const otherSeq = get_seq(other as any);
    return s + otherSeq.sum();
  }

  __radd__(other: T_ifsr): unknown {
    const s = this.sum();
    if (typeof other === 'number') {
      return other + s;
    }
    if (is_rv(other)) {
      return (other as unknown as { __add__: (n: number) => unknown }).__add__(s);
    }
    const otherSeq = get_seq(other as any);
    return otherSeq.sum() + s;
  }

  __sub__(other: T_ifsr): unknown {
    const s = this.sum();
    if (typeof other === 'number') {
      return s - other;
    }
    if (is_rv(other)) {
      return (other as unknown as { __rsub__: (n: number) => unknown }).__rsub__(s);
    }
    const otherSeq = get_seq(other as any);
    return s - otherSeq.sum();
  }

  __rsub__(other: T_ifsr): unknown {
    const s = this.sum();
    if (typeof other === 'number') {
      return other - s;
    }
    if (is_rv(other)) {
      return (other as unknown as { __sub__: (n: number) => unknown }).__sub__(s);
    }
    const otherSeq = get_seq(other as any);
    return otherSeq.sum() - s;
  }

  __mul__(other: T_ifsr): unknown {
    const s = this.sum();
    if (typeof other === 'number') {
      return s * other;
    }
    if (is_rv(other)) {
      return (other as unknown as { __rmul__: (n: number) => unknown }).__rmul__(s);
    }
    const otherSeq = get_seq(other as any);
    return s * otherSeq.sum();
  }

  __rmul__(other: T_ifsr): unknown {
    const s = this.sum();
    if (typeof other === 'number') {
      return other * s;
    }
    if (is_rv(other)) {
      return (other as unknown as { __mul__: (n: number) => unknown }).__mul__(s);
    }
    const otherSeq = get_seq(other as any);
    return otherSeq.sum() * s;
  }

  __floordiv__(other: T_ifsr): unknown {
    const s = this.sum();
    if (typeof other === 'number') {
      return Math.floor(s / other);
    }
    const otherSeq = get_seq(other as any);
    return Math.floor(s / otherSeq.sum());
  }

  __rfloordiv__(other: T_ifsr): unknown {
    const s = this.sum();
    if (typeof other === 'number') {
      return Math.floor(other / s);
    }
    const otherSeq = get_seq(other as any);
    return Math.floor(otherSeq.sum() / s);
  }

  __truediv__(other: T_ifsr): unknown {
    const s = this.sum();
    if (typeof other === 'number') {
      return s / other;
    }
    const otherSeq = get_seq(other as any);
    return s / otherSeq.sum();
  }

  __rtruediv__(other: T_ifsr): unknown {
    const s = this.sum();
    if (typeof other === 'number') {
      return other / s;
    }
    const otherSeq = get_seq(other as any);
    return otherSeq.sum() / s;
  }

  __pow__(other: T_ifsr): unknown {
    const s = this.sum();
    if (typeof other === 'number') {
      return Math.pow(s, other);
    }
    const otherSeq = get_seq(other as any);
    return Math.pow(s, otherSeq.sum());
  }

  __rpow__(other: T_ifsr): unknown {
    const s = this.sum();
    if (typeof other === 'number') {
      return Math.pow(other, s);
    }
    const otherSeq = get_seq(other as any);
    return Math.pow(otherSeq.sum(), s);
  }

  __mod__(other: T_ifsr): unknown {
    const s = this.sum();
    if (typeof other === 'number') {
      return s % other;
    }
    const otherSeq = get_seq(other as any);
    return s % otherSeq.sum();
  }

  __rmod__(other: T_ifsr): unknown {
    const s = this.sum();
    if (typeof other === 'number') {
      return other % s;
    }
    const otherSeq = get_seq(other as any);
    return otherSeq.sum() % s;
  }

  // comparison operators
  __eq__(other: T_ifsr): unknown {
    return this._compare_to(other, (x, y) => x === y);
  }

  __ne__(other: T_ifsr): unknown {
    if (is_rv(other)) {
      return (other as unknown as { __ne__: (s: number) => unknown }).__ne__(this.sum());
    }
    const otherSeq = get_seq(other as any);
    const eq = this._compare_to(otherSeq, (x, y) => x === y);
    if (typeof eq === 'number') {
      return eq === 0 ? 1 : 0;
    }
    return !eq;
  }

  __lt__(other: T_ifsr): unknown {
    return this._compare_to(other, (x, y) => x < y);
  }

  __le__(other: T_ifsr): unknown {
    return this._compare_to(other, (x, y) => x <= y);
  }

  __gt__(other: T_ifsr): unknown {
    return this._compare_to(other, (x, y) => x > y);
  }

  __ge__(other: T_ifsr): unknown {
    return this._compare_to(other, (x, y) => x >= y);
  }

  // boolean operators
  __or__(other: T_ifsr): unknown {
    if (typeof other === 'number') {
      return (this.sum() !== 0 || other !== 0) ? 1 : 0;
    }
    if (is_rv(other)) {
      return (other as unknown as { __or__: (n: number) => unknown }).__or__(this.sum());
    }
    const otherSeq = get_seq(other as any);
    return (this.sum() !== 0 || otherSeq.sum() !== 0) ? 1 : 0;
  }

  __ror__(other: T_ifsr): unknown {
    if (typeof other === 'number') {
      return (other !== 0 || this.sum() !== 0) ? 1 : 0;
    }
    if (is_rv(other)) {
      return (other as unknown as { __ror__: (n: number) => unknown }).__ror__(this.sum());
    }
    const otherSeq = get_seq(other as any);
    return (otherSeq.sum() !== 0 || this.sum() !== 0) ? 1 : 0;
  }

  __and__(other: T_ifsr): unknown {
    if (typeof other === 'number') {
      return (this.sum() !== 0 && other !== 0) ? 1 : 0;
    }
    if (is_rv(other)) {
      return (other as unknown as { __and__: (n: number) => unknown }).__and__(this.sum());
    }
    const otherSeq = get_seq(other as any);
    return (this.sum() !== 0 && otherSeq.sum() !== 0) ? 1 : 0;
  }

  __rand__(other: T_ifsr): unknown {
    if (typeof other === 'number') {
      return (other !== 0 && this.sum() !== 0) ? 1 : 0;
    }
    if (is_rv(other)) {
      return (other as unknown as { __rand__: (n: number) => unknown }).__rand__(this.sum());
    }
    const otherSeq = get_seq(other as any);
    return (otherSeq.sum() !== 0 && this.sum() !== 0) ? 1 : 0;
  }

  _compare_to(other: T_ifsr, operation: (x: number, y: number) => boolean): unknown {
    if (is_rv(other)) {
      return operation(this.sum(), (other as unknown as { mean: () => number }).mean() ?? 0) ? 1 : 0;
    }

    const otherSeq = get_seq(other as any);

    const len1 = this._seq.length;
    const len2 = otherSeq._seq.length;
    const maxLen = Math.max(len1, len2);

    for (let i = 0; i < maxLen; i++) {
      const v1 = i < len1 ? this._seq[i] : -Infinity;
      const v2 = i < len2 ? otherSeq._seq[i] : -Infinity;
      if (!operation(v1, v2)) {
        return 0;
      }
    }
    return 1;
  }

  equals(other: unknown): boolean {
    if (!(other instanceof Seq)) return false;
    return arraysEqual(this._seq, (other as Seq)._seq);
  }

  static seqs_are_equal(s1: T_ifsr, s2: T_ifsr): boolean {
    if (is_rv(s1) || is_rv(s2)) {
      throw new Error('cannot compare Seq with RV');
    }
    const seq1 = get_seq(s1 as any);
    const seq2 = get_seq(s2 as any);
    return arraysEqual(seq1._seq, seq2._seq);
  }
}

function arraysEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
