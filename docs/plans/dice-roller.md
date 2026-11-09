# Dice Roller

> **Status: implemented core.** This document specifies the
> extensible parser/evaluator for dice and roll syntax. Chat commands, chat UI,
> message delivery and visibility are covered by
> [proposals/roll20-style-chat-engine.md](../proposals/roll20-style-chat-engine.md).
>
> Step-by-step task tracking: [dice-roller-implementation.md](dice-roller-implementation.md).

## Purpose

Build a reusable roll engine that:

- parses dice notation and roll syntax into a typed AST/IR;
- expands macros, abilities and attributes through async repositories;
- extracts roll queries and accepts answers from a UI or caller;
- evaluates inline rolls, labels, tables, dice, modifiers and math;
- returns a `RollResult` containing both the final result and metadata that
  describes the full roll process for rendering;
- supports deterministic RNG and typed errors/warnings.

The engine owns syntax and evaluation. Chat owns commands, prompts/UI, message
rendering, recipients and visibility.

## Scope split

| Concern                                                    | Owner                      |
| ---------------------------------------------------------- | -------------------------- |
| Dice notation, modifiers, groups, arithmetic               | roll engine                |
| Macro, ability and attribute syntax + expansion            | roll engine                |
| Roll-query syntax, extraction, validation and substitution | roll engine                |
| Inline rolls, labels, roll references and table syntax     | roll engine                |
| Roll result metadata / process trace                       | roll engine                |
| Chat commands (`/r`, `/w`, `/em`, `/gmroll`, ...)          | chat proposal              |
| Roll-query and ability-call UI                             | chat proposal — next steps |
| Roll templates, chat buttons/menus, message rendering      | chat proposal              |
| Chat delivery, history, visibility and permissions         | chat proposal              |

UI for resolving roll queries and choosing ability/attribute targets is
explicitly deferred. The engine returns request objects and accepts answers; it
does not render prompts.

## Design principles

- **Extensible parser/evaluator.** Syntax families are plugins with their own
  grammar, AST nodes, extraction and evaluation.
- **Typed AST/IR first.** Evaluate structured nodes, never the CST or raw text.
- **Separate grammar per plugin/pass.** Compose Chevrotain vocabularies per
  grammar; no mega-grammar.
- **Async external data.** Macros, abilities and attributes are resolved through
  injected async repositories.
- **Results are data + process.** `RollResult` must contain the total and enough
  metadata to reproduce/render the roll, including drops, rerolls, explosions,
  labels and arithmetic steps.
- **Deterministic under an injected RNG.**
- **Explicit errors and limits.**

## Parser technology

Use the existing **Chevrotain 13.2.0** dependency:

- each plugin owns token definitions and parser rules;
- one lexer/parser class per grammar/pass;
- convert CSTs to explicit typed AST nodes;
- wrap Chevrotain recovery/errors with pass/plugin name and source spans;
- non-grammar scanning (attribute/macro expansion boundaries, HTML entity
  decoding) stays outside Chevrotain.

Prior art to evaluate before finalizing grammar coverage:

