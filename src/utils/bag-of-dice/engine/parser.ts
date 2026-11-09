import { EmbeddedActionsParser, EOF } from 'chevrotain';
import type { IToken, TokenType } from 'chevrotain';
import type {
  AstNode,
  AstSpan,
  BinaryOpNode,
  ComparePoint,
  DiceNode,
  DicePlugin,
  FunctionCallNode,
  GroupedRollNode,
  ModifierNode,
  RollError,
  TableRollNode,
  TokenMap,
} from './contracts';
import { rollError } from './errors';
import {
  buildTokenVocabulary,
  coreTokens,
  snapshotTokens,
  tokenize,
  type TokenSnapshot,
  type TokenVocabulary,
} from './lexer';

interface DiceFaces {
  sides: AstNode;
  fudge?: boolean;
  fudgeVariant?: number;
  customFaces?: number[];
  computed?: boolean;
}

interface DiceTail {
  faces: DiceFaces;
  modifiers: ModifierNode[];
  label?: string;
}

type Suffix =
  | { kind: 'dice'; separator: IToken; tail: DiceTail }
  | { kind: 'table'; table: IToken };

const COMPARE_MODIFIERS = new Set(['r', 'ro', 'm', 'mt', 'cs', 'cf', 's', 'f']);

const MODIFIER_NAMES = new Set([
  'kh',
  'kl',
  'dh',
  'dl',
  'k',
  'd',
  'r',
  'ro',
  'mi',
  'ma',
  'm',
  'mt',
  's',
  'sa',
  'sd',
  'e',
  'cs',
  'cf',
  'f',
]);

export interface ParseResult {
  ast?: AstNode;
  errors: RollError[];
  tokens: IToken[];
  snapshot: TokenSnapshot[];
  /** Trailing message text accepted after the expression. */
  trailingText?: string;
}

export interface ParseOptions {
  plugins?: readonly DicePlugin[];
  maxRecovery?: number;
  vocabulary?: TokenVocabulary;
  /** Accept trailing message text after the expression. Defaults to true. */
  allowTrailingText?: boolean;
}

function spanOf(first: IToken, last: IToken): AstSpan {
  return {
    start: first.startOffset,
    end: (last.endOffset ?? last.startOffset) + 1,
  };
}

function isToken(value: unknown): value is IToken {
  return (
    typeof value === 'object' &&
    value !== null &&
    'tokenType' in (value as Record<string, unknown>)
  );
}

class CoreParser extends EmbeddedActionsParser {
  private readonly tokenMap: TokenMap;

  constructor(tokens: TokenType[], tokenMap: TokenMap) {
    super(tokens, {
      recoveryEnabled: true,
      maxLookahead: 5,
      skipValidations: false,
    });
    this.tokenMap = tokenMap;
    this.performSelfAnalysis();
  }

  /** Public peek used by the surrounding facade after parsing. */
  public peek(): IToken {
    return this.LA(1);
  }

  private token(name: string): TokenType {
    const token = this.tokenMap[name];
    if (!token) throw new Error(`unknown token: ${name}`);
    return token;
  }

  private node<T extends AstNode = AstNode>(
    value: { type: string; plugin?: string; [key: string]: unknown },
    start: IToken,
    end: IToken = this.LA(0),
  ): T {
    return {
      ...value,
      plugin: value.plugin ?? 'core',
      span: spanOf(start, end),
    } as T;
  }

  public expression = this.RULE('expression', (): AstNode =>
    this.SUBRULE(this.addition),
  );

  private addition = this.RULE('addition', (): AstNode => {
    const start = this.LA(1);
    let left = this.SUBRULE(this.multiplication);
    this.MANY(() => {
      const op = this.OR([
        {
          ALT: () => {
            this.CONSUME(this.token('Plus'));
            return '+' as const;
          },
        },
        {
          ALT: () => {
            this.CONSUME(this.token('Minus'));
            return '-' as const;
          },
        },
      ]);
      const right = this.SUBRULE2(this.multiplication);
      left = this.node<BinaryOpNode>(
        { type: 'BinaryOp', op, left, right, plugin: 'arithmetic' },
        start,
      );
    });
    return left;
  });

