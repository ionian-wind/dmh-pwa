import { T_if, T_ifsr, T_ifs, MetaRV, MetaSeq } from './typings';
import { Seq } from './seq';
import { RV } from './randvar';
import { BlankRV } from './blackrv';
import { flatten } from './utils';
import { StringVal, StringSeq } from './string_rvs';

export type T_ifsrt_single = T_ifsr | string;
export type T_ifsrt = T_ifsrt_single | Iterable<T_ifsrt>;

export function get_seq(...source: T_ifsrt[]): Seq | StringSeq {
  const flat = [...flatten(source)];
  const flatRvs = flat.filter(x => is_rv(x));
  const flatRvVals: number[] = [];
  for (const rv of flatRvs) {
    flatRvVals.push(...(rv as unknown as RV).vals);
  }
  const flatElse: T_if[] = [];
  let hasStrings = false;
  for (const x of flat) {
    if (!is_rv(x) && !(x instanceof BlankRV)) {
      if (typeof x === 'string') {
        hasStrings = true;
      }
      flatElse.push(x as T_if);
    }
  }
  
  if (hasStrings) {
    return new StringSeq([...flatElse, ...flatRvVals] as any);
  }
  
  const res = flatElse.concat(flatRvVals);
  return new Seq(...res);
}

export function get_rv(source: T_ifsr): RV {
  if (typeof source === 'number' || typeof source === 'boolean') {
    return RV.from_const(source);
  }
  if (source && typeof source === 'object' && Symbol.iterator in source) {
    return RV.from_seq(source as Iterable<T_ifs>);
  }
  if (source instanceof RV) {
    return source;
  }
  throw new Error(`source must be a RV ${source}`);
}

export function merge_rvs(
  rvs: Iterable<T_ifsr | null>,
  weights?: Iterable<number> | null
): MetaRV {
  return RV.from_rvs(rvs, weights);
}

export function is_blank_rv(rv: unknown): boolean {
  return rv instanceof BlankRV;
}

export function is_rv(rv: unknown): boolean {
  return rv instanceof RV;
}
