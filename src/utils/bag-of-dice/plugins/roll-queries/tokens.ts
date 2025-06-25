import { createToken } from 'chevrotain';
import { RCurly, Comma, WhiteSpace } from '../../core/tokens';

// Default mode: only recognizes QueryStart
export const QueryStart = createToken({ name: 'QueryStart', pattern: /\?\{/, push_mode: 'rollQuery' });

// RollQuery mode tokens
export const Pipe = createToken({ name: 'Pipe', pattern: /\|/ });
export const EscapedChar = createToken({ name: 'EscapedChar', pattern: /\\[|,}]/ });
export const Text = createToken({ name: 'Text', pattern: /([^\\|,}}]|\\(?![|,}]))+/ });

// Export only the global tokens for the core
export const tokens = [WhiteSpace, QueryStart];

// Mode definitions (Chevrotain IMultiModeLexerDefinition)
export const rollQueriesLexerModes = {
  modes: {
    defaultMode: [WhiteSpace, QueryStart],
    rollQuery: [WhiteSpace, Pipe, Comma, EscapedChar, Text, RCurly],
  },
  defaultMode: 'defaultMode',
};

export { Comma, WhiteSpace } from '../../core/tokens'; 