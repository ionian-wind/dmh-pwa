# Dice Roller

> **Status: planned — greenfield implementation.** This document specifies the
> extensible parser/evaluator for dice and roll syntax. Chat commands, chat UI,
> message delivery and visibility are covered by
> [proposals/roll20-style-chat-engine.md](../proposals/roll20-style-chat-engine.md).

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
const extraction = engine.extract(input);
const answers = await ui.ask(extraction.queries);
const result = await engine.roll(input, {
  repositories,
  queryAnswers: answers,
  rng,
});
```

## Async repositories

External data is injected, not hard-coded. The macro source is a configurable
async repository:

```ts
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

interface TableRepository {
  get(name: string): Promise<TableDefinition | undefined>;
}
```

`RollEngineOptions` should accept these repositories plus an optional
`macroSource`/`abilitySource`/`attributeSource` override for tests, packs or
remote providers. Reads are async so implementations can use IndexedDB, file
packs, a network API or an in-memory test double without changing the parser.

## Core contracts

### RollContext

```ts
interface RollContext {
  rng: () => number;
  macros: MacroRepository;
  abilities: AbilityRepository;
  attributes: AttributeRepository;
  tables?: TableRepository;
  queryAnswers?: Record<string, string>;
  allowInfinite?: boolean;
  maxExpansionDepth?: number;
  maxExplosionRolls?: number;
}
```

### RollResult

```ts
interface RollResult {
  total: number;
  breakdown: RollBreakdown;
  process: RollProcess;
  warnings: RollWarning[];
  errors?: RollError[];
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

### Inline rolls, labels and references

- Inline rolls `[[expr]]`, innermost first, stable `$[[n]]` indexes.
- Labels `[[3d6[fire]]]`; labels may contain attribute calls/Markdown-lite.
- Roll references `$[[n]]`, `$[[n.computed]]`; missing index is missing-data.
- Keep raw/computed/rendered values for every index.
- `%NEWLINE%` and final Markdown-lite rendering belong to the chat renderer;
  the engine records the corresponding segments/labels.

### Optional table plugin

`Nt[table]`/`t[table]` may be parsed/evaluated with `TableRepository`. Table
management UI, permissions and chat commands belong to the chat proposal.

## Errors and limits

- Parse errors: unknown tokens, malformed dice, invalid modifiers, mismatched
  groups.
- Validation errors: invalid counts/sides/keep/drop/modifier arguments.
- Missing-data errors: unresolved macro/ability/attribute/table/reference.
- Limits: expansion depth, query depth, inline nesting, explosion count,
  table recursion, output size and pass time.
- Explosion/reroll caps are warnings.
- Errors carry plugin/pass and source span.

## RNG and determinism

- `RollContext.rng` is required for evaluation.
- Same input + RNG sequence + repositories + query answers = same result.
- Roll records retain original/final values for animation without re-rolling.
- Replay IDs/seeds are caller concerns.

## Visualization

Engine returns data; presentation is separate:

- text/chat card baseline;
- 2D dice breakdown;
- optional 3D dice animation.

3D dice display supplied values, never choose results or consume RNG. Text must
remain available; reduced motion and accessibility are required.

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

## Risks and open decisions

- Chevrotain grammar composition and token collisions.
- Freezing the process-metadata/result schema before UI work.
- Async expansion failure/cycle policy.
- Roll-query UI is deferred; engine must not assume a specific prompt UX.
- Optional table/custom/computed grammar may need lookahead.
- 3D dice library/fallback/mobile performance remain presentation decisions.

## Definition of done

- Dice, macros, abilities, attributes, queries, inline rolls and labels parse and
  evaluate through one engine.
- External data is provided only via async repositories.
- A fixed RNG reproduces the same total and process metadata.
- `RollResult` carries enough metadata to render a Roll20-like breakdown.
- Chat can implement query/ability UI without parser changes.
- Text/2D/3D renderers display the same recorded result.

## References

- [Dice Reference](https://wiki.roll20.net/Dice_Reference)
- [Order of Operations](https://wiki.roll20.net/Order_of_Operations)
- [Inline Rolls](https://wiki.roll20.net/Inline_Rolls)
- [Roll Query](https://wiki.roll20.net/Roll_Query)
- [Roll Table](https://wiki.roll20.net/Roll_Table)
- [Reusing Rolls](https://wiki.roll20.net/Reusing_Rolls)
- [`ttg-club/dice-roller-parser`](https://github.com/ttg-club/dice-roller-parser)
- [Macro library & editor proposal](../proposals/macro-library-editor.md)
