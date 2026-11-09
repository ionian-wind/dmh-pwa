import type {
  ArithmeticTrace,
  DiceGroupResult,
  InlineRollRecord,
  PassRecord,
  ResolvedLimits,
  RollSegment,
  RollWarning,
} from './contracts';
import { fail } from './errors';
import { resolveLimits } from './limits';

export interface InlineEvaluation {
  value: number | number[];
  warnings?: RollWarning[];
  groups?: DiceGroupResult[];
  segments?: RollSegment[];
  arithmetic?: ArithmeticTrace[];
}

export interface InlineSettings {
  limits?: ResolvedLimits;
  signal?: AbortSignal;
  evaluate(source: string): Promise<InlineEvaluation>;
}

export interface InlineOutput {
  text: string;
  records: InlineRollRecord[];
  warnings: RollWarning[];
  passes: PassRecord[];
}

interface Span {
  start: number;
  end: number;
}

/**
 * Evaluate inline rolls innermost-first and assign stable indexes. The engine
 * never re-rolls a reference: `$[[n]]` is read from the recorded values.
 */
export async function processInlineRolls(
  input: string,
  settings: InlineSettings,
): Promise<InlineOutput> {
  const limits = settings.limits ?? resolveLimits();
  checkAbort(settings.signal);
  if (inlineDepth(input) > limits.maxInlineDepth) {
    fail(
      'INLINE_DEPTH',
      `inline roll nesting exceeded ${limits.maxInlineDepth} levels`,
      { pass: 'inline', params: { limit: limits.maxInlineDepth } },
    );
  }

  const records: InlineRollRecord[] = [];
  const warnings: RollWarning[] = [];
  let text = input;

  for (;;) {
    const span = innermostInline(text);
    if (!span) break;
    const source = text.slice(span.start + 2, span.end - 2);
    const resolvedSource = replaceReferences(source, records, false);
    if (/\$\[\[\d+/.test(resolvedSource)) {
      fail(
        'MISSING_DATA',
        'inline roll references must point to an earlier inline roll',
        {
          pass: 'inline',
          span: { start: span.start + 2, end: span.end - 2 },
        },
      );
    }
    const evaluated = await settings.evaluate(resolvedSource);
    checkAbort(settings.signal);
    const computed = Array.isArray(evaluated.value)
      ? evaluated.value.reduce((total, value) => total + value, 0)
      : evaluated.value;
    records.push({
      index: records.length,
      source,
      rawResult: evaluated.value,
      computedResult: computed,
      warnings: evaluated.warnings ?? [],
      ...(evaluated.groups ? { groups: evaluated.groups } : {}),
      ...(evaluated.segments ? { segments: evaluated.segments } : {}),
      ...(evaluated.arithmetic ? { arithmetic: evaluated.arithmetic } : {}),
    });
    warnings.push(...(evaluated.warnings ?? []));
    text = text.slice(0, span.start) + String(computed) + text.slice(span.end);
    if (text.length > limits.maxOutputLength) {
      fail('LIMIT_OUTPUT', 'inline roll output is too large', {
        pass: 'inline',
        params: { limit: limits.maxOutputLength },
      });
    }
  }

  text = replaceReferences(text, records, true);
  return {
    text,
    records,
    warnings,
    passes: [
      {
        name: 'inline',
        input,
        output: text,
        warnings: [...warnings],
      },
    ],
  };
}

/** Resolve `$[[n]]` and `$[[n.computed]]` from inline records only. */
export function replaceReferences(
  text: string,
  records: readonly InlineRollRecord[],
  failOnMissing: boolean,
): string {
  return text.replace(
    /\$\[\[(\d+)(?:\.[A-Za-z]+)?\]\]/g,
    (raw, indexText: string) => {
      const index = Number(indexText);
      const record = records[index];
      if (!record) {
        if (!failOnMissing) return raw;
        fail('MISSING_DATA', `missing inline roll reference $[[${index}]]`, {
          pass: 'inline',
          params: { index },
        });
      }
      return record.computedResult !== undefined
        ? String(record.computedResult)
        : String(record.rawResult);
    },
  );
}

function innermostInline(text: string): Span | undefined {
  const spans: Span[] = [];
  for (let index = 0; index < text.length - 1; index += 1) {
    if (text[index] !== '[' || text[index + 1] !== '[') continue;
    if (index > 0 && text[index - 1] === '$') continue;
    const end = findInlineClose(text, index);
    if (end !== -1) spans.push({ start: index, end });
  }
  if (spans.length === 0) return undefined;
  // Greatest start = deepest nested inline roll.
  return spans.reduce((best, span) => (span.start >= best.start ? span : best));
}

function findInlineClose(text: string, openIndex: number): number {
  let index = openIndex + 2;
  while (index < text.length) {
    if (text[index] === '[' && text[index + 1] === '[') {
      const nested = findInlineClose(text, index);
      if (nested === -1) return -1;
      index = nested;
      continue;
    }
    if (text[index] === '[') {
      const labelClose = text.indexOf(']', index + 1);
      if (labelClose === -1) return -1;
      index = labelClose + 1;
      continue;
    }
    if (text[index] === ']' && text[index + 1] === ']') {
      return index + 2;
    }
    index += 1;
  }
  return -1;
}

function inlineDepth(text: string): number {
  let depth = 0;
  let max = 0;
  for (let index = 0; index < text.length - 1; index += 1) {
    if (text[index] === '[' && text[index + 1] === '[') {
      depth += 1;
      max = Math.max(max, depth);
      index += 1;
    } else if (text[index] === ']' && text[index + 1] === ']') {
      depth = Math.max(0, depth - 1);
      index += 1;
    }
  }
  return max;
}

function checkAbort(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    fail('CANCELLED', 'roll was cancelled', { pass: 'inline' });
  }
}
