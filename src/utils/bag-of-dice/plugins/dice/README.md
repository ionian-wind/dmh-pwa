# Dice Plugin

This plugin provides support for dice expressions in the Bag of Dice parser/evaluator.

## Responsibilities
- Recognize and parse dice expressions (e.g., `NdX`, `dX`, `d%`, `dF`, computed dice, custom dice, grouping)
- Build CST and AST nodes for dice expressions
- Provide CST-to-AST and AST-to-CST handler maps
- Evaluation logic: roll dice using RNG, support all dice types, custom dice, computed dice, fudge dice, grouping
- Extraction utility for dice expressions (future)

## Supported Syntax (from dice_notation.md)
- Basic dice: `NdX`, `dX`, `d%`, `dF`, `dF.1`, `dF.2`, `dF.3`
- Aliases: `d%` = `d100`
- Fudge/FATE dice: `dF`, `dF.1`, `dF.2`, `dF.3`
- Computed dice: `(N+Y)dX`, `Nd(X+Y)` (with rounding)
- Custom dice: `d[1,2,3,5,8]`
- Grouping: `{1d6, 2d8+1, 1d4-1}`
- Math on dice: e.g., `round(1d6/2)`
- Dice math functions: `abs()`, `round()`, `ceil()`, `floor()`

## Main Files
- `tokens.ts`: Chevrotain token definitions for dice
- `parser.ts`: Chevrotain grammar for dice
- `converters.ts`: CST-to-AST and AST-to-CST handler maps
- `evaluator.ts`: Evaluation logic for dice
- `README.md`: This file
- `__tests__/dice.test.ts`: Vitest tests for the plugin 