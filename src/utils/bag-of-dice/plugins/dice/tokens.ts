import { createToken } from 'chevrotain';
import { LCurly, RCurly, LParen, RParen, LBracket, RBracket, Comma, WhiteSpace } from '../../core/tokens';

export const Sa = createToken({ name: 'Sa', pattern: /sa/ });
export const Sd = createToken({ name: 'Sd', pattern: /sd/ });
export const S = createToken({ name: 'S', pattern: /s/ });
export const F = createToken({ name: 'F', pattern: /f/ });
export const M = createToken({ name: 'M', pattern: /m/ });
export const E = createToken({ name: 'E', pattern: /e/ });
export const Kh = createToken({ name: 'Kh', pattern: /kh\d+/ });
export const Kl = createToken({ name: 'Kl', pattern: /kl\d+/ });
export const Dh = createToken({ name: 'Dh', pattern: /dh\d+/ });
export const Dl = createToken({ name: 'Dl', pattern: /dl\d+/ });
export const Reroll = createToken({ name: 'Reroll', pattern: /r(o)?(a)?(<|>|=)?\d+/ });
export const Explode = createToken({ name: 'Explode', pattern: /!!|!p|!([<>=]?\d+)?/ });
export const Mi = createToken({ name: 'Mi', pattern: /mi\d+/ });
export const Ma = createToken({ name: 'Ma', pattern: /ma\d+/ });
export const Success = createToken({ name: 'Success', pattern: />\d+/ });
export const Failure = createToken({ name: 'Failure', pattern: /<\d+/ });
export const Equal = createToken({ name: 'Equal', pattern: /=\d+/ });
export const Cs = createToken({ name: 'Cs', pattern: /cs[><=]+\d*/ });
export const Cf = createToken({ name: 'Cf', pattern: /cf[><=]+\d*/ });
export const Kgt = createToken({ name: 'Kgt', pattern: /k>\d+/ });
export const Klt = createToken({ name: 'Klt', pattern: /k<\d+/ });
export const O = createToken({ name: 'O', pattern: /o/ });

export const D = createToken({ name: 'D', pattern: /d/ });
export const DPercent = createToken({ name: 'DPercent', pattern: /d%/ });
export const DF = createToken({ name: 'DF', pattern: /dF(\.[123])?/ });
export const NumberLiteral = createToken({ name: 'NumberLiteral', pattern: /-?\d+/ });
export const Identifier = createToken({ name: 'Identifier', pattern: /[a-zA-Z_][a-zA-Z0-9_]*/ });

export const allDiceTokens = [
  WhiteSpace,
  // Modifiers first to avoid ambiguity with D
  Kh, Kl, Dh, Dl, Reroll, Explode, Mi, Ma, Success, Failure, Equal, Cs, Cf, Kgt, Klt,
  Sa, Sd, S, F, M, E, O,
  // Then dice tokens
  DPercent,
  DF,
  D,
  NumberLiteral,
  LBracket,
  RBracket,
  LCurly,
  RCurly,
  Comma,
  LParen,
  RParen,
  Identifier,
];

export { LBracket, RBracket, LCurly, RCurly, Comma, LParen, RParen } from '../../core/tokens'; 