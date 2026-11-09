# Bag of Dice

Greenfield dice notation parser/evaluator for the roll engine described in
[docs/plans/dice-roller.md](../../../docs/plans/dice-roller.md).

The engine is framework-free. It does not import Vue, Pinia, chat state or any
UI module. External data enters only through async repositories.

## Quick start

```ts
import {
  createRollEngine,
  createEmptyRepositories,
  sequenceRng,
} from '@/utils/bag-of-dice';

const engine = createRollEngine();

// 1. Optional pre-flight: expand macros and collect prompts.
const extraction = await engine.extract('1d20 + ?{Bonus|2}', {
  repositories: createEmptyRepositories(),
});

// 2. Roll once answers are known.
const outcome = await engine.roll('1d20 + ?{Bonus|2}', {
  repositories: createEmptyRepositories(),
  rng: sequenceRng([0.5]),
  queryAnswers: { Bonus: '2' },
});

if (outcome.status === 'complete') {
  console.log(outcome.result.total);
}
```

`roll()` returns one of:

- `complete` with a `RollResult`;
- `needs-input` with extraction queries;
- `error` with typed `RollError[]`.

Pass a deterministic `Rng` for tests and replay. Production defaults to a
crypto-backed RNG; the engine never falls back to `Math.random`.

## Module map

| Module                      | Responsibility                                               |
| --------------------------- | ------------------------------------------------------------ |
| `engine/contracts.ts`       | Public AST, result, process, repository and plugin types     |
| `engine/errors.ts`          | Typed errors/warnings and `RollFailure`                      |
| `engine/limits.ts`          | Documented defaults and `resolveLimits()`                    |
| `engine/rng.ts`             | Crypto/sequence RNGs, validation and replay state            |
| `engine/lexer.ts`           | Chevrotain tokens, vocabulary composition, collisions        |
| `engine/parser.ts`          | Chevrotain grammar, recovery, typed AST                      |
| `engine/plugin-registry.ts` | Plugin/token/CST-rule registration and evaluation dispatch   |
| `engine/evaluator.ts`       | Plugin dispatch and nested evaluation                        |
| `engine/plugins/*`          | Arithmetic, dice/modifiers and optional tables               |
| `engine/expansion.ts`       | Async macros, abilities and attributes                       |
| `engine/queries.ts`         | `?{...}` extraction, identity, answers                       |
| `engine/inline.ts`          | `[[...]]`, `$[[n]]` references and labels                    |
| `engine/engine.ts`          | `extract()` / `roll()` pipeline                              |
| `engine/snapshot.ts`        | Persistable `RollResultSnapshot`                             |
| `engine/text.ts`            | Accessible text and 2D renderers                             |
| `engine/visualize.ts`       | Text/2D/3D visualizer contracts and `@3d-dice/dice-box` hook |

## Supported syntax

- Arithmetic: `+ - * / % **`, parentheses, unary signs,
  `floor/ceil/round/abs` and variadic `min`/`max`.
- Dice: `NdX`, `dX`, `d%`, `dF`, `dF.1`–`dF.3`, computed `(N)dX` / `Nd(X)`,
  custom `d[a,b,c]`, labels `2d6[fire]`.
- Compare points and modifiers: `>N`, `<N`, `=N`, `!=N`, `s`, `f`, `cs`, `cf`,
  `kh`, `kl`, `dh`, `dl`, `k`, `d`, `r`, `ro`, `!`, `!p`, `!!`, `mi`, `ma`,
  `m`, `mt`, `s`/`sa`/`sd`, `e`, `o`.
- Grouped rolls: `{2d6, 1d8}`, nested groups and group modifiers.
- Macros `#name`, abilities `%{character|ability}`, attributes
  `@{selected|HP}`, `@{target|AC}`, `@{selected|HP|max}`, repeating rows.
- Queries `?{Prompt}`, `?{Prompt|Default}`, `?{Prompt|Label,value|...}`.
- Inline rolls `[[expr]]` and references `$[[n]]` / `$[[n.computed]]`.
- Tables `t[name]`, `2t[name]`.

## Syntax compatibility with `dice-roller-parser`

The reference project's roller tests are ported in
`__tests__/reference-compat.test.ts` (Russian syntax and Discord rendering are
intentionally not ported).

