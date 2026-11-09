import type {
  AbilityRepository,
  AttributeRepository,
  EngineOptions,
  ExpansionRecord,
  MacroDefinition,
  MacroRepository,
  PassRecord,
  Repositories,
  ResolvedLimits,
  RollWarning,
} from './contracts';
import { fail, rollWarning } from './errors';
import { resolveLimits } from './limits';

export interface ExpansionSettings {
  repositories: Repositories;
  macroSource?: MacroRepository | MacroRepository[];
  limits?: ResolvedLimits;
  signal?: AbortSignal;
  options?: EngineOptions;
  /** Per-call memo cache shared across expansion passes. */
  cache?: Map<string, unknown>;
}

export interface ExpansionOutput {
  text: string;
  records: ExpansionRecord[];
  warnings: RollWarning[];
  passes: PassRecord[];
}

interface Match {
  kind: 'macro' | 'ability' | 'attribute';
  start: number;
  end: number;
  name: string;
  character?: string;
  attribute?: string;
  max?: boolean;
  rowIndex?: number;
  rowId?: string;
  raw: string;
}

const MACRO_PATTERN = /#([A-Za-z0-9_-]+)/g;
const BRACED_PATTERN = /([%@])\{([^{}]*)\}/g;

/**
 * Expand macros, abilities and attributes through async repositories.
 * Expansion is recursive: a resolved macro may itself contain calls. Cycles are
 * detected on the resolution stack and fail with EXPANSION_CYCLE.
 */
export async function expandRollText(
  input: string,
  settings: ExpansionSettings,
): Promise<ExpansionOutput> {
  const limits = settings.limits ?? resolveLimits(settings.options);
  const warnings: RollWarning[] = [];
  const records: ExpansionRecord[] = [];
  const cache = settings.cache ?? new Map<string, unknown>();
  let text = input;
  let noError = false;

  if (text.includes('&{noerror}')) {
    noError = true;
    text = text.replaceAll('&{noerror}', '');
  }

  const expand = async (
    value: string,
    depth: number,
    stack: string[],
  ): Promise<string> => {
    if (depth > limits.maxExpansionDepth) {
      fail(
        'EXPANSION_DEPTH',
        `expansion exceeded ${limits.maxExpansionDepth} levels`,
        { pass: 'expand', params: { limit: limits.maxExpansionDepth } },
      );
    }
    checkAbort(settings.signal);
    let result = value;
    for (;;) {
      const match = findNext(result);
      if (!match) break;

      const key = expansionKey(match);
      if (stack.includes(key)) {
        fail('EXPANSION_CYCLE', `expansion cycle at ${key}`, {
          pass: 'expand',
          span: { start: match.start, end: match.end },
          params: { key },
        });
      }

      const resolved = await resolveMatch(
        match,
        settings.repositories,
        settings.macroSource,
        warnings,
        noError,
        cache,
      );

      const expandedValue = await expand(resolved.value, depth + 1, [
        ...stack,
        key,
      ]);
      records.push({
        kind: match.kind,
        source: resolved.source,
        name: match.name,
        value: expandedValue,
        depth,
        span: { start: match.start, end: match.end },
      });

      result =
        result.slice(0, match.start) + expandedValue + result.slice(match.end);
      if (result.length > limits.maxOutputLength) {
        fail('LIMIT_OUTPUT', 'expanded roll text is too large', {
          pass: 'expand',
          params: { limit: limits.maxOutputLength },
        });
      }
    }
    return result;
  };

  text = await expand(text, 1, []);
  warnings.push(...checkOutput(text, limits));

  return {
    text,
    records,
    warnings,
    passes: [
      {
        name: 'expand',
        input,
        output: text,
        warnings: [...warnings],
      },
    ],
  };
}

interface ResolvedMatch {
  value: string;
  source: string;
}

