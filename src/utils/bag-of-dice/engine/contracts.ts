/**
 * Shared public contracts for the bag-of-dice engine.
 *
 * This module is deliberately framework-free: it must not import Vue, Pinia,
 * chat state or any UI module. Everything the engine needs from the outside
 * world enters through repositories, options and the RNG.
 */

import type { CstNode, CstParser, TokenType } from 'chevrotain';

/* ------------------------------------------------------------------------- */
/* Source spans and AST                                                       */
/* ------------------------------------------------------------------------- */

export interface AstSpan {
  start: number;
  end: number;
}

/** Every AST node carries its type, owning plugin and original span. */
export interface AstNode {
  type: string;
  plugin: string;
  span: AstSpan;
  /** Optional expression-level label (`5[Fire]`). */
  label?: string;
}

export interface NumberLiteralNode extends AstNode {
  type: 'NumberLiteral';
  value: number;
}

export interface UnaryOpNode extends AstNode {
  type: 'UnaryOp';
  op: '+' | '-' | '!';
  operand: AstNode;
}

export interface BinaryOpNode extends AstNode {
  type: 'BinaryOp';
  op: '+' | '-' | '*' | '/' | '%' | '**';
  left: AstNode;
  right: AstNode;
}

export interface FunctionCallNode extends AstNode {
  type: 'FunctionCall';
  name: string;
  args: AstNode[];
}

export interface ComparePoint {
  op: '=' | '!=' | '>' | '>=' | '<' | '<=';
  value: number;
}

export interface ModifierNode extends AstNode {
  type: 'Modifier';
  /** Written form, e.g. `kh3`. */
  text: string;
  name: string;
  argument?: number;
  compare?: ComparePoint;
  /** Optional second compare point for compound modifier clauses. */
  compare2?: ComparePoint;
}

export interface DiceNode extends AstNode {
  type: 'Dice';
  count: AstNode;
  sides: AstNode;
  /** True when the die is a Fudge/FATE die (`dF`). */
  fudge?: boolean;
  /** Fudge variant from `dF.1`/`dF.2`/`dF.3`; 0 means plain `dF`. */
  fudgeVariant?: number;
  /** Optional custom face list (`d[a,b,c]`). */
  customFaces?: number[];
  /** Present when the count/sides were computed expressions. */
  computed?: boolean;
  modifiers: ModifierNode[];
  label?: string;
}

export interface GroupedRollNode extends AstNode {
  type: 'GroupedRoll';
  rolls: AstNode[];
  modifiers: ModifierNode[];
  label?: string;
}

export interface TableRollNode extends AstNode {
  type: 'TableRoll';
  count: AstNode;
  table: string;
}

export type CoreAstNode =
  | NumberLiteralNode
  | UnaryOpNode
  | BinaryOpNode
  | FunctionCallNode
  | DiceNode
  | GroupedRollNode
  | TableRollNode;

/* ------------------------------------------------------------------------- */
/* RNG                                                                        */
/* ------------------------------------------------------------------------- */

export interface Rng {
  /** Must return a finite number in `[0, 1)`. */
  next(): number;
  snapshot?(): unknown;
  restore?(state: unknown): void;
}

/* ------------------------------------------------------------------------- */
/* Repositories                                                               */
/* ------------------------------------------------------------------------- */

export interface MacroDefinition {
  name: string;
  command: string;
  source: 'user' | 'pack' | 'import' | 'builtin';
  sourceId?: string;
}

export interface AbilityDefinition {
  character: string;
  name: string;
  command: string;
}

export interface AttributeValue {
  value: string | number;
  max?: string | number;
}

export interface AttributeLookupOptions {
  max?: boolean;
  rowIndex?: number;
  rowId?: string;
}

export interface MacroRepository {
  get(name: string): Promise<MacroDefinition | undefined>;
}

export interface AbilityRepository {
  get(
    character: string,
    ability: string,
  ): Promise<AbilityDefinition | undefined>;
}

export interface AttributeRepository {
  get(
    character: string | 'selected' | 'target',
    attribute: string,
    options?: AttributeLookupOptions,
  ): Promise<AttributeValue | undefined>;
}

export interface TableEntry {
  weight: number;
  value: string;
  inlineRoll?: string;
}

export interface TableDefinition {
  name: string;
  entries: TableEntry[];
}

export interface TableRepository {
  get(name: string): Promise<TableDefinition | undefined>;
}

export interface Repositories {
  macros: MacroRepository;
  abilities: AbilityRepository;
  attributes: AttributeRepository;
  tables?: TableRepository;
}

/* ------------------------------------------------------------------------- */
/* Queries                                                                    */
/* ------------------------------------------------------------------------- */

export interface RollQueryOption {
  label: string;
  value: string;
}

