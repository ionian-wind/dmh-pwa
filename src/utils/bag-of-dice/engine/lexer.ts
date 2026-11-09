import { createToken, Lexer } from 'chevrotain';
import type { IToken, TokenType } from 'chevrotain';
import type { DicePlugin, TokenMap } from './contracts';

/* ------------------------------------------------------------------------- */
/* Core tokens                                                                */
/* ------------------------------------------------------------------------- */

export const WhiteSpace = createToken({
  name: 'WhiteSpace',
  pattern: /\s+/,
  group: Lexer.SKIPPED,
});

/** A whole `[label]` / `[a,b,c]` / `[table]` bracket body. */
export const BracketText = createToken({
  name: 'BracketText',
  pattern: /\[[^[\]\n]*\]/,
});

export const GreaterEqual = createToken({
  name: 'GreaterEqual',
  pattern: />=/,
});
export const LessEqual = createToken({
  name: 'LessEqual',
  pattern: /<=/,
});
export const EqualEqual = createToken({
  name: 'EqualEqual',
  pattern: /==/,
});
export const NotEqual = createToken({
  name: 'NotEqual',
  pattern: /!=/,
});
export const Greater = createToken({ name: 'Greater', pattern: />/ });
export const Less = createToken({ name: 'Less', pattern: /</ });
export const Equal = createToken({ name: 'Equal', pattern: /=/ });

