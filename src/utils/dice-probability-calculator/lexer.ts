// lexer.ts
import { createToken, Lexer, IToken } from 'chevrotain';

// --- Tokens definition ---

// Comments: anything between backslashes \ like this \
export const Comment = createToken({
  name: 'Comment',
  pattern: /\\[^\\]*\\/,
  group: Lexer.SKIPPED,
});

// Whitespace
export const WhiteSpace = createToken({
  name: 'WhiteSpace',
  pattern: /\s+/,
  group: Lexer.SKIPPED,
});

// Numbers (integers only, optional minus)
export const NumberLiteral = createToken({
  name: 'NumberLiteral',
  pattern: /-?\d+/,
});

// // Dice notation: d6, 2d20, d%, 3d%
// export const DiceLiteral = createToken({
//   name: 'DiceLiteral',
//   pattern: /(\d+)?d(?:[1-9]\d*|%)?/,
// });

export const D = createToken({ name: 'D', pattern: /d/ });
export const Percent = createToken({ name: 'Percent', pattern: /%/ });

// Identifiers: uppercase letters and underscores for variables
export const VariableIdentifier = createToken({
  name: 'VariableIdentifier',
  pattern: /[A-Z_][A-Z0-9_]*/,
});

// Function names: sequence of lowercase words and uppercase variables separated by spaces.
// Example: "add A to B", "double A:n if above B:n", "count fives and above and subtract ones"
export const FunctionIdentifier = createToken({
  name: 'FunctionIdentifier',
  pattern: /[a-z]+(?:\s+[A-Z_][A-Z0-9_]*|\s+[a-z]+)*(?:\s*:[nds])?/,
  longer_alt: VariableIdentifier,
});

// String literal for named output: double quotes
export const StringLiteral = createToken({
  name: 'StringLiteral',
  pattern: /"[^"\\]*(?:\\.[^"\\]*)*"/,
});

// Keywords
export const OutputKeyword = createToken({
  name: 'OutputKeyword',
  pattern: /output/,
});
export const NamedKeyword = createToken({
  name: 'NamedKeyword',
  pattern: /named/,
});
export const FunctionKeyword = createToken({
  name: 'FunctionKeyword',
  pattern: /function/,
});
export const IfKeyword = createToken({ name: 'IfKeyword', pattern: /if/ });
export const ElseKeyword = createToken({
  name: 'ElseKeyword',
  pattern: /else/,
});
export const LoopKeyword = createToken({
  name: 'LoopKeyword',
  pattern: /loop/,
});
export const OverKeyword = createToken({
  name: 'OverKeyword',
  pattern: /over/,
});
export const ResultKeyword = createToken({
  name: 'ResultKeyword',
  pattern: /result/,
});
export const SetKeyword = createToken({ name: 'SetKeyword', pattern: /set/ });
export const ToKeyword = createToken({ name: 'ToKeyword', pattern: /to/ });

export const TypeIdentifier = createToken({
  name: 'TypeIdentifier',
  pattern: /n|d|s/,
});

// Operators
export const Plus = createToken({ name: 'Plus', pattern: /\+/ });
export const Minus = createToken({ name: 'Minus', pattern: /-/ });
export const Star = createToken({ name: 'Star', pattern: /\*/ });
export const Slash = createToken({ name: 'Slash', pattern: /\// });
export const Caret = createToken({ name: 'Caret', pattern: /\^/ });
export const Equal = createToken({ name: 'Equal', pattern: /=/ });
export const NotEqual = createToken({ name: 'NotEqual', pattern: /!=/ });
export const LessThan = createToken({ name: 'LessThan', pattern: /</ });
export const GreaterThan = createToken({ name: 'GreaterThan', pattern: />/ });
export const LessEqual = createToken({ name: 'LessEqual', pattern: /<=/ });
export const GreaterEqual = createToken({
  name: 'GreaterEqual',
  pattern: />=/,
});
export const And = createToken({ name: 'And', pattern: /&/ });
export const Or = createToken({ name: 'Or', pattern: /\|/ });
export const Not = createToken({ name: 'Not', pattern: /!/ });
export const At = createToken({ name: 'At', pattern: /@/ });
export const Hash = createToken({ name: 'Hash', pattern: /#/ });
export const Colon = createToken({ name: 'Colon', pattern: /:/ });
export const Comma = createToken({ name: 'Comma', pattern: /,/ });
export const Semicolon = createToken({ name: 'Semicolon', pattern: /;/ });

// Delimiters
export const LBracket = createToken({ name: 'LBracket', pattern: /\[/ });
export const RBracket = createToken({ name: 'RBracket', pattern: /\]/ });
export const LCurly = createToken({ name: 'LCurly', pattern: /{/ });
export const RCurly = createToken({ name: 'RCurly', pattern: /}/ });
export const LParen = createToken({ name: 'LParen', pattern: /\(/ });
export const RParen = createToken({ name: 'RParen', pattern: /\)/ });

// All tokens for Lexer
const allTokens = [
  Comment,
  WhiteSpace,
  NumberLiteral,
  D,
  Percent,
  VariableIdentifier,
  FunctionIdentifier,
  StringLiteral,
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
  Plus,
  Minus,
  Star,
  Slash,
  Caret,
  Equal,
  NotEqual,
  LessThan,
  GreaterThan,
  LessEqual,
  GreaterEqual,
  And,
  Or,
  Not,
  At,
  Hash,
  Colon,
  Comma,
  Semicolon,
  LBracket,
  RBracket,
  LCurly,
  RCurly,
  LParen,
  RParen,
  TypeIdentifier,
];

export const DiceLexer = new Lexer(allTokens);

// Helper to lex a script
export function lex(input: string): IToken[] {
  const lexResult = DiceLexer.tokenize(input);
  if (lexResult.errors.length > 0) {
    throw new Error(
      `Lexing errors: ${lexResult.errors.map((e) => e.message).join(', ')}`,
    );
  }
  return lexResult.tokens;
}
