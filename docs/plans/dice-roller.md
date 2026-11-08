# Dice Roller

> **Status:** experimental. Two implementation branches exist, neither is wired
> into the running application. This document is the consolidated dice-roller
> reference: it merges the old feature description, the notation
> specification, the plugin requirements/proposal, and the differences between
> `dice-roller-2` and `dice-roller-3`.

## Purpose

The dice roller is intended to parse and evaluate a Roll20-like dice notation
superset:

- arithmetic, functions and dice pools;
- exploding, rerolling, keep/drop and sorting modifiers;
- grouped and computed rolls, custom dice and Fudge dice;
- macros, roll queries, tables, inline rolls and roll-history references;
- formatting markup, structured errors and non-fatal warnings;
- an injectable RNG for deterministic tests.

The legacy engine under `src/utils/dice-roller/` has been replaced on the dice
branches by `src/utils/bag-of-dice/`.

## Implementation status

| Branch          | Engine                                                                        | Status                                              |
| --------------- | ----------------------------------------------------------------------------- | --------------------------------------------------- |
| `main`          | Legacy `src/utils/dice-roller/`                                               | Not wired; no shared registration entry point.      |
| `dice-roller-2` | `src/utils/bag-of-dice/` with Chevrotain lexers/parsers and plugin converters | Feature tests green; not wired into the app.        |
| `dice-roller-3` | `src/utils/bag-of-dice/` with a custom tokenizer and recursive-descent parser | Experimental; parser/tokenizer tests still failing. |

Both branches share the same notation specification, requirements and proposal.
The application still does not register the engine or call it from a view.
`RollButton.vue` is a standalone `@3d-dice/dice-box` FAB and is not mounted in
the app shell.

## Goals and requirements

- The core provides an extendable parser, evaluator and error handler.
- Each feature area is a plugin encapsulating syntax extension, parsing,
  evaluation and extraction.
- Parsing is a separate step that returns an AST; extraction and evaluation use
  that AST later.
- Plugins are evaluated in the order supplied. Arithmetic is the built-in
  fallback and is always considered last.
- Evaluation order:
  1. roll queries (up to the nesting limit);
  2. inline rolls, deepest first;
  3. dice, including exploding/dropped/special dice;
  4. `floor`/`ceil`/`round`/`abs`;
  5. remaining arithmetic with normal precedence.
- The RNG may be overridden for tests or reproducible rolls.
- Invalid syntax, invalid user input and missing data produce typed exceptions.
- Reaching a dice explosion limit produces a warning, not an exception.
- Invalid formatting markup produces a syntax exception.

## Pipeline

```
parse(text)
  -> AST
extractQueries / extractTables / extractRolls / extractMacros (plugins)
  -> required input schemas, table names, roll ids, macro names
evaluate(ast, { queries, tables, rolls, macros, rng })
  -> { result, warnings }
```

The engine may also expose a single `processDiceExpression`-style helper that
runs the pipeline and returns extraction details, but the current branches keep
the stages separate.

## Plugin architecture

A plugin owns its token definitions, AST handlers and evaluator. Common
responsibilities:

- extend tokenization/grammar;
- claim and parse plugin-specific tokens/nodes;
- evaluate its AST node types;
- extract data required before evaluation;
- report domain-specific errors and warnings.

Evaluation stops at the first plugin that handles a node. Arithmetic is the
fallback for math and unknown-node errors.

### `dice-roller-2` — Chevrotain implementation

- Uses Chevrotain lexers and CST parsers.
- Each plugin supplies `tokens`, an optional parser/top rule, CST-to-AST handler
  maps, an evaluator and extraction functions.
- `parse()` merges token vocabularies, delegates to the plugin parser, and
  converts the resulting CST to an AST.
- Non-strict parsing returns `null` instead of throwing on syntax/recovery
  errors.
- Includes core, arithmetic, dice, roll-query, table and integration tests.
- This is the more mature branch: its suite passes and is the better base for
  further work.

### `dice-roller-3` — custom tokenizer/parser implementation

- Replaces Chevrotain with a custom sticky-regex tokenizer and a
  recursive-descent `Parser`.
- Plugins contribute `TokenDef` records and implement `canParse`/`parse`.
- Core parser rules cover arithmetic; plugins claim their own tokens/nodes.
- The branch is an architectural experiment; its parser/tokenizer and
  integration tests are not yet green.

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
- Labels: `2d6[fire]`; labels may contain Markdown.
- Descriptive text after a roll is allowed, e.g. `1d20+5 for initiative`.

### Dice modifiers

- Keep/drop: `khN`, `klN`, `dhN`, `dlN`; custom `k>N`, `k<N`.
- Rerolls: `rN`, `roN`, `r<3`; `raN` rerolls until success and requires the
  `allowInfinite` context flag.
