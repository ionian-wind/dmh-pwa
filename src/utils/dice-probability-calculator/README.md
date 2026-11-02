# Dice Probability Calculator

An AnyDice-compatible dice probability engine written in TypeScript. The
language parser is built with [Chevrotain](https://chevrotain.io/) and the
evaluator computes exact discrete probability distributions using integer
weights.

## Usage

```ts
import { calculate } from '@/utils/dice-probability-calculator';

const result = calculate(`
  function: highest of S:s { result: 1@S }
  output [highest of 2d6] named "highest of 2d6"
`);

for (const output of result.outputs) {
  console.log(output.name, output.mean, output.stddev);
  for (const outcome of output.outcomes) {
    console.log(outcome.value, outcome.probability);
  }
}
```

`parse(script)` is also exported when only the AST is needed.

## Supported language

- Backslash comments: `\ comment \`
- Integers, `dX`, `NdX`, `d%`, `d{...}`, and arbitrary dice such as `1d(2d4)`
- Arithmetic: `+ - * / ^`, integer division truncated toward zero
- Comparisons: `= != < > <= >=`
- Boolean operators: `! & |`
- Introspection: `@` (position access) and `#` (length)
- Sequences: literals, ranges `{1..6}`, repetitions `{1:4}`, range repetitions
  `{1..6:2}`, nesting, `{d6}`. Literals preserve their written order; `sort`
  applies the `position order` setting.
- Variables and reassignment: `NAME: expression`
- Functions with typed parameters: `function: name A:n B:s { ... }`
- `result: expression` for early function returns
- `if` / `else if` / `else`
- `loop NAME over SEQUENCE { ... }`
- `output expression [named "name"]` with `[VARIABLE]` interpolation
- `set "position order"`, `set "explode depth"`,
  `set "maximum function depth"`

### Function parameter casting

The evaluator follows AnyDice's function-casting rules:

| Parameter | Number argument                   | Sequence argument         | Die argument                  |
| --------- | --------------------------------- | ------------------------- | ----------------------------- |
| `:n`      | passed directly                   | summed                    | invoked once per outcome      |
| `:s`      | wrapped in a one-element sequence | passed directly           | invoked for every sorted roll |
| `:d`      | promoted to a constant die        | summed, then constant die | passed directly               |

## Built-in functions

- `[absolute N]`
- `[SEQUENCE contains NUMBER]`
- `[count VALUES in SEQUENCE]` (repeated values count repeatedly)
- `[explode DIE]`
- `[highest N of DICE]`, `[lowest N of DICE]`, `[middle N of DICE]`
- `[highest N of DICE and DICE ...]`, `[lowest N of DICE and DICE ...]`
- `[highest of A and B]`, `[lowest of A and B]`
- `[maximum of DIE]`, `[minimum of DIE]`
- `[reverse SEQUENCE]`, `[sort SEQUENCE]`

## Architecture

| File           | Responsibility                                  |
| -------------- | ----------------------------------------------- |
| `tokens.ts`    | Chevrotain token definitions                    |
| `parser.ts`    | Chevrotain grammar                              |
| `toAst.ts`     | CST to AST conversion                           |
| `ast.ts`       | AST and statement types                         |
| `seq.ts`       | Ordered numeric sequences                       |
| `die.ts`       | Weighted PMFs, convolution and order statistics |
| `builtins.ts`  | Built-in AnyDice function library               |
| `evaluator.ts` | AST interpreter and type-casting rules          |
| `index.ts`     | Public `parse` / `calculate` API                |

The engine intentionally has no UI or CLI. The application can consume the
returned distributions directly.

## Tests

```bash
npx vitest run src/utils/dice-probability-calculator
```

The tests cover parsing, arithmetic, sequences, order statistics, built-ins,
function casting, loops, conditionals, settings, recursion and error handling.
`__tests__/articles.test.ts` mirrors the programs and published results from
the official AnyDice articles. `__tests__/official-docs.test.ts` covers every
page of the official documentation.

See [docs/features/dice-probability-calculator.md](../../../docs/features/dice-probability-calculator.md)
for the full documentation-validation matrix and known gaps.

## Current limitations

- Output views (graph, CSV, at-least/at-most) are UI concerns and are not part
  of the library.
- Multiple position selectors such as `{1,2}@20d6` use explicit roll
  enumeration and therefore have a safety limit. Single position selectors use
  an exact order-statistic formula and have no such limit.
- Mixed pools such as `[highest 3 of 3d6 and 1d8]` are enumerated and also have
  a safety limit. A single homogeneous pool uses order statistics efficiently.
- Function-depth truncation returns the empty die but does not yet expose the
  warning that AnyDice shows.
- The official `explode` page is internally inconsistent about the default
  depth (it mentions both “twice” and `explode depth` 8). The library currently
  uses 8 and always supports `set "explode depth" to X`.
- There is no memoization cache yet. Distributions are exact, but repeated
  expensive subexpressions are recomputed.
