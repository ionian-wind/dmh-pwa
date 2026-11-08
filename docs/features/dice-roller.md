# Dice Roller Engine

> **Status: work in progress.** The engine is a standalone TypeScript library
> under `src/utils/dice-roller/`. It is not registered or called by the
> application yet: there is no `src/utils/dice-roller/index.ts` bootstrap and no
> app component calls `processDiceExpression`. The 3D dice FAB
> (`src/components/RollButton.vue`) exists and uses `@3d-dice/dice-box` with
> direct notations, but it is not mounted in the app shell and does not call the
> engine. Nothing in this document should be read as a defect report against the
> current release; the "WIP notes" section lists known gaps to address before
> the feature ships.

## Purpose

Parse and evaluate a Roll20-like dice notation superset, with a plugin
architecture for macros, roll queries, tables, inline rolls, roll references,
and formatting.

## Key files

| File                                   | Role                                                          |
| -------------------------------------- | ------------------------------------------------------------- |
| `core/index.ts`                        | Plugin registry and parse/extract/evaluate pipeline           |
| `lib/types.ts`                         | AST/plugin/result/error types                                 |
| `lib/utils.ts`                         | AST traversal, math funcs, dice helpers, validation           |
| `plugins/dice/tokens.ts`               | Chevrotain lexer tokens                                       |
| `plugins/dice/parser.ts`               | Chevrotain CST parser                                         |
| `plugins/dice/ast.ts`                  | CST → AST visitor (~1,400 lines)                              |
| `plugins/dice/dicePlugin.ts`           | Dice/modifier evaluation (~800 lines)                         |
| `plugins/macros/index.ts`              | Macro expansion                                               |
| `plugins/roll-queries/index.ts`        | `?{prompt\|default}` handling                                 |
| `plugins/tables/index.ts`              | `Nt[table]` weighted table rolls                              |
| `plugins/inline-rolls/index.ts`        | `[[expr]]` and index assignment                               |
| `plugins/roll-references/index.ts`     | `$[[n]]`, `$[roll:name]`                                      |
| `plugins/formatting/index.ts`          | `%NEWLINE%`-style markup                                      |
| `lib/errors.ts`                        | Dice-roller error classes                                     |
| `src/components/RollButton.vue`        | Standalone 3D dice FAB (not mounted, not wired to the engine) |
| `__tests__/*`, `plugins/*/__tests__/*` | Extensive unit/integration tests                              |

## Pipeline

```
input string
   │
parseInput(input)            // first plugin whose parse() succeeds
   │  └─ assignInlineRollIndices(ast)
   ▼
AST
   │
extractQueries/Macros/Tables/Rolls/Formatting(ast)  // all plugins, flatMap
   ▼
evaluate(ast, context)       // first plugin whose evaluate() returns truthy
   ▼
{ total, rolls[], warnings[], details }
```

`processDiceExpression(input, context)` runs all steps and attaches extraction
results under `details`.

### Plugin interface

```ts
interface DiceRollerPlugin {
  name: string;
  register?(core): void;
  parse?(input): ASTNode;
  extractQueries?/extractMacros?/extractTables?/extractRolls?/extractFormatting?
  evaluate?(node, context): any;
  evaluateMacro?/evaluateRollQuery?/evaluateTable?/evaluateRollReference?
  evaluateFormatting?
}
```

`registerPlugin` pushes into a module-level array and optionally calls
`plugin.register(core)`.

Important evaluation semantics:

- A plugin's `evaluate` returning a falsy value means "not handled".
- **Generic errors thrown by a plugin are swallowed** and the loop continues. A
  real bug inside the dice plugin is indistinguishable from "this plugin
  doesn't handle this node"; if no plugin returns a result, the core throws
  `Unable to parse/evaluate`.
- Intentional `DiceRollerError`s (syntax, validation, missing data) are
  remembered and rethrown when no later plugin handles the node.
- Macro/table/inline-roll plugins call back into `evaluate` recursively.

## Dice syntax support

Tokens include:

