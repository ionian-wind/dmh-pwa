# Dice Roller

> **Status: planned — greenfield implementation.** This document specifies an
> extensible dice-notation parser and evaluator built from scratch. Chat,
> macros, roll queries, inline rolls, templates and delivery are covered by
> [proposals/roll20-style-chat-engine.md](../proposals/roll20-style-chat-engine.md).

## Purpose

Build a reusable dice engine that:

- parses dice notation into a typed AST;
- evaluates dice, modifiers, groups and math through plugins;
- returns structured roll records rather than presentation text;
- supports deterministic RNG and typed errors/warnings;
- can be embedded in a chat engine, combat tracker, macro runner or sheet tool.

The engine is one pass in a larger system. It receives an already-expanded dice
expression and does not own macros, attributes, roll queries, inline rolls, roll
templates, chat commands or visibility.

## Boundary with the chat engine

| Concern                                                       | Owner              |
| ------------------------------------------------------------- | ------------------ |
| Dice notation, modifiers, groups, arithmetic, roll evaluation | dice engine        |
| Chat commands, macros, abilities, attributes                  | chat engine        |
| Roll queries and inline-roll expansion                        | chat engine        |
| Roll templates, buttons, chat delivery and visibility         | chat engine        |
| Visualization of roll records                                 | presentation layer |

The chat engine calls the dice engine after its expansion/query/inline passes.
The dice engine returns roll records; it never renders or sends chat messages.

## Design principles

- **Extensible parser/evaluator.** Syntax families are plugins with their own
  grammar contribution, AST nodes, extraction and evaluation.
- **Typed AST first.** Parse to a typed AST; evaluate the AST, never the CST or
  the raw string directly.
- **Separate grammar per plugin.** Compose token vocabularies per grammar; do
  not create one mega-grammar.
- **Results are data.** A roll is a structured record; text/2D/3D rendering is
  downstream.
- **Deterministic under an injected RNG.** Tests and replays must reproduce
  exact dice values.
- **Explicit errors.** Parse, validation, missing-data and limit failures are
  typed and carry source spans.
- **No arbitrary code execution.** Plugins are declarative and bounded.

## Parser technology

Use the existing **Chevrotain 13.2.0** dependency for grammar-based parsing:

- each plugin owns its token definitions and parser rules;
- create one `Lexer` and parser class per grammar/pass, not one global parser;
- convert Chevrotain CSTs into explicit typed AST nodes;
- use token categories, recovery and error reporting, then wrap failures in
  typed engine errors with source spans;
- text preprocessing that is not grammar-based (trimming, injection of external
  dice values) stays outside Chevrotain.

No hand-written tokenizer/parser stack is planned.

## Engine pipeline

```
dice expression text
  -> lexer            Chevrotain tokens for this grammar
  -> parser           Chevrotain rules
  -> CST -> AST       explicit typed node conversion
  -> extraction       optional plugins expose metadata (tables, labels, ...)
  -> evaluation       plugin evaluators produce roll records
  -> RollResult       total, groups, records, warnings
```

The engine may expose:

```ts
parse(input: string): DiceAst;
evaluate(ast: DiceAst, context: DiceContext): RollResult;
roll(input: string, context: DiceContext): RollResult;
extract(ast: DiceAst): Record<string, unknown[]>;
```

## Core contracts

### DiceContext

```ts
interface DiceContext {
  rng: () => number;
  maxExplosionRolls?: number;
  tables?: Record<string, TableDefinition>;
  allowInfinite?: boolean;
  metadata?: Record<string, unknown>;
}
```

### RollResult

```ts
interface RollResult {
  total: number;
  groups: DiceGroupResult[];
  records: DieRecord[];
  warnings: RollWarning[];
  details?: Record<string, unknown>;
}
```

### DieRecord

```ts
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
```

### DiceGroupResult

```ts
interface DiceGroupResult {
  id: string;
  kind: 'dice' | 'fudge' | 'custom' | 'group';
  dice: DieRecord[];
  total: number;
  modifiers: AppliedModifier[];
  labels?: string[];
}
```

Contracts are provisional but must be fixed before visualization adapters or
chat integration are built.

## Plugin architecture

A plugin owns one syntax family. It declares:

- token definitions;
- parser rules;
- CST-to-AST conversion;
- AST node types;
- extraction behavior;
- evaluation behavior;
- validation and typed errors.

