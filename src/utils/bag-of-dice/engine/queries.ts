import type {
  QueryAnswerRecord,
  QueryAnswers,
  RollQueryRequest,
  RollWarning,
  ResolvedLimits,
} from './contracts';
import { fail, rollWarning } from './errors';
import { resolveLimits } from './limits';

export interface QueryOccurrence {
  request: RollQueryRequest;
  start: number;
  end: number;
  raw: string;
  children: QueryOccurrence[];
}

export interface QueryExtraction {
  queries: RollQueryRequest[];
  occurrences: QueryOccurrence[];
  warnings: RollWarning[];
}

export interface QueryResolution {
  text: string;
  answers: QueryAnswerRecord[];
  warnings: RollWarning[];
  missing: RollQueryRequest[];
  needsInput: boolean;
}

interface ParsedBody {
  prompt: string;
  defaultValue?: string;
  options?: Array<{ label: string; value: string }>;
}

/**
 * Extract `?{...}` requests without rolling dice or resolving macros. Nested
 * requests are returned as children and also flattened into `queries`.
 */
export function extractQueries(
  text: string,
  limits: ResolvedLimits = resolveLimits(),
): QueryExtraction {
  const warnings: RollWarning[] = [];
  const occurrences = scanQueries(text, 0, 0, limits.maxQueryDepth);
  const byId = new Map<string, RollQueryRequest>();
  for (const occurrence of flatten(occurrences)) {
    const existing = byId.get(occurrence.request.id);
    if (!existing) {
      byId.set(occurrence.request.id, occurrence.request);
      continue;
    }
    const children = new Map<string, RollQueryRequest>();
    for (const child of [
      ...(existing.children ?? []),
      ...(occurrence.request.children ?? []),
    ]) {
      children.set(child.id, child);
    }
    if (children.size > 0) existing.children = [...children.values()];
  }
  return { queries: [...byId.values()], occurrences, warnings };
}

/**
 * Substitute answers into the query text. Returns `needsInput` rather than
 * throwing when a required answer is missing so the caller can prompt.
 */
export function resolveQueries(
  text: string,
  extraction: QueryExtraction,
  answers: QueryAnswers,
  limits: ResolvedLimits = resolveLimits(),
): QueryResolution {
  const warnings: RollWarning[] = [];
  const records: QueryAnswerRecord[] = [];
  const missing: RollQueryRequest[] = [];
  const used = new Set<string>();
  const topLevel = extraction.occurrences.filter(
    (occurrence) =>
      !extraction.occurrences.some(
        (other) =>
          other !== occurrence &&
          other.start <= occurrence.start &&
          other.end >= occurrence.end,
      ),
  );

  const renderRegion = (
    regionText: string,
    baseOffset: number,
    occurrences: QueryOccurrence[],
  ): string => {
    const local = occurrences
      .map((child) => ({
        ...child,
        start: child.start - baseOffset,
        end: child.end - baseOffset,
      }))
      .filter((child) => child.start >= 0 && child.end <= regionText.length)
      .sort((left, right) => left.start - right.start);
    let output = '';
    let cursor = 0;
    for (const child of local) {
      output += regionText.slice(cursor, child.start);
      output += resolveOccurrence(child);
      cursor = child.end;
    }
    return output + regionText.slice(cursor);
  };

  const resolveOccurrence = (occurrence: QueryOccurrence): string => {
    // Re-parse the body after child answers were rendered into the prompt.
    const body = renderRegion(
      occurrence.raw.slice(2, -1),
      occurrence.start + 2,
      occurrence.children,
    );
    const parsed = parseBody(body);
    const request = occurrence.request;
    const picked = pickAnswer(parsed, request, answers, used);
    if (picked === undefined) {
      if (parsed.defaultValue !== undefined) {
        return parsed.defaultValue;
      }
      if (request.required) missing.push(request);
      return occurrence.raw;
    }

    used.add(picked.key);
    records.push({
      prompt: parsed.prompt,
      answer: picked.answer,
      sourceSpan: { start: occurrence.start, end: occurrence.end },
    });
    void limits;
    return picked.answer;
  };

  const output = renderRegion(text, 0, topLevel);

  for (const key of Object.keys(answers)) {
    if (used.has(key)) continue;
    const known = extraction.queries.some(
      (request) => request.id === key || request.prompt === key,
    );
    if (!known) {
      warnings.push(
        rollWarning('QUERY_EXTRA_ANSWER', 'ignored answer for unknown query', {
          pass: 'queries',
          params: { key },
        }),
      );
    }
  }

  return {
    text: output,
    answers: records,
    warnings,
    missing: dedupeMissing(missing),
    needsInput: missing.length > 0,
  };
}