  private multiplication = this.RULE('multiplication', (): AstNode => {
    const start = this.LA(1);
    let left = this.SUBRULE(this.exponentiation);
    this.MANY(() => {
      const op = this.OR([
        {
          ALT: () => {
            this.CONSUME(this.token('Star'));
            return '*' as const;
          },
        },
        {
          ALT: () => {
            this.CONSUME(this.token('Slash'));
            return '/' as const;
          },
        },
        {
          ALT: () => {
            this.CONSUME(this.token('PercentOperator'));
            return '%' as const;
          },
        },
      ]);
      const right = this.SUBRULE2(this.exponentiation);
      left = this.node<BinaryOpNode>(
        { type: 'BinaryOp', op, left, right, plugin: 'arithmetic' },
        start,
      );
    });
    return left;
  });

  private exponentiation = this.RULE('exponentiation', (): AstNode => {
    const start = this.LA(1);
    const left = this.SUBRULE(this.unary);
    const op = this.OPTION(() => this.CONSUME(this.token('DoubleStar')));
    if (this.RECORDING_PHASE || !op) return left;
    const right = this.SUBRULE(this.exponentiation);
    return this.node<BinaryOpNode>(
      { type: 'BinaryOp', op: '**', left, right, plugin: 'arithmetic' },
      start,
    );
  });

  private unary = this.RULE('unary', (): AstNode => {
    const start = this.LA(1);
    const sign = this.OPTION(() =>
      this.OR([
        {
          ALT: () => {
            this.CONSUME(this.token('Plus'));
            return '+' as const;
          },
        },
        {
          ALT: () => {
            this.CONSUME(this.token('Minus'));
            return '-' as const;
          },
        },
      ]),
    );
    const operand = this.SUBRULE(this.postfix);
    if (this.RECORDING_PHASE || !sign) return operand;
    return this.node(
      { type: 'UnaryOp', op: sign, operand, plugin: 'arithmetic' },
      start,
    );
  });

  /**
   * Postfix dice/table layer. The base expression is optional so that bare
   * `d6` / `t[loot]` forms work; `2d6` is a number base followed by a dice
   * suffix. This avoids the ambiguity of trying to decide from a leading
   * number whether it is a count or a standalone literal.
   */
  private postfix = this.RULE('postfix', (): AstNode => {
    const start = this.LA(1);
    return this.OR([
      {
        GATE: () => this.LA(1).tokenType === this.token('DiceSeparator'),
        ALT: () => {
          const separator = this.CONSUME(this.token('DiceSeparator'));
          const tail = this.SUBRULE(this.diceTail);
          return this.buildDiceNode(undefined, separator, tail, start);
        },
      },
      {
        GATE: () => this.LA(1).tokenType === this.token('TableKeyword'),
        ALT: () => {
          this.CONSUME(this.token('TableKeyword'));
          const table = this.CONSUME(this.token('BracketText'));
          return this.buildTableNode(undefined, table, start);
        },
      },
      {
        GATE: () => {
          const type = this.LA(1).tokenType;
          return (
            type !== this.token('DiceSeparator') &&
            type !== this.token('TableKeyword')
          );
        },
        ALT: () => {
          const base = this.SUBRULE(this.baseExpression);
          const suffix = this.SUBRULE(this.optionalSuffix);
          const label = this.OPTION3(() => this.SUBRULE(this.label));
          if (this.RECORDING_PHASE) return base;
          const parsed = suffix as Suffix | undefined;
          const result = !parsed
            ? base
            : parsed.kind === 'dice'
              ? this.buildDiceNode(base, parsed.separator, parsed.tail, start)
              : this.buildTableNode(base, parsed.table, start);
          return label === undefined ? result : { ...result, label };
        },
      },
    ]);
  });

  private optionalSuffix = this.RULE('optionalSuffix', (): Suffix | undefined =>
    this.OPTION(() =>
      this.OR([
        {
          GATE: () => this.LA(1).tokenType === this.token('DiceSeparator'),
          ALT: () => {
            const separator = this.CONSUME(this.token('DiceSeparator'));
            const tail = this.SUBRULE(this.diceTail);
            return { kind: 'dice', separator, tail } as const;
          },
        },
        {
          GATE: () => this.LA(1).tokenType === this.token('TableKeyword'),
          ALT: () => {
            this.CONSUME(this.token('TableKeyword'));
            const table = this.CONSUME(this.token('BracketText'));
            return { kind: 'table', table } as const;
          },
        },
      ]),
    ),
  );

