import { createToken } from 'chevrotain';
import { LParen, RParen, WhiteSpace, Comma } from '../../core/tokens';

export const ArithmeticPlus = createToken({ name: 'ArithmeticPlus', pattern: /\+/ });
export const ArithmeticMinus = createToken({ name: 'ArithmeticMinus', pattern: /-/ });
export const ArithmeticMult = createToken({ name: 'ArithmeticMult', pattern: /\*/ });
export const ArithmeticDiv = createToken({ name: 'ArithmeticDiv', pattern: /\// });
export const ArithmeticMod = createToken({ name: 'ArithmeticMod', pattern: /%/ });
export const ArithmeticPow = createToken({ name: 'ArithmeticPow', pattern: /\*\*/ });

export const ArithmeticNumberLiteral = createToken({ name: 'ArithmeticNumberLiteral', pattern: /\d+(?:\.\d+)?/ });

export const ArithmeticFloor = createToken({ name: 'ArithmeticFloor', pattern: /floor/ });
export const ArithmeticCeil = createToken({ name: 'ArithmeticCeil', pattern: /ceil/ });
export const ArithmeticRound = createToken({ name: 'ArithmeticRound', pattern: /round/ });
export const ArithmeticAbs = createToken({ name: 'ArithmeticAbs', pattern: /abs/ });

export const allArithmeticTokens = [
  WhiteSpace,
  ArithmeticPow,
  ArithmeticPlus,
  ArithmeticMinus,
  ArithmeticMult,
  ArithmeticDiv,
  ArithmeticMod,
  LParen,
  RParen,
  ArithmeticFloor,
  ArithmeticCeil,
  ArithmeticRound,
  ArithmeticAbs,
  ArithmeticNumberLiteral,
];

export { LParen, RParen } from '../../core/tokens'; 