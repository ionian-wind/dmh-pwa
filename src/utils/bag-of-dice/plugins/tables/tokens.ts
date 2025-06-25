import { createToken } from 'chevrotain';

export const NumberLiteral = createToken({ name: 'NumberLiteral', pattern: /\d+/ });
export const Identifier = createToken({ name: 'Identifier', pattern: /[a-zA-Z_][a-zA-Z0-9_-]*/ });
export const TableRollStart = createToken({ name: 'TableRollStart', pattern: /t\[/ });
export const RBracket = createToken({ name: 'RBracket', pattern: /\]/ });
export const WhiteSpace = createToken({ name: 'WhiteSpace', pattern: /[ \t\n\r]+/ });
// For future: add arithmetic tokens for computed N

export const allTableTokens = [
  WhiteSpace,
  NumberLiteral,
  TableRollStart,
  Identifier,
  RBracket,
]; 