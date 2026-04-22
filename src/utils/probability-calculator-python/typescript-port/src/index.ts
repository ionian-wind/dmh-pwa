export const __version__ = '0.3.5';

export { RV } from './randvar';
export { Seq } from './seq';
export { get_seq } from './factory';
export { roll, roller, myrange } from './roller';
export { settings_set, settings_reset } from './settings';
export { SETTINGS, DEFAULT_SETTINGS } from './settings';
export { output } from './output';
export { BlankRV } from './blackrv';

export { anydice_casting, anydice_type_casting, anydiceTyped, max_func_depth } from './decorators';

export type { T_N, T_S, T_D, T_if, T_ifs, T_ifsr } from './typings';
export type { Settings } from './settings';

export { StringSeq, StringVal } from './string_rvs';

export { absolute as absolute_X, X_contains_X, count_X_in_X, explode_X, highest_X_of_X } from './funclib';
export { lowest_X_of_X, middle_X_of_X, highest_of_X_and_X, lowest_of_X_and_X } from './funclib';
export { maximum_of_X, reverse_X, sort_X } from './funclib';

export { myMatmul, myLen, myInvert, myAnd, myOr } from './utils';

export { D } from './altcast';