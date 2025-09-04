import { createToken, Lexer } from 'chevrotain';

export const WhiteSpace = createToken({
  name: 'WhiteSpace',
  pattern: /[ \t\n\r]+/,
  group: Lexer.SKIPPED,
});
export const Integer = createToken({ name: 'Integer', pattern: /\d+/ });
export const Decimal = createToken({ name: 'Decimal', pattern: /\d+\.\d+/ });
export const D = createToken({ name: 'D', pattern: /d/i });
export const FudgeDice = createToken({ name: 'FudgeDice', pattern: /dF\.\d+/ });
export const FudgeDiceBasic = createToken({
  name: 'FudgeDiceBasic',
  pattern: /dF/i,
});
export const Plus = createToken({ name: 'Plus', pattern: /\+/ });
export const Minus = createToken({ name: 'Minus', pattern: /-/ });
export const Multiply = createToken({ name: 'Multiply', pattern: /\*/ });
export const Divide = createToken({ name: 'Divide', pattern: /\// });
export const Modulo = createToken({ name: 'Modulo', pattern: /%/ });
export const Exponent = createToken({ name: 'Exponent', pattern: /\*\*/ });
export const LParen = createToken({ name: 'LParen', pattern: /\(/ });
export const RParen = createToken({ name: 'RParen', pattern: /\)/ });

// Dice Modifiers (partial, to be extended)
export const Kh = createToken({ name: 'Kh', pattern: /kh\d+/ });
export const Kl = createToken({ name: 'Kl', pattern: /kl\d+/ });
export const Dh = createToken({ name: 'Dh', pattern: /dh\d+/ });
export const Dl = createToken({ name: 'Dl', pattern: /dl\d+/ });
export const R = createToken({ name: 'R', pattern: /r\d+/ });
export const Ro = createToken({ name: 'Ro', pattern: /ro\d+/ });
export const Rlt = createToken({ name: 'Rlt', pattern: /r<\d+/ });
export const Rgt = createToken({ name: 'Rgt', pattern: /r>\d+/ });
export const Req = createToken({ name: 'Req', pattern: /r=\d+/ });
export const Rne = createToken({ name: 'Rne', pattern: /r!=\d+/ });
export const Explode = createToken({
  name: 'Explode',
  pattern: /!(!|p|r|<\d+|>\d+|=\d+|\d+)?/,
});
export const Mi = createToken({ name: 'Mi', pattern: /mi\d+/ });
export const Ma = createToken({ name: 'Ma', pattern: /ma\d+/ });
export const M = createToken({ name: 'M', pattern: /m/ });
export const Gt = createToken({ name: 'Gt', pattern: />\d+/ });
export const Lt = createToken({ name: 'Lt', pattern: /<\d+/ });
export const Eq = createToken({ name: 'Eq', pattern: /=\d+/ });
export const Sa = createToken({ name: 'Sa', pattern: /sa/ });
export const Sd = createToken({ name: 'Sd', pattern: /sd/ });
export const S = createToken({ name: 'S', pattern: /s/ });
export const F = createToken({ name: 'F', pattern: /f/ });
export const Cs = createToken({ name: 'Cs', pattern: /cs[><=]*\d*/ });
export const Cf = createToken({ name: 'Cf', pattern: /cf[><=]*\d*/ });
export const Kgt = createToken({ name: 'Kgt', pattern: /k>\d+/ });
export const Klt = createToken({ name: 'Klt', pattern: /k<\d+/ });

export const Floor = createToken({ name: 'Floor', pattern: /floor/ });
export const Ceil = createToken({ name: 'Ceil', pattern: /ceil/ });
export const Round = createToken({ name: 'Round', pattern: /round/ });
export const Abs = createToken({ name: 'Abs', pattern: /abs/ });
export const Min = createToken({ name: 'Min', pattern: /min/ });
export const Max = createToken({ name: 'Max', pattern: /max/ });
export const Comma = createToken({ name: 'Comma', pattern: /,/ });

// Macro token for #macro_name
export const Macro = createToken({
  name: 'Macro',
  pattern: /#[a-zA-Z_][a-zA-Z0-9_-]*/,
});

// Inline roll token for [[...]]
export const InlineRoll = createToken({
  name: 'InlineRoll',
  pattern: /\[\[[\s\S]*?\]\]/,
});

// Table tokens for Nt[table-name]
export const TableRoll = createToken({
  name: 'TableRoll',
  pattern: /\d+t\[[a-zA-Z_][a-zA-Z0-9_-]*\]/,
});
export const TableName = createToken({
  name: 'TableName',
  pattern: /\[[a-zA-Z_][a-zA-Z0-9_-]*\]/,
});

// Dice labels and custom dice
export const LBracket = createToken({ name: 'LBracket', pattern: /\[/ });
export const RBracket = createToken({ name: 'RBracket', pattern: /\]/ });
export const LabelText = createToken({
  name: 'LabelText',
  pattern: /[a-zA-Z0-9_\s\-]{2,}/,
});

// Grouped roll modifiers
export const LBrace = createToken({ name: 'LBrace', pattern: /\{/ });
export const RBrace = createToken({ name: 'RBrace', pattern: /\}/ });
export const Semicolon = createToken({ name: 'Semicolon', pattern: /;/ });

export const O = createToken({ name: 'O', pattern: /o/ });

export const E = createToken({ name: 'E', pattern: /e/ });

export const AllTokens = [
  WhiteSpace,
  Floor,
  Ceil,
  Round,
  Abs,
  Min,
  Max,
  Comma,
  Kh,
  Kl,
  Dh,
  Dl,
  Kgt,
  Klt,
  R,
  Ro,
  Rlt,
  Rgt,
  Req,
  Rne,
  Explode,
  Mi,
  Ma,
  Cs,
  Cf,
  Sa,
  Sd,
  Gt,
  Lt,
  Eq,
  E,
  Decimal,
  Integer,
  FudgeDice,
  FudgeDiceBasic,
  D,
  Plus,
  Minus,
  Exponent,
  Multiply,
  Divide,
  Modulo,
  LParen,
  RParen,
  Macro,
  InlineRoll,
  LBracket,
  RBracket,
  TableRoll,
  TableName,
  LBrace,
  RBrace,
  Semicolon,
  LabelText,
  O,
  M,
  S,
  F,
];
