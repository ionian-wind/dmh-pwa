import type {
  AstNode,
  DicePlugin,
  EngineOptions,
  EngineOutcome,
  ExtractionResult,
  ResolvedLimits,
  Rng,
  RollEngine,
  RollResult,
  RollWarning,
  TableDefinition,
} from './contracts';
import { RollFailure, rollError, toRollErrors } from './errors';
import { evaluateAst } from './evaluator';
import { expandRollText } from './expansion';
import { processInlineRolls } from './inline';
import { resolveLimits } from './limits';
import { parseExpression } from './parser';
import { createPluginRegistry } from './plugin-registry';
import { createArithmeticPlugin } from './plugins/arithmetic';
import { createDicePlugin } from './plugins/dice';
import {
  createTablePlugin,
  tableCacheKey,
  tableMissingKey,
} from './plugins/table';
import { extractQueries, resolveQueries } from './queries';
import { captureRngState, cryptoRng, finishRngState } from './rng';
import { createEmptyRepositories } from './repositories';

export interface EngineConfig {
  plugins?: DicePlugin[];
}

export function defaultPlugins(): DicePlugin[] {
  return [createArithmeticPlugin(), createDicePlugin(), createTablePlugin()];
}

export function createRollEngine(config: EngineConfig = {}): RollEngine {
  const plugins = config.plugins ?? defaultPlugins();
  // Build eagerly so token/collision errors fail at construction time.
  createPluginRegistry(plugins);

  const extract = async (
    input: string,
    options: EngineOptions,
  ): Promise<ExtractionResult> => {
    const limits = resolveLimits(options);
    try {
      const repositories = options.repositories ?? createEmptyRepositories();
      const expansion = await expandRollText(input, {
        repositories,
        cache: new Map(),
        ...(options.macroSource ? { macroSource: options.macroSource } : {}),
        limits,
        ...(options.signal ? { signal: options.signal } : {}),
        options,
      });
      const expanded = options.expanded ?? expansion.text;
      const queries = extractQueries(expanded, limits);
      return {
        expanded,
        queries: queries.queries,
        passes: expansion.passes,
        warnings: [...expansion.warnings, ...queries.warnings],
        errors: [],
      };
    } catch (error) {
      return {
        expanded: options.expanded ?? input,
        queries: [],
        passes: [],
        warnings: [],
        errors: toRollErrors(error, { pass: 'extract' }),
      };
    }
  };

  const roll = async (
    input: string,
    options: EngineOptions,
  ): Promise<EngineOutcome> => {
    const startedAt = Date.now();
    const limits = resolveLimits(options);
    const repositories = options.repositories ?? createEmptyRepositories();
    const rng = options.rng ?? cryptoRng();
    const replayBefore = captureRngState(rng);
    const warnings: RollWarning[] = [];
    const passes: RollResult['process']['passes'] = [];

    try {
      checkAbort(options.signal);
      const expansionCache = new Map<string, unknown>();
      const expansion = await expandRollText(input, {
        repositories,
        cache: expansionCache,
        ...(options.macroSource ? { macroSource: options.macroSource } : {}),
        limits,
        ...(options.signal ? { signal: options.signal } : {}),
        options,
      });
      passes.push(...expansion.passes);
      warnings.push(...expansion.warnings);

      const expanded = options.expanded ?? expansion.text;
      const extraction = extractQueries(expanded, limits);
      warnings.push(...extraction.warnings);
      const resolved = resolveQueries(
        expanded,
        extraction,
        options.queryAnswers ?? {},
        limits,
      );
      warnings.push(...resolved.warnings);

      if (resolved.needsInput) {
        return {
          status: 'needs-input',
          extraction: {
            expanded,
            queries: extraction.queries,
            passes: expansion.passes,
            warnings,
            errors: [],
          },
        };
      }

      passes.push({
        name: 'queries',
        input: expanded,
        output: resolved.text,
        warnings: resolved.warnings,
      });

      let inlineIndex = 0;
      const inline = await processInlineRolls(resolved.text, {
        limits,
        ...(options.signal ? { signal: options.signal } : {}),
        evaluate: async (source) => {
          const evaluated = evaluateTextSync(source, {
            options,
            limits,
            rng,
            plugins,
            groupIdPrefix: `i${inlineIndex}-`,
          });
          inlineIndex += 1;
          return {
            value: evaluated.value,
            ...(evaluated.groups ? { groups: evaluated.groups } : {}),
            ...(evaluated.segments ? { segments: evaluated.segments } : {}),
            ...(evaluated.arithmetic
              ? { arithmetic: evaluated.arithmetic }
              : {}),
            warnings: evaluated.warnings,
          };
        },
      });
      warnings.push(...inline.warnings);
      passes.push(...inline.passes);

      const result = await finishRoll({
        raw: input,
        expanded,
        inlineText: inline.text,
        options,
        limits,
        rng,
        plugins,
        startedAt,
        replayBefore,
        warnings,
        passes,
        expansionRecords: expansion.records,
        queryAnswers: resolved.answers,
        inlineRecords: inline.records,
      });
      return { status: 'complete', result };
    } catch (error) {
      return { status: 'error', errors: toRollErrors(error, { pass: 'roll' }) };
    }
  };

  return { extract, roll };
}