export interface RollQueryRequest {
  id: string;
  prompt: string;
  defaultValue?: string;
  options?: RollQueryOption[];
  required: boolean;
  children?: RollQueryRequest[];
  span: AstSpan;
}

export type QueryAnswers = Record<string, string>;

/* ------------------------------------------------------------------------- */
/* Roll records                                                               */
/* ------------------------------------------------------------------------- */

export interface DieRecord {
  groupId: string;
  sides: number | null;
  value: number;
  originalValue?: number;
  kept: boolean;
  dropped: boolean;
  exploded?: boolean;
  compounded?: boolean;
  penetrating?: boolean;
  rerolled?: boolean;
  matched?: boolean;
  label?: string;
  /** Zero-based position within the originating pool. */
  index?: number;
}

export interface DiceGroupResult {
  id: string;
  kind: 'dice' | 'fudge' | 'custom' | 'group' | 'table';
  dice: DieRecord[];
  total: number;
  rawTotal?: number;
  modifiers: string[];
  labels?: string[];
  modifierOrder?: string[];
  success?: number;
  failure?: number;
  critical?: number;
}

export interface ExpansionRecord {
  kind: 'macro' | 'ability' | 'attribute';
  source: string;
  name: string;
  value: string;
  depth: number;
  span?: AstSpan;
}

export interface QueryAnswerRecord {
  prompt: string;
  answer: string;
  sourceSpan: AstSpan;
}

export interface InlineRollRecord {
  index: number;
  source: string;
  rawResult: number | number[];
  computedResult?: number;
  warnings: RollWarning[];
  groups?: DiceGroupResult[];
  segments?: RollSegment[];
  arithmetic?: ArithmeticTrace[];
}

export interface ArithmeticTrace {
  expression: string;
  result: number;
  nodeType: string;
  children?: ArithmeticTrace[];
}

export interface TableSelectionRecord {
  table: string;
  index: number;
  value: string;
  weight: number;
  depth: number;
}

export type RollSegment =
  | { kind: 'dice'; text: string; groupIds: string[]; result?: number }
  | { kind: 'modifier'; text: string; modifier?: string; result?: number }
  | { kind: 'math'; text: string; result?: number }
  | { kind: 'label'; text: string }
  | { kind: 'text'; text: string }
  | { kind: 'table'; text: string; table: string; result?: number };

export interface RollBreakdown {
  segments: RollSegment[];
  groups: DiceGroupResult[];
  rawTotal: number;
  finalTotal: number;
}

export interface PassRecord {
  name: string;
  input: string;
  output: string;
  warnings: RollWarning[];
}

export interface RollProcess {
  raw: string;
  expanded: string;
  passes: PassRecord[];
  expansions: ExpansionRecord[];
  queries: QueryAnswerRecord[];
  inlineRolls: InlineRollRecord[];
  arithmetic: ArithmeticTrace[];
  tables: TableSelectionRecord[];
}

export interface RollReplay {
  rngStateBefore?: unknown;
  rngStateAfter?: unknown;
  seed?: string;
}

export interface RollResult {
  schemaVersion: 1;
  total: number;
  breakdown: RollBreakdown;
  process: RollProcess;
  warnings: RollWarning[];
  errors?: RollError[];
  replay?: RollReplay;
  snapshot?: RollResultSnapshot;
}

export interface RollResultSnapshot extends Omit<RollResult, 'snapshot'> {
  createdAt: number;
}

/* ------------------------------------------------------------------------- */
/* Errors and warnings                                                        */
/* ------------------------------------------------------------------------- */

export type RollErrorCode =
  | 'PARSE_UNKNOWN_TOKEN'
  | 'PARSE_UNEXPECTED_TOKEN'
  | 'PARSE_INVALID_MODIFIER'
  | 'PARSE_MISMATCHED_GROUP'
  | 'PARSE_RECOVERY_LIMIT'
  | 'PARSE_EMPTY'
  | 'VALIDATION_INVALID_DICE'
  | 'VALIDATION_INVALID_MODIFIER'
  | 'MISSING_DATA'
  | 'EXPANSION_CYCLE'
  | 'EXPANSION_DEPTH'
  | 'QUERY_MISSING_ANSWER'
  | 'QUERY_INVALID_ANSWER'
  | 'QUERY_DEPTH'
  | 'INLINE_DEPTH'
  | 'TABLE_MISSING'
  | 'TABLE_CYCLE'
  | 'TABLE_DEPTH'
  | 'LIMIT_EXPLOSION'
  | 'LIMIT_OUTPUT'
  | 'LIMIT_TIME'
  | 'RNG_FAILURE'
  | 'CANCELLED'
  | 'MATH_DIVIDE_BY_ZERO'
  | 'MATH_NON_FINITE'
  | 'MATH_UNKNOWN_FUNCTION'
  | 'MATH_INVALID_ARITY'
  | 'INTERNAL';

