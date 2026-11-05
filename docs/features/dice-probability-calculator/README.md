# Dice Probability Calculator

Status: **library and UI implemented**.

The probability calculator engine is a standalone TypeScript library under
`src/utils/dice-probability-calculator/`. It parses an AnyDice-compatible
script with Chevrotain and evaluates exact discrete probability distributions
using integer (`bigint`) weights. A Vue page under
`src/probability-calculator/` connects it to the application.

## Application integration

- Route: `/probability-calculator` (lazy loaded).
- Syntax reference: `/probability-calculator/syntax`, linked from the top
  header and translated into English and Russian. Its title/back action live in
  the application header; the right drawer contains a hideable TOC whose
  entries are real `#anchor` links to the section cards. Section headings are
  anchor links too, so their URLs can be copied. The TOC highlights the section
  currently in view and updates as the page is scrolled.
- Page title and syntax action are rendered in the application top header via
  `ViewHeader`; there is no in-page title block.
- Main menu: inside the expandable **Tools** section, using `IconChartLine`.
  Timers and Calculator are grouped there as well.
- Source editor: reusable `MonacoEditor.vue` wrapper with a custom AnyDice
  Monarch syntax highlighter, autocomplete for keywords, snippets, built-in
  functions and variables, definitions from code pieces included in the current
  namespace (variables and functions, labelled with the source piece name), and
  Monaco markers for syntax-error ranges. Completion labels/details and
  code-piece source labels follow the current UI language.
- Syntax errors are structured by the parser (unexpected token/character,
  expected token types, source range). Fault-tolerant parsing collects multiple
  errors via `DiceSyntaxError.errors`, and Monaco shows a marker for each issue.
  Messages are localized and the error banner links to the first issue with a
  clickable `line N, column M` link that moves the editor cursor there.
- Controls: Calculate, Table, Graph, Export, Roller, Normal, At Least, At Most,
  Transposed and Summary.
- Results: probability tables, CSV export, exact summary statistics, a roller,
  and graphs rendered with `vue3-charts`, including zoom in/out/reset controls.
- Share links encode the source in the URL hash (`#code=<base64>`); opening a
  link restores the program. Editing the source clears the generated link.
- The source program is persisted in `localStorage`.
- Unsaved editor changes trigger confirmation when leaving the page and a
  browser `beforeunload` warning when closing/reloading the tab.
- Code library sidebar: a right drawer toggled with `IconCodeblock` from the top
  header. Items use the same colored-border card layout as map marker/area
  items in the map sidebar. Save named snippets, include selected snippets in the calculation
  namespace, rename/delete them, and load them with an unsaved-changes
  confirmation. Library contents persist in `localStorage`.

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