interface FinishSettings {
  raw: string;
  expanded: string;
  inlineText: string;
  options: EngineOptions;
  limits: ResolvedLimits;
  rng: Rng;
  plugins: DicePlugin[];
  startedAt: number;
  replayBefore: ReturnType<typeof captureRngState>;
  warnings: RollWarning[];
  passes: RollResult['process']['passes'];
  expansionRecords: RollResult['process']['expansions'];
  queryAnswers: RollResult['process']['queries'];
  inlineRecords: RollResult['process']['inlineRolls'];
}

async function finishRoll(settings: FinishSettings): Promise<RollResult> {
  const parsed = parseExpression(settings.inlineText, {
    plugins: settings.plugins,
    maxRecovery: settings.limits.maxParserRecovery,
    allowTrailingText: settings.options.allowTrailingText ?? true,
  });
  if (parsed.errors.length > 0 || !parsed.ast) {
    throw new RollFailure(
      parsed.errors[0] ??
        rollError('PARSE_EMPTY', 'empty roll', { pass: 'parse' }),
    );
  }

  const tableCache = new Map<string, unknown>();
  if (settings.raw.includes('&{noerror}')) {
    tableCache.set('noerror', true);
  }
  await preloadTables(
    parsed.ast,
    settings.options.repositories?.tables,
    tableCache,
    settings.limits,
    settings.plugins,
    0,
    [],
  );

  const evaluation = evaluateAst(parsed.ast, {
    rng: settings.rng,
    options: settings.options,
    plugins: settings.plugins,
    limits: settings.limits,
    cache: tableCache,
    ...(settings.options.signal ? { signal: settings.options.signal } : {}),
    warnings: settings.warnings,
  });

  settings.passes.push({
    name: 'parse',
    input: settings.inlineText,
    output: parsed.ast.type,
    warnings: [],
  });
  const trailingSegments: RollResult['breakdown']['segments'] =
    parsed.trailingText ? [{ kind: 'text', text: parsed.trailingText }] : [];
  settings.passes.push({
    name: 'evaluate',
    input: settings.inlineText,
    output: String(evaluation.total),
    warnings: [],
  });

  if (Date.now() - settings.startedAt > settings.limits.maxPassTimeMs) {
    throw new RollFailure(
      rollError('LIMIT_TIME', 'roll exceeded the pass time limit', {
        pass: 'evaluate',
        params: { limit: settings.limits.maxPassTimeMs },
      }),
    );
  }

  const inlineGroups = settings.inlineRecords.flatMap(
    (record) => record.groups ?? [],
  );
  const inlineSegments = settings.inlineRecords.flatMap(
    (record) => record.segments ?? [],
  );
  const inlineArithmetic = settings.inlineRecords.flatMap(
    (record) => record.arithmetic ?? [],
  );

  const replay = finishRngState(settings.rng, settings.replayBefore);
  return {
    schemaVersion: 1,
    total: evaluation.total,
    breakdown: {
      segments: [
        ...inlineSegments,
        ...(evaluation.result.segments ?? []),
        ...trailingSegments,
      ],
      groups: [...inlineGroups, ...(evaluation.result.groups ?? [])],
      rawTotal: evaluation.rawTotal,
      finalTotal: evaluation.total,
    },
    process: {
      raw: settings.raw,
      expanded: settings.expanded,
      passes: settings.passes,
      expansions: settings.expansionRecords,
      queries: settings.queryAnswers,
      inlineRolls: settings.inlineRecords,
      arithmetic: [
        ...inlineArithmetic,
        ...(evaluation.result.arithmetic ?? []),
      ],
      tables: evaluation.result.tables ?? [],
    },
    warnings: settings.warnings,
    ...(replay.rngStateBefore !== undefined ||
    replay.rngStateAfter !== undefined
      ? { replay }
      : {}),
  };
}

