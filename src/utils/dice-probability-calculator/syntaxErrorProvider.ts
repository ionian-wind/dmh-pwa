import type {
  ILexerErrorMessageProvider,
  IParserErrorMessageProvider,
  IToken,
  TokenType,
} from 'chevrotain';
import type { DiceSyntaxErrorCode } from './errors';

export interface SyntaxErrorMetadata {
  code: DiceSyntaxErrorCode;
  found?: string;
  foundKind?: string;
  expected?: string[];
}

const METADATA_SEPARATOR = '\u0000';

/**
 * Keep a readable fallback plus machine-readable details in the Chevrotain
 * message. `parseCst` strips the metadata before exposing the error.
 */
function withMetadata(message: string, metadata: SyntaxErrorMetadata): string {
  return `${message}${METADATA_SEPARATOR}${JSON.stringify(metadata)}`;
}

export function decodeSyntaxErrorMetadata(message: string): {
  message: string;
  metadata: SyntaxErrorMetadata | null;
} {
  const separator = message.lastIndexOf(METADATA_SEPARATOR);
  if (separator === -1) return { message, metadata: null };

  try {
    return {
      message: message.slice(0, separator),
      metadata: JSON.parse(message.slice(separator + 1)),
    };
  } catch {
    return { message, metadata: null };
  }
}

const SYMBOL_NAMES: Record<string, string> = {
  LCurly: '{',
  RCurly: '}',
  LBracket: '[',
  RBracket: ']',
  LParen: '(',
  RParen: ')',
  Colon: ':',
  Comma: ',',
  Plus: '+',
  Minus: '-',
  Star: '*',
  Slash: '/',
  Percent: '%',
  Power: '^',
  Equal: '=',
  NotEqual: '!=',
  Less: '<',
  Greater: '>',
  LessEqual: '<=',
  GreaterEqual: '>=',
  And: '&',
  Or: '|',
  Not: '!',
  At: '@',
  Hash: '#',
  DoubleDot: '..',
  D: 'd',
};

const DESCRIBED_NAMES: Record<string, string> = {
  NumberLiteral: 'number',
  StringLiteral: 'text',
  VarName: 'variable',
  Word: 'word',
  EOF: 'end of input',
};

function readableToken(name: string): string {
  return SYMBOL_NAMES[name] ?? DESCRIBED_NAMES[name] ?? name;
}

function tokenTypeNames(tokenTypes: TokenType[]): string[] {
  return [...new Set(tokenTypes.map((tokenType) => tokenType.name))];
}

function firstPathTokens(pathsPerAlt: TokenType[][][]): string[] {
  return tokenTypeNames(
    pathsPerAlt.flatMap((paths) =>
      paths
        .map((path) => path[0])
        .filter((tokenType): tokenType is TokenType => !!tokenType),
    ),
  );
}

function tokenDetails(
  token: IToken | undefined,
): Pick<SyntaxErrorMetadata, 'found' | 'foundKind'> {
  const foundKind = token?.tokenType?.name;
  const found = token?.image?.trim() || undefined;
  return { found, foundKind };
}

export const parserErrorMessageProvider: IParserErrorMessageProvider = {
  buildMismatchTokenMessage({ expected, actual }) {
    const details = tokenDetails(actual);
    const endOfInput = details.foundKind === 'EOF';
    return withMetadata(
      `Unexpected ${details.found ? `"${details.found}"` : 'end of input'}. Expected ${readableToken(
        expected.name,
      )}.`,
      {
        code: endOfInput ? 'unexpected-end-of-input' : 'unexpected-token',
        expected: [expected.name],
        ...details,
      },
    );
  },

  buildNotAllInputParsedMessage({ firstRedundant }) {
    const details = tokenDetails(firstRedundant);
    return withMetadata(
      `Unexpected input "${details.found ?? ''}". Expected end of input.`,
      {
        code: 'unexpected-token',
        expected: ['EOF'],
        ...details,
      },
    );
  },

  buildNoViableAltMessage({ expectedPathsPerAlt, actual }) {
    const details = tokenDetails(actual[0]);
    const expected = firstPathTokens(expectedPathsPerAlt);
    const expectedText = expected.map(readableToken).join(', ');
    return withMetadata(
      `Unexpected ${details.found ? `"${details.found}"` : 'end of input'}. Expected one of: ${expectedText}.`,
      {
        code:
          details.foundKind === 'EOF'
            ? 'unexpected-end-of-input'
            : 'unexpected-token',
        expected,
        ...details,
      },
    );
  },

  buildEarlyExitMessage({ expectedIterationPaths, actual }) {
    const details = tokenDetails(actual[0]);
    const expected = firstPathTokens([expectedIterationPaths]);
    const expectedText = expected.map(readableToken).join(', ');
    return withMetadata(
      `Unexpected ${details.found ? `"${details.found}"` : 'end of input'}. Expected one of: ${expectedText}.`,
      {
        code:
          details.foundKind === 'EOF'
            ? 'unexpected-end-of-input'
            : 'unexpected-token',
        expected,
        ...details,
      },
    );
  },
};

export const lexerErrorMessageProvider: ILexerErrorMessageProvider = {
  buildUnexpectedCharactersMessage(fullText, startOffset) {
    const found = fullText.charAt(startOffset);
    return withMetadata(`Unexpected character "${found}".`, {
      code: 'unexpected-character',
      found,
    });
  },

  buildUnableToPopLexerModeMessage(token) {
    return withMetadata(`Unexpected lexer mode after "${token.image}".`, {
      code: 'invalid-syntax',
      found: token.image,
    });
  },
};
