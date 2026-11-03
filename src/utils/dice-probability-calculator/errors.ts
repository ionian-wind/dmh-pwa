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
}

/**
 * A syntax error with a source range suitable for editor markers.
 *
 * Coordinates are 1-based, following Monaco/Chevrotain conventions. The raw
 * `message` is kept for diagnostics; user-facing text is produced from the
 * structured details by the probability calculator's formatter.
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
  }
}