- Explosions:
  - `!` explode on maximum;
  - `!p` penetrating;
  - `!!` compound;
  - `!N` custom threshold;
  - `!<N`, `!>N`, `!=N` directional thresholds.
  - Explosions are capped at 99 rolls and emit a warning at the limit.
- Dice pools and counting: `=N`, `>N`, `<N`, `e`, `s`, `f`, `cs`, `cf`.
- Min/max per die: `miN`, `maN`.
- Matching: `m`.
- Sorting: `sa`, `sd`.
- Roll once: `o`.
- Modifiers can be chained, e.g. `4d6kh3ro1!>5sd`.
- Nested groups can receive modifiers, e.g. `{2d6kh1, 1d8}kh1`.
- Advantage/disadvantage use `2d20kh1` / `2d20kl1`.

### Tables

`Nt[table-name]` rolls N times on a weighted table; `t[table]` rolls once.
Weights may be expressed by repeating entries or by percentages that total 100.
Table references can be extracted before evaluation.

### Macros and roll queries

- Macros: `#macro-name`; calls may be nested or chained with `;`.
- Roll queries:
  - `?{Prompt}` asks for a value;
  - `?{Prompt|Default}` supplies a default;
  - `?{Prompt|Option1|Option2}` offers choices;
  - labelled variants are supported;
  - query defaults may themselves be inline rolls, e.g. `?{Dmg|[[1d8]]}`;
  - multiple independent queries may appear in one expression;
  - nesting is limited; exceeding the limit is a syntax error.
- Escape `|`, `,` and `}` inside queries/macros with `\`.

### Inline rolls, references and formatting

- Inline rolls: `[[expr]]`, evaluated deepest-first.
- Roll references: `$[[N]]`, `$[[N]]-1`, `$[roll:id]`.
- `%NEWLINE%` inserts a line break in output.
- `//` starts a comment.
- Invalid markup is a syntax error.

### Errors and limits

- Syntax/validation/missing-data/nesting-limit exceptions are typed.
- Missing macro, table or roll reference is a missing-data error.
- Division by zero is reported as an error/null result.
- Invalid dice such as `2d0`, `0d6`, `2d-6` and `2d6.5` are rejected.
- Invalid keep/drop counts are rejected.
- Negative dice such as `-1d6` are rejected.
- Mismatched braces/brackets and malformed queries are rejected.
- Explosion limits are warnings; query nesting limits are errors.

## Evaluation details

- Modifiers apply left-to-right.
- The `e` modifier rerolls successes after other modifiers, up to 99 cycles.
- Arithmetic combines scalar totals, concatenates roll arrays, and propagates
  warnings/details.
- Generic plugin errors must not be silently mistaken for “plugin did not handle
  this node”; intentional typed errors are rethrown when no later plugin
  handles the node.

## Key files

| File/directory                                | Role                                                |
| --------------------------------------------- | --------------------------------------------------- |
| `src/utils/bag-of-dice/`                      | Replacement engine on both dice branches            |
| `src/utils/bag-of-dice/index.ts`              | Public `BagOfDice` API                              |
| `src/utils/bag-of-dice/plugins/`              | Arithmetic, dice, roll-query, table plugins         |
| `src/utils/bag-of-dice/utils/cstAstConverter` | CST/AST conversion used by `dice-roller-2`          |
| `src/utils/bag-of-dice/core/`                 | Tokenizer/parser/evaluator used by `dice-roller-3`  |
| `src/components/RollButton.vue`               | Standalone 3D dice FAB; not mounted or engine-wired |

The legacy `src/utils/dice-roller/` tree documented by earlier revisions has
been removed on both dice branches.

## Testing

- `dice-roller-2`: full suite passes; `features:verify` passes.
- `dice-roller-3`: merge/type-check succeeds, but the experimental
  tokenizer/parser suite has pre-existing failures. Fix those before using that
  branch as a base.
- Deterministic tests inject a fake RNG.

## Integration checklist

Before shipping:

1. Choose one implementation branch and delete the rejected one.
2. Add a single registration/bootstrap module that loads the chosen plugins
   once.
3. Wire the engine to a UI entry point (or wrap `RollButton.vue`) and render
   results/warnings.
4. Feed real table, macro and roll-reference data into evaluation.
5. Add app-level tests for parse → extract → prompt → evaluate.
6. Keep the notation specification and this document as the canonical feature
   reference.

## Known gaps

- No app registration or UI integration.
- `dice-roller-3` parser/tokenizer is incomplete.
- Formatting, macro and roll-reference plugins are not fully exercised end to
  end.
- No final decision on whether to keep 3D dice, the engine, or both.
