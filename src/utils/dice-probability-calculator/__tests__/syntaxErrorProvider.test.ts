import { describe, expect, it } from 'vitest';
import {
  decodeSyntaxErrorMetadata,
  lexerErrorMessageProvider,
  parserErrorMessageProvider,
} from '../syntaxErrorProvider';

const numberToken = {
  image: '2',
  tokenType: { name: 'NumberLiteral' },
} as any;
const eofToken = {
  image: '',
  tokenType: { name: 'EOF' },
} as any;
const rcurly = { name: 'RCurly' } as any;
const comma = { name: 'Comma' } as any;

describe('Chevrotain syntax error providers', () => {
  it('encodes mismatch details and readable fallback text', () => {
    const message = parserErrorMessageProvider.buildMismatchTokenMessage({
      expected: rcurly,
      actual: numberToken,
      previous: numberToken,
      ruleName: 'expression',
    });
    const decoded = decodeSyntaxErrorMetadata(message);

    expect(decoded.message).toBe('Unexpected "2". Expected }.');
    expect(decoded.metadata).toMatchObject({
      code: 'unexpected-token',
      expected: ['RCurly'],
      found: '2',
      foundKind: 'NumberLiteral',
    });
  });

  it('marks EOF mismatches as unexpected end of input', () => {
    const message = parserErrorMessageProvider.buildMismatchTokenMessage({
      expected: rcurly,
      actual: eofToken,
      previous: numberToken,
      ruleName: 'expression',
    });
    expect(decodeSyntaxErrorMetadata(message).metadata).toMatchObject({
      code: 'unexpected-end-of-input',
      expected: ['RCurly'],
      foundKind: 'EOF',
    });
  });

  it('describes redundant input and alternatives', () => {
    const redundant = decodeSyntaxErrorMetadata(
      parserErrorMessageProvider.buildNotAllInputParsedMessage({
        firstRedundant: numberToken,
        ruleName: 'program',
      }),
    );
    expect(redundant.metadata).toMatchObject({
      code: 'unexpected-token',
      expected: ['EOF'],
      found: '2',
    });

    const alternative = decodeSyntaxErrorMetadata(
      parserErrorMessageProvider.buildNoViableAltMessage({
        expectedPathsPerAlt: [[[rcurly]], [[comma]]],
        actual: [numberToken],
        previous: numberToken,
        ruleName: 'expression',
      }),
    );
    expect(alternative.metadata).toMatchObject({
      expected: ['RCurly', 'Comma'],
      found: '2',
    });
  });

  it('describes early-exit and lexer failures', () => {
    const early = decodeSyntaxErrorMetadata(
      parserErrorMessageProvider.buildEarlyExitMessage({
        expectedIterationPaths: [[rcurly]],
        actual: [numberToken],
        previous: numberToken,
        ruleName: 'program',
      }),
    );
    expect(early.metadata).toMatchObject({
      code: 'unexpected-token',
      expected: ['RCurly'],
    });

    const character = decodeSyntaxErrorMetadata(
      lexerErrorMessageProvider.buildUnexpectedCharactersMessage(
        'output ?',
        7,
        1,
        1,
        8,
      ),
    );
    expect(character).toMatchObject({
      message: 'Unexpected character "?".',
      metadata: { code: 'unexpected-character', found: '?' },
    });

    const mode = decodeSyntaxErrorMetadata(
      lexerErrorMessageProvider.buildUnableToPopLexerModeMessage({
        image: 'X',
      } as any),
    );
    expect(mode.metadata).toMatchObject({
      code: 'invalid-syntax',
      found: 'X',
    });
  });

  it('ignores messages without valid metadata', () => {
    expect(decodeSyntaxErrorMetadata('plain message')).toEqual({
      message: 'plain message',
      metadata: null,
    });
    expect(decodeSyntaxErrorMetadata('bad\u0000not-json')).toEqual({
      message: 'bad\u0000not-json',
      metadata: null,
    });
  });
});
