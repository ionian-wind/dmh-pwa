import { Lexer, createToken } from 'chevrotain';

export const OUTPUT = createToken({ name: 'OUTPUT', pattern: /output/ });
export const FUNCTION = createToken({ name: 'FUNCTION', pattern: /function/ });
export const LOOP = createToken({ name: 'LOOP', pattern: /loop/ });
export const OVER = createToken({ name: 'OVER', pattern: /over/ });
export const NAMED = createToken({ name: 'NAMED', pattern: /named/ });
export const SET = createToken({ name: 'SET', pattern: /set/ });
export const TO = createToken({ name: 'TO', pattern: /to/ });
export const IF = createToken({ name: 'IF', pattern: /if/ });
export const ELSE = createToken({ name: 'ELSE', pattern: /else/ });
export const RESULT = createToken({ name: 'RESULT', pattern: /result/ });

export const PLUS = createToken({ name: 'PLUS', pattern: /\+/ });
export const MINUS = createToken({ name: 'MINUS', pattern: /-/ });
export const TIMES = createToken({ name: 'TIMES', pattern: /\*/ });
export const DIVIDE = createToken({ name: 'DIVIDE', pattern: /\// });
export const POWER = createToken({ name: 'POWER', pattern: /\^/ });

export const COLON = createToken({ name: 'COLON', pattern: /:/ });
export const LESS = createToken({ name: 'LESS', pattern: /</ });
export const GREATER = createToken({ name: 'GREATER', pattern: />/ });
export const EQUALS = createToken({ name: 'EQUALS', pattern: /=/ });
export const NOTEQUALS = createToken({ name: 'NOTEQUALS', pattern: /!=/ });
export const AT = createToken({ name: 'AT', pattern: /@/ });

export const HASH = createToken({ name: 'HASH', pattern: /#/ });
export const OR = createToken({ name: 'OR', pattern: /\|/ });
export const AND = createToken({ name: 'AND', pattern: /&/ });
export const EXCLAMATION = createToken({ name: 'EXCLAMATION', pattern: /!/ });

export const DOT = createToken({ name: 'DOT', pattern: /\./ });
export const DOUBLE_DOT = createToken({ name: 'DOUBLE_DOT', pattern: /\.\./ });
export const COMMA = createToken({ name: 'COMMA', pattern: /,/ });

export const LPAREN = createToken({ name: 'LPAREN', pattern: /\(/ });
export const RPAREN = createToken({ name: 'RPAREN', pattern: /\)/ });
export const LBRACE = createToken({ name: 'LBRACE', pattern: /\{/ });
export const RBRACE = createToken({ name: 'RBRACE', pattern: /}/ });
export const LBRACKET = createToken({ name: 'LBRACKET', pattern: /\[/ });
export const RBRACKET = createToken({ name: 'RBRACKET', pattern: /]/ });

export const LOWERNAME = createToken({ name: 'LOWERNAME', pattern: /[a-z][a-z]*/ });
export const UPPERNAME = createToken({ name: 'UPPERNAME', pattern: /[A-Z_][A-Z_]*/ });
export const NUMBER = createToken({ name: 'NUMBER', pattern: /\d+/ });

export const D_OP = createToken({ name: 'D_OP', pattern: /d/ });

export const INSTRING = createToken({ name: 'INSTRING', pattern: /"[^"]*"/ });

export const COMMENT = createToken({
  name: 'COMMENT',
  pattern: /\\[\s\S]*?\\/,
  group: Lexer.SKIPPED,
});

const allTokens = [
  COMMENT,
  OUTPUT,
  FUNCTION,
  LOOP,
  OVER,
  NAMED,
  SET,
  TO,
  IF,
  ELSE,
  RESULT,
  PLUS,
  MINUS,
  TIMES,
  DIVIDE,
  POWER,
  COLON,
  LESS,
  GREATER,
  EQUALS,
  NOTEQUALS,
  AT,
  HASH,
  OR,
  AND,
  EXCLAMATION,
  DOUBLE_DOT,
  DOT,
  COMMA,
  LPAREN,
  RPAREN,
  LBRACE,
  RBRACE,
  LBRACKET,
  RBRACKET,
  UPPERNAME,
  D_OP,
  LOWERNAME,
  NUMBER,
  INSTRING,
];

export const CLexer = new Lexer({
  defaultMode: 'main',
  modes: {
    main: allTokens,
  },
});