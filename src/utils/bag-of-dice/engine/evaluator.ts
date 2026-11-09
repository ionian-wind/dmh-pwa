import type {
  AstNode,
  DicePlugin,
  EngineOptions,
  EvalContext,
  EvalResult,
  ResolvedLimits,
  Rng,
  RollSegment,
} from './contracts';
import { RollFailure, toRollErrors } from './errors';
import { resolveLimits } from './limits';
import { parseExpression } from './parser';
import { createPluginRegistry, type PluginRegistry } from './plugin-registry';
import { numberValue } from './plugins/arithmetic';

export interface EvaluationSettings {
  rng: Rng;
  options: EngineOptions;
  plugins: readonly DicePlugin[];
  limits?: ResolvedLimits;
  signal?: AbortSignal;
  warnings?: EvalContext['warnings'];
  /** Shared per-call cache (table preloads, lookup memoization). */
  cache?: Map<string, unknown>;
  /** Prefix for group ids so inline evaluations cannot collide. */
  groupIdPrefix?: string;
}

export interface EvaluationOutput {
  total: number;
  rawTotal: number;
  result: EvalResult;
  context: EvalContext;
  registry: PluginRegistry;
}

/**
 * Evaluate a parsed AST with the plugin registry. Evaluation is pure with
 * respect to the AST; all side effects go into the returned records and the
 * shared per-call context.
 */
export function evaluateAst(
  ast: AstNode,
  settings: EvaluationSettings,
): EvaluationOutput {
  const registry = createPluginRegistry(settings.plugins);
  const limits = settings.limits ?? resolveLimits(settings.options);
  let group = 0;

  const context: EvalContext = {
    rng: settings.rng,
    cache: settings.cache ?? new Map(),
    limits,
    warnings: settings.warnings ?? [],
    ...(settings.signal ? { signal: settings.signal } : {}),
    options: settings.options,
    ...(settings.groupIdPrefix
      ? { groupIdPrefix: settings.groupIdPrefix }
      : {}),
    nextGroupId() {
      group += 1;
      return `${settings.groupIdPrefix ?? ''}g${group}`;
    },
    evaluate: () => {
      throw new Error('evaluate() called before initialization');
    },
  };

  const evaluate = (node: AstNode): EvalResult => {
    try {
      return registry.evaluate(node, context);
    } catch (error) {
      if (error instanceof RollFailure) throw error;
      throw new RollFailure(
        toRollErrors(error, {
          pass: 'evaluate',
          plugin: node.plugin,
          span: node.span,
        }),
      );
    }
  };
  context.evaluate = evaluate;
  context.evaluateText = (text: string) => {
    const parsed = parseExpression(text, {
      vocabulary: registry.vocabulary,
      maxRecovery: limits.maxParserRecovery,
    });
    if (parsed.errors.length > 0 || !parsed.ast) {
      throw toRollErrors(parsed.errors[0] ?? new Error('empty expression'), {
        pass: 'evaluate',
        plugin: 'nested',
      });
    }
    return evaluate(parsed.ast);
  };

  let result: EvalResult;
  try {
    result = evaluate(ast);
  } catch (error) {
    if (error instanceof RollFailure) throw error;
    throw new RollFailure(
      toRollErrors(error, {
        pass: 'evaluate',
        plugin: ast.plugin,
        span: ast.span,
      }),
    );
  }

  const total = numberValue(result.value);
  const rawTotal = computeRawTotal(result);
  return { total, rawTotal, result, context, registry };
}

function computeRawTotal(result: EvalResult): number {
  const groups = result.groups ?? [];
  if (groups.length === 0) return numberValue(result.value);
  return groups
    .filter((group) => group.kind !== 'group')
    .reduce((total, group) => total + (group.rawTotal ?? group.total), 0);
}

export function collectSegments(result: EvalResult): RollSegment[] {
  return result.segments ?? [];
}
