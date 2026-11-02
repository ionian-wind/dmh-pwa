/**
 * A syntax error with a source range suitable for editor markers.
 *
 * Coordinates are 1-based, following Monaco/Chevrotain conventions.
 */
export class DiceSyntaxError extends Error {
  readonly line: number;
  readonly column: number;
  readonly endLine: number;
  readonly endColumn: number;

  constructor(
    message: string,
    line = 1,
    column = 1,
    endLine = line,
    endColumn = column + 1,
  ) {
    super(message);
    this.name = 'DiceSyntaxError';
    this.line = line;
    this.column = column;
    this.endLine = endLine;
    this.endColumn = Math.max(endColumn, column + 1);
  }
}
