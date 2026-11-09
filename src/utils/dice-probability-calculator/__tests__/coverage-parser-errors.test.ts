import { afterEach, describe, expect, it, vi } from 'vitest';

type LexerErrorState = {
  message: string;
  offset: number;
  line: number;
  column: number;
  length: number;
};

const state: {
  lexerErrors: LexerErrorState[] | null;
  stripLocations: boolean;
  rawMessages: boolean;
  metadata: Record<string, unknown> | null;
} = {
  lexerErrors: null,
  stripLocations: false,
  rawMessages: false,
  metadata: null,
};

vi.mock('../tokens', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../tokens')>();
  return {
    ...actual,
    tokenize: (input: string) => {
      if (state.lexerErrors) {
        return { tokens: [], errors: state.lexerErrors };
      }
      const result = actual.tokenize(input);
      if (state.stripLocations) {
        for (const token of result.tokens) {
          delete (token as Partial<typeof token>).startLine;
          delete (token as Partial<typeof token>).startColumn;
          delete (token as Partial<typeof token>).endLine;
          delete (token as Partial<typeof token>).endColumn;
        }
      }
      return result;
    },
  };
});

vi.mock('../syntaxErrorProvider', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../syntaxErrorProvider')>();
  return {
    ...actual,
    decodeSyntaxErrorMetadata: (message: string) => {
      if (state.rawMessages) return { message, metadata: null };
      if (state.metadata) return { message, metadata: state.metadata };
      return actual.decodeSyntaxErrorMetadata(message);
    },
  };
});

import { DiceSyntaxError } from '../errors';
import { parseCst } from '../parser';

function catchSyntaxError(run: () => unknown): DiceSyntaxError {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(DiceSyntaxError);
    return error as DiceSyntaxError;
  }
  throw new Error('Expected a syntax error');
}

afterEach(() => {
  state.lexerErrors = null;
  state.stripLocations = false;
  state.rawMessages = false;
  state.metadata = null;
});

describe('parser error fallbacks', () => {
  it('recovers unexpected characters from lexer messages', () => {
    state.lexerErrors = [
      {
        message: 'unexpected character: ->?<-',
        offset: 7,
        line: 1,
        column: 8,
        length: 1,
      },
    ];
    expect(catchSyntaxError(() => parseCst('output ?')).found).toBe('?');

    state.lexerErrors = [
      {
        message: 'unmatched input',
        offset: 0,
        line: 1,
        column: 1,
        length: 1,
      },
    ];
    expect(catchSyntaxError(() => parseCst('X')).found).toBe('X');
    expect(catchSyntaxError(() => parseCst('')).found).toBeUndefined();
  });

  it('deduplicates repeated syntax issues', () => {
    const issue: LexerErrorState = {
      message: 'unmatched input',
      offset: 0,
      line: 1,
      column: 1,
      length: 1,
    };
    state.lexerErrors = [issue, { ...issue }];
    const error = catchSyntaxError(() => parseCst('X'));
    expect(error.errors).toHaveLength(1);
  });

  it('uses token details when parser messages have no metadata', () => {
    state.rawMessages = true;

    const eof = catchSyntaxError(() => parseCst('output 1 +'));
    expect(eof.code).toBe('unexpected-end-of-input');
    expect(eof.foundKind).toBe('EOF');

    const token = catchSyntaxError(() => parseCst('output {1 2}'));
    expect(token.code).toBe('invalid-syntax');
    expect(token.found).toBe('2');
    expect(token.foundKind).toBe('NumberLiteral');
    expect(token.expected).toEqual([]);
  });

  it('uses metadata expectations when the code is missing', () => {
    state.metadata = { expected: ['Something'] };
    const error = catchSyntaxError(() => parseCst('output {1 2}'));
    expect(error.code).toBe('unexpected-token');
    expect(error.expected).toEqual(['Something']);
  });

  it('falls back to the previous token when locations are unavailable', () => {
    state.stripLocations = true;
    const error = catchSyntaxError(() => parseCst('output 1 +'));
    expect(error.line).toBeGreaterThanOrEqual(1);
    expect(error.column).toBeGreaterThanOrEqual(1);
    expect(error.endLine).toBeGreaterThanOrEqual(error.line);
  });
});
