import type { EngineOptions, ResolvedLimits } from './contracts';

export const DEFAULT_LIMITS: Readonly<ResolvedLimits> = Object.freeze({
  maxExpansionDepth: 99,
  maxQueryDepth: 99,
  maxInlineDepth: 99,
  maxExplosionRolls: 99,
  maxTableDepth: 16,
  maxOutputLength: 256 * 1024,
  maxPassTimeMs: 1_000,
  maxParserRecovery: 10,
});

/**
 * Merge caller overrides over the documented defaults. Values must be finite
 * and non-negative; invalid values fall back to the default rather than
 * silently disabling a safety limit.
 */
export function resolveLimits(
  options: Pick<
    EngineOptions,
    | 'maxExpansionDepth'
    | 'maxQueryDepth'
    | 'maxInlineDepth'
    | 'maxExplosionRolls'
    | 'maxTableDepth'
    | 'maxOutputLength'
    | 'maxPassTimeMs'
    | 'maxParserRecovery'
  > = {},
): ResolvedLimits {
  return {
    maxExpansionDepth: positive(
      options.maxExpansionDepth,
      DEFAULT_LIMITS.maxExpansionDepth,
      true,
    ),
    maxQueryDepth: positive(
      options.maxQueryDepth,
      DEFAULT_LIMITS.maxQueryDepth,
      true,
    ),
    maxInlineDepth: positive(
      options.maxInlineDepth,
      DEFAULT_LIMITS.maxInlineDepth,
      true,
    ),
    maxExplosionRolls: positive(
      options.maxExplosionRolls,
      DEFAULT_LIMITS.maxExplosionRolls,
      true,
    ),
    maxTableDepth: positive(
      options.maxTableDepth,
      DEFAULT_LIMITS.maxTableDepth,
      true,
    ),
    maxOutputLength: positive(
      options.maxOutputLength,
      DEFAULT_LIMITS.maxOutputLength,
    ),
    maxPassTimeMs: positive(
      options.maxPassTimeMs,
      DEFAULT_LIMITS.maxPassTimeMs,
    ),
    maxParserRecovery: positive(
      options.maxParserRecovery,
      DEFAULT_LIMITS.maxParserRecovery,
      true,
    ),
  };
}

function positive(
  value: number | undefined,
  fallback: number,
  integer = false,
): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return fallback;
  }
  return integer ? Math.floor(value) : value;
}
