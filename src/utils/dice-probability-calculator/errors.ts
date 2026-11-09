export type DiceSyntaxErrorCode =
  | 'unexpected-token'
  | 'unexpected-end-of-input'
  | 'unexpected-character'
  | 'invalid-syntax';

export interface DiceSyntaxErrorDetails {
  code?: DiceSyntaxErrorCode;
  found?: string;
  foundKind?: string;
  expected?: string[];
  /** All syntax issues in source order, including this error. */
  errors?: DiceSyntaxError[];
}

/**
 * A syntax error with a source range suitable for editor markers.
 *
 * Coordinates are 1-based, following editor/Chevrotain conventions. The raw
 * `message` is kept for diagnostics; user-facing text is produced from the
 * structured details by the probability calculator's formatter.
 *
 * `errors` contains every issue found during lexing/parsing. Top-level fields
 * mirror the first issue so existing single-error consumers keep working.
 */
export class DiceSyntaxError extends Error {
  readonly line: number;
  readonly column: number;
  readonly endLine: number;
  readonly endColumn: number;
  readonly code: DiceSyntaxErrorCode;
  readonly found?: string;
  readonly foundKind?: string;
  readonly expected: string[];
  readonly errors: DiceSyntaxError[];

  constructor(
    message: string,
    line = 1,
    column = 1,
    endLine = line,
    endColumn = column + 1,
    details: DiceSyntaxErrorDetails = {},
  ) {
    super(message);
    this.name = 'DiceSyntaxError';
    this.line = line;
    this.column = column;
    this.endLine = endLine;
    this.endColumn = Math.max(endColumn, column + 1);
    this.code = details.code ?? 'invalid-syntax';
    this.found = details.found;
    this.foundKind = details.foundKind;
    this.expected = details.expected ?? [];
    this.errors =
      details.errors && details.errors.length > 0 ? details.errors : [this];
  }
}
