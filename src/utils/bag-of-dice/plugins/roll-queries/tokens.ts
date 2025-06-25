import { createToken } from 'chevrotain';
import { RCurly, Comma, WhiteSpace } from '../../core/tokens';

export const QueryStart = createToken({ name: 'QueryStart', pattern: /\?\{/ });
export const Pipe = createToken({ name: 'Pipe', pattern: /\|/ });
export const EscapedChar = createToken({ name: 'EscapedChar', pattern: /\\[|,}]/ });
export const Text = createToken({ name: 'Text', pattern: /([^\\|,}}]|\\(?![|,}]))+/ });

export const allRollQueryTokens = [
  WhiteSpace,
  QueryStart,
  RCurly,
  Pipe,
  Comma,
  EscapedChar,
  Text,
];

export { Comma, WhiteSpace } from '../../core/tokens'; 