import { createToken, Lexer } from 'chevrotain';

export const LCurly = createToken({ name: 'LCurly', pattern: /\{/ });
export const RCurly = createToken({ name: 'RCurly', pattern: /\}/ });
export const LParen = createToken({ name: 'LParen', pattern: /\(/ });
export const RParen = createToken({ name: 'RParen', pattern: /\)/ });
export const LBracket = createToken({ name: 'LBracket', pattern: /\[/ });
export const RBracket = createToken({ name: 'RBracket', pattern: /\]/ });
export const Comma = createToken({ name: 'Comma', pattern: /,/ });
export const WhiteSpace = createToken({ name: 'WhiteSpace', pattern: /[ \t\n\r]+/, group: Lexer.SKIPPED });

export const allCoreTokens = [
  WhiteSpace,
  LCurly,
  RCurly,
  LParen,
  RParen,
  LBracket,
  RBracket,
  Comma,
]; 