function pickAnswer(
  parsed: ParsedBody,
  request: RollQueryRequest,
  answers: QueryAnswers,
  used: Set<string>,
): { key: string; answer: string } | undefined {
  const candidates = [request.id, request.prompt, parsed.prompt].filter(
    (value): value is string => Boolean(value),
  );
  for (const key of candidates) {
    if (Object.prototype.hasOwnProperty.call(answers, key)) {
      return { key, answer: validateAnswer(parsed, answers[key], request) };
    }
  }
  return undefined;
}

function validateAnswer(
  parsed: ParsedBody,
  answer: string,
  request: RollQueryRequest,
): string {
  if (!parsed.options || parsed.options.length === 0) return answer;
  const option = parsed.options.find(
    (candidate) => candidate.value === answer || candidate.label === answer,
  );
  if (!option) {
    fail(
      'QUERY_INVALID_ANSWER',
      `invalid answer "${answer}" for query "${parsed.prompt}"`,
      {
        pass: 'queries',
        span: request.span,
        params: { answer, prompt: parsed.prompt },
      },
    );
  }
  return option.value;
}

function scanQueries(
  text: string,
  baseOffset: number,
  depth: number,
  maxDepth: number,
): QueryOccurrence[] {
  if (depth > maxDepth) {
    fail('QUERY_DEPTH', `query nesting exceeded ${maxDepth} levels`, {
      pass: 'queries',
      params: { limit: maxDepth },
    });
  }
  const result: QueryOccurrence[] = [];
  let index = 0;
  while (index < text.length - 1) {
    if (text[index] === '?' && text[index + 1] === '{') {
      const end = findMatchingBrace(text, index + 1);
      if (end === -1) {
        fail('PARSE_MISMATCHED_GROUP', 'unterminated roll query', {
          pass: 'queries',
          span: { start: baseOffset + index, end: baseOffset + text.length },
        });
      }
      const raw = text.slice(index, end + 1);
      const body = text.slice(index + 2, end);
      const children = scanQueries(
        body,
        baseOffset + index + 2,
        depth + 1,
        maxDepth,
      );
      const parsed = parseBody(body);
      result.push({
        request: buildRequest(parsed, children, {
          start: baseOffset + index,
          end: baseOffset + end + 1,
        }),
        start: baseOffset + index,
        end: baseOffset + end + 1,
        raw,
        children,
      });
      index = end + 1;
      continue;
    }
    index += 1;
  }
  return result;
}

function findMatchingBrace(text: string, openIndex: number): number {
  let depth = 0;
  for (let index = openIndex; index < text.length; index += 1) {
    const char = text[index];
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function parseBody(body: string): ParsedBody {
  const parts = splitTopLevel(body, '|').map((part) => part.trim());
  const prompt = decodeEntities(parts[0] ?? '');
  if (parts.length === 1) return { prompt };
  if (parts.length === 2) {
    return { prompt, defaultValue: decodeEntities(parts[1]) };
  }
  const options = parts.slice(1).map(parseOption);
  return { prompt, options };
}

function parseOption(part: string): { label: string; value: string } {
  const comma = part.indexOf(',');
  if (comma === -1) {
    const decoded = decodeEntities(part.trim());
    return { label: decoded, value: decoded };
  }
  return {
    label: decodeEntities(part.slice(0, comma).trim()),
    value: decodeEntities(part.slice(comma + 1).trim()),
  };
}

function splitTopLevel(text: string, separator: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '{') depth += 1;
    else if (char === '}') depth -= 1;
    if (char === separator && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts;
}

function buildRequest(
  parsed: ParsedBody,
  children: QueryOccurrence[],
  span: { start: number; end: number },
): RollQueryRequest {
  const optionValues = parsed.options?.map((option) => option.value) ?? [];
  return {
    id: hashId(
      `${normalize(parsed.prompt)}|${optionValues.map(normalize).join('|')}`,
    ),
    prompt: parsed.prompt,
    ...(parsed.defaultValue !== undefined
      ? { defaultValue: parsed.defaultValue }
      : {}),
    ...(parsed.options ? { options: parsed.options } : {}),
    required: !parsed.defaultValue,
    ...(children.length > 0
      ? { children: children.map((child) => child.request) }
      : {}),
    span,
  };
}

function flatten(occurrences: QueryOccurrence[]): QueryOccurrence[] {
  return occurrences.flatMap((occurrence) => [
    occurrence,
    ...flatten(occurrence.children),
  ]);
}

function dedupeMissing(requests: RollQueryRequest[]): RollQueryRequest[] {
  const seen = new Set<string>();
  return requests.filter((request) => {
    if (seen.has(request.id)) return false;
    seen.add(request.id);
    return true;
  });
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lbrace;/g, '{')
    .replace(/&rbrace;/g, '}');
}

/** Stable 32-bit FNV-1a hash for query identity. */
function hashId(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