- [`ttg-club/dice-roller-parser`](https://github.com/ttg-club/dice-roller-parser)
  — existing JavaScript Roll20-style parser/evaluator. Use it as a coverage
  reference and source of edge cases; it likely does not implement the full
  syntax or pass order, so it is not automatically the implementation.

### Grammar composition

- Core token categories: whitespace, numbers, dice separator, compare operators,
  parentheses, braces, brackets and separators.
- Plugin tokens must have a unique `name`. Two plugins declaring the same token
  name must declare identical patterns or the engine fails at registration.
- Token order is explicit: longer keywords before identifiers, compare operators
  before dice separators, and plugin tokens before catch-all identifiers.
- Each plugin may expose a Chevrotain parser class or parser rules. The engine
  creates one lexer/parser combination per grammar build, not per token.
- Recovery is bounded to 10 parser errors; the first error is retained and later
  ones become warnings with spans.
- Lookahead is allowed only where required: computed dice `(expr)dX`, custom-dice
  lists, grouped-roll separators and modifier arguments.
- A plugin returning `null` means "not handled"; it must not throw for ordinary
  non-matches. Throwing means a real plugin failure.

### AST contract

All nodes carry:

```ts
interface AstSpan {
  start: number;
  end: number;
}

interface AstNode {
  type: string;
  plugin: string;
  span: AstSpan;
}
```

Minimum core nodes:

- `NumberLiteral`, `UnaryOp`, `BinaryOp`, `FunctionCall`;
- `Dice`, `FudgeDice`, `CustomDice`, `ComputedDice`;
- `DiceGroup`, `GroupedRoll`;
- `Modifier` nodes owned by the dice plugin;
- `Label`;
- optional `TableRoll`, `MacroCall`, `AbilityCall`, `AttributeCall`,
  `QueryNode`, `InlineRoll`, `RollReference`.

Nodes are immutable after parsing. Evaluation returns new records; it never
mutates AST nodes.

### Plugin contract

```ts
interface DicePlugin {
  name: string;
  tokens: TokenType[];
  /** Register Chevrotain rules on the pass parser. */
  grammar?(parser: CstParser, tokens: TokenMap): void;
  /** Convert plugin CST nodes to typed AST nodes. */
  cstToAst: Record<
    string,
    (cst: CstNode, convert: (node: any) => AstNode) => AstNode
  >;
  /** Optional pre-evaluation extraction. */
  extract?(ast: AstNode): Record<string, unknown[]>;
  /** Evaluate plugin AST node; return null if not handled. */
  evaluate(node: AstNode, context: EvalContext): EvalResult | null;
  /** Optional validation before evaluation. */
  validate?(ast: AstNode): RollError[];
}
```

`EvalResult` is a record, not a string, so every plugin contributes to
`RollResult` metadata:

```ts
interface EvalContext {
  rng: Rng;
  cache: Map<string, unknown>;
  limits: Required<
    Pick<
      EngineOptions,
      | 'maxExpansionDepth'
      | 'maxQueryDepth'
      | 'maxInlineDepth'
      | 'maxExplosionRolls'
      | 'maxTableDepth'
      | 'maxOutputLength'
      | 'maxPassTimeMs'
    >
  >;
  warnings: RollWarning[];
  signal?: AbortSignal;
}

interface EvalResult {
  value: number | number[];
  records: DieRecord[];
  segments: RollSegment[];
  warnings: RollWarning[];
}
```

Plugin evaluation must be pure with respect to the AST and must not mutate
`context`. Plugins share a per-call memo cache and RNG through `EvalContext`.

Implementation note: the current grammar is a shared Chevrotain grammar. The
`grammar()` hook is reserved for future plugin rules; built-in plugins currently
contribute tokens, CST conversion rule names and evaluators.

## Engine pipeline

```
roll expression text
  -> expansion pass         macros, abilities, attributes (async repositories)
  -> query extraction       ?{...} -> RollQueryRequest[]
  -> caller provides answers
  -> inline-roll pass       [[...]], labels, stable roll indexes
  -> dice parser/evaluator  Chevrotain AST + plugin evaluation
  -> math/arithmetic pass
  -> RollResult             total + roll process metadata
```

A convenience `roll()` call can run the full pipeline when supplied with query
answers and external data. Extraction should also be available separately so a
UI can ask the user first:

```ts
const extraction = await engine.extract(input);
const answers = await ui.ask(extraction.queries);
const result = await engine.roll(input, {
  repositories,
  queryAnswers: answers,
  rng,
});
```

### Engine API lifecycle

```ts
type EngineOutcome =
  | { status: 'complete'; result: RollResult }
  | { status: 'needs-input'; extraction: ExtractionResult }
  | { status: 'error'; errors: RollError[] };

interface ExtractionResult {
  expanded: string;
  queries: RollQueryRequest[];
  passes: PassRecord[];
  warnings: RollWarning[];
  errors: RollError[];
}

interface RollEngine {
  extract(input: string, options: EngineOptions): Promise<ExtractionResult>;
  roll(
    input: string,
    options: EngineOptions & { queryAnswers?: QueryAnswers },
  ): Promise<EngineOutcome>;
}
```

Rules:

- `extract()` is async because expansion of macros/abilities/attributes is async.
  It performs expansion and query extraction, but never rolls dice.
- `roll()` performs expansion again unless the caller passes a previously
  extracted value through `options.expanded`. This keeps the API stateless and
  allows a UI to re-run after collecting answers.
- Missing required query answers produce `needs-input` with the extraction
  result, never a partial roll.
- Syntax/validation errors fail the whole roll by default. `noerror` only
  suppresses missing-data errors where explicitly allowed.
- Cancellation is cooperative via `AbortSignal`; each async repository call and
  pass checks the signal.
- There are no automatic retries. The caller re-invokes after fixing data.
- Passes fail fast; warnings never fail a roll.
- A roll is evaluated once per call; re-rendering uses the returned metadata and
  never re-rolls.

## Async repositories

External data is injected through async repositories. The macro source is a
configurable option, not a hard-coded store.

```ts
interface Repositories {
  macros: MacroRepository;
  abilities: AbilityRepository;
  attributes: AttributeRepository;
  tables?: TableRepository;
}

interface MacroDefinition {
  name: string;
  command: string;
  source: 'user' | 'pack' | 'import' | 'builtin';
  sourceId?: string;
}

interface AbilityDefinition {
  character: string;
  name: string;
  command: string;
}

interface AttributeValue {
  value: string | number;
  max?: string | number;
}

interface MacroRepository {
  get(name: string): Promise<MacroDefinition | undefined>;
}

interface AbilityRepository {
  get(
    character: string,
    ability: string,
  ): Promise<AbilityDefinition | undefined>;
}

interface AttributeRepository {
  get(
    character: string | 'selected' | 'target',
    attribute: string,
    options?: { max?: boolean; rowIndex?: number; rowId?: string },
  ): Promise<AttributeValue | undefined>;
}

interface TableDefinition {
  name: string;
  entries: Array<{
    weight: number;
    value: string;
    inlineRoll?: string;
  }>;
}

interface TableRepository {
  get(name: string): Promise<TableDefinition | undefined>;
}
```

### Source precedence

`macroSource` may be a single repository or an ordered list. A
`CompositeMacroRepository` resolves in this default order:

1. user macros;
2. active campaign/pack macros;
3. imported pack macros;
4. built-in macros.

The first async hit wins. Duplicate names from lower-priority sources are
ignored with a `macro-shadowed` warning. The caller can supply a different order
for tests or pack-only sessions.

Abilities and attributes are scoped by character/keyword. The repository
implementation owns resolution of `selected`/`target`; the engine passes the
literal keyword through. No token model is assumed.

### Lookup rules

- Lookups are case-insensitive and keyed by normalized name.
- Each `roll()` call has a per-call memo cache keyed by
  `(repository, kind, source, name, options)`.
- Repositories may add longer-lived caches; the engine never assumes them.
- Missing data returns `undefined` to the engine, which raises
  `MISSING_DATA` unless `noerror` semantics are enabled.
- Expansion cycles are detected by an expansion stack keyed by
  `kind:source:name`; a repeated key raises `EXPANSION_CYCLE`.
- Repositories may return a synchronous value via `Promise.resolve`; the engine
  always awaits.

`EngineOptions` accepts `repositories`, `macroSource`, optional per-kind source
overrides for tests/packs and an `AbortSignal`.

## Core contracts

### EngineOptions / RollContext

```ts
interface EngineOptions {
  repositories: Repositories;
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
  signal?: AbortSignal;
  collectWarnings?: boolean;
}

interface RollContext extends EngineOptions {
  rng: Rng;
}
```

Defaults: expansion 99, queries 99, inline 99, explosion 99, table depth 16,
output 256 KiB, pass time 1,000 ms, warnings collected.

### RNG

```ts
interface Rng {
  next(): number; // [0, 1)
  snapshot?(): unknown;
  restore?(state: unknown): void;
}
```

Production uses a crypto-backed uniform RNG; tests inject deterministic
sequences. If the RNG exposes snapshots, `RollResult.replay` records
`rngStateBefore` and `rngStateAfter`. Otherwise replay is seed/context-based and
the caller is responsible for retention.

### RollResult

```ts
interface RollResult {
  schemaVersion: 1;
  total: number;
  breakdown: RollBreakdown;
  process: RollProcess;
  warnings: RollWarning[];
  errors?: RollError[];
  replay?: {
    rngStateBefore?: unknown;
    rngStateAfter?: unknown;
    seed?: string;
  };
  snapshot?: RollResultSnapshot;
}

interface RollResultSnapshot extends Omit<RollResult, 'snapshot'> {
  createdAt: number;
}
```

### RollProcess metadata

The result must describe the complete roll, not just the final number:

- raw input and fully expanded expression;
- ordered pass records;
- macro/ability/attribute expansions with source and resolved value;
- query requests and answers;
- inline-roll records with stable indexes and raw/computed values;
- dice groups and every die's original/final value;
- kept/dropped/rerolled/exploded/compounded/penetrating flags;
- applied modifiers and order;
- success/failure/critical counts;
- arithmetic/function evaluation trace;
- labels and display segments;
- table selections;
- warnings/errors with source spans.

Suggested shapes:

```ts
interface RollBreakdown {
  segments: RollSegment[];
  groups: DiceGroupResult[];
  rawTotal: number;
  finalTotal: number;
}

type RollSegment =
  | { kind: 'dice'; text: string; groupIds: string[]; result?: number }
  | { kind: 'modifier'; text: string; modifier?: string; result?: number }
  | { kind: 'math'; text: string; result?: number }
  | { kind: 'label'; text: string }
  | { kind: 'text'; text: string };

interface PassRecord {
  name: string;
  input: string;
  output: string;
  warnings: RollWarning[];
}

interface ExpansionRecord {
  kind: 'macro' | 'ability' | 'attribute';
  source: string;
  name: string;
  value: string;
  depth: number;
}

interface QueryAnswerRecord {
  prompt: string;
  answer: string;
  sourceSpan: { start: number; end: number };
}

interface InlineRollRecord {
  index: number;
  source: string;
  rawResult: number | number[];
  computedResult?: number;
  warnings: RollWarning[];
}

interface DieRecord {
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
  label?: string;
}

interface DiceGroupResult {
  id: string;
  kind: 'dice' | 'fudge' | 'custom' | 'group';
  dice: DieRecord[];
  total: number;
  modifiers: string[];
  labels?: string[];
}

interface ArithmeticTrace {
  expression: string;
  result: number;
  nodeType: string;
  children?: ArithmeticTrace[];
}

interface RollProcess {
  raw: string;
  expanded: string;
  passes: PassRecord[];
  expansions: ExpansionRecord[];
  queries: QueryAnswerRecord[];
  inlineRolls: InlineRollRecord[];
  arithmetic: ArithmeticTrace[];
}

type RollErrorCode =
  | 'PARSE_UNKNOWN_TOKEN'
  | 'PARSE_UNEXPECTED_TOKEN'
  | 'PARSE_INVALID_MODIFIER'
  | 'PARSE_MISMATCHED_GROUP'
  | 'VALIDATION_INVALID_DICE'
  | 'VALIDATION_INVALID_MODIFIER'
  | 'MISSING_DATA'
  | 'EXPANSION_CYCLE'
  | 'EXPANSION_DEPTH'
  | 'QUERY_MISSING_ANSWER'
  | 'QUERY_INVALID_ANSWER'
  | 'INLINE_DEPTH'
  | 'TABLE_MISSING'
  | 'TABLE_CYCLE'
  | 'LIMIT_EXPLOSION'
  | 'LIMIT_OUTPUT'
  | 'RNG_FAILURE'
  | 'INTERNAL';

interface RollError {
  code: RollErrorCode;
  message: string;
  pass: string;
  plugin?: string;
  span?: { start: number; end: number };
  cause?: unknown;
}

interface RollWarning {
  code: string;
  message: string;
  pass: string;
  plugin?: string;
  span?: { start: number; end: number };
}
```

`RollSegment[]` is the primary UI contract: it describes the visible roll
breakdown (dice, modifiers, math, labels, text) and references the detailed
group/die records for tooltips and animations. 3D dice and chat cards both read
this metadata; neither recomputes the roll.

## Syntax and evaluation

### Arithmetic and functions

Operators: `+`, `-`, `*`, `/`, `%`, `**`, parentheses. Math-only expressions are
valid. Functions: `floor(x)`, `round(x)`, `ceil(x)`, `abs(x)`.

Precedence: parentheses, functions, exponentiation, multiplication/division/
modulus left-to-right, addition/subtraction left-to-right.

### Dice

- `NdX`, `dX`; `d%` = `d100`.
- `dF`, `dF.1`, `dF.2`, `dF.3` Fudge variants.
- Computed dice: `(N+Y)dX`, `Nd(X+Y)`, `(1+2)dF`; parenthesised values round.
- Custom dice: `d[1,2,3,5,8]`.
- Grouped rolls: `{1d6, 2d8+1, 1d4-1}`.
- Labels: `2d6[fire]`.
- Math on dice: `round(1d6/2)`.

### Compare points

Optional operator plus target: `3` = equal, `>3` = at or above, `<3` = at or
below. Successes, failures, explosions, rerolls and matching use this convention.

### Dice modifiers

- Successes `CP`, failures `fCP` (only with a success check).
- Keep/drop `khN`, `klN`, `dhN`, `dlN`; shortcuts `kN`/`dN`.
- Rerolls `rCP` until outside compare point; `roCP` once; `r` = reroll 1s.
- Explosions `!`, `!CP`, `!p`, `!!`, `!<N`, `!>N`, `!=N`; cap and warn.
- Pools/counting `=N`, `>N`, `<N`, `e`, `s`, `f`, `cs`, `cf`.
- Matching `m`, `mt`, `mtN`, `mtN>X`.
- Min/max `miN`, `maN`; sorting `s`/`sa`/`sd`; roll once `o`.
- Chained modifiers and nested group modifiers.
- Two-phase order: roll-time (explode/reroll) then settled modifiers
  (keep/drop/success/failure/sort).

Concrete modifier phases:

| Phase | Modifiers                                                      | Effect                                                  |
| ----- | -------------------------------------------------------------- | ------------------------------------------------------- |
| A     | reroll (`r`, `ro`), min/max (`mi`, `ma`)                       | transform each die value; rerolls can be rerolled again |
| B     | explode (`!`, `!p`, `!!`, threshold variants)                  | add/merge dice until cap                                |
| C     | keep/drop (`kh`, `kl`, `dh`, `dl`, `k`, `d`)                   | mark dice kept/dropped                                  |
| D     | matching (`m`, `mt`)                                           | compute match groups; `mt` changes the reported count   |
| E     | success/failure/critical (`>`, `<`, `=`, `s`, `f`, `cs`, `cf`) | count or replace the pool total                         |
| F     | sort (`s`, `sa`, `sd`)                                         | display order only                                      |
| G     | aggregate                                                      | sum/display total, emit records                         |

Modifiers are applied in written order within each phase. Sorting is always
last regardless of where it appears. `e` (exhaustive successes) runs after
phase E and rerolls only successes, up to the explosion cap. Explosion and
reroll limits produce warnings, not errors.

Compatibility note: where Roll20's ordering is ambiguous for a chained modifier,
the engine records `modifierOrder` on each group so the UI can explain the
result. Ambiguous chains receive golden tests before release.

### Grouped rolls

- Commas total each sub-expression before group modifiers; without commas,
  modifiers apply across individual dice.
- Sub-rolls must be the same kind (sum, success or compatible nested groups).
- `{5d6!!}>8` means compound each die, then count successes.

### Macros, abilities and attributes

- Macros: `#macro-name`; nested/chained calls allowed.
- Abilities: `%{character|ability}`.
- Attributes: `@{character|attribute}`, `@{selected|...}`, `@{target|...}`,
  token bars and optional `max`.
- Repeating sections: `repeating_section_$N_field` or RowID.
- Names are case-insensitive.
- Expansion is async through repositories and repeated up to a limit (default 99) until stable.
- Undefined calls are missing-data errors unless the caller requests
  `noerror` semantics.
- Expansion records become part of `RollResult.process`.

The chat UI for choosing selected/target tokens or abilities is next-step work;
the engine only requests/resolves them through the repositories.

### Roll queries

- `?{Prompt}`, `?{Prompt|Default}`, `?{Prompt|Option1|Option2}`.
- `?{Prompt|Label 1,value1|Label 2,value2}` separates label/value.
- Query defaults may contain inline rolls.
- Same prompt asked once per message.
- Nested queries require HTML-entity escaping; 99-level limit.
- Extraction returns `RollQueryRequest[]`; answers are validated and substituted.
- UI prompts are deferred to the chat proposal.

```ts
interface RollQueryRequest {
  id: string; // stable hash of prompt + option values
  prompt: string;
  defaultValue?: string;
  options?: Array<{ label: string; value: string }>;
  required: boolean;
  children?: RollQueryRequest[];
  span: { start: number; end: number };
}

type QueryAnswers = Record<
  string, // request id or exact prompt text
  string
>;
```

Identity rules:

- `id = hash(normalize(prompt) + '|' + normalizedOptionValues.join('|'))`.
- Repeated identical requests are deduplicated and asked once.
- Answers are matched by `id` first, then by exact prompt text for UI
  convenience.
- Missing required answers produce `QUERY_MISSING_ANSWER`; invalid option values
  produce `QUERY_INVALID_ANSWER`.
- Nested queries are resolved depth-first: inner requests are answered and
  substituted before the enclosing query is finalized.
- Extra answers for unknown requests are ignored with a warning, not an error.

### Inline rolls, labels and references

- Inline rolls `[[expr]]`, innermost first, stable `$[[n]]` indexes.
- Labels `[[3d6[fire]]]`; labels may contain attribute calls/Markdown-lite.
- Roll references `$[[n]]`, `$[[n.computed]]`; missing index is missing-data.
- Keep raw/computed/rendered values for every index.
- `%NEWLINE%` and final Markdown-lite rendering belong to the chat renderer;
  the engine records the corresponding segments/labels.

### Optional table plugin

`Nt[table]`/`t[table]` may be parsed/evaluated with `TableRepository`.

- `N` defaults to 1; N must be a positive integer.
- `TableDefinition.entries` weights may be counts or percentages. If every
  weight is a percentage and the sum is 100 ±0.01, use percentage mode;
  otherwise treat weights as relative counts.
- Selection uses one RNG draw per roll. Entry values are strings; an entry may
  contain a roll expression resolved by the engine.
- Nested table references are allowed to a depth of 16. A table cycle
  (`A -> B -> A`) raises `TABLE_CYCLE`.
- Missing table raises `TABLE_MISSING` unless `noerror` is enabled.
- Table results are recorded in `RollProcess` and as `RollSegment`s.
- Entry values that look like roll expressions (or provide `inlineRoll`) are
  evaluated with the same per-call RNG and context; other values are treated as
  display text with a numeric fallback of `0`.
- Table management UI, permissions and chat commands belong to the chat
  proposal.

## Errors and limits

### Error taxonomy

- `PARSE_*` — lexer/parser failures: unknown token, unexpected token, invalid
  modifier syntax, mismatched group.
- `VALIDATION_*` — syntactically valid but invalid values: dice counts/sides,
  keep/drop amounts, modifier arguments.
- `MISSING_DATA` — unresolved macro, ability, attribute, table or roll
  reference.
- `EXPANSION_CYCLE`, `EXPANSION_DEPTH` — expansion recursion failures.
- `QUERY_MISSING_ANSWER`, `QUERY_INVALID_ANSWER` — query resolution failures.
- `INLINE_DEPTH` — inline-roll nesting limit.
- `TABLE_MISSING`, `TABLE_CYCLE` — table failures.
- `LIMIT_*` — output/time/explosion limits.
- `RNG_FAILURE` — invalid RNG output or exception.
- `MATH_*` — division/modulus by zero, non-finite arithmetic, unknown function
  and invalid function arity.
- `PARSE_EMPTY`, `PARSE_RECOVERY_LIMIT` — empty input and bounded parser
  recovery overflow.
- `QUERY_DEPTH`, `TABLE_DEPTH`, `LIMIT_TIME`, `CANCELLED` — nested/depth and
  execution-control failures.
- `INTERNAL` — plugin bug; includes the original cause.

Every error carries `code`, `message`, `pass`, optional `plugin`, optional
`span` and optional `cause`. Errors are fatal; warnings are non-fatal.

### Limit defaults

| Limit                  | Default | Behavior at limit                |
| ---------------------- | ------- | -------------------------------- |
| Expansion depth        | 99      | `EXPANSION_DEPTH` error          |
| Query depth            | 99      | `QUERY_*` depth error            |
| Inline nesting         | 99      | `INLINE_DEPTH` error             |
| Explosion/reroll rolls | 99      | warning, stop rolling            |
| Table recursion        | 16      | `TABLE_CYCLE`/depth error        |
| Output length          | 256 KiB | `LIMIT_OUTPUT` error             |
| Pass time              | 1,000ms | `LIMIT_TIME` error               |
| Parser recovery errors | 10      | first error fatal, rest warnings |

`noerror` suppresses only `MISSING_DATA` where explicitly enabled; it never
suppresses parse, validation, cycle, table-cycle or limit errors.

### Failure policy

- Parse/validation/limit errors fail the whole roll.
- Missing data may be downgraded to an empty string with `&{noerror}` and a
  warning.
- Warnings are always returned in order of the pass that produced them.
- Fatal errors include the partially expanded text and pass records for
  diagnostics.

## RNG and determinism

- `Rng.next()` must return a finite number in `[0, 1)`; otherwise
  `RNG_FAILURE`.
- Production default: crypto-backed uniform RNG.
- Tests inject a deterministic sequence; the engine never falls back silently to
  `Math.random`.
- Same input + same RNG sequence + same repositories + same query answers =
  identical `RollResult` including metadata.
- If the RNG implements `snapshot()`/`restore()`, `RollResult.replay` records the
  before/after state. Otherwise callers may pass a seed through their own RNG
  implementation and record it externally.
- `RollResultSnapshot` is the persistable form (schema version, total,
  breakdown, process, warnings, replay state if permitted). Re-rendering reads a
  snapshot and never re-rolls.
- 3D dice receive recorded values; they never call the RNG.

## Visualization

Engine returns data; presentation is separate:

- text/chat card baseline;
- 2D dice breakdown;
- optional 3D dice animation.

3D dice use the existing `@3d-dice/dice-box` dependency. The adapter receives a
`RollResult`/`RollSegment[]` and animates the recorded values; it never chooses
results, consumes RNG or changes the total. If 3D rendering fails or is disabled
(reduced motion, low-power device, unsupported WebGL), fall back to the text/2D
breakdown. Text must remain accessible and must show the same values.

Adapter contract:

```ts
interface RollVisualizer {
  canRender(result: RollResult): boolean;
  render(result: RollResult, host: VisualizerHost): Promise<void>;
  dispose(): void;
}
```

Visualizer adapters must not mutate the result and must tolerate missing 3D
assets by reporting a fallback.

## Non-functional requirements

### Performance budgets

Initial targets on a mid-range desktop:

- parse a typical expression (< 100 tokens) in under 5 ms;
- evaluate 100 dice in under 20 ms;
- full expansion/query/inline/dice/math pipeline under 100 ms excluding async
  repository latency;
- hard maximum pass time 1,000 ms;
- hard maximum output 256 KiB.

Benchmarks run in CI for representative expressions, large dice pools and
modifier chains. Regressions fail the benchmark job.

### Localization

The engine returns stable error codes and message parameters. It does not return
translated user-facing strings. Chat/UI maps codes to localized messages using
the normal i18n system.

### Accessibility

`RollSegment` and die/group records contain textual values suitable for screen
readers and clipboard output. 3D animation is optional; reduced-motion and
low-power modes use text/2D output. No information exists only in animation.

### Snapshot persistence

`RollResultSnapshot` is persisted with `schemaVersion`. The implementation
exports `ENGINE_SCHEMA_VERSION = 1`. Chat stores snapshots or
snapshot references; reloading a message uses the snapshot and never re-rolls.
Schema upgrades are versioned; unknown versions render a generic fallback
instead of failing the chat.

## Implementation phases

1. **Core contracts** — AST, process metadata, result, context, repositories.
2. **Chevrotain core** — lexer/parser helpers, CST-to-AST, plugin composition.
3. **Arithmetic + dice** — all dice types, compare points, modifiers, groups.
4. **Expansion** — macros, abilities, attributes with async repositories.
5. **Queries and inline rolls** — extraction, answers, labels, indexes,
   references.
6. **Optional table plugin** — table references and evaluation.
7. **Process metadata** — complete trace for UI rendering.
8. **Visualization adapters** — text/2D baseline, optional 3D.
9. **Test matrix** — parser, AST, modifier chains, expansion, queries, inline,
   RNG and metadata.
10. **UI next steps** — query prompts and ability selectors belong to chat.

## Planned module layout

| Module              | Responsibility                                         |
| ------------------- | ------------------------------------------------------ |
| `engine/contracts`  | AST, result, process metadata, context, errors         |
| `engine/lexer`      | Chevrotain token helpers and vocabularies              |
| `engine/parser`     | Parser classes and CST-to-AST conversion               |
| `engine/expansions` | Macro/ability/attribute scanning and async resolution  |
| `engine/queries`    | Query extraction, validation and substitution          |
| `engine/inline`     | Inline rolls, labels, index registry and references    |
| `engine/evaluator`  | Plugin dispatch and evaluation                         |
| `engine/plugins`    | Arithmetic, dice, optional tables/custom/computed dice |
| `engine/rng`        | RNG interface and deterministic helpers                |
| `engine/visualize`  | Visualization adapter contracts                        |

## Integration contract

Chat calls extraction, prompts the user, then calls evaluation:

```ts
const extraction = engine.extract(message);
const answers = await chatUi.resolveQueries(extraction.queries);
const result = await engine.roll(message, {
  rng,
  macros,
  abilities,
  attributes,
  tables,
  queryAnswers: answers,
});
chatUi.render(result);
```

Expansion/query answering and selected/target token resolution are async.
Chat owns commands, prompts, ability selectors, templates, message rendering and
delivery. The engine never reads chat state directly.

## Testing plan

- Chevrotain parser/recovery/source-span tests per syntax family.
- CST-to-AST tests for every node type.
- Modifier/group golden tests, including interaction chains.
- Async repository tests: macros, abilities, attributes, missing data, cycles.
- Query extraction/validation/substitution tests.
- Inline index/reference tests.
- RNG determinism tests.
- Process-metadata completeness tests.
- Visualization tests: display data matches records without re-rolling.

## Acceptance criteria

### Parser and AST

- All grammar-based passes use Chevrotain lexers/parsers and typed AST nodes.
- Token collisions fail at registration with a clear error.
- Malformed input returns `PARSE_*` with pass, plugin and source span.
- Parser recovery is bounded and deterministic.

### Expansion

- Macros, abilities and attributes resolve through async repositories.
- Macro source precedence is configurable and deterministic.
- Expansion cycles/depth limits fail with `EXPANSION_*`.
- `noerror` only downgrades missing data, never syntax/validation failures.
- Expansion records appear in `RollResult.process`.

### Queries and inline rolls

- `extract()` returns deduplicated `RollQueryRequest[]` without rolling.
- Repeated identical prompts reuse one answer.
- Missing/invalid answers produce `QUERY_*`.
- Nested queries resolve depth-first.
- Inline rolls get stable indexes; `$[[n]]` and `.computed` resolve from records.
- Missing inline references produce `MISSING_DATA`.

### Evaluation

- All dice types and modifiers in this plan are parsed/evaluated.
- Modifier phases A–G are deterministic and recorded.
- Grouped rolls validate sub-roll kind compatibility: every member must contain
  at least one dice, table or nested-group node. Pure-math members fail with
  `VALIDATION_INVALID_MODIFIER`.
- Table plugin follows the defined weight/cycle/missing rules.
- Arithmetic/functions obey the documented precedence.

### Metadata

- `RollResult` contains total, segments, groups, per-die records, expansions,
  queries, inline rolls and arithmetic trace.
- A renderer can reproduce the full breakdown from metadata alone.
- Snapshot persistence uses `schemaVersion` and never re-rolls on render.

### External data and RNG

- All external data comes through async repositories.
- `selected`/`target` are passed through as keywords; no token model is assumed.
- Same input + RNG sequence + repositories + answers produces identical results.
- Production uses a crypto RNG; tests inject deterministic RNG.

### Quality

- Performance budgets and hard limits from this document pass.
- Error codes/parameters are localization-ready; no translated engine strings.
- Text/2D/3D adapters render identical values with accessible text fallback.
- Golden tests cover modifier chains, expansions, queries, inline rolls, tables
  and metadata completeness.

## Non-blocking decisions

These do not block the parser/evaluator build:

- whether optional table/custom/computed plugins ship in v1;
- whether 3D dice are enabled by default or opt-in;
- snapshot retention policy in chat storage;
- post-v1 custom roll parsing extension point.

## Definition of done

- Dice, macros, abilities, attributes, queries, inline rolls and labels parse and
  evaluate through one engine.
- External data is provided only via async repositories.
- A fixed RNG reproduces the same total and process metadata.
- `RollResult` carries enough metadata to render a Roll20-like breakdown.
- Chat can implement query/ability UI without parser changes.
- Text/2D/3D renderers display the same recorded result.

## Implementation deltas

The engine is implemented under `src/utils/bag-of-dice` (see its README and the
implementation tracker). Deltas discovered while building it:

- grouped-roll homogeneity is enforced as "must contain dice";
- `o` is parsed/recorded but not yet fully semantic;
- inline-table preloading is limited to tables referenced by the main
  expression;
- plugin grammar registration is reserved, not active;
- exhaustive-success (`e`) behavior is a capped follow-up loop and needs more
  compatibility golden cases;
- `mtN`/`mtN>X` arguments are parsed but not yet reflected in matching totals;
- extra typed codes (`MATH_*`, `PARSE_EMPTY`, `PARSE_RECOVERY_LIMIT`,
  `QUERY_DEPTH`, `TABLE_DEPTH`, `LIMIT_TIME`, `CANCELLED`) were added to the
  taxonomy.

## References

- [Dice Reference](https://wiki.roll20.net/Dice_Reference)
- [Order of Operations](https://wiki.roll20.net/Order_of_Operations)
- [Inline Rolls](https://wiki.roll20.net/Inline_Rolls)
- [Roll Query](https://wiki.roll20.net/Roll_Query)
- [Roll Table](https://wiki.roll20.net/Roll_Table)
- [Reusing Rolls](https://wiki.roll20.net/Reusing_Rolls)
- [`ttg-club/dice-roller-parser`](https://github.com/ttg-club/dice-roller-parser)
- [Macro library & editor proposal](../proposals/macro-library-editor.md)