async function resolveMatch(
  match: Match,
  repositories: Repositories,
  macroSource: MacroRepository | MacroRepository[] | undefined,
  warnings: RollWarning[],
  noError: boolean,
  cache: Map<string, unknown>,
): Promise<ResolvedMatch> {
  const cacheKey = `${match.kind}:${(match.character ?? '').toLowerCase()}:${(match.attribute ?? match.name).toLowerCase()}:${
    match.max ? 'max' : ''
  }:${match.rowIndex ?? ''}:${match.rowId ?? ''}`;
  const cached = cache.get(cacheKey) as ResolvedMatch | undefined;
  if (cached) return cached;
  let value: string | undefined;
  let source: string = match.kind;

  if (match.kind === 'macro') {
    const resolved = await resolveMacro(match.name, repositories, macroSource);
    value = resolved?.definition.command;
    source = resolved?.definition.source ?? 'macro';
    if (resolved?.shadowed.length) {
      for (const shadow of resolved.shadowed) {
        warnings.push(
          rollWarning('macro-shadowed', `macro "${match.name}" is shadowed`, {
            pass: 'expand',
            span: { start: match.start, end: match.end },
            params: { shadow, winner: source },
          }),
        );
      }
    }
  } else if (match.kind === 'ability') {
    const definition = await repositories.abilities.get(
      match.character ?? 'selected',
      match.name,
    );
    value = definition?.command;
    source = definition?.character ?? match.character ?? 'ability';
  } else {
    const attribute = await repositories.attributes.get(
      match.character ?? 'selected',
      match.attribute ?? match.name,
      {
        ...(match.max ? { max: true } : {}),
        ...(match.rowIndex !== undefined ? { rowIndex: match.rowIndex } : {}),
        ...(match.rowId ? { rowId: match.rowId } : {}),
      },
    );
    if (attribute) {
      const selected =
        match.max && attribute.max !== undefined
          ? attribute.max
          : attribute.value;
      value = selected === undefined ? undefined : String(selected);
    }
    source = match.character ?? 'selected';
  }

  if (value === undefined) {
    if (noError) {
      warnings.push(
        rollWarning('MISSING_DATA', `missing ${match.kind} "${match.name}"`, {
          pass: 'expand',
          span: { start: match.start, end: match.end },
          params: { kind: match.kind, name: match.name },
        }),
      );
      const missing = { value: '', source };
      cache.set(cacheKey, missing);
      return missing;
    }
    fail('MISSING_DATA', `missing ${match.kind} "${match.name}"`, {
      pass: 'expand',
      span: { start: match.start, end: match.end },
      params: { kind: match.kind, name: match.name },
    });
  }

  const resolved = { value, source };
  cache.set(cacheKey, resolved);
  return resolved;
}

async function resolveMacro(
  name: string,
  repositories: Repositories,
  macroSource: MacroRepository | MacroRepository[] | undefined,
): Promise<{ definition: MacroDefinition; shadowed: string[] } | undefined> {
  const sources = macroSource
    ? Array.isArray(macroSource)
      ? macroSource
      : [macroSource]
    : [repositories.macros];
  const hits: MacroDefinition[] = [];
  for (const repository of sources) {
    const definition = await repository.get(name);
    if (definition) hits.push(definition);
  }
  if (hits.length === 0) return undefined;
  const winner = hits[0];
  return {
    definition: winner,
    shadowed: hits.slice(1).map((hit) => hit.source),
  };
}

function findNext(text: string): Match | undefined {
  const matches: Match[] = [];

  MACRO_PATTERN.lastIndex = 0;
  for (
    let match = MACRO_PATTERN.exec(text);
    match;
    match = MACRO_PATTERN.exec(text)
  ) {
    // `#name` inside a longer word is not a macro call.
    if (match.index > 0 && /[A-Za-z0-9_-]/.test(text[match.index - 1]))
      continue;
    matches.push({
      kind: 'macro',
      start: match.index,
      end: match.index + match[0].length,
      name: match[1],
      raw: match[0],
    });
  }

  BRACED_PATTERN.lastIndex = 0;
  for (
    let match = BRACED_PATTERN.exec(text);
    match;
    match = BRACED_PATTERN.exec(text)
  ) {
    const marker = match[1];
    const body = match[2];
    const parts = body.split('|').map((part) => part.trim());
    if (marker === '%') {
      matches.push({
        kind: 'ability',
        start: match.index,
        end: match.index + match[0].length,
        name: parts[1] ?? parts[0],
        character: parts[0],
        raw: match[0],
      });
    } else {
      const attribute = parts[1] ?? parts[0];
      const extra = parts.slice(2);
      const max = extra.includes('max');
      const embeddedRow = attribute.match(/\$(\d+)(?:_|$)/);
      const rowIndex =
        extra
          .map((part) => Number(part))
          .find((value) => Number.isInteger(value)) ??
        (embeddedRow ? Number(embeddedRow[1]) : undefined);
      const rowId = extra.find((part) => part !== 'max' && !/^\d+$/.test(part));
      matches.push({
        kind: 'attribute',
        start: match.index,
        end: match.index + match[0].length,
        name: attribute,
        character: parts[0],
        attribute,
        ...(max ? { max: true } : {}),
        ...(rowIndex !== undefined ? { rowIndex } : {}),
        ...(rowId ? { rowId } : {}),
        raw: match[0],
      });
    }
  }

  matches.sort((left, right) => left.start - right.start);
  return matches[0];
}

function expansionKey(match: Match): string {
  return `${match.kind}:${match.character ?? ''}:${(match.attribute ?? match.name).toLowerCase()}`;
}

function checkAbort(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    fail('CANCELLED', 'roll was cancelled', { pass: 'expand' });
  }
}

function checkOutput(text: string, limits: ResolvedLimits): RollWarning[] {
  if (text.length > limits.maxOutputLength) {
    fail('LIMIT_OUTPUT', 'expanded roll text is too large', {
      pass: 'expand',
      params: { limit: limits.maxOutputLength },
    });
  }
  return [];
}
