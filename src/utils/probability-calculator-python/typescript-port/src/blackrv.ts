import { MetaRV, T_ifs, T_ifsr } from './typings';

export class BlankRV implements MetaRV {
  vals: number[] = [];
  probs: number[] = [];
  _str_LHS_RHS: [number, number | string] = [0, '{}'];
  _special_null = false;

  constructor(_special_null = false) {
    // Empty constructor
  }

  mean(): number {
    return 0;
  }

  std(): number {
    return 0;
  }

  output(...args: unknown[]): unknown {
    return null;
  }

  __matmul__(other: T_ifs): unknown {
    return null;
  }

  __rmatmul__(other: unknown): unknown {
    return null;
  }

  __add__(other: T_ifsr): unknown {
    return null;
  }

  __radd__(other: T_ifsr): unknown {
    return null;
  }

  __sub__(other: T_ifsr): unknown {
    return null;
  }

  __rsub__(other: T_ifsr): unknown {
    return null;
  }

  __mul__(other: T_ifsr): unknown {
    return null;
  }

  __rmul__(other: T_ifsr): unknown {
    return null;
  }

  __floordiv__(other: T_ifsr): unknown {
    return null;
  }

  __rfloordiv__(other: T_ifsr): unknown {
    return null;
  }

  __truediv__(other: T_ifsr): unknown {
    return null;
  }

  __rtruediv__(other: T_ifsr): unknown {
    return null;
  }

  __pow__(other: T_ifsr): unknown {
    return null;
  }

  __rpow__(other: T_ifsr): unknown {
    return null;
  }

  __mod__(other: T_ifsr): unknown {
    return null;
  }

  __rmod__(other: T_ifsr): unknown {
    return null;
  }

  // comparison operators
  __eq__(other: T_ifsr): unknown {
    return null;
  }

  __ne__(other: T_ifsr): unknown {
    return null;
  }

  __lt__(other: T_ifsr): unknown {
    return null;
  }

  __le__(other: T_ifsr): unknown {
    return null;
  }

  __gt__(other: T_ifsr): unknown {
    return null;
  }

  __ge__(other: T_ifsr): unknown {
    return null;
  }

  // boolean operators
  __or__(other: T_ifsr): unknown {
    return null;
  }

  __ror__(other: T_ifsr): unknown {
    return null;
  }

  __and__(other: T_ifsr): unknown {
    return null;
  }

  __rand__(other: T_ifsr): unknown {
    return null;
  }

  __bool__(): boolean {
    return false;
  }

  __len__(): number {
    return 0;
  }

  __pos__(): BlankRV {
    return this;
  }

  __neg__(): BlankRV {
    return this;
  }

  __invert__(): unknown {
    return null;
  }

  __abs__(): BlankRV {
    return this;
  }

  __round__(n?: number): BlankRV {
    return this;
  }

  __floor__(): BlankRV {
    return this;
  }

  __ceil__(): BlankRV {
    return this;
  }

  __trunc__(): BlankRV {
    return this;
  }

  __str__(): string {
    return '';
  }

  __repr__(): string {
    return '';
  }

  _get_expanded_possible_rolls(): [unknown[], unknown[]] {
    return [[], []];
  }

  set_source(roll: number, die: unknown): void {
    // Empty
  }
}