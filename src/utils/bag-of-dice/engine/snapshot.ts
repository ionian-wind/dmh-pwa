import type { RollResult, RollResultSnapshot } from './contracts';

export const ENGINE_SCHEMA_VERSION = 1 as const;

/**
 * Create the persistable form of a roll. Rendering a snapshot must never call
 * the RNG or re-evaluate the expression.
 */
export function createSnapshot(
  result: RollResult,
  createdAt = Date.now(),
): RollResultSnapshot {
  const { snapshot: _ignored, replay, ...rest } = result;
  void _ignored;
  const cloned = tryClone(rest);
  if (!cloned.ok) {
    throw new Error('roll result cannot be serialized');
  }
  const safeReplay = replay ? sanitizeReplay(replay) : undefined;
  return {
    ...cloned.value,
    ...(safeReplay ? { replay: safeReplay } : {}),
    createdAt,
  };
}

export function serializeSnapshot(snapshot: RollResultSnapshot): string {
  return JSON.stringify(snapshot);
}

export type SnapshotParseResult =
  | { ok: true; snapshot: RollResultSnapshot }
  | { ok: false; reason: 'invalid-json' | 'incompatible' | 'unknown-version' };

export function parseSnapshot(value: string | unknown): SnapshotParseResult {
  let parsed: unknown;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      return { ok: false, reason: 'invalid-json' };
    }
  } else {
    parsed = value;
  }
  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, reason: 'incompatible' };
  }
  const record = parsed as Record<string, unknown>;
  if (record.schemaVersion !== ENGINE_SCHEMA_VERSION) {
    return { ok: false, reason: 'unknown-version' };
  }
  if (
    typeof record.createdAt !== 'number' ||
    typeof record.total !== 'number' ||
    !record.breakdown ||
    !record.process
  ) {
    return { ok: false, reason: 'incompatible' };
  }
  const cloned = tryClone(record);
  if (!cloned.ok) {
    return { ok: false, reason: 'incompatible' };
  }
  return {
    ok: true,
    snapshot: cloned.value as unknown as RollResultSnapshot,
  };
}

/** Safe fallback rendering for an unsupported snapshot version. */
export function renderSnapshotFallback(): string {
  return 'This roll was created by a newer version and cannot be displayed.';
}

/**
 * Drop replay fields that cannot be persisted as JSON, keeping the serializable
 * ones (for example a seed next to a non-serializable RNG snapshot).
 */
function sanitizeReplay(
  replay: NonNullable<RollResult['replay']>,
): NonNullable<RollResult['replay']> | undefined {
  try {
    const serialized = JSON.stringify(replay);
    if (serialized === undefined) return undefined;
    const parsed = JSON.parse(serialized) as Record<string, unknown>;
    return Object.keys(parsed).length > 0
      ? (parsed as NonNullable<RollResult['replay']>)
      : undefined;
  } catch {
    return undefined;
  }
}

function tryClone<T>(value: T): { ok: true; value: T } | { ok: false } {
  if (typeof structuredClone === 'function') {
    try {
      return { ok: true, value: structuredClone(value) };
    } catch {
      /* fall through to JSON for non-cloneable replay states */
    }
  }
  try {
    return { ok: true, value: JSON.parse(JSON.stringify(value)) as T };
  } catch {
    return { ok: false };
  }
}