- arithmetic: `+ - * / % **`, parentheses
- numbers (integer/decimal), unary minus
- `NdX`, `dX`, Fudge `dF`/`dF.x`, custom `Nd[a,b,c]`
- labels `2d6[fire]`
- keep/drop: `kh`, `kl`, `dh`, `dl`, `k>`, `k<`
- rerolls: `r`, `ro`, (partially `ra`)
- explosions: `!`, `!!`, `!p`, `!r`, `!>n`, `!<n`, `!=n`, `!n`
- success/failure/critical: `s`, `f`, `>`, `<`, `=`, `cs`, `cf`, `e`
- sorting `sa`/`sd`, min/max `mi`/`ma`, matching `m`, roll-once `o`
- functions `floor ceil round abs min max`
- macros `#name`, inline `[[expr]]`, tables `Nt[name]`, queries `?{...}`,
  references `$[[n]]` / `$[roll:name]`, formatting `%NEWLINE%`

The specification is documented in the repository root (`dice_notation.md`,
`dice_notation_proposal.md`).

## Evaluation details

### Dice and modifiers

`evaluateDiceNode` handles node types:
`number`, `unary`, `arithmetic`, `function`, `macro` (delegates to core),
`table` (throws; should have been expanded), `group`, `custom-dice`,
`grouped-roll`, `dice`, `fudge-dice`.

Modifiers are applied left-to-right by `applyModifiers`. The `e` (exhaustive)
modifier is pulled out, the last success-type modifier is remembered, and after
normal modifiers it repeatedly rerolls only successes (max 99 cycles).

Explosions are delegated to `explodeDice`, capped at `context.maxRolls ?? 99`.

`ra` (reroll until success) requires `context.allowInfinite`; otherwise it
warns and does nothing.

### Functions

Arguments are evaluated recursively; `mathFunctions` provides the six
functions.

### Arithmetic

Scalar totals combine normally; `rolls` arrays are concatenated; warnings and
details propagate.

### Errors

Custom error classes (`SyntaxError`, `ValidationError`, `MissingDataError`,
base `DiceRollerError`) are defined in `lib/types.ts`. `SyntaxError` shadows the
global name inside modules that import it.

## WIP notes (address before shipping)

1. **UI registration entry point.** `dicePlugin` exposes `parse`, `evaluate`,
   and `register`, and the test suite registers the plugin pipeline manually.
   The application still has no `src/utils/dice-roller/index.ts` that registers
   all plugins once for the UI, and `RollButton.vue` still sends raw notation
   such as `1d20` to `@3d-dice/dice-box` instead of evaluating it through the
   engine.
2. **Operator order is lost.** In `ast.ts`, `additive` concatenates `Plus`
   tokens then `Minus` tokens before walking, and `multiplicative` concatenates
   multiply/divide/modulo groups. Mixed expressions can be re-associated
   (`5 - 2 + 3`). This should be fixed before relying on arbitrary arithmetic.
3. **`d%` is not supported.** `%` lexes as modulo; there is no `d%` alias to
   `d100`.
4. **Exponential CST indexing.** Chained exponents (`2**3**2`) may associate
   incorrectly.
5. **Plugin error surfacing.** Core evaluation now rethrows intentional
   `DiceRollerError`s (e.g. missing roll references) but still swallows generic
   plugin errors when another plugin handles the node. Debug logs remain
   verbose.

Fixed during remediation: custom dice count semantics, Fudge variants,
roll-reference tokenization, nested inline rolls, grouped-roll evaluation, and
the plugin API/test drift.

## Planned UI integration

The WIP scope includes connecting the engine to the app:

1. Create `src/utils/dice-roller/index.ts` that imports and registers the dice,
   macros, tables, inline-roll, roll-query, roll-reference, and formatting
   plugins exactly once.
2. Replace or wrap `RollButton.vue` to call `processDiceExpression` and show
   results, or keep 3D dice and use the engine for the result calculation.
3. Pass an RNG (see technical proposals) so rolls are reproducible/testable.
4. Surface `warnings` in the UI.
5. When `CombatView` starts using the engine, remove its unused `S` token
   import; it is a leftover from exploratory work, not a shipped bug.

## Performance

- The parser is re-created per `parseDiceExpression` call
  (`new DiceRollerDiceParser()`), even though Chevrotain parsers are reusable.
- `cstToAst` is verbose with debug branches and repeated token scans; building
  the AST for long expressions is heavier than necessary.
- `getBacklinks`-style linear scans are not relevant here; the engine itself
  has no caches.

## Testing

The dice tests are the most complete part of the repository and currently pass.
They document the intended syntax and behavior; each suite registers the plugin
pipeline manually because the app has no shared registration entry point yet.
See `src/utils/dice-roller/__tests__/` and each plugin's `__tests__/`.