export interface RollError {
  code: RollErrorCode;
  message: string;
  pass: string;
  plugin?: string;
  span?: AstSpan;
  /** Structured, localization-ready parameters. */
  params?: Record<string, unknown>;
  cause?: unknown;
}

export interface RollWarning {
  code: RollErrorCode | string;
  message: string;
  pass: string;
  plugin?: string;
  span?: AstSpan;
  params?: Record<string, unknown>;
}

/* ------------------------------------------------------------------------- */
/* Engine options and outcomes                                                */
/* ------------------------------------------------------------------------- */

export interface ResolvedLimits {
  maxExpansionDepth: number;
  maxQueryDepth: number;
  maxInlineDepth: number;
  maxExplosionRolls: number;
  maxTableDepth: number;
  maxOutputLength: number;
  maxPassTimeMs: number;
  maxParserRecovery: number;
}

export interface EngineOptions {
  repositories: Repositories;
  /** A single repository or an ordered precedence list. */
  macroSource?: MacroRepository | MacroRepository[];
  rng?: Rng;
  queryAnswers?: QueryAnswers;
  expanded?: string;
  allowInfinite?: boolean;
  maxExpansionDepth?: number;
  maxQueryDepth?: number;
  maxInlineDepth?: number;
  maxExplosionRolls?: number;
  maxTableDepth?: number;
  maxOutputLength?: number;
  maxPassTimeMs?: number;
  maxParserRecovery?: number;
  signal?: AbortSignal;
  collectWarnings?: boolean;
  /** Accept trailing message text after the roll expression. Defaults to true. */
  allowTrailingText?: boolean;
}

export interface RollContext extends EngineOptions {
  rng: Rng;
}

export interface ExtractionResult {
  expanded: string;
  queries: RollQueryRequest[];
  passes: PassRecord[];
  warnings: RollWarning[];
  errors: RollError[];
}

export type EngineOutcome =
  | { status: 'complete'; result: RollResult }
  | { status: 'needs-input'; extraction: ExtractionResult }
  | { status: 'error'; errors: RollError[] };

export interface RollEngine {
  extract(input: string, options: EngineOptions): Promise<ExtractionResult>;
  roll(
    input: string,
    options: EngineOptions & { queryAnswers?: QueryAnswers },
  ): Promise<EngineOutcome>;
}

/* ------------------------------------------------------------------------- */
/* Plugin contract                                                            */
/* ------------------------------------------------------------------------- */

export interface TokenMap {
  [name: string]: TokenType;
}

export interface EvalContext {
  rng: Rng;
  cache: Map<string, unknown>;
  limits: ResolvedLimits;
  warnings: RollWarning[];
  signal?: AbortSignal;
  /** Repository access for expansion-aware plugins (tables, roll refs). */
  options: EngineOptions;
  /** Monotonic group id counter shared by all plugins. */
  nextGroupId(): string;
  /** Prefix applied to generated group ids (inline evaluations use one). */
  groupIdPrefix?: string;
  /** Recursively evaluate a child node through the plugin registry. */
  evaluate(node: AstNode): EvalResult;
  /** Parse and evaluate a nested roll expression with the same context. */
  evaluateText?: (text: string) => EvalResult;
}

export interface EvalResult {
  value: number | number[];
  records: DieRecord[];
  segments: RollSegment[];
  warnings?: RollWarning[];
  groups?: DiceGroupResult[];
  arithmetic?: ArithmeticTrace[];
  tables?: TableSelectionRecord[];
}

export interface DicePlugin {
  name: string;
  tokens: TokenType[];
  /** Register Chevrotain rules on the pass parser. */
  grammar?(parser: CstParser, tokens: TokenMap): void;
  /** Convert plugin CST node names to typed AST nodes. */
  cstToAst?: Record<
    string,
    (cst: CstNode, convert: (node: AstNode) => AstNode) => AstNode
  >;
  /** Optional pre-evaluation extraction. */
  extract?(ast: AstNode): Record<string, unknown[]>;
  /** Evaluate a plugin AST node; return null when not handled. */
  evaluate(node: AstNode, context: EvalContext): EvalResult | null;
  /** Optional validation before evaluation. */
  validate?(ast: AstNode): RollError[];
}

export interface VisualizerHost {
  element: unknown;
  reducedMotion?: boolean;
  webglAvailable?: boolean;
}

export interface RollVisualizer {
  canRender(result: RollResult): boolean;
  render(result: RollResult, host: VisualizerHost): Promise<void>;
  dispose(): void;
}