  private buildDiceNode(
    base: AstNode | undefined,
    separator: IToken,
    tail: DiceTail,
    start: IToken,
  ): DiceNode {
    const one: AstNode = this.node(
      { type: 'NumberLiteral', value: 1, plugin: 'arithmetic' },
      separator,
      separator,
    );
    const count = this.RECORDING_PHASE ? one : (base ?? one);
    const faces: DiceFaces = this.RECORDING_PHASE
      ? { sides: one }
      : (tail.faces ?? { sides: one });
    const modifierList = this.RECORDING_PHASE ? [] : (tail.modifiers ?? []);
    const label = this.RECORDING_PHASE ? undefined : tail.label;
    const computed =
      !this.RECORDING_PHASE &&
      (start.tokenType === this.token('LParen') ||
        (base !== undefined && base.type !== 'NumberLiteral'));
    return this.node<DiceNode>(
      {
        type: 'Dice',
        count,
        sides: faces.sides,
        ...(faces.fudge ? { fudge: true } : {}),
        ...(faces.fudgeVariant !== undefined
          ? { fudgeVariant: faces.fudgeVariant }
          : {}),
        ...(faces.customFaces ? { customFaces: faces.customFaces } : {}),
        ...(computed || faces.computed ? { computed: true } : {}),
        modifiers: [...modifierList],
        ...(label !== undefined ? { label } : {}),
        plugin: 'dice',
      },
      start,
    );
  }

  private buildTableNode(
    base: AstNode | undefined,
    table: IToken,
    start: IToken,
  ): TableRollNode {
    const one: AstNode = this.node(
      { type: 'NumberLiteral', value: 1, plugin: 'arithmetic' },
      table,
      table,
    );
    return this.node<TableRollNode>(
      {
        type: 'TableRoll',
        count: this.RECORDING_PHASE ? one : (base ?? one),
        table: table.image.slice(1, -1),
        plugin: 'table',
      },
      start,
    );
  }

  private numberLiteral = this.RULE('numberLiteral', (): AstNode => {
    const token = this.CONSUME(this.token('NumberLiteral'));
    return this.node(
      {
        type: 'NumberLiteral',
        value: Number(token.image),
        plugin: 'arithmetic',
      },
      token,
      token,
    );
  });

  private paren = this.RULE('paren', (): AstNode => {
    this.CONSUME(this.token('LParen'));
    const expression = this.SUBRULE(this.expression);
    this.CONSUME(this.token('RParen'));
    return expression;
  });

  private functionCall = this.RULE('functionCall', (): AstNode => {
    const start = this.LA(1);
    const name = this.CONSUME(this.token('Identifier'));
    this.CONSUME(this.token('LParen'));
    const args: AstNode[] = [];
    this.OPTION(() => {
      args.push(this.SUBRULE(this.expression));
      this.MANY(() => {
        this.CONSUME(this.token('Comma'));
        args.push(this.SUBRULE2(this.expression));
      });
    });
    this.CONSUME(this.token('RParen'));
    return this.node<FunctionCallNode>(
      {
        type: 'FunctionCall',
        name: name.image,
        args,
        plugin: 'arithmetic',
      },
      start,
    );
  });

  private baseExpression = this.RULE('baseExpression', (): AstNode =>
    this.OR([
      {
        GATE: () => this.LA(1).tokenType === this.token('NumberLiteral'),
        ALT: () => this.SUBRULE(this.numberLiteral),
      },
      {
        GATE: () => this.LA(1).tokenType === this.token('LParen'),
        ALT: () => this.SUBRULE(this.paren),
      },
      {
        GATE: () => this.LA(1).tokenType === this.token('LBrace'),
        ALT: () => this.SUBRULE(this.groupedRoll),
      },
      {
        GATE: () =>
          this.LA(1).tokenType === this.token('Identifier') &&
          this.LA(2).tokenType === this.token('LParen'),
        ALT: () => this.SUBRULE(this.functionCall),
      },
    ]),
  );

  private diceTail = this.RULE('diceTail', (): DiceTail => {
    const faces = this.SUBRULE(this.diceFaces);
    const modifiers = this.SUBRULE(this.modifiers);
    const label = this.OPTION(() => this.SUBRULE(this.label));
    return { faces, modifiers, ...(label !== undefined ? { label } : {}) };
  });

