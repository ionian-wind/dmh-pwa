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
  const { snapshot: _ignored, ...rest } = result;
  void _ignored;
  return {
    ...clone(rest),
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
  return {
    ok: true,
    snapshot: clone(record) as unknown as RollResultSnapshot,
  };
}

/** Safe fallback rendering for an unsupported snapshot version. */
export function renderSnapshotFallback(): string {
  return 'This roll was created by a newer version and cannot be displayed.';
}

function clone<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value);
    } catch {
      /* fall through to JSON for non-cloneable replay states */
    }
  }
  return JSON.parse(JSON.stringify(value)) as T;
}