/** Parse and evaluate a nested expression synchronously, sharing the RNG. */
function evaluateTextSync(
  source: string,
  settings: {
    options: EngineOptions;
    limits: ResolvedLimits;
    rng: Rng;
    plugins: DicePlugin[];
    groupIdPrefix?: string;
  },
): import('./contracts').EvalResult {
  const parsed = parseExpression(source, {
    plugins: settings.plugins,
    maxRecovery: settings.limits.maxParserRecovery,
    allowTrailingText: false,
  });
  if (parsed.errors.length > 0 || !parsed.ast) {
    throw new RollFailure(
      parsed.errors[0] ??
        rollError('PARSE_EMPTY', 'empty inline roll', { pass: 'inline' }),
    );
  }
  const output = evaluateAst(parsed.ast, {
    rng: settings.rng,
    options: settings.options,
    plugins: settings.plugins,
    limits: settings.limits,
    ...(settings.groupIdPrefix
      ? { groupIdPrefix: settings.groupIdPrefix }
      : {}),
  });
  return output.result;
}

async function preloadTables(
  ast: AstNode,
  repository: EngineOptions['repositories']['tables'],
  cache: Map<string, unknown>,
  limits: ResolvedLimits,
  plugins: DicePlugin[],
  depth: number,
  stack: string[],
): Promise<void> {
  const visit = async (node: AstNode): Promise<void> => {
    if (node.type === 'TableRoll') {
      const table = node as unknown as { table: string };
      await loadTable(
        table.table,
        repository,
        cache,
        limits,
        plugins,
        depth,
        stack,
      );
    }
    const record = node as unknown as Record<string, unknown>;
    for (const key of ['left', 'right', 'operand', 'count', 'sides']) {
      const child = record[key];
      if (child && typeof child === 'object') {
        await visit(child as AstNode);
      }
    }
    for (const key of ['args', 'rolls', 'modifiers']) {
      const children = record[key];
      if (Array.isArray(children)) {
        for (const child of children) {
          await visit(child as AstNode);
        }
      }
    }
  };
  await visit(ast);
}

async function loadTable(
  name: string,
  repository: EngineOptions['repositories']['tables'],
  cache: Map<string, unknown>,
  limits: ResolvedLimits,
  plugins: DicePlugin[],
  depth: number,
  stack: string[],
): Promise<void> {
  const normalized = name.trim().toLowerCase();
  if (stack.includes(normalized)) {
    throw new RollFailure(
      rollError('TABLE_CYCLE', `table cycle at "${name}"`, {
        pass: 'tables',
        plugin: 'table',
        params: { table: name },
      }),
    );
  }
  if (depth > limits.maxTableDepth) {
    throw new RollFailure(
      rollError(
        'TABLE_DEPTH',
        `table recursion exceeded ${limits.maxTableDepth}`,
        {
          pass: 'tables',
          plugin: 'table',
          params: { limit: limits.maxTableDepth },
        },
      ),
    );
  }
  if (cache.has(tableCacheKey(name))) return;
  if (!repository) {
    cache.set(tableMissingKey(name), true);
    return;
  }

  let definition: TableDefinition | undefined;
  try {
    definition = await repository.get(name);
  } catch (error) {
    throw new RollFailure(
      rollError('TABLE_MISSING', `failed to load table "${name}"`, {
        pass: 'tables',
        plugin: 'table',
        params: { table: name },
        cause: error,
      }),
    );
  }
  if (!definition) {
    cache.set(tableMissingKey(name), true);
    return;
  }
  cache.set(tableCacheKey(name), definition);

  const nextStack = [...stack, normalized];
  for (const entry of definition.entries) {
    // Preload table references that appear literally in entry text.
    const pattern = /(\d*)t\[([^\]]+)\]/gi;
    for (const match of entry.value.matchAll(pattern)) {
      await loadTable(
        match[2],
        repository,
        cache,
        limits,
        plugins,
        depth + 1,
        nextStack,
      );
    }
    if (entry.inlineRoll) {
      const parsed = parseExpression(entry.inlineRoll, {
        plugins,
        maxRecovery: limits.maxParserRecovery,
        allowTrailingText: false,
      });
      if (parsed.ast) {
        await preloadTables(
          parsed.ast,
          repository,
          cache,
          limits,
          plugins,
          depth + 1,
          nextStack,
        );
      }
    }
  }
}

function checkAbort(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    throw new RollFailure(
      rollError('CANCELLED', 'roll was cancelled', { pass: 'roll' }),
    );
  }
}
