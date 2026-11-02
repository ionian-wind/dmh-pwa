# Dice Probability Calculator

Status: **library and UI implemented**.

The probability calculator engine is a standalone TypeScript library under
`src/utils/dice-probability-calculator/`. It parses an AnyDice-compatible
script with Chevrotain and evaluates exact discrete probability distributions
using integer (`bigint`) weights. A Vue page under
`src/probability-calculator/` connects it to the application.

## Application integration

- Route: `/probability-calculator` (lazy loaded).
- Syntax reference: `/probability-calculator/syntax`, linked from the
  calculator header and translated into English and Russian.
- Main menu: directly below Calculator, using `IconChartLine`.
- Source editor: reusable `MonacoEditor.vue` wrapper with a custom AnyDice
  Monarch syntax highlighter and autocomplete for keywords, snippets,
  built-in functions and variables.
- Controls: Calculate, Table, Graph, Export, Roller, Normal, At Least, At Most,
  Transposed and Summary.
- Results: probability tables, CSV export, exact summary statistics, a roller,
  and graphs rendered with `vue3-charts`, including zoom in/out/reset controls.
- Share links encode the source in the URL hash (`#code=<base64>`); opening a
  link restores the program. Editing the source clears the generated link.
- The source program is persisted in `localStorage`.

UI coverage is split between `src/probability-calculator/__tests__/`,
`src/components/common/__tests__/MonacoEditor.test.ts`, and
`tests/e2e/probability-calculator.e2e.ts`.

## Public API

```ts
import { calculate, parse } from '@/utils/dice-probability-calculator';

const result = calculate(`
  function: highest of S:s { result: 1@S }
  output [highest of 2d6] named "highest of 2d6"
`);

result.outputs[0].name; // "highest of 2d6"
result.outputs[0].mean;
result.outputs[0].stddev;
result.outputs[0].outcomes; // [{ value, weight, probability }, ...]
```

`parse(script)` returns the typed AST when only parsing is needed.

## Documentation set

| Document                 | Contents                                                     |
| ------------------------ | ------------------------------------------------------------ |
| [spec.md](spec.md)       | Detailed language, data-model and architecture specification |
| [library.md](library.md) | Library syntax, casting rules, module map and tests          |

## Implementation overview

Implementation details, supported syntax, function parameter casting, the
module map and the test layout are documented in [library.md](library.md).

## Validation against official AnyDice documentation

Source: <https://anydice.com/docs/>

| Documentation page     | Status | Notes                                                                                                                                                                                        |
| ---------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Introduction           | ✅     | Output values, names, means and standard deviations are returned. Views/links are UI concerns.                                                                                               |
| The Basics             | ✅     | Arithmetic, integer division toward zero, comparisons, booleans, variables and comments match.                                                                                               |
| Dice                   | ✅     | Die arithmetic, comparisons, convolution and `NdX` collections. `d` precedence follows the introspection examples.                                                                           |
| Sequences              | ✅     | Literals preserve written order; ranges, repetitions, nesting, `{d4}`, empty sequences and sequence math match. `sort` applies the position-order setting.                                   |
| Arbitrary Dice         | ✅     | `d{...}`, `d{start..end}`, `d{}` and `Nd(expression)`.                                                                                                                                       |
| Introspection          | ✅     | `#` and `@` for numbers, sequences and dice collections; position-order setting affects dice collections and digits.                                                                         |
| Strings with Variables | ✅     | `[VARIABLE]` interpolation in named outputs. Die/sequence formatting is intentionally simplified.                                                                                            |
| Looping                | ✅     | Loops over sequences and dice, loop variable interpolation and nested loops.                                                                                                                 |
| Conditional Blocks     | ✅     | `if`, `else if`, `else`, nested blocks and early `result`.                                                                                                                                   |
| Functions              | ✅     | Word-based names, typed parameters, number/die/sequence casting, local variables, recursion and maximum function depth. `output` and `set` are rejected inside functions, matching the docs. |
| Function Library       | ✅     | All 12 listed functions, including the 2025 multi-pool `highest`/`lowest` variants.                                                                                                          |
| Changelog              | ✅     | Native `[highest N of SA and SB]` and `[lowest N of SA and SB]` are implemented.                                                                                                             |

### Function-library matrix

| Function                         | Status                           |
| -------------------------------- | -------------------------------- |
| `[absolute NUMBER]`              | ✅                               |
| `[SEQUENCE contains NUMBER]`     | ✅                               |
| `[count VALUES in SEQUENCE]`     | ✅ including repeated values     |
| `[explode DIE]`                  | ✅ with `explode depth`          |
| `[highest NUMBER of DICE]`       | ✅ including `... and ...` pools |
| `[lowest NUMBER of DICE]`        | ✅ including `... and ...` pools |
| `[middle NUMBER of DICE]`        | ✅                               |
| `[highest of NUMBER and NUMBER]` | ✅                               |
| `[lowest of NUMBER and NUMBER]`  | ✅                               |
| `[maximum of DIE]`               | ✅ (`0` for the empty die)       |
| `[reverse SEQUENCE]`             | ✅                               |
| `[sort SEQUENCE]`                | ✅ follows position order        |

## Official-documentation corrections applied

Validating against the official docs exposed several incorrect assumptions in
the earlier specification and implementation:

1. **Sequence literals are not automatically sorted.** Official introspection
   examples such as `1@{2,4,6} = 2` require written order to be preserved.
   Ranges and repetitions therefore keep their explicit order; `sort` is the
   operation that applies the position-order setting.
2. **A sequence passed to a `:d` parameter is summed**, not converted into a
   custom die. This is stated on the Functions page.
3. **`count` counts repeated values repeatedly.** The official example
   `[count {4..6, 6} in d6]` counts a 6 twice.
4. **Function-local `output` and `set` are invalid.** Both now raise an error.
5. **Multi-pool `highest`/`lowest` are native functions** added in the
   2025-09-06 changelog and are supported.
6. **Nested functions may read caller variables.** This is required by the
   official Qin article and similar helper-function patterns.

## Known gaps and intentional scope

- Output views (`Table`, `Graph`, `Export`, normal/at-least/at-most/transposed)
  and share links are application UI, not library concerns.
- The library returns `outcomes`, `mean` and population `stddev`; it does not
  render them.
- Function-depth truncation returns the empty die. AnyDice additionally shows a
  warning; warnings are not part of the public result yet.
- The official `explode` page is internally inconsistent about the default
  depth (it mentions both “twice” and `explode depth` 8). The library currently
  uses 8 and always allows `set "explode depth" to X`.
- Mixed-pool `highest`/`lowest` uses explicit roll enumeration and therefore
  has a safety limit. Single homogeneous pools use the exact order-statistic
  formula and scale better.
- String formatting for values that are dice or sequences is simplified; the
  documentation itself notes that such conversions are not always useful.