  private diceFaces = this.RULE('diceFaces', (): DiceFaces => {
    return this.OR([
      {
        GATE: () => this.LA(1).tokenType === this.token('NumberLiteral'),
        ALT: () => ({ sides: this.SUBRULE(this.simpleFaces) }),
      },
      {
        GATE: () => this.LA(1).tokenType === this.token('PercentOperator'),
        ALT: () => {
          const token = this.CONSUME(this.token('PercentOperator'));
          return {
            sides: this.node(
              { type: 'NumberLiteral', value: 100, plugin: 'arithmetic' },
              token,
              token,
            ),
          };
        },
      },
      {
        GATE: () => this.isFudgeAhead(),
        ALT: () => this.SUBRULE(this.fudgeFaces),
      },
      {
        GATE: () => this.LA(1).tokenType === this.token('LParen'),
        ALT: () => ({
          sides: this.SUBRULE(this.paren),
          computed: true,
        }),
      },
      {
        GATE: () => this.LA(1).tokenType === this.token('BracketText'),
        ALT: () => this.SUBRULE(this.customFaces),
      },
      {
        GATE: () =>
          this.LA(1).tokenType === this.token('Plus') ||
          this.LA(1).tokenType === this.token('Minus'),
        ALT: () => {
          const start = this.LA(1);
          const op = this.OR2([
            {
              ALT: () => {
                this.CONSUME(this.token('Plus'));
                return '+' as const;
              },
            },
            {
              ALT: () => {
                this.CONSUME(this.token('Minus'));
                return '-' as const;
              },
            },
          ]);
          const operand = this.SUBRULE2(this.simpleFaces);
          return {
            sides: this.node(
              { type: 'UnaryOp', op, operand, plugin: 'arithmetic' },
              start,
            ),
            computed: true,
          };
        },
      },
    ]);
  });

  private simpleFaces = this.RULE('simpleFaces', (): AstNode => {
    const token = this.CONSUME(this.token('NumberLiteral'));
    return this.node(
      {
        type: 'NumberLiteral',
        value: Number(token.image),
        plugin: 'arithmetic',
      },
      token,
      token,
    );
  });

  private fudgeFaces = this.RULE('fudgeFaces', (): DiceFaces => {
    const start = this.LA(1);
    this.CONSUME(this.token('Identifier'));
    const dot = this.OPTION(() => {
      this.CONSUME(this.token('Dot'));
      return this.CONSUME(this.token('NumberLiteral'));
    });
    const variant = !this.RECORDING_PHASE && dot ? Number(dot.image) : 0;
    return {
      fudge: true,
      fudgeVariant: variant,
      sides: this.node(
        { type: 'NumberLiteral', value: 3, plugin: 'arithmetic' },
        start,
      ),
    };
  });

  private customFaces = this.RULE('customFaces', (): DiceFaces => {
    const token = this.CONSUME(this.token('BracketText'));
    const body = token.image.slice(1, -1);
    const values = body
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .map(Number);
    return {
      customFaces: values,
      sides: this.node(
        { type: 'NumberLiteral', value: values.length, plugin: 'arithmetic' },
        token,
        token,
      ),
    };
  });

  private label = this.RULE('label', (): string => {
    const token = this.CONSUME(this.token('BracketText'));
    return token.image.slice(1, -1);
  });

  private groupedRoll = this.RULE('groupedRoll', (): AstNode => {
    const start = this.LA(1);
    this.CONSUME(this.token('LBrace'));
    const rolls: AstNode[] = [];
    if (this.LA(1).tokenType !== this.token('RBrace')) {
      rolls.push(this.SUBRULE(this.expression));
      this.MANY(() => {
        this.CONSUME(this.token('Comma'));
        rolls.push(this.SUBRULE2(this.expression));
      });
    }
    this.CONSUME(this.token('RBrace'));
    const modifiers = this.SUBRULE(this.modifiers);
    const label = this.OPTION(() => this.SUBRULE(this.label));
    return this.node<GroupedRollNode>(
      {
        type: 'GroupedRoll',
        rolls,
        modifiers,
        ...(label !== undefined ? { label } : {}),
        plugin: 'dice',
      },
      start,
    );
  });