| Feature                | `ttg-club/dice-roller-parser`      | This engine                                                        |
| ---------------------- | ---------------------------------- | ------------------------------------------------------------------ |
| Dice separator         | `d`, Russian `к`                   | `d`/`D` only                                                       |
| Fate dice              | `dF`, `df`, Russian `кС`           | `dF`, `df`, plus `dF.1`/`dF.2`/`dF.3`                              |
| Russian operators      | yes                                | no — syntax localization is out of scope                           |
| Custom dice            | no                                 | `d[a,b,c]`                                                         |
| `d%`                   | yes                                | yes                                                                |
| Computed dice          | yes                                | yes                                                                |
| Keep/drop size         | full roll expression               | integer literal                                                    |
| Reroll/explode target  | full roll expression               | number or compare point (`>N`, `<N`, `=N`, `!=N`)                  |
| Success/failure        | `>`, `<`, `=`, `f`                 | same, plus `s`, `cs`, `cf`                                         |
| Sort                   | `s`, `sa`, `sd`                    | same; `s>N` is success counting                                    |
| Match                  | `m`, `mt`, `mtN`, optional target  | same semantics                                                     |
| Explode forms          | `!`, `!!`, `!p`, optional target   | same; `!N` means `!=N`                                             |
| Grouped-roll modifiers | single member flattens to dice     | same                                                               |
| Labels                 | after roll/bracket expressions     | after dice, groups and ordinary terms                              |
| Trailing text          | captured as the expression label   | stored as a text segment (disable with `allowTrailingText: false`) |
| Inline rolls           | `[[expr]]`, usable as a dice count | same, plus `$[[n]]` references                                     |
| Roll queries           | no                                 | `?{...}` extraction/answer pass                                    |
| Macros/abilities/attrs | no                                 | `#macro`, `%{...}`, `@{...}` expansion pass                        |
| Tables                 | no                                 | `Nt[table]` plugin                                                 |
| Roll-once `o`          | no                                 | parsed but currently a no-op                                       |
| Errors                 | boolean flags / thrown errors      | typed `RollError` codes and outcome statuses                       |
| RNG                    | callback                           | `Rng` interface with snapshot/replay                               |
| Chat renderer          | Discord markdown renderer          | text/2D/3D visualizer contracts (Discord out of scope)             |

Semantics aligned with the reference corpus: inclusive target numbers, `mt`
matching-group counts, single-member group flattening, trailing text, `!N` and
`dN` drop shorthand. Differences are intentional where this engine adds roll
queries, macros, APIs and typed metadata.

## Metadata

`RollResult` carries the final total plus:

- ordered pass records;
- expansion records;
- query answers;
- inline-roll records (including nested dice groups);
- dice groups and per-die `kept`/`dropped`/`rerolled`/`exploded`/`compounded`/
  `penetrating` flags;
- arithmetic traces;
- table selections;
- warnings with codes, spans and localization parameters;
- optional RNG replay state.

`createSnapshot()` produces the persistable form. Rendering a snapshot never
re-rolls.

## Determinism

Same input + RNG sequence + repositories + query answers produces the same
result and metadata. `sequenceRng()` exposes `snapshot()` / `restore()` for
replay tests.

## Testing

```sh
npx vitest run src/utils/bag-of-dice
npx vue-tsc --noEmit -p tsconfig.json
```

`__tests__/reference-compat.test.ts` ports the value/fixed-RNG/sort tests from
`ttg-club/dice-roller-parser`. Russian operators and Discord rendering are
intentionally out of scope and not ported.

## Known limitations / follow-ups

These are tracked in
[docs/plans/dice-roller-implementation.md](../../../docs/plans/dice-roller-implementation.md):

- The plugin `grammar()` hook is reserved metadata; the core grammar is shared
  and plugins currently contribute tokens, CST rule names and evaluators.
- `o` (roll once) is parsed and recorded but currently a no-op.
- Fudge variant mapping is explicit: `dF`/`dF.2 = {-1,0,1}`,
  `dF.1 = {0,1}`, `dF.3 = {-1,0}`.
- `e` exhaustive successes is implemented as a capped follow-up loop and should
  receive more golden cases.
- Target-number compares follow the reference corpus and are inclusive:
  `>` behaves as `>=` and `<` as `<=`.
- Single-member grouped rolls apply group modifiers to individual dice;
  multi-member groups apply them to sub-roll totals.
- Table references inside inline rolls are not preloaded yet; tables used by the
  main expression are.
- Grouped rolls must contain dice; pure-math group members are rejected.
- Trailing message text after the expression is accepted by default and stored
  as a text segment. Set `allowTrailingText: false` to reject it.
