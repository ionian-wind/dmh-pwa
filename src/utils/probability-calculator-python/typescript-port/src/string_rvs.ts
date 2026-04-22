import { T_if, MetaStr } from './typings';

export type T_ift = T_if | string | StringVal;

export class Seq {
  _seq: number[] = [];
}

const _CONST_COEF = '_UNIQUE_STRING';

export class StringVal implements MetaStr {
  keys: string[] = [];
  data: Record<string, T_if> = {};

  constructor(keys: string[], pairs: Record<string, T_if>) {
    this.keys = [...keys].sort();
    this.data = { ...pairs };
  }

  static from_const(constant: T_if): StringVal {
    return new StringVal([_CONST_COEF], { [_CONST_COEF]: constant });
  }

  static from_str(s: string): StringVal {
    return new StringVal([s], { [s]: 1 });
  }

  static from_paris(pairs: Record<string, T_if>): StringVal {
    return new StringVal(Object.keys(pairs), pairs);
  }

  is_number(): boolean {
    const regex = /^-?\d+(\.\d+)?$/;
    return this.keys.length === 1 && regex.test(this.keys[0]);
  }

  __add__(other: unknown): StringVal {
    if (!(other instanceof StringVal)) {
      other = StringVal.from_const(other as T_if);
    }
    const newData = { ...this.data };
    for (const [key, val] of Object.entries((other as StringVal).data)) {
      newData[key] = (newData[key] || 0) + val;
    }
    return StringVal.from_paris(newData);
  }

  __radd__(other: unknown): StringVal {
    return this.__add__(other);
  }

  __eq__(other: unknown): boolean {
    if (!(other instanceof StringVal)) return false;
    if (!arraysEqual(this.keys, (other as StringVal).keys)) return false;
    const thisData = this._getSortedData();
    const otherData = (other as StringVal)._getSortedData();
    return JSON.stringify(thisData) === JSON.stringify(otherData);
  }

  private _getSortedData(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const key of this.keys) {
      result[key] = this.data[key];
    }
    return result;
  }

  __ne__(other: unknown): boolean {
    return !this.__eq__(other);
  }

  equals(other: unknown): boolean {
    return this.__eq__(other);
  }

  __le__(other: unknown): number {
    return this._compare_to(other, (x, y) => x <= y) ? 1 : 0;
  }

  __lt__(other: unknown): number {
    return this._compare_to(other, (x, y) => x < y) ? 1 : 0;
  }

  __ge__(other: unknown): number {
    return this._compare_to(other, (x, y) => x >= y) ? 1 : 0;
  }

  __gt__(other: unknown): number {
    return this._compare_to(other, (x, y) => x > y) ? 1 : 0;
  }

  hash(): number {
    return hash(JSON.stringify(this.keys) + JSON.stringify(this.data));
  }

  toString(): string {
    const parts: string[] = [];
    let lastCoeff = '';
    
    for (const key of this.keys) {
      if (key === _CONST_COEF) {
        lastCoeff = ' + ' + String(this.data[key]);
      } else if (this.data[key] === 1) {
        parts.push(key);
      } else {
        parts.push(`${this.data[key]}*${key}`);
      }
    }
    return parts.join(' + ') + lastCoeff;
  }

  private _compare_to(other: unknown, operation: (x: number | string, y: number | string) => boolean): number {
    if (!(other instanceof StringVal)) {
      return operation(Infinity, (other as number)) ? 1 : 0;
    }

    let i = 0;
    while (true) {
      if (i >= this.keys.length || i >= (other as StringVal).keys.length) {
        return operation(this.keys.length, (other as StringVal).keys.length) ? 1 : 0;
      }
      if (this.keys[i] !== (other as StringVal).keys[i]) {
        return operation(this.keys[i], (other as StringVal).keys[i]) ? 1 : 0;
      }
      if (this.data[this.keys[i]] !== (other as StringVal).data[(other as StringVal).keys[i]]) {
        return operation(this.data[this.keys[i]], (other as StringVal).data[(other as StringVal).keys[i]]) ? 1 : 0;
      }
      i++;
    }
  }
}

export class StringSeq {
  _strSeqData: StringVal[] = [];
  _seq: number[] = [];

  constructor(source: T_ift[]) {
    const processed: StringVal[] = [];
    for (const x of source) {
      if (typeof x === 'string') {
        processed.push(StringVal.from_str(x));
      } else if (x instanceof StringVal) {
        processed.push(x);
      } else if (typeof x === 'number') {
        processed.push(StringVal.from_const(x));
      }
    }
    this._strSeqData = processed;
    this._seq = [];
  }

  sum(): number {
    let total = 0;
    for (const sv of this._strSeqData) {
      // For StringVal, just return 0 as a placeholder
    }
    return total;
  }

  __len__(): number {
    return this._strSeqData.length;
  }

  equals(other: unknown): boolean {
    if (!(other instanceof StringSeq)) return false;
    if (this._strSeqData.length !== (other as StringSeq)._strSeqData.length) return false;
    for (let i = 0; i < this._strSeqData.length; i++) {
      if (!this._strSeqData[i].equals((other as StringSeq)._strSeqData[i])) return false;
    }
    return true;
  }

  [Symbol.iterator](): Iterator<T_ift> {
    return this._strSeqData[Symbol.iterator]();
  }
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  }
  return h;
}