The core composes plugins in a fixed order. A plugin must explicitly report
`not-handled`; generic errors must not be used as fallback control flow.

Planned plugins:

| Plugin        | Responsibility                                             |
| ------------- | ---------------------------------------------------------- |
| arithmetic    | numbers, unary signs, math functions and precedence        |
| dice          | dice types, compare points, modifiers and groups           |
| tables        | optional `Nt[table]` parsing/evaluation with external data |
| custom-dice   | optional custom-die syntax and validation                  |
| computed-dice | optional computed count/sides expressions                  |
| labeling      | optional dice labels and display metadata                  |

Chat-oriented plugins are not part of this engine. See the chat proposal.

## Notation specification

### Arithmetic and functions

Operators: `+`, `-`, `*`, `/`, `%`, `**`, parentheses. Math-only expressions
such as `5+7*2` are valid. Supported functions: `floor(x)`, `round(x)`,
`ceil(x)`, `abs(x)`.

Precedence: parentheses, functions, exponentiation, multiplication/division/
modulus left-to-right, addition/subtraction left-to-right.

### Dice

- `NdX`, `dX`: N dice with X sides; N defaults to 1.
- `d%`: alias for `d100`.
- `dF`, `dF.1`, `dF.2`, `dF.3`: Fudge/FATE variants.
- Computed dice: `(N+Y)dX`, `Nd(X+Y)`, `(1+2)dF`; parenthesised values are
  rounded.
- Custom dice: `d[1,2,3,5,8]`.
- Grouped rolls: `{1d6, 2d8+1, 1d4-1}`.
- Math on dice: `round(1d6/2)`.
- Labels: `2d6[fire]`.
- Descriptive text after a roll is not part of the engine; it is chat output.

### Compare points

A compare point is an optional operator plus target number:

- `3` → equal to 3;
- `>3` → greater than or equal to 3;
- `<3` → less than or equal to 3.

Successes, failures, explosions, rerolls and matching use this convention.
Modifiers state whether they apply to basic (`B`) and/or Fudge (`F`) dice.

### Dice modifiers

- Successes: `CP`; e.g. `3d6>3`, `10d6<4`.
- Failures: `fCP`; only valid with a success check, e.g. `3d6>3f1`.
- Keep/drop: `khN`, `klN`, `dhN`, `dlN`; shorthand `kN` / `dN`.
- Rerolls: `rCP` rerolls until outside the compare point; `roCP` rerolls once;
  `r` with no CP rerolls 1s. Multiple clauses are allowed.
- Explosions:
  - `!` explode on maximum;
  - `!CP` custom threshold;
  - `!p` penetrating (each extra die gets −1);
  - `!!` compounding (extra rolls merge into the same die);
  - `!<N`, `!>N`, `!=N` directional thresholds.
  - Cap additional rolls (default 99) and emit a warning.
- Dice pools: `=N`, `>N`, `<N`, `e`, `s`, `f`, `cs`, `cf`.
- Min/max per die: `miN`, `maN`.
- Matching: `m` shows matches; `mt` counts matching groups; `mtN` requires N
  matching dice; `mtN>X` requires N matches at or above X.
- Sorting: `s`/`sa` ascending (default), `sd` descending.
- Roll once: `o`.
- Chained modifiers, e.g. `4d6kh3ro1!>5sd`.
- Nested groups, e.g. `{2d6kh1, 1d8}kh1`.
- Advantage/disadvantage use `2d20kh1` / `2d20kl1`.

Modifier application order:

1. exploding, compounding, penetrating and rerolls while dice are rolling;
2. keep/drop, success/failure counting and sorting after dice settle.

### Grouped rolls

- `{...}` groups sub-rolls. With commas each sub-expression is totaled before
  group modifiers; without commas modifiers apply across individual dice.
- All sub-rolls must be the same kind: sum rolls, success rolls or compatible
  nested groups.
- Group modifiers include keep/drop, successes and failures.
- `{5d6!!}>8` means compound each die, then count successes against 8.

### Optional table plugin

`Nt[table]` may be implemented as an optional plugin for systems that need it.
The engine accepts table data through `DiceContext.tables`; table management,
commands, permissions and UI belong to the chat proposal. Table entries may
contain dice expressions, which the engine can evaluate recursively with a
bounded depth.

