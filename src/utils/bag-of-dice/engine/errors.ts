import type {
  AstSpan,
  RollError,
  RollErrorCode,
  RollWarning as RollWarningRecord,
} from './contracts';

export interface ErrorDetails {
  pass?: string;
  plugin?: string;
  span?: AstSpan;
  params?: Record<string, unknown>;
  cause?: unknown;
}

/**
 * Build a typed roll error. Messages are stable English diagnostics; callers
 * localize using `code` and `params`, never by parsing the message.
 */
export function rollError(
  code: RollErrorCode,
  message: string,
  details: ErrorDetails = {},
): RollError {
  return {
    code,
    message,
    pass: details.pass ?? 'unknown',
    ...(details.plugin ? { plugin: details.plugin } : {}),
    ...(details.span ? { span: details.span } : {}),
    ...(details.params ? { params: details.params } : {}),
    ...(details.cause !== undefined ? { cause: details.cause } : {}),
  };
}

export function rollWarning(
  code: RollErrorCode | string,
  message: string,
  details: ErrorDetails = {},
): RollWarningRecord {
  return {
    code,
    message,
    pass: details.pass ?? 'unknown',
    ...(details.plugin ? { plugin: details.plugin } : {}),
    ...(details.span ? { span: details.span } : {}),
    ...(details.params ? { params: details.params } : {}),
  };
}

export function isRollError(value: unknown): value is RollError {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as RollError).code === 'string' &&
    typeof (value as RollError).message === 'string'
  );
}

export class RollFailure extends Error {
  readonly errors: RollError[];

  constructor(errors: RollError[] | RollError) {
    const list = Array.isArray(errors) ? errors : [errors];
    super(list.map((error) => error.message).join('; ') || 'Roll failed');
    this.name = 'RollFailure';
    this.errors = list;
  }
}

/** Throw a typed failure from deep inside a pass. */
export function fail(
  code: RollErrorCode,
  message: string,
  details: ErrorDetails = {},
): never {
  throw new RollFailure(rollError(code, message, details));
}

export function toRollError(
  error: unknown,
  fallback: ErrorDetails = {},
): RollError {
  if (error instanceof RollFailure) {
    return error.errors[0];
  }
  return rollError(
    'INTERNAL',
    error instanceof Error ? error.message : String(error),
    { ...fallback, cause: error },
  );
}

export function toRollErrors(
  error: unknown,
  fallback: ErrorDetails = {},
): RollError[] {
  if (error instanceof RollFailure) {
    return error.errors;
  }
  return [toRollError(error, fallback)];
}