export const DoubleStar = createToken({
  name: 'DoubleStar',
  pattern: /\*\*/,
});
export const Star = createToken({ name: 'Star', pattern: /\*/ });
export const Slash = createToken({ name: 'Slash', pattern: /\// });
export const PercentOperator = createToken({
  name: 'PercentOperator',
  pattern: /%/,
});
export const Plus = createToken({ name: 'Plus', pattern: /\+/ });
export const Minus = createToken({ name: 'Minus', pattern: /-/ });
export const Bang = createToken({ name: 'Bang', pattern: /!/ });

export const LParen = createToken({ name: 'LParen', pattern: /\(/ });
export const RParen = createToken({ name: 'RParen', pattern: /\)/ });
export const LBrace = createToken({ name: 'LBrace', pattern: /\{/ });
export const RBrace = createToken({ name: 'RBrace', pattern: /\}/ });
export const LBracket = createToken({ name: 'LBracket', pattern: /\[/ });
export const RBracket = createToken({ name: 'RBracket', pattern: /\]/ });
export const Comma = createToken({ name: 'Comma', pattern: /,/ });
export const Dot = createToken({ name: 'Dot', pattern: /\./ });
export const Colon = createToken({ name: 'Colon', pattern: /:/ });
export const Pipe = createToken({ name: 'Pipe', pattern: /\|/ });
export const Question = createToken({ name: 'Question', pattern: /\?/ });
export const At = createToken({ name: 'At', pattern: /@/ });
export const Hash = createToken({ name: 'Hash', pattern: /#/ });
export const Dollar = createToken({ name: 'Dollar', pattern: /\$/ });
export const Ampersand = createToken({ name: 'Ampersand', pattern: /&/ });
export const Semicolon = createToken({ name: 'Semicolon', pattern: /;/ });

/**
 * `d`/`D` when followed by something that can start die faces. The lookahead is
 * what keeps modifier keywords such as `dh`, `dl` and `d` as identifiers.
 */
export const DiceSeparator = createToken({
  name: 'DiceSeparator',
  pattern: /[dD](?=[0-9%+\-Ff[(])/,
});

/** `t`/`T` introducer for table rolls (`2t[loot]`). */
export const TableKeyword = createToken({
  name: 'TableKeyword',
  pattern: /[tT](?=\[)/,
});

export const NumberLiteral = createToken({
  name: 'NumberLiteral',
  pattern: /\d+(?:\.\d+)?/,
});

export const Identifier = createToken({
  name: 'Identifier',
  pattern: /[A-Za-z_][A-Za-z_-]*/,
});

/** Core tokens that must be ordered before plugin tokens. */
const CORE_PREFIX: TokenType[] = [
  WhiteSpace,
  BracketText,
  GreaterEqual,
  LessEqual,
  EqualEqual,
  NotEqual,
  DoubleStar,
  Greater,
  Less,
  Equal,
  Star,
  Slash,
  PercentOperator,
  Plus,
  Minus,
  Bang,
  LParen,
  RParen,
  LBrace,
  RBrace,
  LBracket,
  RBracket,
  Comma,
  Dot,
  Colon,
  Pipe,
  Question,
  At,
  Hash,
  Dollar,
  Ampersand,
  Semicolon,
  DiceSeparator,
  TableKeyword,
  NumberLiteral,
];

/** Core tokens that are safely ordered after plugin tokens. */
const CORE_SUFFIX: TokenType[] = [Identifier];

export class PluginRegistrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PluginRegistrationError';
  }
}

export interface TokenVocabulary {
  allTokens: TokenType[];
  tokenMap: TokenMap;
}

/**
 * Compose the deterministic token vocabulary used by a parser build.
 *
 * Plugin tokens are placed before the catch-all identifier so custom keywords
 * win, and duplicate names are rejected unless the patterns are identical.
 */
export function buildTokenVocabulary(
  plugins: readonly DicePlugin[] = [],
): TokenVocabulary {
  const tokenMap: TokenMap = {};
  const allTokens: TokenType[] = [];

  const add = (token: TokenType, origin: string) => {
    const existing = tokenMap[token.name];
    if (existing) {
      if (!samePattern(existing, token)) {
        throw new PluginRegistrationError(
          `token name collision: "${token.name}" is declared by ${origin} with a different pattern`,
        );
      }
      return;
    }
    tokenMap[token.name] = token;
    allTokens.push(token);
  };

  for (const token of CORE_PREFIX) add(token, 'core');

  const pluginTokenNames = new Set<string>();
  for (const plugin of plugins) {
    if (!plugin.name.trim()) {
      throw new PluginRegistrationError('plugin name must not be empty');
    }
    for (const token of plugin.tokens) {
      const previous = pluginTokenNames.has(token.name)
        ? plugin.name
        : undefined;
      void previous;
      add(token, `plugin "${plugin.name}"`);
      pluginTokenNames.add(token.name);
    }
  }

  for (const token of CORE_SUFFIX) add(token, 'core');

  return { allTokens, tokenMap };
}

function samePattern(a: TokenType, b: TokenType): boolean {
  return String(a.PATTERN) === String(b.PATTERN);
}

export interface LexResult {
  tokens: IToken[];
  errors: Array<{
    offset: number;
    line: number;
    column: number;
    message: string;
  }>;
}

export function tokenize(
  source: string,
  vocabulary: TokenVocabulary,
): LexResult {
  const lexer = new Lexer(vocabulary.allTokens, {
    positionTracking: 'full',
  });
  const result = lexer.tokenize(source);
  return {
    tokens: result.tokens,
    errors: result.errors.map((error) => ({
      offset: error.offset,
      line: error.line ?? 1,
      column: error.column ?? 1,
      message: error.message,
    })),
  };
}

export interface TokenSnapshot {
  name: string;
  image: string;
  start: number;
  end: number;
  line: number;
  column: number;
}

/** Stable, serializable token stream used in parse diagnostics. */
export function snapshotTokens(tokens: readonly IToken[]): TokenSnapshot[] {
  return tokens.map((token) => ({
    name: token.tokenType.name,
    image: token.image,
    start: token.startOffset,
    end: token.endOffset ?? token.startOffset,
    line: token.startLine ?? 1,
    column: token.startColumn ?? 1,
  }));
}

/** Look up the token type for a name; useful to plugin grammars. */
export function coreTokens(): TokenMap {
  const map: TokenMap = {};
  for (const token of [...CORE_PREFIX, ...CORE_SUFFIX]) {
    map[token.name] = token;
  }
  return map;
}
