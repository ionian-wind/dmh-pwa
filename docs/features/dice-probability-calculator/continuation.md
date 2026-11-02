# Continuation Notes

## State

The `feat/probability-calculator` branch was rebased onto `main` and the
outdated TypeScript port under `src/utils/probability-calculator-python` was
removed. The new implementation lives in
`src/utils/dice-probability-calculator/`.

The library has:

- a Chevrotain lexer/parser for the AnyDice-like script language,
- a CST-to-AST layer,
- exact bigint-weighted probability distributions,
- convolution, sequence values and order statistics,
- AnyDice function-parameter casting (`:n`, `:s`, `:d`),
- built-in functions and user-defined functions, loops, conditionals and
  settings,
- a public `parse(script)` / `calculate(script)` API with no UI dependency.

Tests:

```bash
npm run test:probability-calculator
```

## Next steps

1. Add a memoization cache keyed by normalized AST nodes. Repeated expensive
   subexpressions are currently recomputed.
2. Optimize multiple position selectors (`{1,2}@20d6`). Single selectors use an
   exact order-statistic formula; multiple selectors still enumerate sorted
   rolls and have a safety limit.
3. Expose evaluator warnings (currently only function-depth truncation returns
   the empty die silently).
4. Add output view helpers (at-least/at-most/normal/export) outside the core
   evaluator if the UI needs them.
5. Cross-check against the external `../python_dice` engine with a reference
   script corpus.
6. Wire the library into a probability calculator view. Keep UI work separate
   from this package.

The official-docs validation matrix is maintained in
[README.md](README.md).