  private modifiers = this.RULE('modifiers', (): ModifierNode[] => {
    const modifiers: ModifierNode[] = [];
    this.MANY({
      GATE: () =>
        this.isModifierStart(this.LA(1)) ||
        (this.LA(1).tokenType === this.token('DiceSeparator') &&
          this.LA(2).tokenType === this.token('NumberLiteral')),
      DEF: () => {
        modifiers.push(this.SUBRULE(this.modifierClause));
      },
    });
    // Multiple reroll/explode clauses may be comma separated.
    this.MANY2({
      GATE: () =>
        this.LA(1).tokenType === this.token('Comma') &&
        (this.isModifierStart(this.LA(2)) ||
          (this.LA(2).tokenType === this.token('DiceSeparator') &&
            this.LA(3).tokenType === this.token('NumberLiteral'))),
      DEF: () => {
        this.CONSUME(this.token('Comma'));
        modifiers.push(this.SUBRULE2(this.modifierClause));
      },
    });
    return modifiers;
  });

  private modifierClause = this.RULE('modifierClause', (): ModifierNode =>
    this.OR([
      {
        GATE: () => this.LA(1).tokenType === this.token('Bang'),
        ALT: () => this.SUBRULE(this.bangModifier),
      },
      {
        GATE: () =>
          this.LA(1).tokenType === this.token('DiceSeparator') &&
          this.LA(2).tokenType === this.token('NumberLiteral'),
        ALT: () => this.SUBRULE(this.dropShorthand),
      },
      {
        GATE: () => this.LA(1).tokenType === this.token('Identifier'),
        ALT: () => this.SUBRULE(this.identifierModifier),
      },
      {
        GATE: () => this.isCompareStart(this.LA(1)),
        ALT: () => this.SUBRULE(this.compareModifier),
      },
    ]),
  );

  private bangModifier = this.RULE('bangModifier', (): ModifierNode => {
    const start = this.LA(1);
    this.CONSUME(this.token('Bang'));
    const second = this.OPTION2(() => this.CONSUME2(this.token('Bang')));
    const penetrate = this.OPTION3({
      GATE: () =>
        this.LA(1).tokenType === this.token('Identifier') &&
        ['p', 'P'].includes(this.LA(1).image),
      DEF: () => this.CONSUME(this.token('Identifier')),
    });
    const compare = this.OPTION(() => this.SUBRULE(this.bangTarget));
    const name = second ? '!!' : penetrate ? '!p' : '!';
    return this.node<ModifierNode>(
      {
        type: 'Modifier',
        text: name + (compare ? compareText(compare) : ''),
        name,
        ...(compare ? { compare } : {}),
      },
      start,
    );
  });

  private dropShorthand = this.RULE('dropShorthand', (): ModifierNode => {
    const start = this.LA(1);
    this.CONSUME(this.token('DiceSeparator'));
    const value = this.CONSUME(this.token('NumberLiteral'));
    return this.node<ModifierNode>(
      {
        type: 'Modifier',
        text: `d${value.image}`,
        name: 'd',
        argument: Number(value.image),
      },
      start,
    );
  });

  private identifierModifier = this.RULE(
    'identifierModifier',
    (): ModifierNode => {
      const start = this.LA(1);
      const name = this.CONSUME(this.token('Identifier'));
      const argument = this.OPTION(() => {
        const token = this.CONSUME(this.token('NumberLiteral'));
        return Number(token.image);
      });
      const normalized = name.image.toLowerCase();
      const compare = this.OPTION2({
        GATE: () => COMPARE_MODIFIERS.has(normalized),
        DEF: () => this.SUBRULE(this.comparePoint),
      });
      return this.node<ModifierNode>(
        {
          type: 'Modifier',
          text:
            name.image +
            (argument !== undefined ? String(argument) : '') +
            (compare ? compareText(compare) : ''),
          name: normalized,
          ...(argument !== undefined ? { argument } : {}),
          ...(compare ? { compare } : {}),
        },
        start,
      );
    },
  );

  private compareModifier = this.RULE('compareModifier', (): ModifierNode => {
    const start = this.LA(1);
    const compare = this.SUBRULE(this.comparePoint);
    return this.node<ModifierNode>(
      {
        type: 'Modifier',
        text: compareText(compare),
        name: 'compare',
        compare,
      },
      start,
    );
  });

