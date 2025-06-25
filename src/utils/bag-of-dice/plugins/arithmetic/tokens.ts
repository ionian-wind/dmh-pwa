import { createToken } from 'chevrotain';
import { LParen, RParen, WhiteSpace, Comma } from '../../core/tokens';

export const Plus = createToken({ name: 'Plus', pattern: /\+/ });
export const Minus = createToken({ name: 'Minus', pattern: /-/ });
export const Mult = createToken({ name: 'Mult', pattern: /\*/ });
export const Div = createToken({ name: 'Div', pattern: /\// });
export const Mod = createToken({ name: 'Mod', pattern: /%/ });
export const Pow = createToken({ name: 'Pow', pattern: /\*\*/ });

export const NumberLiteral = createToken({ name: 'NumberLiteral', pattern: /\d+(?:\.\d+)?/ });

export const Floor = createToken({ name: 'Floor', pattern: /floor/ });
export const Ceil = createToken({ name: 'Ceil', pattern: /ceil/ });
export const Round = createToken({ name: 'Round', pattern: /round/ });
export const Abs = createToken({ name: 'Abs', pattern: /abs/ });

export const allArithmeticTokens = [
  WhiteSpace,
  Pow,
  Plus,
  Minus,
  Mult,
  Div,
  Mod,
  LParen,
  RParen,
  Floor,
  Ceil,
  Round,
  Abs,
  NumberLiteral,
];

export { LParen, RParen } from '../../core/tokens'; 