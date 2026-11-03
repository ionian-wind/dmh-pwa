import type { DiceSyntaxError } from '@/utils/dice-probability-calculator';

type Translate = (key: string, named?: Record<string, unknown>) => string;

/** Literal token types rendered with their source spelling. */
const LITERAL_TOKENS: Record<string, string> = {
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
  OutputKeyword: 'output',
  NamedKeyword: 'named',
  FunctionKeyword: 'function',
  IfKeyword: 'if',
  ElseKeyword: 'else',
  LoopKeyword: 'loop',
  OverKeyword: 'over',
  ResultKeyword: 'result',
  SetKeyword: 'set',
  ToKeyword: 'to',
};

/** Lexical token classes get localized descriptions. */
const DESCRIBED_TOKENS: Record<string, string> = {
  NumberLiteral: 'number',
  StringLiteral: 'string',
  VarName: 'variable',
  Word: 'word',
  EOF: 'endOfInput',
};

function tokenLabel(tokenType: string, t: Translate): string {
  const literal = LITERAL_TOKENS[tokenType];
  if (literal) return `“${literal}”`;

  const described = DESCRIBED_TOKENS[tokenType];
  if (described) {
    return t(`probabilityCalculator.syntaxErrors.tokens.${described}`);
  }

  return tokenType;
}

function foundLabel(error: DiceSyntaxError, t: Translate): string {
  if (error.found) return `“${error.found}”`;
  if (error.foundKind === 'EOF') {
    return t('probabilityCalculator.syntaxErrors.tokens.endOfInput');
  }
  return t('probabilityCalculator.syntaxErrors.tokens.unknown');
}

/**
 * Turn a structured parser error into localized, human-readable text.
 *
 * The returned string intentionally omits the source position; the UI renders
 * that separately as a link that moves the editor cursor.
 */
export function formatDiceSyntaxError(
  error: DiceSyntaxError,
  t: Translate,
): string {
  const expected = error.expected.map((type) => tokenLabel(type, t));
  const expectedText = expected.join(', ');
  const found = foundLabel(error, t);

  switch (error.code) {
    case 'unexpected-character':
      return t('probabilityCalculator.syntaxErrors.unexpectedCharacter', {
        found,
      });
    case 'unexpected-end-of-input':
      return expectedText
        ? t('probabilityCalculator.syntaxErrors.unexpectedEnd', {
            expected: expectedText,
          })
        : t('probabilityCalculator.syntaxErrors.unexpectedEndNoExpected');
    case 'unexpected-token':
      return expectedText
        ? t('probabilityCalculator.syntaxErrors.unexpectedToken', {
            found,
            expected: expectedText,
          })
        : t('probabilityCalculator.syntaxErrors.unexpectedTokenNoExpected', {
            found,
          });
    default:
      return t('probabilityCalculator.syntaxErrors.invalid');
  }
}