  private bangTarget = this.RULE('bangTarget', (): ComparePoint =>
    this.OR([
      {
        GATE: () => this.isCompareStart(this.LA(1)),
        ALT: () => this.SUBRULE(this.comparePoint),
      },
      {
        GATE: () => this.LA(1).tokenType === this.token('NumberLiteral'),
        ALT: () => {
          const value = this.CONSUME(this.token('NumberLiteral'));
          return { op: '=' as const, value: Number(value.image) };
        },
      },
    ]),
  );

  private comparePoint = this.RULE('comparePoint', (): ComparePoint => {
    const op = this.SUBRULE(this.compareOp);
    const value = this.CONSUME(this.token('NumberLiteral'));
    return { op, value: Number(value.image) };
  });

  private compareOp = this.RULE('compareOp', (): ComparePoint['op'] =>
    this.OR([
      {
        ALT: () => {
          this.CONSUME(this.token('GreaterEqual'));
          return '>=' as const;
        },
      },
      {
        ALT: () => {
          this.CONSUME(this.token('LessEqual'));
          return '<=' as const;
        },
      },
      {
        ALT: () => {
          this.CONSUME(this.token('EqualEqual'));
          return '=' as const;
        },
      },
      {
        ALT: () => {
          this.CONSUME(this.token('NotEqual'));
          return '!=' as const;
        },
      },
      {
        ALT: () => {
          this.CONSUME(this.token('Greater'));
          return '>' as const;
        },
      },
      {
        ALT: () => {
          this.CONSUME(this.token('Less'));
          return '<' as const;
        },
      },
      {
        ALT: () => {
          this.CONSUME(this.token('Equal'));
          return '=' as const;
        },
      },
    ]),
  );

  private isFudgeAhead(): boolean {
    return (
      this.LA(1).tokenType === this.token('Identifier') &&
      this.LA(1).image.toLowerCase() === 'f'
    );
  }

  private isCompareStart(token: IToken): boolean {
    return [
      this.token('Greater'),
      this.token('GreaterEqual'),
      this.token('Less'),
      this.token('LessEqual'),
      this.token('Equal'),
      this.token('EqualEqual'),
      this.token('NotEqual'),
    ].includes(token.tokenType);
  }

  private isModifierStart(token: IToken): boolean {
    if (token.tokenType === this.token('Bang')) return true;
    if (this.isCompareStart(token)) return true;
    if (token.tokenType !== this.token('Identifier')) return false;
    return MODIFIER_NAMES.has(token.image.toLowerCase());
  }
}

function compareText(compare: ComparePoint): string {
  return `${compare.op}${compare.value}`;
}

/** Collect the first/last token from arbitrary CST children (plugin helper). */
export function cstSpan(
  children: Record<string, unknown> | undefined,
): AstSpan {
  const tokens: IToken[] = [];
  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
    } else if (isToken(value)) {
      tokens.push(value);
    }
  };
  if (children) Object.values(children).forEach(visit);
  if (tokens.length === 0) return { start: 0, end: 0 };
  return spanOf(tokens[0], tokens[tokens.length - 1]);
}

/** Convert a token pair to a span; exported for plugin CST converters. */
export function tokenSpan(first: IToken, last: IToken = first): AstSpan {
  return spanOf(first, last);
}

const defaultVocabulary = buildTokenVocabulary();
const pluginVocabularyCache = new WeakMap<
  readonly DicePlugin[],
  TokenVocabulary
>();
const parserCache = new WeakMap<TokenVocabulary, CoreParser>();

function resolveVocabulary(options: ParseOptions): TokenVocabulary {
  if (options.vocabulary) return options.vocabulary;
  const plugins = options.plugins;
  if (!plugins || plugins.length === 0) return defaultVocabulary;
  let vocabulary = pluginVocabularyCache.get(plugins);
  if (!vocabulary) {
    vocabulary = buildTokenVocabulary(plugins);
    pluginVocabularyCache.set(plugins, vocabulary);
  }
  return vocabulary;
}

function resolveParser(vocabulary: TokenVocabulary): CoreParser {
  let parser = parserCache.get(vocabulary);
  if (!parser) {
    parser = new CoreParser(vocabulary.allTokens, vocabulary.tokenMap);
    parserCache.set(vocabulary, parser);
  }
  return parser;
}

