import { createToken, Lexer, type IToken } from 'chevrotain';

/** A lowercase word. */
export const Word = createToken({
  name: 'Word',
  pattern: /[a-z]+/,
});

function keyword(name: string, pattern: RegExp) {
  return createToken({
    name,
    pattern,
    longer_alt: Word,
  });
}

export const OutputKeyword = keyword('OutputKeyword', /output/);
export const NamedKeyword = keyword('NamedKeyword', /named/);
export const FunctionKeyword = keyword('FunctionKeyword', /function/);
export const IfKeyword = keyword('IfKeyword', /if/);
export const ElseKeyword = keyword('ElseKeyword', /else/);
export const LoopKeyword = keyword('LoopKeyword', /loop/);
export const OverKeyword = keyword('OverKeyword', /over/);
export const ResultKeyword = keyword('ResultKeyword', /result/);
export const SetKeyword = keyword('SetKeyword', /set/);
export const ToKeyword = keyword('ToKeyword', /to/);

/** All tokens that may appear as a word inside a function name. */
export const wordTokens = [
  Word,
  OutputKeyword,
  NamedKeyword,
  FunctionKeyword,
  IfKeyword,
  ElseKeyword,
  LoopKeyword,
  OverKeyword,
  ResultKeyword,
  SetKeyword,
  ToKeyword,
];

/** Any text between backslashes is a comment. */
export const Comment = createToken({
  name: 'Comment',
  pattern: /\\[\s\S]*?\\/,
  group: Lexer.SKIPPED,
});

export const WhiteSpace = createToken({
  name: 'WhiteSpace',
  pattern: /\s+/,
  group: Lexer.SKIPPED,
});

export const StringLiteral = createToken({
  name: 'StringLiteral',
  pattern: /"(?:[^"\\]|\\.)*"/,
});

export const NumberLiteral = createToken({
  name: 'NumberLiteral',
  pattern: /\d+/,
});

/** The AnyDice `d` operator. `dice` is a word, not the operator. */
export const D = createToken({
  name: 'D',
  pattern: /d/,
  longer_alt: Word,
});

export const Percent = createToken({ name: 'Percent', pattern: /%/ });

/** Variables and function parameter names are uppercase. */
export const VarName = createToken({
  name: 'VarName',
  pattern: /[A-Z_][A-Z0-9_]*/,
});

export const DoubleDot = createToken({ name: 'DoubleDot', pattern: /\.\./ });
export const NotEqual = createToken({ name: 'NotEqual', pattern: /!=/ });
export const LessEqual = createToken({ name: 'LessEqual', pattern: /<=/ });
export const GreaterEqual = createToken({
  name: 'GreaterEqual',
  pattern: />=/,
});
export const Power = createToken({ name: 'Power', pattern: /\^/ });
export const At = createToken({ name: 'At', pattern: /@/ });
export const Hash = createToken({ name: 'Hash', pattern: /#/ });
export const And = createToken({ name: 'And', pattern: /&/ });
export const Or = createToken({ name: 'Or', pattern: /\|/ });
export const Not = createToken({ name: 'Not', pattern: /!/ });
export const Plus = createToken({ name: 'Plus', pattern: /\+/ });
export const Minus = createToken({ name: 'Minus', pattern: /-/ });
export const Star = createToken({ name: 'Star', pattern: /\*/ });
export const Slash = createToken({ name: 'Slash', pattern: /\// });
export const Equal = createToken({ name: 'Equal', pattern: /=/ });
export const Less = createToken({ name: 'Less', pattern: /</ });
export const Greater = createToken({ name: 'Greater', pattern: />/ });
export const Colon = createToken({ name: 'Colon', pattern: /:/ });
export const Comma = createToken({ name: 'Comma', pattern: /,/ });
export const LCurly = createToken({ name: 'LCurly', pattern: /\{/ });
export const RCurly = createToken({ name: 'RCurly', pattern: /\}/ });
export const LBracket = createToken({ name: 'LBracket', pattern: /\[/ });
export const RBracket = createToken({ name: 'RBracket', pattern: /\]/ });
export const LParen = createToken({ name: 'LParen', pattern: /\(/ });
export const RParen = createToken({ name: 'RParen', pattern: /\)/ });

export const allTokens = [
  Comment,
  WhiteSpace,
  StringLiteral,
  NumberLiteral,
  D,
  Percent,
  OutputKeyword,
  NamedKeyword,
  FunctionKeyword,
  IfKeyword,
  ElseKeyword,
  LoopKeyword,
  OverKeyword,
  ResultKeyword,
  SetKeyword,
  ToKeyword,
  Word,
  VarName,
  DoubleDot,
  NotEqual,
  LessEqual,
  GreaterEqual,
  Power,
  At,
  Hash,
  And,
  Or,
  Not,
  Plus,
  Minus,
  Star,
  Slash,
  Equal,
  Less,
  Greater,
  Colon,
  Comma,
  LCurly,
  RCurly,
  LBracket,
  RBracket,
  LParen,
  RParen,
];

export const lexer = new Lexer(allTokens);

export interface TokenizationError {
  message: string;
  offset: number;
  line: number;
  column: number;
  length: number;
}

export function tokenize(input: string): {
  tokens: IToken[];
  errors: TokenizationError[];
} {
  const result = lexer.tokenize(input);
  return {
    tokens: result.tokens,
    errors: result.errors.map((error) => ({
      message: error.message,
      offset: error.offset,
      line: error.line ?? 1,
      column: error.column ?? 1,
      length: error.length ?? 1,
    })),
  };
}
