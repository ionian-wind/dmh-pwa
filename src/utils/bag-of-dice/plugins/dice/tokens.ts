import { createToken } from 'chevrotain';
import { LCurly, RCurly, LParen, RParen, LBracket, RBracket, Comma, WhiteSpace } from '../../core/tokens';

export const DiceSa = createToken({ name: 'DiceSa', pattern: /sa/ });
export const DiceSd = createToken({ name: 'DiceSd', pattern: /sd/ });
export const DiceS = createToken({ name: 'DiceS', pattern: /s/ });
export const DiceF = createToken({ name: 'DiceF', pattern: /f/ });
export const DiceM = createToken({ name: 'DiceM', pattern: /m/ });
export const DiceE = createToken({ name: 'DiceE', pattern: /e/ });
export const DiceKh = createToken({ name: 'DiceKh', pattern: /kh\d+/ });
export const DiceKl = createToken({ name: 'DiceKl', pattern: /kl\d+/ });
export const DiceDh = createToken({ name: 'DiceDh', pattern: /dh\d+/ });
export const DiceDl = createToken({ name: 'DiceDl', pattern: /dl\d+/ });
export const DiceReroll = createToken({ name: 'DiceReroll', pattern: /r(o)?(a)?(<|>|=)?\d+/ });
export const DiceExplode = createToken({ name: 'DiceExplode', pattern: /!!|!p|!([<>=]?\d+)?/ });
export const DiceMi = createToken({ name: 'DiceMi', pattern: /mi\d+/ });
export const DiceMa = createToken({ name: 'DiceMa', pattern: /ma\d+/ });
export const DiceSuccess = createToken({ name: 'DiceSuccess', pattern: />\d+/ });
export const DiceFailure = createToken({ name: 'DiceFailure', pattern: /<\d+/ });
export const DiceEqual = createToken({ name: 'DiceEqual', pattern: /=\d+/ });
export const DiceCs = createToken({ name: 'DiceCs', pattern: /cs[><=]+\d*/ });
export const DiceCf = createToken({ name: 'DiceCf', pattern: /cf[><=]+\d*/ });
export const DiceKgt = createToken({ name: 'DiceKgt', pattern: /k>\d+/ });
export const DiceKlt = createToken({ name: 'DiceKlt', pattern: /k<\d+/ });
export const DiceO = createToken({ name: 'DiceO', pattern: /o/ });

export const DiceD = createToken({ name: 'DiceD', pattern: /d/ });
export const DiceDPercent = createToken({ name: 'DiceDPercent', pattern: /d%/ });
export const DiceDF = createToken({ name: 'DiceDF', pattern: /dF(\.[123])?/ });
export const DiceNumberLiteral = createToken({ name: 'DiceNumberLiteral', pattern: /-?\d+/ });
export const DiceIdentifier = createToken({ name: 'DiceIdentifier', pattern: /[a-zA-Z_][a-zA-Z0-9_]*/ });

export const allDiceTokens = [
  WhiteSpace,
  // Modifiers first to avoid ambiguity with D
  DiceKh, DiceKl, DiceDh, DiceDl, DiceReroll, DiceExplode, DiceMi, DiceMa, DiceSuccess, DiceFailure, DiceEqual, DiceCs, DiceCf, DiceKgt, DiceKlt,
  DiceSa, DiceSd, DiceS, DiceF, DiceM, DiceE, DiceO,
  // Then dice tokens
  DiceDPercent,
  DiceDF,
  DiceD,
  DiceNumberLiteral,
  LBracket,
  RBracket,
  LCurly,
  RCurly,
  Comma,
  LParen,
  RParen,
  DiceIdentifier,
];

export { LBracket, RBracket, LCurly, RCurly, Comma, LParen, RParen } from '../../core/tokens'; 