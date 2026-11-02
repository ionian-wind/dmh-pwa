import type { Program } from './ast';
import { Die } from './die';
import { Evaluator } from './evaluator';
import { parseCst } from './parser';
import { Seq } from './seq';
import { buildProgram } from './toAst';
import type { CalculationResult, Outcome, OutputResult } from './types';

export { DiceSyntaxError } from './errors';
export { Die, Seq, Evaluator };
export type {
  CallItem,
  Expression,
  FunctionStatement,
  Program,
  SignaturePart,
  Statement,
} from './ast';
export type {
  CalculationResult,
  Outcome,
  OutputResult,
  Settings,
} from './types';

/** Parse an AnyDice-style script into an AST. */
export function parse(script: string): Program {
  return buildProgram(parseCst(script));
}

/** Parse and evaluate a script, returning all `output` results. */
export function calculate(script: string): CalculationResult {
  return new Evaluator().calculate(parse(script));
}

/** Alias kept for readability in integrations. */
export const evaluate = calculate;

export { Die as ProbabilityDie, Seq as ProbabilitySequence };