export function parseExpression(
  source: string,
  options: ParseOptions = {},
): ParseResult {
  const vocabulary = resolveVocabulary(options);
  const lexed = tokenize(source, vocabulary);

  if (lexed.errors.length > 0) {
    const errors = lexed.errors.map((error) =>
      rollError('PARSE_UNKNOWN_TOKEN', error.message, {
        pass: 'parse',
        plugin: 'lexer',
        span: { start: error.offset, end: error.offset + 1 },
        params: { line: error.line, column: error.column },
      }),
    );
    return {
      errors: boundErrors(errors, options.maxRecovery),
      tokens: lexed.tokens,
      snapshot: snapshotTokens(lexed.tokens),
    };
  }

  const parser = resolveParser(vocabulary);
  parser.input = lexed.tokens;
  let ast: AstNode | undefined;
  try {
    ast = parser.expression();
  } catch (error) {
    const errors = parser.errors
      .filter(
        (exception) =>
          options.allowTrailingText === false ||
          exception.name !== 'NotAllInputParsedException',
      )
      .map((exception) => recognitionToError(exception, source));
    if (errors.length === 0) {
      errors.push(
        rollError(
          'INTERNAL',
          error instanceof Error ? error.message : String(error),
          { pass: 'parse', plugin: 'parser', cause: error },
        ),
      );
    }
    return {
      errors: boundErrors(errors, options.maxRecovery),
      tokens: lexed.tokens,
      snapshot: snapshotTokens(lexed.tokens),
    };
  }

  const errors = parser.errors
    .filter(
      (exception) =>
        options.allowTrailingText === false ||
        exception.name !== 'NotAllInputParsedException',
    )
    .map((exception) => recognitionToError(exception, source));

  const trailing = parser.peek();
  let trailingText: string | undefined;
  if (trailing.tokenType !== EOF) {
    if (options.allowTrailingText === false) {
      errors.push(
        rollError(
          'PARSE_UNEXPECTED_TOKEN',
          `unexpected token "${trailing.image}"`,
          {
            pass: 'parse',
            plugin: 'parser',
            span: spanOf(trailing, trailing),
            params: { token: trailing.image },
          },
        ),
      );
    } else {
      trailingText = source.slice(trailing.startOffset).trim();
    }
  }

  return {
    ...(ast ? { ast } : {}),
    ...(trailingText ? { trailingText } : {}),
    errors: boundErrors(errors, options.maxRecovery),
    tokens: lexed.tokens,
    snapshot: snapshotTokens(lexed.tokens),
  };
}

function boundErrors(
  errors: RollError[],
  maxRecovery: number | undefined,
): RollError[] {
  const limit = maxRecovery ?? 10;
  if (errors.length <= limit) return errors;
  return [
    ...errors.slice(0, limit),
    rollError(
      'PARSE_RECOVERY_LIMIT',
      `parser exceeded the recovery limit of ${limit} errors`,
      { pass: 'parse', plugin: 'parser', params: { limit } },
    ),
  ];
}

function recognitionToError(
  exception: {
    name?: string;
    message: string;
    token?: IToken;
  },
  source: string,
): RollError {
  const token = exception.token;
  let span = token ? spanOf(token, token) : undefined;
  if (
    token &&
    (span === undefined || span.start < 0 || token.tokenType === EOF)
  ) {
    span = { start: source.length, end: source.length };
  }
  const code =
    exception.name === 'MismatchedTokenException'
      ? 'PARSE_UNEXPECTED_TOKEN'
      : exception.name === 'NoViableAltException'
        ? 'PARSE_UNEXPECTED_TOKEN'
        : exception.name === 'EarlyExitException'
          ? 'PARSE_MISMATCHED_GROUP'
          : 'PARSE_UNEXPECTED_TOKEN';
  return rollError(code, exception.message, {
    pass: 'parse',
    plugin: 'parser',
    ...(span ? { span } : {}),
    params: token
      ? { token: token.image, snippet: snippetAt(source, token.startOffset) }
      : undefined,
  });
}

function snippetAt(source: string, offset: number): string {
  const start = Math.max(0, offset - 12);
  const end = Math.min(source.length, offset + 12);
  return source.slice(start, end);
}

/** Token map used by the built-in grammar; exported for plugin rule builders. */
export function createCoreTokenMap(): TokenMap {
  return coreTokens();
}