## Errors and limits

- Explicit parse errors for unknown tokens, malformed dice, invalid modifiers
  and mismatched groups.
- Validation errors for invalid counts, sides, keep/drop amounts and modifier
  arguments.
- Missing-data errors for optional plugins when required external data is
  absent.
- Explosion/reroll limits are warnings, not errors.
- Bounded recursion for nested groups and optional table entries.
- Every error carries a pass/plugin name and source span.

## RNG and determinism

- `DiceContext.rng` is required for evaluation; a default cryptographic RNG can
  be supplied by callers that want one.
- The same input + same RNG sequence + same context must produce the same
  `RollResult`.
- Roll records retain original and final values so 2D/3D visualizations can
  animate without re-rolling.
- Replay IDs or seeds are a caller concern, not an engine side effect.

## Visualization

The engine is visualization-neutral. A `RollResult` can be rendered as:

- text/chat card (required baseline);
- a 2D dice breakdown;
- optional 3D dice animation.

Rules:

- 3D dice display supplied values; they never decide the result or consume RNG.
- Text output must remain available with 3D dice enabled.
- Reduced motion, accessibility and low-power devices must be supported.
- Visualization adapters must not mutate roll records.

## Implementation phases

1. **Core contracts** — AST, result, records, context, errors and warnings.
2. **Chevrotain core** — lexer/parser setup, CST-to-AST conversion and plugin
   composition.
3. **Arithmetic plugin** — numbers, functions, precedence and unary signs.
4. **Dice plugin** — dice types, compare points, modifiers and groups.
5. **Optional plugins** — tables, custom dice, computed dice, labels.
6. **Visualization adapters** — text/2D baseline, optional 3D.
7. **Test matrix** — parser, AST, modifier interactions, RNG and visualization.

The chat engine is a separate implementation track.

## Planned module layout

Names are provisional; the boundaries matter more than paths.

| Module             | Responsibility                                      |
| ------------------ | --------------------------------------------------- |
| `engine/contracts` | AST, records, results, context, errors              |
| `engine/lexer`     | Chevrotain token definitions and vocabulary helpers |
| `engine/parser`    | Parser classes and CST-to-AST conversion            |
| `engine/evaluator` | AST traversal and plugin dispatch                   |
| `engine/plugins`   | Arithmetic, dice and optional plugins               |
| `engine/rng`       | RNG interface and deterministic helpers             |
| `engine/visualize` | Visualization adapter contracts                     |

## Integration contract

The chat engine calls:

```ts
const result = diceEngine.roll(expandedDiceExpression, {
  rng,
  tables,
  allowInfinite: false,
});
```

It must provide already-expanded text:

- macros, abilities and attributes resolved;
- roll queries answered;
- inline rolls replaced with values or explicit references resolved;
- labels/templates left to the chat renderer.

The dice engine must not inspect chat message state, recipients, macro names or
templates. It returns source spans and warnings so the chat engine can map errors
back to the original message.

## Testing plan

- Parser tests per plugin using Chevrotain directly.
- Recovery/error-span tests for malformed input.
- CST-to-AST tests for every node type.
- Evaluation tests per modifier and modifier chain.
- Golden tests for grouped rolls, computed/custom/Fudge dice.
- RNG determinism tests.
- Optional table-plugin tests.
- Visualization tests asserting display data matches roll records without
  re-rolling.

## Risks and open decisions

- Chevrotain grammar composition: keep one grammar per plugin and prevent token
  collisions.
- Modifier interaction matrix needs explicit golden cases before implementation.
- The result schema must be stable before visualization and chat integration.
- Custom-dice/computed-dice grammar may require parser lookahead; validate early.
- 3D dice library/fallback/mobile performance remain open presentation decisions.
- Table-plugin recursion depth and external-data failure policy need review.

## Definition of done

- Dice expressions parse through Chevrotain into a typed AST.
- Every modifier and group has deterministic tests and matching roll records.
- A malformed expression produces a typed error with source span.
- The same input and RNG sequence produce the same `RollResult`.
- A `RollResult` renders as text/2D and optionally 3D without changing values.
- The chat engine can call the dice engine using only expanded text and context.

## References

- [Dice Reference](https://wiki.roll20.net/Dice_Reference)
- [Roll Table](https://wiki.roll20.net/Roll_Table)
