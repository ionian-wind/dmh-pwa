export type T_if = number;
export type T_ifs = T_if | Iterable<T_ifs>;
export type T_ifsr = T_ifs | MetaRV;

export type T_N = number;
export type T_S = Seq;
export type T_D = RV;

export interface MetaRV {
  vals: number[];
  probs: number[];
  _str_LHS_RHS: [T_if, T_if | string];

  _get_expanded_possible_rolls(): [Iterable<Seq>[], number[]];

  __neg__(): MetaRV;
  __lt__(other: T_ifsr): MetaRV;
  __le__(other: T_ifsr): MetaRV;
  __gt__(other: T_ifsr): MetaRV;
  __ge__(other: T_ifsr): MetaRV;

  __rmatmul__(other: T_ifs): unknown;

  set_source(roll: number, die: MetaRV): void;
}

export interface MetaSeq {
  _seq: number[];

  sum(): number;
  __len__(): number;
  __getitem__(i: number): T_if;
}

export interface MetaStr {
  is_number(): boolean;
}
