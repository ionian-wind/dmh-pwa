import 'reflect-metadata';
import { T_ifsr, T_N, T_S, T_D, T_ifs } from './typings';
import { get_seq, get_rv, merge_rvs } from './factory';
import { SETTINGS } from './settings';
import { BlankRV } from './blackrv';
import { Seq } from './seq';
import { RV } from './randvar';

const ANYDICE_PARAM_TYPES = Symbol('anydice:param:types');
const ANYDICE_RETURN_TYPE = Symbol('anydice:return:type');

type ParamType = 'T_N' | 'T_S' | 'T_D';

export function anydiceTyped(
  config: {
    params?: Record<string, ParamType>;
    returns?: ParamType;
  } = {}
) {
  return function <T extends (...args: unknown[]) => unknown>(func: T): T {
    if (config.params) {
      Reflect.defineMetadata(ANYDICE_PARAM_TYPES, config.params, func);
    }
    if (config.returns) {
      Reflect.defineMetadata(ANYDICE_RETURN_TYPE, config.returns, func);
    }
    return func;
  };
}

export function getAnyDiceParamTypes(func: unknown): Record<string, ParamType> | undefined {
  return Reflect.getMetadata(ANYDICE_PARAM_TYPES, func);
}

export function getAnyDiceReturnType(func: unknown): ParamType | undefined {
  return Reflect.getMetadata(ANYDICE_RETURN_TYPE, func);
}

export function anydice_casting() {
  return function <T extends (...args: unknown[]) => unknown>(func: T): T {
    return anydice_type_casting()(func);
  };
}

export function anydice_type_casting(verbose = false) {
  return function <T extends (...args: unknown[]) => unknown>(func: T): T {
    const paramTypes = getAnyDiceParamTypes(func);

    return function(...args: unknown[]): unknown {
      const argsList = [...args];
      const isSeq = (x: unknown): x is Seq => x instanceof Seq;
      const isRV = (x: unknown): x is RV => x instanceof RV;
      const hardParams: { index: number; value: unknown; type: ParamType }[] = [];

      if (paramTypes) {
        for (let i = 0; i < argsList.length; i++) {
          const argVal = argsList[i];
          const paramName = Object.keys(paramTypes)[i];
          const expectedType = paramTypes[paramName];

          if (expectedType === 'T_N') {
            if (isRV(argVal)) {
              hardParams.push({ index: i, value: argVal, type: 'T_N' });
            } else if (isSeq(argVal)) {
              argsList[i] = (argVal as Seq).sum();
            }
          } else if (expectedType === 'T_S') {
            if (isRV(argVal)) {
              hardParams.push({ index: i, value: argVal, type: 'T_S' });
            } else if (typeof argVal === 'number') {
              argsList[i] = new Seq(argVal);
            }
          } else if (expectedType === 'T_D') {
            if (isSeq(argVal)) {
              argsList[i] = RV.from_seq(argVal as Seq);
            } else if (typeof argVal === 'number') {
              argsList[i] = new RV([argVal], [1]);
            }
          }
        }
      } else {
        for (let i = 0; i < argsList.length; i++) {
          const argVal = argsList[i];
          if (isRV(argVal)) {
            hardParams.push({ index: i, value: argVal, type: 'T_N' });
          } else if (isSeq(argVal)) {
            const sum = (argVal as Seq).sum();
            if (typeof sum === 'number') {
              argsList[i] = sum;
            }
          }
        }
      }

      if (hardParams.length === 0) {
        return (func as (...args: unknown[]) => unknown)(...argsList);
      }

      for (const hardParam of hardParams) {
        if (hardParam.type === 'T_S') {
          const rv = hardParam.value as RV;
          const expanded = rv._get_expanded_possible_rolls();
          const seqs = [...expanded[0]];
          const probsArr = [...expanded[1]];

          const resVals: unknown[] = [];
          const resProbs: number[] = [];

          for (let i = 0; i < seqs.length; i++) {
            const rollArgs = [...argsList];
            rollArgs[hardParam.index] = seqs[i];
            const val = (func as (...args: unknown[]) => unknown)(...rollArgs);
            if (isSeq(val)) {
              resVals.push(val as Seq);
            } else if (typeof val === 'number') {
              resVals.push(new Seq(val));
            } else if (val instanceof RV) {
              resVals.push(val);
            } else {
              resVals.push(val);
            }
            resProbs.push(probsArr[i]);
          }

          return merge_rvs(resVals as T_ifs[], resProbs);
        } else {
          const rv = hardParam.value as RV;
          const expanded = rv._get_expanded_possible_rolls();
          const seqs = [...expanded[0]];
          const probsArr = [...expanded[1]];

          const resVals: unknown[] = [];
          const resProbs: number[] = [];

          for (let i = 0; i < seqs.length; i++) {
            const rollArgs = [...argsList];
            const argVal = seqs[i];
            const numVal = (argVal as Seq).sum();
            rollArgs[hardParam.index] = numVal;
            const val = (func as (...args: unknown[]) => unknown)(...rollArgs);
            if (isSeq(val)) {
              resVals.push((val as Seq).sum());
            } else if (typeof val === 'number') {
              resVals.push(val);
            } else {
              resVals.push(val);
            }
            resProbs.push(probsArr[i]);
          }

          return merge_rvs(resVals as T_ifs[], resProbs);
        }
      }

      return (func as (...args: unknown[]) => unknown)(...argsList);
    } as T;
  };
}

export function max_func_depth() {
  return function <T extends (...args: unknown[]) => unknown>(func: T): T {
    return function(...args: unknown[]): unknown {
      if ((SETTINGS as unknown as { 'INTERNAL_CURR_DEPTH': number }).INTERNAL_CURR_DEPTH >= (SETTINGS as unknown as { 'maximum function depth': number })['maximum function depth']) {
        return new BlankRV();
      }
      (SETTINGS as unknown as { 'INTERNAL_CURR_DEPTH': number }).INTERNAL_CURR_DEPTH += 1;
      const result = (func as (...args: unknown[]) => unknown)(...args);
      (SETTINGS as unknown as { 'INTERNAL_CURR_DEPTH': number }).INTERNAL_CURR_DEPTH -= 1;
      return result ?? new BlankRV();
    } as T;
  };
}